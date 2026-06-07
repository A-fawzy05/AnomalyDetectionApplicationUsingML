
   
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import pandas as pd

from django.conf import settings
from django.db import transaction

from .models import EventLog, P2PCase, P2PEvent

logger = logging.getLogger(__name__)

P2P_ACTIVITY_ORDER = [
    "Purchase Requisition Creation",
    "Budget Approval",
    "Manager Approval",
    "Purchase Order Creation",
    "Goods Receipt Verification",
    "Invoice Processing",
    "Three-Way Matching",
    "Payment Authorization",
]

def _detect_format(filename: str) -> str:
                                                         
    lower = filename.lower()
    if lower.endswith(".xes"):
        return EventLog.Format.XES
    if lower.endswith(".json"):
        return EventLog.Format.OCEL
    return EventLog.Format.CSV

def _parse_xes(file_path: str) -> pd.DataFrame:
                                                                                                       
    try:
        import pm4py                 
        log = pm4py.read_xes(file_path)
        df = pm4py.convert_to_dataframe(log)
        df = df.rename(
            columns={
                "case:concept:name": "case_id",
                "concept:name": "activity",
                "time:timestamp": "timestamp",
                "org:resource": "resource",
            }
        )
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        return df
    except Exception as exc:
        logger.error({"event": "xes_parse_failed", "error": str(exc)})
        raise

def _parse_csv(file_path: str) -> pd.DataFrame:
                                                                                                                     
    df = pd.read_csv(file_path)
                            
    col_map = {}
    for col in df.columns:
        lower = col.lower().replace(" ", "_")
        if "case" in lower and "id" in lower:
            col_map[col] = "case_id"
        elif "activity" in lower or "event" in lower:
            col_map[col] = "activity"
        elif "timestamp" in lower or "time" in lower:
            col_map[col] = "timestamp"
        elif "resource" in lower or "user" in lower:
            col_map[col] = "resource"
        elif "supplier" in lower or "vendor" in lower:
            col_map[col] = "supplier"
    df = df.rename(columns=col_map)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    return df

def _parse_ocel(file_path: str) -> pd.DataFrame:
                                                                      
    import json

    with open(file_path, "r", encoding="utf-8") as f:
        ocel_data = json.load(f)

    rows = []

    events = ocel_data.get("events", {})
    objects = ocel_data.get("objects", {})

    obj_attrs: dict = {}
    obj_types: dict = {}
    if isinstance(objects, dict):
        for obj_id, obj_data in objects.items():
            raw = obj_data.get("attributes", {})
            if isinstance(raw, list):
                raw = {a.get("name", ""): a.get("value", "") for a in raw if isinstance(a, dict)}
            obj_attrs[obj_id] = raw
            obj_types[obj_id] = obj_data.get("type", "")
    elif isinstance(objects, list):
        for obj in objects:
            oid = obj.get("id", "")
            raw = obj.get("attributes", {})
            if isinstance(raw, list):
                raw = {a.get("name", ""): a.get("value", "") for a in raw if isinstance(a, dict)}
            obj_attrs[oid] = raw
            obj_types[oid] = obj.get("type", "")

    if isinstance(events, dict):
        event_iter = events.items()
    elif isinstance(events, list):
        event_iter = ((e.get("id", str(i)), e) for i, e in enumerate(events))
    else:
        return pd.DataFrame()

    for evt_id, evt in event_iter:
                                                                   
        activity = (
            evt.get("type")
            or evt.get("activity")
            or evt.get("ocel:activity", "Unknown")
        )
        timestamp_raw = (
            evt.get("time")
            or evt.get("timestamp")
            or evt.get("ocel:timestamp", "")
        )

        resource = evt.get("resource", "")
        if not resource:
            for attr in evt.get("attributes", []):
                if isinstance(attr, dict) and attr.get("name", "").lower() == "resource":
                    resource = str(attr.get("value", ""))
                    break

        related_objs = evt.get("relationships", evt.get("ocel:omap", []))

        case_id = evt_id
        supplier = ""
        if isinstance(related_objs, list):
            for rel in related_objs:
                obj_id = rel.get("objectId") or rel.get("id", "") if isinstance(rel, dict) else rel
                obj_id_str = str(obj_id)
                obj_type_str = str(obj_types.get(obj_id_str, "")).lower()

                if (
                    "purchase_order" in obj_id_str.lower()
                    or obj_type_str == "purchase_order"
                    or obj_type_str == "purchaseorder"
                    or obj_id_str.lower().startswith("po:")
                    or "_po_" in obj_id_str.lower()
                ):
                    case_id = obj_id_str

                attrs = obj_attrs.get(obj_id_str, {})
                if isinstance(attrs, dict):
                    for k, v in attrs.items():
                        if any(x in str(k).lower() for x in ["vendor", "supplier", "lifnr"]):
                            supplier = str(v)
                            break

        rows.append({
            "case_id": case_id,
            "activity": activity,
            "timestamp": timestamp_raw,
            "resource": resource,
            "supplier": supplier,
        })

    df = pd.DataFrame(rows)
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
        df = df.dropna(subset=["timestamp"])
    return df

def _dataframe_to_db(df: pd.DataFrame, event_log: EventLog) -> tuple[int, int]:

       
    sla_threshold = event_log.sla_threshold_days or getattr(
        settings, "SLA_DEFAULT_DAYS", 21
    )

    cases_created = 0
    events_created = 0

    if "case_id" not in df.columns:
        raise ValueError("DataFrame must have a 'case_id' column")

    for case_id_val, group in df.groupby("case_id", sort=False):
        group = group.sort_values("timestamp")
        start_ts = group["timestamp"].min()
        end_ts = group["timestamp"].max()

        if pd.notna(start_ts) and pd.notna(end_ts):
            cycle_time_days = (end_ts - start_ts).total_seconds() / 86400.0
        else:
            cycle_time_days = None

        sla_breached = (
            cycle_time_days is not None and cycle_time_days > sla_threshold
        )

        if pd.isna(end_ts) or end_ts == start_ts:
            case_status = P2PCase.CaseStatus.IN_PROGRESS
        elif sla_breached:
            case_status = P2PCase.CaseStatus.DELAYED
        else:
            case_status = P2PCase.CaseStatus.COMPLETED

        supplier = ""
        if "supplier" in group.columns:
            supplier_vals = group["supplier"].dropna()
            if not supplier_vals.empty:
                supplier = str(supplier_vals.iloc[0])

        p2p_case = P2PCase(
            id=uuid.uuid4(),
            case_id=str(case_id_val),
            event_log=event_log,
            supplier=supplier,
            start_date=start_ts.to_pydatetime() if pd.notna(start_ts) else datetime.now(timezone.utc),
            end_date=end_ts.to_pydatetime() if pd.notna(end_ts) else None,
            cycle_time_days=cycle_time_days,
            status=case_status,
            activity_count=len(group),
            sla_breached=sla_breached,
        )
        p2p_case.save()
        cases_created += 1

        prev_ts = None
        for _, row in group.iterrows():
            ts = row["timestamp"]
            duration = None
            if prev_ts is not None and pd.notna(ts):
                duration = (ts - prev_ts).total_seconds() / 86400.0
            prev_ts = ts if pd.notna(ts) else prev_ts

            skip_cols = {"case_id", "activity", "timestamp", "resource", "supplier"}
            extra_attrs = {
                k: v
                for k, v in row.items()
                if k not in skip_cols and pd.notna(v)
            }

            P2PEvent.objects.create(
                case=p2p_case,
                activity=str(row.get("activity", "Unknown")),
                timestamp=ts.to_pydatetime() if pd.notna(ts) else datetime.now(timezone.utc),
                resource=str(row.get("resource", "")) or None,
                duration_days=duration,
                attributes=extra_attrs,
            )
            events_created += 1

    return cases_created, events_created

def process_event_log(event_log_id: str) -> EventLog:

       
    from apps.performance.services.cycle_time import compute_cycle_time_metrics
    from apps.performance.services.bottleneck import compute_bottleneck_metrics
    from apps.performance.services.sla import compute_sla_metrics
    from apps.performance.services.throughput import compute_weekly_throughput
    from apps.variants.services.discovery import discover_variants
    from apps.variants.services.conformance import compute_conformance
    from apps.variants.services.severity import compute_anomaly_rates

    event_log = EventLog.objects.get(pk=event_log_id)
    event_log.status = EventLog.Status.PROCESSING
    event_log.save(update_fields=["status"])

    logger.info(
        {"event": "ingestion_started", "event_log_id": str(event_log_id), "format": event_log.format}
    )

    try:
        file_path = event_log.file.path

        if event_log.format == EventLog.Format.XES:
            df = _parse_xes(file_path)
        elif event_log.format == EventLog.Format.OCEL:
            df = _parse_ocel(file_path)
        else:
            df = _parse_csv(file_path)

        logger.info(
            {"event": "parse_complete", "event_log_id": str(event_log_id), "rows": len(df)}
        )

        with transaction.atomic():
            case_count, event_count = _dataframe_to_db(df, event_log)

        event_log.case_count = case_count
        event_log.event_count = event_count
        event_log.save(update_fields=["case_count", "event_count"])

        logger.info(
            {
                "event": "db_persist_complete",
                "event_log_id": str(event_log_id),
                "case_count": case_count,
                "event_count": event_count,
            }
        )

        with transaction.atomic():
            compute_cycle_time_metrics(event_log)
            compute_bottleneck_metrics(event_log)
            compute_sla_metrics(event_log)
            compute_weekly_throughput(event_log)
            variants = discover_variants(event_log)
            compute_conformance(event_log, variants)
            compute_anomaly_rates(event_log, variants)

        event_log.status = EventLog.Status.READY
        event_log.save(update_fields=["status"])

        logger.info({"event": "ingestion_complete", "event_log_id": str(event_log_id)})

    except Exception as exc:                                
        logger.exception(
            {"event": "ingestion_failed", "event_log_id": str(event_log_id), "error": str(exc)}
        )
        event_log.status = EventLog.Status.FAILED
        event_log.error_message = str(exc)
        event_log.save(update_fields=["status", "error_message"])

    return event_log
