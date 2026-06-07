
   
import logging
from io import IOBase
from typing import Union
from collections import defaultdict

import pandas as pd
import numpy as np

from ingestion.base import BaseIngester

logger = logging.getLogger(__name__)

MAX_EVENTS = 50_000                                               

class OCEL2Ingester(BaseIngester):

    def ingest(self, source: Union[str, IOBase]) -> pd.DataFrame:
        import json

        if isinstance(source, (str, bytes)):
            data = json.loads(source)
        else:
            data = json.load(source)

        self._validate(data)

        events_raw  = data.get('events',  [])
        objects_raw = data.get('objects', [])

        if len(events_raw) > MAX_EVENTS:
            raise ValueError(
                f'File has {len(events_raw)} events. '
                f'Max supported is {MAX_EVENTS}. '
                f'Split the file into smaller chunks.'
            )

        po_attrs   = {}
        mat_attrs  = {}

        obj_graph = defaultdict(list)

        for obj in objects_raw:
            obj_id   = obj.get('id', '')
            obj_type = obj.get('type', '')
            attrs    = self._extract_attrs(obj.get('attributes', []))
            rels     = obj.get('relationships', [])

            for r in rels:
                target_id = r.get('objectId')
                if target_id:
                    obj_graph[obj_id].append(target_id)
                    obj_graph[target_id].append(obj_id)

            if obj_type == 'purchase_order':
                po_attrs[obj_id] = {
                    'vendor':       attrs.get('Vendor (EKKO-LIFNR)', ''),
                    'doc_type':     attrs.get('Document Type (EKKO-BSART)', ''),
                    'purch_group':  attrs.get('Purchasing Group (EKKO-EKGRP)', ''),
                    'purch_org':    attrs.get('Purchasing Organization (EKKO-EKORG)', ''),
                    'release':      attrs.get('Release Status (EKKO-FRGZU)', ''),
                    'mat_ids':      [
                        r['objectId'] for r in rels
                        if 'material' in r.get('qualifier', '').lower()
                    ],
                }

            elif obj_type == 'material':
                price = self._to_float(attrs.get('Net Price (EKPO-NETPR)', 0))
                qty   = self._to_float(attrs.get('Quantity (EKPO-MENGE)', 0))
                mat_attrs[obj_id] = {
                    'price':    price,
                    'quantity': qty,
                    'amount':   price * qty if qty > 0 else price,
                }

        obj_to_pos = defaultdict(set)
        for obj_id in list(obj_graph.keys()):
            if obj_id.startswith('purchase_order:'):
                obj_to_pos[obj_id].add(obj_id)
                continue
                
            queue = [obj_id]
            visited = {obj_id}
            
            while queue:
                curr = queue.pop(0)
                if curr.startswith('purchase_order:'):
                    obj_to_pos[obj_id].add(curr)
                for neighbor in obj_graph[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

        rows = []
        no_po_count = 0

        for event in events_raw:
            event_id  = event.get('id', '')
            activity  = event.get('type', '')
            timestamp = event.get('time', '')

            ev_attrs = {
                a['name']: a['value']
                for a in event.get('attributes', [])
            }
            resource = ev_attrs.get('resource', ev_attrs.get('ocel:resource', ''))

            direct_pos = set(
                r['objectId'] for r in event.get('relationships', [])
                if r.get('objectId', '').startswith('purchase_order:')
            )
            
            po_ids = direct_pos

            if not po_ids:
                po_ids = set()
                for r in event.get('relationships', []):
                    related_obj = r.get('objectId', '')
                    if related_obj in obj_to_pos:
                        po_ids.update(obj_to_pos[related_obj])
            
            if not po_ids:
                no_po_count += 1
                continue                                          

            for po_id in po_ids:
                                            
                po = po_attrs.get(po_id, {})
                vendor      = po.get('vendor', '')
                doc_type    = po.get('doc_type', '')
                purch_group = po.get('purch_group', '')
                purch_org   = po.get('purch_org', '')
                release     = po.get('release', '')

                amount   = 0.0
                quantity = 0.0
                for mat_id in po.get('mat_ids', []):
                    mat = mat_attrs.get(mat_id, {})
                    if mat.get('amount', 0) > 0:
                        amount   = mat['amount']
                        quantity = mat['quantity']
                        break

                rows.append({
                    'case_id':    po_id,
                    'activity':   activity,
                    'timestamp':  timestamp,
                    'resource':   resource,
                    'amount':     amount,
                    'quantity':   quantity,
                    'vendor':     vendor or None,
                    'case:Document Type':             doc_type,
                    'case:Spend area text':           purch_group,
                    'case:Sub spend area text':       '',
                    'case:Spend classification text': release,
                    'case:Source':                    'OCEL2',
                    'case:Company':                   purch_org,
                    'case:Item Type':                 'Material',
                    'case:Item Category':             '',
                    'case:Name':                      po_id,
                    'case:GR-Based Inv. Verif.':      False,
                    'case:Goods Receipt':             False,
                    'case:Vendor':                    vendor or None,
                    'case:Purchasing Document':       po_id,
                    'case:Item':                      po.get('mat_ids', [''])[0] if po.get('mat_ids') else '',
                })

        if no_po_count > 0:
            logger.warning(
                f'OCEL2: Skipped {no_po_count} events with no resolvable purchase_order.'
            )

        if not rows:
            raise ValueError(
                'OCEL2 ingestion produced 0 rows. '
                'Check that the file has purchase_order objects and '
                'events link to them (directly or via other objects).'
            )

        df = pd.DataFrame(rows)
        df['timestamp'] = pd.to_datetime(
            df['timestamp'], utc=True, errors='coerce'
        )
        df = df.sort_values(['case_id', 'timestamp']).reset_index(drop=True)

        n_cases = df['case_id'].nunique()
        logger.info(
            f'OCEL2 ingested: {len(df)} events, {n_cases} unique PO cases '
            f'(skipped {no_po_count} orphan events)'
        )

        if n_cases > 5000:
            logger.error(
                f'Case count {n_cases} is suspiciously high. '
                f'Check relationship qualifier names in the file.'
            )

        return df

    def _validate(self, data: dict) -> None:
        if 'events' not in data:
            raise ValueError(
                "Invalid OCEL2: missing 'events' array. "
                "Expected OCEL2 array format."
            )
        if 'objects' not in data:
            raise ValueError("Invalid OCEL2: missing 'objects' array.")
        if len(data.get('events', [])) == 0:
            raise ValueError("Invalid OCEL2: 'events' array is empty.")

    def _extract_attrs(self, attributes: list) -> dict:

           
        result = {}
        seen   = {}                          

        for a in attributes:
            name  = a.get('name', '')
            value = a.get('value', '')
            time  = a.get('time', '9999')

            if value is None or str(value).strip() in ('', 'nan'):
                continue

            if name not in seen or time < seen[name]:
                seen[name]   = time
                result[name] = value

        return result

    @staticmethod
    def _to_float(val) -> float:
        try:
            return float(val)
        except (TypeError, ValueError):
            return 0.0
