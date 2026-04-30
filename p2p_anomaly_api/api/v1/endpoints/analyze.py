"""
Endpoint for initiating event log analysis.
"""

import time
import logging
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.schemas.response import AnalysisResponse
from core.config import settings
from core.exceptions import UnsupportedFileTypeError, IngestionError
from db.repositories import (
    run_repository, event_log_repository, case_repository, phase_repository
)
from db.session import get_db
from features.case_features import build_case_features
from features import sequence_features
from ingestion.csv_ingester import CSVIngester
from ingestion.ocel2_ingester import OCEL2Ingester
from ingestion.xes_ingester import XESIngester
from models import isolation_forest, lstm_autoencoder
from scoring.labeler import apply_labels
from scoring.merger import merge_scores

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_event_log(
    file: UploadFile = File(...),
    file_type: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    start_time_ts = time.time()
    
    # 1. Validate file size
    content = await file.read()
    file_size = len(content)
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    await file.seek(0)

    # 2. Create analysis_run record
    detected_type = file_type or _detect_file_type(file.filename)
    run = await run_repository.create_run(db, file.filename, detected_type, file_size)
    run_id = run.run_id
    
    try:
        # 3. Update status → 'processing'
        await run_repository.update_run_status(db, run_id, "processing")
        
        # 4. Ingest file → canonical DataFrame
        ingester = _get_ingester(detected_type)
        df = ingester.ingest(file.file)
        
        # 5. Persist raw events to DB
        await event_log_repository.bulk_insert_events(db, run_id, df)
        
        # 6. Build IF case features (2117 cols)
        X_case = build_case_features(df)
        
        # 7. Build LSTM sequences
        df_events = sequence_features.prep_event_features(df)
        encoded   = lstm_autoencoder.encode_events(df_events)
        X_seq, case_ids, lengths = lstm_autoencoder.build_sequences(df_events, encoded)
        
        # 8. Run IF (pipeline: scaler → var_selector → IF)
        if_scores, if_labels = isolation_forest.predict_with_labels(X_case)
        
        # 9. Run LSTM (scores already capped inside score_sequences)
        lstm_scores = lstm_autoencoder.score_sequences(X_seq, lengths, case_ids)
        lstm_scores = lstm_autoencoder.assign_flags(lstm_scores)
        
        # 10. Build phase summary for 3-way match
        phase_summary = build_phase_summary(df)
        
        # 11. Fuse scores
        merged = merge_scores(X_case, if_scores, lstm_scores, phase_summary)
        
        # 12. Apply anomaly type labels and severity
        labeled = apply_labels(merged, df)
        # Clean NaN values for JSON/DB compatibility
        labeled = labeled.where(pd.notnull(labeled), None)
        
        # 12.5. Restore vendor data from original ingested DataFrame
        # This fixes the vendor preservation issue by directly mapping vendor from original data
        if "vendor" in df.columns and "case_id" in labeled.columns:
            # Create vendor mapping from original ingested data
            vendor_map = df.groupby("case_id")["vendor"].first()
            # Map vendor data to labeled results
            labeled["supplier"] = labeled["case_id"].map(vendor_map)
        
        # 13. Build process flow map
        flow_map = build_process_flow_map(df, labeled)
        
        # 14. Compute summary
        summary = _compute_summary(labeled)
        
        # 15. Persist results
        case_rows = _prepare_case_rows(labeled)
        await case_repository.bulk_insert_cases(db, run_id, case_rows)
        await phase_repository.bulk_insert_phases(db, run_id, flow_map)
        
        duration_ms = int((time.time() - start_time_ts) * 1000)
        await run_repository.update_run_results(db, run_id, summary, duration_ms)
        
        # 16. Return response
        return build_analysis_response(run_id, labeled, flow_map, summary)

    except Exception as e:
        logger.error(f"Analysis failed for run {run_id}: {str(e)}", exc_info=True)
        await run_repository.update_run_status(db, run_id, "failed", str(e))
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


def build_phase_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Identifies presence of P2P phases and computes missing 3-way steps.
    """
    def map_phase(activity: str) -> str:
        # Exact match first (OCEL2 activity names)
        EXACT_MAP = {
            'Approve Purchase Order':                   'Purchase Order Creation',
            'Create Purchase Order':                    'Purchase Order Creation',
            'Create Purchase Requisition':              'Purchase Requisition',
            'Approve Purchase Requisition':             'Purchase Requisition',
            'Delegate Purchase Requisition Approval':   'Purchase Requisition',
            'Create Goods Receipt':                     'Goods Receipt',
            'Create Invoice Receipt':                   'Invoice Verification',
            'Perform Two-Way Match':                    'Invoice Verification',
            'Create Request for Quotation':             'Purchase Requisition',
            'Execute Payment':                          'Payment Processing',
        }
        if activity in EXACT_MAP:
            return EXACT_MAP[activity]

        # Keyword fallback (BPI 2019 activity names)
        a = str(activity).lower()
        if 'requisition' in a:                                                      return 'Purchase Requisition'
        if 'purchase order' in a or 'srm' in a or 'order item' in a:               return 'Purchase Order Creation'
        if 'goods receipt' in a:                                                    return 'Goods Receipt'
        if 'invoice' in a or 'clear invoice' in a or 'vendor creates invoice' in a: return 'Invoice Verification'
        if 'payment' in a:                                                          return 'Payment Processing'
        return 'Other'

    case_groups = df.groupby("case_id")["activity"].unique()
    rows = []
    for case_id, activities in case_groups.items():
        phases = [map_phase(a) for a in activities]
        
        has_pr = any(p == 'Purchase Requisition' for p in phases)
        has_po = any(p == 'Purchase Order Creation' for p in phases)
        has_gr = any(p == 'Goods Receipt' for p in phases)
        has_inv = any(p == 'Invoice Verification' for p in phases)
        has_pay = any(p == 'Payment Processing' for p in phases)
        
        # 3-way match: PO, GR, INV
        missing_3way = 0
        if not has_po: missing_3way += 1
        if not has_gr: missing_3way += 1
        if not has_inv: missing_3way += 1
        
        rows.append({
            "case_id": case_id,
            "has_pr": int(has_pr),
            "has_po": int(has_po),
            "has_gr": int(has_gr),
            "has_inv": int(has_inv),
            "has_pay": int(has_pay),
            "missing_3way_steps": missing_3way
        })
    return pd.DataFrame(rows)


def build_process_flow_map(df: pd.DataFrame, results_df: pd.DataFrame) -> list:
    """
    Computes anomaly rates per process phase.
    """
    phases = df["activity"].unique()
    flow_map = []
    for phase in phases:
        phase_cases = df[df["activity"] == phase]["case_id"].unique()
        total_in_phase = len(phase_cases)
        anomalies_in_phase = len(results_df[
            (results_df["case_id"].isin(phase_cases)) & 
            (results_df["anomaly_type"].notna())
        ])
        flow_map.append({
            "phase": phase,
            "total_cases": total_in_phase,
            "anomalies": anomalies_in_phase,
            "anomaly_rate": anomalies_in_phase / total_in_phase if total_in_phase > 0 else 0
        })
    return flow_map


def _compute_summary(results_df: pd.DataFrame) -> dict:
    total_cases = len(results_df)
    anomalous_cases = len(results_df[results_df["anomaly_type"].notna()])
    
    # Check for duration column
    avg_proc = 0.0
    if "case_duration_hours" in results_df:
        avg_proc = results_df["case_duration_hours"].mean() / 24.0
    
    return {
        "total_cases": total_cases,
        "anomalous_cases": anomalous_cases,
        "anomaly_rate": anomalous_cases / total_cases if total_cases > 0 else 0,
        "avg_processing_time_days": float(avg_proc)
    }


def _prepare_case_rows(results_df: pd.DataFrame) -> list:
    rows = []
    for _, row in results_df.iterrows():
        case_row = {
            "case_id": str(row["case_id"]),
            "supplier": row.get("supplier"),
            "amount": float(row.get("case_amount", 0.0)),
            "anomaly_type": row.get("anomaly_type"),
            "severity_score": float(row.get("severity_score", 0.0)),
            "severity_label": row.get("severity_label", "Low"),
            "if_score": float(row.get("if_score", 0.0)),
            "lstm_case_score": float(row.get("lstm_case_score", 0.0)),
            "hybrid_score": float(row.get("hybrid_3way_score", 0.0)),
            "case_duration_hours": float(row.get("case_duration_hours", 0.0)),
            "off_hours_ratio": float(row.get("off_hours_ratio", 0.0)),
            "flags": {
                "price_mismatch": bool(row.get("price_mismatch", False)),
                "three_way_match_failure": bool(row.get("three_way_match_flag", False)),
                "maverick_buying": bool(row.get("maverick_buying_flag", False)),
                "temporal_delay": bool(row.get("temporal_delay_flag", False)),
                "duplicate_invoice": bool(row.get("duplicate_invoice", False)),
                "unauthorized_vendor": bool(row.get("unauthorized_vendor", False)),
                "quantity_variance": bool(row.get("quantity_variance", False)),
            }
        }
        rows.append(case_row)
    return rows


def build_analysis_response(run_id, labeled, flow_map, summary) -> dict:
    # Prepare top anomalies
    anomalies = labeled[labeled["anomaly_type"].notna()].sort_values("severity_score", ascending=False).head(50)
    
    anomaly_cases = []
    for _, row in anomalies.iterrows():
        anomaly_cases.append({
            "case_id": str(row["case_id"]),
            "supplier": row.get("supplier"),
            "amount": float(row.get("case_amount", 0.0)),
            "anomaly_type": row.get("anomaly_type"),
            "severity_score": float(row.get("severity_score", 0.0)),
            "severity_label": row.get("severity_label", "Low"),
            "status": "Open",
            "detected_at": pd.Timestamp.now(tz="UTC"),
            "flags": {
                "price_mismatch": bool(row.get("price_mismatch", False)),
                "three_way_match_failure": bool(row.get("three_way_match_flag", False)),
                "maverick_buying": bool(row.get("maverick_buying_flag", False)),
                "temporal_delay": bool(row.get("temporal_delay_flag", False)),
                "duplicate_invoice": bool(row.get("duplicate_invoice", False)),
                "unauthorized_vendor": bool(row.get("unauthorized_vendor", False)),
                "quantity_variance": bool(row.get("quantity_variance", False)),
            }
        })

    type_counts = labeled["anomaly_type"].value_counts().to_dict()
    sev_counts = labeled["severity_label"].value_counts().to_dict()
    
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
