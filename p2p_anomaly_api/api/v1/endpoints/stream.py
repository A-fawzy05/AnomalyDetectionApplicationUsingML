"""
Real-time streaming endpoints: append new events to an existing analyzed run.

POST /runs/{run_id}/append        — JSON body (StreamRequest), for Kafka consumers,
                                    webhooks, and any service that can POST events.
POST /runs/{run_id}/append/file   — multipart file upload (CSV / XES / OCEL2),
                                    for batch real-time ingestion.

Both endpoints run the full ML pipeline on the new batch, upsert results into
the existing run, recompute the run-level summary from DB totals, and return
an AppendResponse containing only the new anomalies + the updated summary.
"""

import logging
import time
from typing import Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.endpoints.analyze import (
    _detect_file_type,
    _get_ingester,
    _prepare_case_rows,
    build_analysis_response,
    build_phase_summary,
    build_process_flow_map,
)
from api.v1.schemas.request import StreamRequest
from api.v1.schemas.response import AppendResponse
from core.config import settings
from core.exceptions import IngestionError
from db.repositories import (
    case_repository,
    event_log_repository,
    phase_repository,
    run_repository,
)
from db.session import get_db
from features import sequence_features
from features.case_features import build_case_features
from models import isolation_forest, lstm_autoencoder
from scoring.labeler import apply_labels
from scoring.merger import calibrate_thresholds, merge_scores

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Shared pipeline helper
# ---------------------------------------------------------------------------

async def _run_pipeline_and_append(
    run_id: UUID,
    df: pd.DataFrame,
    db: AsyncSession,
    start_ts: float,
) -> AppendResponse:
    """
    Execute the full anomaly detection pipeline on `df`, upsert results into
    `run_id`, recompute run-level summary from DB, and return AppendResponse.
    """
    n_cases = df["case_id"].nunique()

    if n_cases == 0:
        raise HTTPException(status_code=422, detail="No cases found in the provided events.")

    if n_cases > 10_000:
        raise IngestionError(
            f"Batch contains {n_cases} cases — exceeds the 10,000-case safety limit."
        )

    # 1. Persist new raw events (appended to same run)
    await event_log_repository.bulk_insert_events(db, run_id, df)

    # 2. Feature engineering
    X_case = build_case_features(df)
    df_events = sequence_features.prep_event_features(df)
    encoded = lstm_autoencoder.encode_events(df_events)
    X_seq, case_ids, lengths = lstm_autoencoder.build_sequences(df_events, encoded)

    # 3. Scoring
    if_scores, _ = isolation_forest.predict_with_labels(X_case)
    lstm_scores = lstm_autoencoder.score_sequences(X_seq, lengths, case_ids)
    lstm_scores = lstm_autoencoder.assign_flags(lstm_scores)

    # 4. Phase summary & score fusion
    phase_summary = build_phase_summary(df)
    merged = merge_scores(X_case, if_scores, lstm_scores, phase_summary)

    # 5. Adaptive threshold calibration (same strategy as /analyze)
    adaptive_if_threshold, adaptive_lstm_threshold = calibrate_thresholds(
        if_scores=if_scores,
        lstm_scores=lstm_scores["lstm_case_score"].values,
        if_train_threshold=isolation_forest.get_threshold(),
        lstm_train_threshold=lstm_autoencoder.get_thresholds()["case"],
        target_anomaly_rate=0.05,
    )

    # 6. Labeling
    labeled = apply_labels(
        merged, df,
        if_threshold=adaptive_if_threshold,
        lstm_threshold=adaptive_lstm_threshold,
    )
    labeled = labeled.where(pd.notnull(labeled), None)

    # Restore vendor from ingested df (same fix as /analyze)
    if "vendor" in df.columns and "case_id" in labeled.columns:
        vendor_map = df.groupby("case_id")["vendor"].first()
        labeled["supplier"] = labeled["case_id"].map(vendor_map)

    # 7. Process flow map (scoped to new batch)
    flow_map = build_process_flow_map(df, labeled)

    # 8. Upsert cases — track new vs updated
    case_rows = _prepare_case_rows(labeled)
    new_count, updated_count = await case_repository.upsert_cases(db, run_id, case_rows)
    await phase_repository.bulk_insert_phases(db, run_id, flow_map)

    # 9. Recompute run-level summary from DB totals (old + new)
    total_cases_db, anomalous_cases_db = await case_repository.get_total_counts(db, run_id)
    avg_proc = 0.0
    if "case_duration_hours" in labeled.columns:
        avg_proc = float(labeled["case_duration_hours"].mean() / 24.0)

    updated_summary = {
        "total_cases": total_cases_db,
        "anomalous_cases": anomalous_cases_db,
        "anomaly_rate": anomalous_cases_db / total_cases_db if total_cases_db > 0 else 0.0,
        "avg_processing_time_days": avg_proc,
        "delta_total_cases_pct": 0.0,
        "delta_anomalous_cases_pct": 0.0,
        "delta_anomaly_rate_pct": 0.0,
        "delta_avg_processing_time_pct": 0.0,
    }

    # 10. Update run record with new totals
    duration_ms = int((time.time() - start_ts) * 1000)
    await run_repository.update_run_results(db, run_id, updated_summary, duration_ms)

    # 11. Build response — new_anomalies = anomalies found in THIS batch only
    new_anomalies_df = labeled[labeled["anomaly_type"].notna()].sort_values(
        "severity_score", ascending=False
    ).head(50)

    new_anomaly_cases = []
    for _, row in new_anomalies_df.iterrows():
        supplier_val = row.get("supplier") if pd.notna(row.get("supplier")) else row.get("vendor")
        new_anomaly_cases.append({
            "case_id": str(row["case_id"]),
            "supplier": str(supplier_val) if pd.notna(supplier_val) else None,
            "amount": float(row.get("case_amount", 0.0)),
            "anomaly_type": str(row.get("anomaly_type")) if row.get("anomaly_type") else None,
            "severity_score": float(row.get("severity_score", 0.0)),
            "severity_label": row.get("severity_label", "Low"),
            "status": "Open",
            "detected_at": pd.Timestamp.now(tz="UTC"),
            "flags": {
                "price_mismatch": bool(row.get("price_mismatch", False)),
                "three_way_match_failure": bool(row.get("three_way_match_failure", False)),
                "maverick_buying": bool(row.get("maverick_buying", False)),
                "temporal_delay": bool(row.get("temporal_delay", False)),
                "duplicate_invoice": bool(row.get("duplicate_invoice", False)),
                "unauthorized_vendor": bool(row.get("unauthorized_vendor", False)),
                "quantity_variance": bool(row.get("quantity_variance", False)),
            },
        })

    real_time_feed = [
        {
            "case_id": c["case_id"],
            "supplier": c["supplier"],
            "anomaly_type": c["anomaly_type"],
            "amount": c["amount"],
            "severity_label": c["severity_label"],
            "detected_at": c["detected_at"],
        }
        for c in new_anomaly_cases[:10]
    ]

    return {
        "run_id": run_id,
        "appended_cases": n_cases,
        "updated_cases": updated_count,
        "new_cases": new_count,
        "new_anomalies": new_anomaly_cases,
        "updated_summary": updated_summary,
        "process_flow_map": flow_map,
        "real_time_feed": real_time_feed,
    }


def _stream_events_to_df(request: StreamRequest) -> pd.DataFrame:
    """
    Convert a StreamRequest (list of StreamEvent) into the canonical 25-column
    DataFrame that the ML pipeline expects — same schema as CSVIngester output.
    """
    rows = []
    for ev in request.events:
        rows.append({
            "case_id": ev.case_id,
            "activity": ev.activity,
            "timestamp": pd.Timestamp(ev.timestamp).tz_convert("UTC") if ev.timestamp.tzinfo else pd.Timestamp(ev.timestamp, tz="UTC"),
            "resource": ev.resource or "",
            "amount": ev.amount,
            "quantity": ev.quantity,
            "vendor": ev.vendor or "",
            # BPI-2019 / canonical attribute columns — fill defaults
            "case:Document Type": ev.document_type or "",
            "case:Spend area text": ev.spend_area or "",
            "case:Sub spend area text": "",
            "case:Spend classification text": "",
            "case:Source": "stream",
            "case:Company": ev.company or "",
            "case:Item Type": "",
            "case:Item Category": ev.item_category or "",
            "case:Name": ev.case_id,
            "case:GR-Based Inv. Verif.": False,
            "case:Goods Receipt": False,
            "case:Vendor": ev.vendor or "",
            "case:Purchasing Document": ev.case_id,
            "case:Item": "",
        })

    df = pd.DataFrame(rows)
    df = df.sort_values(["case_id", "timestamp"]).reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# Endpoint 1: JSON events (real-time streaming)
# ---------------------------------------------------------------------------

@router.post(
    "/runs/{run_id}/append",
    response_model=AppendResponse,
    summary="Append new events (JSON) to an existing run",
    description=(
        "Real-time streaming endpoint. Accepts a JSON body containing new P2P events, "
        "scores them through the full ML pipeline (Isolation Forest + LSTM Autoencoder), "
        "upserts results into the existing run, and returns only the newly detected anomalies "
        "together with the updated run-level summary. "
        "Events for an existing case_id update that case in place; "
        "new case_ids are appended. "
        "The run must be in 'completed' status."
    ),
    tags=["Real-Time Analysis"],
)
async def append_events_json(
    run_id: UUID,
    request: StreamRequest,
    db: AsyncSession = Depends(get_db),
) -> AppendResponse:
    start_ts = time.time()

    # Validate the run exists and is completed
    run = await run_repository.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")
    if run.status not in ("completed", "failed"):
        raise HTTPException(
            status_code=409,
            detail=f"Run {run_id} is in status '{run.status}'. "
                   "Only completed runs can be appended to.",
        )

    if not request.events:
        raise HTTPException(status_code=422, detail="events list must not be empty.")

    logger.info(
        {
            "event": "stream_append_started",
            "run_id": str(run_id),
            "incoming_events": len(request.events),
        }
    )

    try:
        df = _stream_events_to_df(request)
        return await _run_pipeline_and_append(run_id, df, db, start_ts)

    except IngestionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error(f"Stream append failed for run {run_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error during stream append.")


# ---------------------------------------------------------------------------
# Endpoint 2: File upload (batch real-time append)
# ---------------------------------------------------------------------------

@router.post(
    "/runs/{run_id}/append/file",
    response_model=AppendResponse,
    summary="Append a new file (CSV / XES / OCEL2) to an existing run",
    description=(
        "Batch real-time endpoint. Accepts a new event-log file, runs the full ML pipeline "
        "on it, and appends the results to the specified run. "
        "Use this when receiving periodic file drops that extend a live analysis run. "
        "The run must be in 'completed' status."
    ),
    tags=["Real-Time Analysis"],
)
async def append_events_file(
    run_id: UUID,
    file: UploadFile = File(...),
    file_type: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
) -> AppendResponse:
    start_ts = time.time()

    # Validate run
    run = await run_repository.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")
    if run.status not in ("completed", "failed"):
        raise HTTPException(
            status_code=409,
            detail=f"Run {run_id} is in status '{run.status}'. "
                   "Only completed runs can be appended to.",
        )

    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large.")
    await file.seek(0)

    logger.info(
        {
            "event": "file_append_started",
            "run_id": str(run_id),
            "file_name": file.filename,
            "file_size_bytes": len(content),
        }
    )

    try:
        detected_type = file_type or _detect_file_type(file.filename)
        ingester = _get_ingester(detected_type)
        df = ingester.ingest(file.file)
        return await _run_pipeline_and_append(run_id, df, db, start_ts)

    except IngestionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error(f"File append failed for run {run_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error during file append.")
