"""
Business logic for event log ingestion.
Parses XES, CSV, and OCEL JSON files using pm4py,
then persists cases and events to PostgreSQL.
All metric precomputation is triggered synchronously here.
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import pandas as pd

from django.conf import settings
from django.db import transaction

from .models import EventLog, P2PCase, P2PEvent

logger = logging.getLogger(__name__)

# Standard P2P activity sequence for ordering / reference model
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
    """Infer the event log format from file extension."""
    lower = filename.lower()
    if lower.endswith(".xes"):
        return EventLog.Format.XES
    if lower.endswith(".json"):
        return EventLog.Format.OCEL
    return EventLog.Format.CSV


def _parse_xes(file_path: str) -> pd.DataFrame:
    """Parse an XES file into a flat DataFrame with columns: case_id, activity, timestamp, resource."""
    try:
        import pm4py  # noqa: PLC0415
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
    """Parse a flat CSV event log. Expects columns: case_id / Case ID, activity / Activity, timestamp / Timestamp."""
    df = pd.read_csv(file_path)
    # Normalise column names
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
    """Parse an OCEL 2.0 JSON file into a flat P2P event DataFrame."""
    import json

    with open(file_path, "r", encoding="utf-8") as f:
        ocel_data = json.load(f)

    rows = []

    # Support OCEL 2.0 structure
    events = ocel_data.get("events", {})
    objects = ocel_data.get("objects", {})

    # Build object attributes lookup
    obj_attrs: dict = {}
    if isinstance(objects, dict):
        for obj_id, obj_data in objects.items():
            obj_attrs[obj_id] = obj_data.get("attributes", {})
    elif isinstance(objects, list):
        for obj in objects:
            obj_attrs[obj.get("id", "")] = obj.get("attributes", {})

    if isinstance(events, dict):
        event_iter = events.items()
    elif isinstance(events, list):
        event_iter = ((e.get("id", str(i)), e) for i, e in enumerate(events))
    else:
        return pd.DataFrame()

    for evt_id, evt in event_iter:
        activity = evt.get("activity") or evt.get("ocel:activity", "Unknown")
        timestamp_raw = evt.get("timestamp") or evt.get("ocel:timestamp", "")
        related_objs = evt.get("relationships", evt.get("ocel:omap", []))

        # Find a purchase order object to use as the case_id
        case_id = evt_id
        supplier = ""
        if isinstance(related_objs, list):
            for rel in related_objs:
                if isinstance(rel, dict):
                    obj_id = rel.get("objectId") or rel.get("id", "")
                else:
                    obj_id = rel
                attrs = obj_attrs.get(obj_id, {})
                if isinstance(attrs, list):
                    attrs = {a.get("name", ""): a.get("value", "") for a in attrs if isinstance(a, dict)}
                if "Purchase Order" in str(obj_id) or "PO" in str(obj_id):
                    case_id = str(obj_id)
                if "supplier" in str(attrs).lower():
                    supplier = attrs.get("supplier") or attrs.get("Supplier", "")

        rows.append(
            {
                "case_id": case_id,
                "activity": activity,
                "timestamp": timestamp_raw,
                "resource": evt.get("resource", ""),
                "supplier": supplier,
            }
        )

    df = pd.DataFrame(rows)
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
        df = df.dropna(subset=["timestamp"])
    return df


def _dataframe_to_db(df: pd.DataFrame, event_log: EventLog) -> tuple[int, int]:
    """
    Persist parsed event log DataFrame to P2PCase and P2PEvent rows.
    Returns (case_count, event_count).
    """
    sla_threshold = event_log.sla_threshold_days or getattr(
        settings, "SLA_DEFAULT_DAYS", 21
    )

    cases_created = 0
    events_created = 0

    # Group by case_id
    if "case_id" not in df.columns:
        raise ValueError("DataFrame must have a 'case_id' column")

    for case_id_val, group in df.groupby("case_id", sort=False):
        group = group.sort_values("timestamp")
        start_ts = group["timestamp"].min()
        end_ts = group["timestamp"].max()

        # Cycle time in days
        if pd.notna(start_ts) and pd.notna(end_ts):
            cycle_time_days = (end_ts - start_ts).total_seconds() / 86400.0
        else:
            cycle_time_days = None

        # Determine SLA breach
        sla_breached = (
            cycle_time_days is not None and cycle_time_days > sla_threshold
        )

        # Determine case status
        if pd.isna(end_ts) or end_ts == start_ts:
            case_status = P2PCase.CaseStatus.IN_PROGRESS
        elif sla_breached:
            case_status = P2PCase.CaseStatus.DELAYED
        else:
            case_status = P2PCase.CaseStatus.COMPLETED

        # Supplier: try to grab from DataFrame column; fall back to empty string
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

            # Collect extra attributes from remaining columns
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
    """
    Main ingestion entry point called synchronously at upload time.
    Parses the uploaded file, persists cases/events, then triggers precomputation.
    """
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

        # Parse
        if event_log.format == EventLog.Format.XES:
            df = _parse_xes(file_path)
        elif event_log.format == EventLog.Format.OCEL:
            df = _parse_ocel(file_path)
        else:
            df = _parse_csv(file_path)

        logger.info(
            {"event": "parse_complete", "event_log_id": str(event_log_id), "rows": len(df)}
        )

        # Persist cases + events in a single transaction
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

        # Precompute all metrics synchronously
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

    except Exception as exc:  # pylint: disable=broad-except
        logger.exception(
            {"event": "ingestion_failed", "event_log_id": str(event_log_id), "error": str(exc)}
        )
        event_log.status = EventLog.Status.FAILED
        event_log.error_message = str(exc)
        event_log.save(update_fields=["status", "error_message"])

    return event_log
