"""
Endpoint for initiating event log analysis.
"""

import time
import logging
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from p2p_anomaly_api.db.session import get_db
from p2p_anomaly_api.db.repositories import (
    run_repository, event_log_repository, case_repository, phase_repository
)
from p2p_anomaly_api.api.v1.schemas.response import AnalysisResponse
from p2p_anomaly_api.ingestion.csv_ingester import CSVIngester
from p2p_anomaly_api.ingestion.xes_ingester import XESIngester
from p2p_anomaly_api.ingestion.ocel2_ingester import OCEL2Ingester
from p2p_anomaly_api.features.case_features import build_case_features
from p2p_anomaly_api.features.sequence_features import build_sequences
from p2p_anomaly_api.models.isolation_forest import IsolationForestModel
from p2p_anomaly_api.models.lstm_autoencoder import LSTMAutoencoderModel
from p2p_anomaly_api.scoring.merger import merge_scores
from p2p_anomaly_api.scoring.labeler import apply_labels
from p2p_anomaly_api.core.config import settings
from p2p_anomaly_api.core.exceptions import UnsupportedFileTypeError, IngestionError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_event_log(
    file: UploadFile = File(...),
    file_type: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    start_time = time.time()
    
    # 1. Validate file size
    file_size = 0
    content = await file.read()
    file_size = len(content)
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    await file.seek(0) # Reset pointer

    # 2. Create analysis_run record
    detected_type = file_type or _detect_file_type(file.filename)
    run = await run_repository.create_run(db, file.filename, detected_type, file_size)
    
    try:
        # 3. Update status → 'processing'
        await run_repository.update_run_status(db, run.run_id, "processing")
        
        # 4. Ingest file
        ingester = _get_ingester(detected_type)
        df = ingester.ingest(file.file)
        
        # 5. Persist raw events
        await event_log_repository.bulk_insert_events(db, run.run_id, df)
        
        # 6. Feature Engineering
        case_feature_df = build_case_features(df)
        sequence_tensor = build_sequences(df, max_len=settings.LSTM_MAX_LEN)
        
        # 7. Model Prediction
        if_model = IsolationForestModel()
        lstm_model = LSTMAutoencoderModel()
        
        if_scores = if_model.predict(case_feature_df.values)
        lstm_scores_dict = lstm_model.predict(sequence_tensor)
        
        # 8. Merge and Label
        results_df = merge_scores(case_feature_df, if_scores, lstm_scores_dict)
        results_df = apply_labels(results_df, df)
        
        # 9. Compute summaries and flow map
        summary = _compute_summary(results_df)
        flow_map = _compute_flow_map(df, results_df)
        
        # 10. Persist results
        case_rows = _prepare_case_rows(results_df)
        await case_repository.bulk_insert_cases(db, run.run_id, case_rows)
        await phase_repository.bulk_insert_phases(db, run.run_id, flow_map)
        
        # 11. Finalize run
        duration_ms = int((time.time() - start_time) * 1000)
        await run_repository.update_run_results(db, run.run_id, summary, duration_ms)
        
        # 12. Build response
        return _build_analysis_response(run.run_id, summary, results_df, flow_map)

    except Exception as e:
        logger.error(f"Analysis failed for run {run.run_id}: {str(e)}", exc_info=True)
        await run_repository.update_run_status(db, run.run_id, "failed", str(e))
        if isinstance(e, IngestionError):
            raise HTTPException(status_code=422, detail=str(e))
        raise HTTPException(status_code=500, detail="Internal analysis error")


def _detect_file_type(filename: str) -> str:
    if filename.endswith(".csv"): return "csv"
    if filename.endswith(".xes"): return "xes"
    if filename.endswith(".json"): return "ocel2_json"
    raise UnsupportedFileTypeError(f"Unsupported file extension for {filename}")


def _get_ingester(file_type: str):
    if file_type == "csv": return CSVIngester()
    if file_type == "xes": return XESIngester()
    if file_type == "ocel2_json": return OCEL2Ingester()
    raise UnsupportedFileTypeError(f"Unsupported file type: {file_type}")


def _compute_summary(results_df: pd.DataFrame) -> dict:
    total_cases = len(results_df)
    anomalous_cases = len(results_df[results_df["anomaly_type"].notna()])
    avg_proc = results_df["case_duration_hours"].mean() / 24.0 if "case_duration_hours" in results_df else 0.0
    
    return {
        "total_cases": total_cases,
        "anomalous_cases": anomalous_cases,
        "anomaly_rate": anomalous_cases / total_cases if total_cases > 0 else 0,
        "avg_processing_time_days": float(avg_proc)
    }


def _compute_flow_map(df: pd.DataFrame, results_df: pd.DataFrame) -> list:
    # Group by activity (phase)
    phases = df["activity"].unique()
    flow_map = []
    
    for phase in phases:
        # Cases that went through this phase
        phase_cases = df[df["activity"] == phase]["case_id"].unique()
        total_in_phase = len(phase_cases)
        
        # Anomalies in these cases
        anomalies_in_phase = len(results_df[(results_df.index.isin(phase_cases)) & (results_df["anomaly_type"].notna())])
        
        flow_map.append({
            "phase": phase,
            "total_cases": total_in_phase,
            "anomalies": anomalies_in_phase,
            "anomaly_rate": anomalies_in_phase / total_in_phase if total_in_phase > 0 else 0
        })
    return flow_map


def _prepare_case_rows(results_df: pd.DataFrame) -> list:
    rows = []
    for cid, row in results_df.iterrows():
        case_row = {
            "case_id": str(cid),
            "supplier": row.get("vendor"),
            "amount": float(row.get("amount", 0.0)),
            "anomaly_type": row.get("anomaly_type"),
            "severity_score": float(row.get("severity_score", 0.0)),
            "severity_label": row.get("severity_label", "Low"),
            "if_score": float(row.get("if_score", 0.0)),
            "lstm_case_score": float(row.get("lstm_case_score", 0.0)),
            "hybrid_score": float(row.get("hybrid_score", 0.0)),
            "case_duration_hours": float(row.get("case_duration_hours", 0.0)),
            "off_hours_ratio": float(row.get("off_hours_ratio", 0.0)),
            "flags": {
                "price_mismatch": bool(row.get("price_mismatch", False)),
                "three_way_match_failure": bool(row.get("three_way_match_failure", False)),
                "maverick_buying": bool(row.get("maverick_buying", False)),
                "temporal_delay": bool(row.get("temporal_delay", False)),
                "duplicate_invoice": bool(row.get("duplicate_invoice", False)),
                "unauthorized_vendor": bool(row.get("unauthorized_vendor", False)),
                "quantity_variance": bool(row.get("quantity_variance", False)),
            }
        }
        rows.append(case_row)
    return rows


def _build_analysis_response(run_id, summary, results_df, flow_map) -> dict:
    # Prepare top anomalies for the feed
    anomalies = results_df[results_df["anomaly_type"].notna()].sort_values("severity_score", ascending=False).head(50)
    
    anomaly_cases = []
    for cid, row in anomalies.iterrows():
        anomaly_cases.append({
            "case_id": str(cid),
            "supplier": row.get("vendor"),
            "amount": float(row.get("amount", 0.0)),
            "anomaly_type": row.get("anomaly_type"),
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
            }
        })

    type_counts = results_df["anomaly_type"].value_counts().to_dict()
    sev_counts = results_df["severity_label"].value_counts().to_dict()
    # Map to expected labels
    sev_mapped = {
        "Critical (80-100%)": sev_counts.get("Critical", 0),
        "High (60-79%)": sev_counts.get("High", 0),
        "Medium (40-59%)": sev_counts.get("Medium", 0),
        "Low (0-39%)": sev_counts.get("Low", 0),
    }

    real_time_feed = []
    for item in anomaly_cases[:10]:
        real_time_feed.append({
            "case_id": item["case_id"],
            "supplier": item["supplier"],
            "anomaly_type": item["anomaly_type"],
            "amount": item["amount"],
            "severity_label": item["severity_label"],
            "detected_at": item["detected_at"]
        })

    return {
        "run_id": run_id,
        "summary": summary,
        "anomaly_cases": anomaly_cases,
        "anomaly_type_counts": {str(k): int(v) for k, v in type_counts.items()},
        "severity_counts": sev_mapped,
        "process_flow_map": flow_map,
        "real_time_feed": real_time_feed
    }
