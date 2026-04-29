"""
Ingester for OCEL 2.0 JSON event logs.
Supports both prefixed (ocel:events) and non-prefixed (events) schemas.
"""

import json
import logging
from typing import Union, IO, Dict, Any, List
import pandas as pd
from ingestion.base import BaseIngester
from core.exceptions import IngestionError

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

        # Step 1 – Extract main containers
        events_raw = data.get("ocel:events", data.get("events", []))
        objects_raw = data.get("ocel:objects", data.get("objects", []))

        # Convert lists to dicts if necessary
        if isinstance(events_raw, list):
            events = {e.get("id", f"e{i}"): e for i, e in enumerate(events_raw)}
        else:
            events = events_raw

        if isinstance(objects_raw, list):
            objects = {obj.get("id", f"obj{i}"): obj for i, obj in enumerate(objects_raw)}
        else:
            objects = objects_raw

        if not events:
            raise IngestionError("No events found in OCEL2 file")

        # Step 2 – Build object lookup
        object_lookup = {}
        for obj_id, obj_data in objects.items():
            # Support both ocel:type and type
            obj_type = obj_data.get("ocel:type", obj_data.get("type"))
            
            # Support ocel:ovmap or attributes list
            attrs = {}
            if "ocel:ovmap" in obj_data:
                attrs = obj_data["ocel:ovmap"]
            elif "attributes" in obj_data:
                # OCEL2 list format: [{"name": "...", "value": "...", "time": "..."}, ...]
                # We take the latest value or just a map of names to values
                for attr in obj_data["attributes"]:
                    attrs[attr["name"]] = attr["value"]
            
            object_lookup[obj_id] = {
                "type": obj_type,
                "attrs": attrs
            }

        # Step 3 – Flatten events
        rows = []
        for event_id, event_data in events.items():
            # Support ocel:activity/activity and ocel:timestamp/time
            activity = event_data.get("ocel:activity", event_data.get("type"))
            timestamp = event_data.get("ocel:timestamp", event_data.get("time"))
            
            row = {
                "event_id": event_id,
                "activity": activity,
                "timestamp": timestamp,
            }
            
            # Extract attributes from vmap or attributes list
            vmap = {}
            if "ocel:vmap" in event_data:
                vmap = event_data["ocel:vmap"]
            elif "attributes" in event_data:
                for attr in event_data["attributes"]:
                    vmap[attr["name"]] = attr["value"]
            
            row["resource"] = vmap.get("ocel:resource", vmap.get("resource"))
            row["amount"] = vmap.get("amount", vmap.get("Amount (DMBTR)", vmap.get("Debit Amount (BSEG-DMBTR)", 0.0)))
            row["quantity"] = vmap.get("quantity", vmap.get("Quantity (EKPO-MENGE)", 0))

            # Find primary PO object in omap or relationships
            omap = event_data.get("ocel:omap", [])
            if not omap and "relationships" in event_data:
                omap = [r["objectId"] for r in event_data["relationships"]]
            
            po_object_id = None
            for obj_id in omap:
                obj_info = object_lookup.get(obj_id)
                if obj_info and str(obj_info["type"]).lower() in ["purchase_order", "purchase order"]:
                    po_object_id = obj_id
                    break
            
            if po_object_id:
                row["case_id"] = po_object_id
                # Merge PO object's attributes
                po_attrs = object_lookup[po_object_id]["attrs"]
                row.update(po_attrs)
                # Map specific OCEL2 p2p attributes to canonical ones
                if "Vendor (EKKO-LIFNR)" in row:
                    row["vendor"] = row["Vendor (EKKO-LIFNR)"]
            else:
                # Fallback: find any related object to use as case_id
                if omap:
                    row["case_id"] = omap[0]
                else:
                    row["case_id"] = event_id
                    logger.warning(f"Event {event_id} has no linked objects. Using event_id as case_id.")

            rows.append(row)

        df = pd.DataFrame(rows)
        df = self.normalize_columns(df)
        
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
            
        return df
