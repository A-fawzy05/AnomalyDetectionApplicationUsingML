"""
Ingester for OCEL 2.0 JSON event logs.
"""

import json
import logging
from typing import Union, IO, Dict, Any
import pandas as pd
from p2p_anomaly_api.ingestion.base import BaseIngester
from p2p_anomaly_api.core.exceptions import IngestionError

logger = logging.getLogger(__name__)


class OCEL2Ingester(BaseIngester):
    def ingest(self, source: Union[str, IO]) -> pd.DataFrame:
        try:
            if hasattr(source, 'read'):
                data = json.load(source)
            else:
                with open(source, 'r') as f:
                    data = json.load(f)
        except json.JSONDecodeError as e:
            raise IngestionError(f"Invalid JSON format: {str(e)}")

        # Step 1 – Validate schema
        self._validate_ocel2(data)

        # Step 2 – Build object lookup
        objects = data.get("ocel:objects", {})
        object_lookup = {}
        for obj_id, obj_data in objects.items():
            object_lookup[obj_id] = {
                "type": obj_data.get("ocel:type"),
                "attrs": obj_data.get("ocel:ovmap", {})
            }

        # Step 3 – Flatten events
        events = data.get("ocel:events", {})
        rows = []

        for event_id, event_data in events.items():
            row = {
                "event_id": event_id,
                "activity": event_data.get("ocel:activity"),
                "timestamp": event_data.get("ocel:timestamp"),
            }
            
            # Extract vmap attributes
            vmap = event_data.get("ocel:vmap", {})
            row["resource"] = vmap.get("ocel:resource", vmap.get("resource"))
            row["amount"] = vmap.get("amount", 0.0)
            row["quantity"] = vmap.get("quantity", 0)

            # Find primary PO object
            omap = event_data.get("ocel:omap", [])
            po_object_id = None
            for obj_id in omap:
                obj_info = object_lookup.get(obj_id)
                if obj_info and obj_info["type"] == "Purchase Order":
                    po_object_id = obj_id
                    break
            
            if po_object_id:
                row["case_id"] = po_object_id
                # Merge PO object's ovmap attributes
                po_attrs = object_lookup[po_object_id]["attrs"]
                row.update(po_attrs)
            else:
                row["case_id"] = event_id
                logger.warning(f"Event {event_id} has no linked Purchase Order object. Using event_id as case_id.")

            rows.append(row)

        df = pd.DataFrame(rows)
        df = self.normalize_columns(df)
        
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
            
        return df

    def _validate_ocel2(self, data: Dict[str, Any]) -> None:
        global_log = data.get("ocel:global-log", {})
        if str(global_log.get("ocel:version")) != "2.0":
            raise IngestionError("ocel:global-log.ocel:version must equal '2.0'")
        
        if not data.get("ocel:events") or not data.get("ocel:objects"):
            raise IngestionError("ocel:events and ocel:objects must both be present and non-empty")
        
        events = data.get("ocel:events", {})
        for eid, edata in events.items():
            if "ocel:activity" not in edata or "ocel:timestamp" not in edata:
                raise IngestionError(f"Event {eid} must have ocel:activity and ocel:timestamp")
