

import time
import logging
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import require_roles, Identity
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
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(require_roles("admin", "analyst")),
):
    start_time_ts = time.time()

    content = await file.read()
    file_size = len(content)
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    await file.seek(0)

    detected_type = file_type or _detect_file_type(file.filename)
    run = await run_repository.create_run(db, file.filename, detected_type, file_size)
    run_id = run.run_id
    
    try:
                                         
        await run_repository.update_run_status(db, run_id, "processing")

        ingester = _get_ingester(detected_type)
        try:
            df = ingester.ingest(file.file)
        except ValueError as ve:

            raise IngestionError(str(ve))
        
        n_cases = df['case_id'].nunique()
        n_events = len(df)

        if n_cases > 10_000:
            raise IngestionError(
                f'Ingestion produced {n_cases} cases from {n_events} events. '
                f'This indicates a relationship resolution failure — '
                f'check that your file has purchase_order objects and '
                f'events with purchase_order qualifier in relationships.'
            )

        if n_events / max(n_cases, 1) < 2:
            logger.warning(
                f'Low events-per-case ratio: {n_events}/{n_cases} = '
                f'{n_events/n_cases:.1f}. Expected > 4. '
                f'Orphan events may have been created.'
            )

        await event_log_repository.bulk_insert_events(db, run_id, df)

        X_case = build_case_features(df)

        df_events = sequence_features.prep_event_features(df)
        encoded   = lstm_autoencoder.encode_events(df_events)
        X_seq, case_ids, lengths = lstm_autoencoder.build_sequences(df_events, encoded)

        if_scores, if_labels = isolation_forest.predict_with_labels(X_case)

        lstm_scores = lstm_autoencoder.score_sequences(X_seq, lengths, case_ids)
        lstm_scores = lstm_autoencoder.assign_flags(lstm_scores)

        phase_summary = build_phase_summary(df)

        merged = merge_scores(X_case, if_scores, lstm_scores, phase_summary)

        from scoring.merger import calibrate_thresholds
        adaptive_if_threshold, adaptive_lstm_threshold = calibrate_thresholds(
            if_scores          = if_scores,
            lstm_scores        = lstm_scores["lstm_case_score"].values,
            if_train_threshold = isolation_forest.get_threshold(),
            lstm_train_threshold = lstm_autoencoder.get_thresholds()["case"],
            target_anomaly_rate  = 0.05,                                 
        )

        labeled = apply_labels(merged, df, 
            if_threshold=adaptive_if_threshold,
            lstm_threshold=adaptive_lstm_threshold
        )
                                                    
        labeled = labeled.where(pd.notnull(labeled), None)

        if "vendor" in df.columns and "case_id" in labeled.columns:
                                                               
            vendor_map = df.groupby("case_id")["vendor"].first()
                                                
            labeled["supplier"] = labeled["case_id"].map(vendor_map)

        flow_map = build_process_flow_map(df, labeled)

        summary = await _compute_summary(labeled, db)

        case_rows = _prepare_case_rows(labeled)
        await case_repository.bulk_insert_cases(db, run_id, case_rows)
        await phase_repository.bulk_insert_phases(db, run_id, flow_map)
        
        duration_ms = int((time.time() - start_time_ts) * 1000)
        await run_repository.update_run_results(db, run_id, summary, duration_ms)

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

       
    def map_phase(activity: str) -> str:
                                                  
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

        a = str(activity).lower()
        if 'requisition' in a:                                                      return 'Purchase Requisition'
        if 'purchase order' in a or 'srm' in a or 'order item' in a:               return 'Purchase Order Creation'
        if 'goods receipt' in a:                                                    return 'Goods Receipt'
        if 'invoice' in a or 'clear invoice' in a or 'vendor creates invoice' in a: return 'Invoice Verification'
        if 'payment' in a:                                                          return 'Payment Processing'
        return 'Other'

    tmp = df.copy()
    tmp["phase"] = tmp["activity"].apply(map_phase)

    phase_sets   = tmp.groupby("case_id")["phase"].apply(
        lambda s: set(s.dropna().astype(str))
    )

    all_phases_in_batch = set(tmp["phase"].dropna().unique())

    check_pr  = "Purchase Requisition"    in all_phases_in_batch
    check_po  = "Purchase Order Creation" in all_phases_in_batch
    check_gr  = "Goods Receipt"           in all_phases_in_batch
    check_inv = "Invoice Verification"    in all_phases_in_batch
    check_pay = "Payment Processing"      in all_phases_in_batch

    rows = []
    for case_id, phases in phase_sets.items():
        has_pr  = int("Purchase Requisition"    in phases)
        has_po  = int("Purchase Order Creation" in phases)
        has_gr  = int("Goods Receipt"           in phases)
        has_inv  = int("Invoice Verification"    in phases)
        has_pay  = int("Payment Processing"      in phases)

        missing = 0
        if check_pr  and not has_pr:  missing += 1
        if check_po  and not has_po:  missing += 1
        if check_gr  and not has_gr:  missing += 1
        if check_inv and not has_inv:  missing += 1

        rows.append({
            "case_id":          case_id,
            "has_pr":           has_pr,
            "has_po":           has_po,
            "has_gr":           has_gr,
            "has_inv":           has_inv,
            "has_pay":           has_pay,
            "unique_phases":      len(phases),
            "missing_3way_steps": missing,
        })

    return pd.DataFrame(rows)

def build_process_flow_map(df: pd.DataFrame, results_df: pd.DataFrame) -> list:


    ACTIVITY_TO_PHASE = {
        'Create Request for Quotation':             'Create Request for Quotation',
        'Create Purchase Requisition':              'Create Request for Quotation',
        'Approve Purchase Requisition':             'Create Request for Quotation',
        'Delegate Purchase Requisition Approval':   'Create Request for Quotation',
        'Create Purchase Order':                    'Create Purchase Order',
        'Approve Purchase Order':                   'Approve Purchase Order',
        'Create Goods Receipt':                     'Create Goods Receipt',
        'Create Invoice Receipt':                   'Create Goods Receipt',
        'Perform Two-Way Match':                    'Create Goods Receipt',
        'Execute Payment':                          'Execute Payment',
    }

    process_flow = [
        'Create Request for Quotation',
        'Create Purchase Order',
        'Approve Purchase Order',
        'Create Goods Receipt',
        'Execute Payment',
    ]

    tmp = df.copy()
    tmp['_phase'] = tmp['activity'].map(ACTIVITY_TO_PHASE)
    case_phases = (
        tmp.dropna(subset=['_phase'])
           .groupby('case_id')['_phase']
           .apply(set)
    )

    phase_to_cases: dict[str, set] = {p: set() for p in process_flow}
    for case_id, phases in case_phases.items():
        for p in phases:
            if p in phase_to_cases:
                phase_to_cases[p].add(case_id)

    anomalous_ids = set(results_df.loc[results_df['anomaly_type'].notna(), 'case_id'])

    flow_map = []
    cumulative = None                                                           
    for phase in process_flow:
        phase_case_ids = phase_to_cases.get(phase, set())
        if not phase_case_ids:
            continue

        if cumulative is None:
            cumulative = phase_case_ids
        else:
            cumulative = cumulative & phase_case_ids

        total_in_phase  = len(cumulative)
        anomalies_in_phase = len(cumulative & anomalous_ids)

        flow_map.append({
            'phase':        phase,
            'total_cases':  total_in_phase,
            'anomalies':    anomalies_in_phase,
            'anomaly_rate': anomalies_in_phase / total_in_phase if total_in_phase > 0 else 0,
        })

    return flow_map

async def _compute_summary(results_df: pd.DataFrame, session=None) -> dict:
    total_cases = len(results_df)
    anomalous_cases = len(results_df[results_df["anomaly_type"].notna()])

    avg_proc = 0.0
    if "case_duration_hours" in results_df:
        avg_proc = results_df["case_duration_hours"].mean() / 24.0

    delta_total_cases_pct = 0.0
    delta_anomalous_cases_pct = 0.0
    delta_anomaly_rate_pct = 0.0
    delta_avg_processing_time_pct = 0.0

    if session is not None:
        from db.repositories.run_repository import get_latest_completed_run

        previous_run = await get_latest_completed_run(session)
        
        if previous_run is not None:
                                          
            if previous_run.total_cases and previous_run.total_cases > 0:
                delta_total_cases_pct = ((total_cases - previous_run.total_cases) / previous_run.total_cases) * 100
            
            if previous_run.anomalous_cases and previous_run.anomalous_cases > 0:
                delta_anomalous_cases_pct = ((anomalous_cases - previous_run.anomalous_cases) / previous_run.anomalous_cases) * 100
            
            if previous_run.anomaly_rate is not None and previous_run.anomaly_rate > 0:
                current_rate = anomalous_cases / total_cases if total_cases > 0 else 0
                delta_anomaly_rate_pct = ((current_rate - float(previous_run.anomaly_rate)) / float(previous_run.anomaly_rate)) * 100
            
            if previous_run.avg_processing_time_days is not None and previous_run.avg_processing_time_days > 0:
                delta_avg_processing_time_pct = ((avg_proc - float(previous_run.avg_processing_time_days)) / float(previous_run.avg_processing_time_days)) * 100
    
    return {
        "total_cases": total_cases,
        "anomalous_cases": anomalous_cases,
        "anomaly_rate": anomalous_cases / total_cases if total_cases > 0 else 0,
        "avg_processing_time_days": float(avg_proc),
        "delta_total_cases_pct": delta_total_cases_pct,
        "delta_anomalous_cases_pct": delta_anomalous_cases_pct,
        "delta_anomaly_rate_pct": delta_anomaly_rate_pct,
        "delta_avg_processing_time_pct": delta_avg_processing_time_pct
    }

def _format_anomaly_type(anomaly_type):
                                                                                  
    try:
        if pd.isna(anomaly_type) or anomaly_type is None:
            return None
        elif isinstance(anomaly_type, list):
                                              
            if len(anomaly_type) <= 2:
                if len(anomaly_type) == 1:
                    return anomaly_type[0]
                else:
                    return " | ".join(anomaly_type)
            else:
                                                                
                priority_order = [
                    "Three-Way Match Failure",
                    "Price Mismatch", 
                    "Duplicate Invoice",
                    "Unauthorized Vendor",
                    "Maverick Buying",
                    "Temporal Delay",
                    "Quantity Variance"
                ]

                filtered_types = [t for t in anomaly_type if t in priority_order]
                sorted_types = sorted(filtered_types, key=lambda x: priority_order.index(x))

                top_types = sorted_types[:2]
                return " | ".join(top_types)
        else:
            return anomaly_type
    except (ValueError, TypeError):
                                        
        if hasattr(anomaly_type, '__len__') and len(anomaly_type) > 0:
            if isinstance(anomaly_type, (list, tuple)):
                if len(anomaly_type) <= 2:
                    if len(anomaly_type) == 1:
                        return str(anomaly_type[0])
                    else:
                        return " | ".join(str(x) for x in anomaly_type)
                else:
                                                  
                    priority_order = [
                        "Three-Way Match Failure",
                        "Price Mismatch", 
                        "Duplicate Invoice",
                        "Unauthorized Vendor",
                        "Maverick Buying",
                        "Temporal Delay",
                        "Quantity Variance"
                    ]
                    
                    filtered_types = [str(x) for x in anomaly_type if str(x) in priority_order]
                    sorted_types = sorted(filtered_types, key=lambda x: priority_order.index(x))
                    top_types = sorted_types[:2]
                    return " | ".join(top_types)
            else:
                return str(anomaly_type)
        else:
            return None

def _prepare_case_rows(results_df: pd.DataFrame) -> list:
    rows = []
    for _, row in results_df.iterrows():
        supplier_val = row.get("supplier") if pd.notna(row.get("supplier")) else row.get("vendor")
        case_row = {
            "case_id": str(row["case_id"]),
            "supplier": str(supplier_val) if pd.notna(supplier_val) else None,
            "amount": float(row.get("case_amount", 0.0)),
            "anomaly_type": _format_anomaly_type(row.get("anomaly_type")),
            "severity_score": float(row.get("severity_score", 0.0)),
            "severity_label": row.get("severity_label", "Low"),
            "if_score": float(row.get("if_score", 0.0)),
            "lstm_case_score": float(row.get("lstm_case_score", 0.0)),
            "hybrid_score": float(row.get("hybrid_3way_score", 0.0)),
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

def build_analysis_response(run_id, labeled, flow_map, summary) -> dict:
                           
    anomalies = labeled[labeled["anomaly_type"].notna()].sort_values("severity_score", ascending=False).head(50)
    
    anomaly_cases = []
    for _, row in anomalies.iterrows():
        supplier_val = row.get("supplier") if pd.notna(row.get("supplier")) else row.get("vendor")
        anomaly_cases.append({
            "case_id": str(row["case_id"]),
            "supplier": str(supplier_val) if pd.notna(supplier_val) else None,
            "amount": float(row.get("case_amount", 0.0)),
            "anomaly_type": _format_anomaly_type(row.get("anomaly_type")),
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

    all_types = []
    for types in labeled["anomaly_type"]:
        try:
            if pd.notna(types) and types is not None:
                if isinstance(types, list):
                    all_types.extend(types)
                else:
                    all_types.append(types)
        except (ValueError, TypeError):
                                            
            if hasattr(types, '__len__') and len(types) > 0:
                if isinstance(types, (list, tuple)):
                    all_types.extend(types)
                else:
                    all_types.append(str(types))
    type_counts = pd.Series(all_types).value_counts().to_dict()
    sev_counts = labeled["severity_label"].value_counts().to_dict()
    
    sev_mapped = {
        "Critical (90-100%)": sev_counts.get("Critical", 0),
        "High (60-90%)": sev_counts.get("High", 0),
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

@router.get("/debug/ocel2-qualifiers")
async def debug_qualifiers(file: UploadFile):
    import json
    data    = json.load(file.file)
    events  = data.get('events', [])[:100]
    quals   = {}
    for ev in events:
        for r in ev.get('relationships', []):
            q = r.get('qualifier', '')
            quals[q] = quals.get(q, 0) + 1
    po_events = sum(
        1 for ev in events
        if any(r.get('qualifier','').lower() == 'purchase_order'
               for r in ev.get('relationships', []))
    )
    return {
        "qualifier_counts": quals,
        "events_with_po_link": po_events,
        "total_events_sampled": len(events),
        "expected_case_count": sum(
            1 for o in data.get('objects', [])
            if o.get('type') == 'purchase_order'
        )
    }
