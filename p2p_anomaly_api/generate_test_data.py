"""
Generate test data covering ALL anomaly types:
  1. price_mismatch          – price > 2*std from training mean
  2. three_way_match_failure – missing GR or Invoice step
  3. maverick_buying         – short process, no PO approval
  4. temporal_delay          – >30 day gap between events
  5. duplicate_invoice       – same vendor+amount twice
  6. unauthorized_vendor     – rare/unknown vendor name
  7. quantity_variance       – quantity far from expected

Produces:
  ocel2-p2p-anomaly-test.json  (OCEL2 format, ~50 cases, 7 anomaly groups)
  p2p-anomaly-test.csv         (flat CSV format, same cases)
"""

import json
import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT_DIR = Path("d:/BUE/Year 3/Graudation project/project/p2p_anomaly_api")

# ── Helpers ──────────────────────────────────────────────────────────────────

def ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def make_po_attrs(vendor: str, doc_type="Standard PO (NB)", grp="001", org="Global Bike Inc", release="Fully Approved"):
    base = "1970-01-01T00:00:00.000Z"
    return [
        {"name": "Vendor (EKKO-LIFNR)",                   "value": vendor,   "time": base},
        {"name": "Document Type (EKKO-BSART)",            "value": doc_type, "time": base},
        {"name": "Purchasing Group (EKKO-EKGRP)",         "value": grp,      "time": base},
        {"name": "Purchasing Organization (EKKO-EKORG)",  "value": org,      "time": base},
        {"name": "Release Status (EKKO-FRGZU)",           "value": release,  "time": base},
    ]

def make_mat_attrs(price: float, qty: int, material="BIKE_PART"):
    base = "1970-01-01T00:00:00.000Z"
    return [
        {"name": "Net Price (EKPO-NETPR)",    "value": price,    "time": base},
        {"name": "Quantity (EKPO-MENGE)",     "value": qty,      "time": base},
        {"name": "Material (EKPO-MATNR)",     "value": material, "time": base},
        {"name": "Plant (EKPO-WERKS)",        "value": "1000",   "time": base},
        {"name": "Delivery Date (EKPO-BEDAT)","value": "2024-01-01 00:00:00", "time": base},
    ]

def event(eid: str, etype: str, t: datetime, resource: str, rels: list) -> dict:
    return {
        "id": eid,
        "type": etype,
        "time": ts(t),
        "attributes": [
            {"name": "lifecycle", "value": "complete"},
            {"name": "resource",  "value": resource},
        ],
        "relationships": rels,
    }

def rel(obj_id: str, qualifier: str) -> dict:
    return {"objectId": obj_id, "qualifier": qualifier}

# ── Build OCEL2 objects + events ─────────────────────────────────────────────

objects = []
events  = []
ev_id   = 0
po_id   = 0
mat_id  = 0
quot_id = 0
gr_id   = 0
pay_id  = 0

BASE = datetime(2024, 1, 10, 9, 0, 0, tzinfo=timezone.utc)

def next_ev():
    global ev_id; ev_id += 1; return f"event:test_{ev_id}"
def next_po():
    global po_id; po_id += 1; return f"purchase_order:test_{po_id}"
def next_mat():
    global mat_id; mat_id += 1; return f"material:test_{mat_id}"
def next_quot():
    global quot_id; quot_id += 1; return f"quotation:test_{quot_id}"
def next_gr():
    global gr_id; gr_id += 1; return f"goods receipt:test_{gr_id}"
def next_pay():
    global pay_id; pay_id += 1; return f"payment:test_{pay_id}"


# ── CASE TYPE 1: NORMAL – 10 clean cases ─────────────────────────────────────
for i in range(10):
    t     = BASE + timedelta(days=i * 20)
    po    = next_po(); mat = next_mat(); q = next_quot(); gr = next_gr(); p = next_pay()
    vendor = "Precision Gears Ltd"
    price, qty = 15000.0, 1  # Matches __global__ mean in category_means.json

    objects.append({"id": po,  "type": "purchase_order", "attributes": make_po_attrs(vendor), "relationships": [{"objectId": mat, "qualifier": "Materials of Purchase Order"}, {"objectId": p, "qualifier": "order_pm"}]})
    objects.append({"id": mat, "type": "material",        "attributes": make_mat_attrs(price, qty), "relationships": []})
    objects.append({"id": q,   "type": "quotation",       "attributes": [], "relationships": [{"objectId": mat, "qualifier": "material"}, {"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": gr,  "type": "goods receipt",   "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": p,   "type": "payment",         "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})

    events += [
        event(next_ev(), "Create Request for Quotation",  t,            "Buyer",                   [rel(q, "quotation")]),
        event(next_ev(), "Create Purchase Requisition",   t+timedelta(hours=1), "Buyer",            [rel(q, "quotation"), rel(po, "purchase_order")]),
        event(next_ev(), "Create Purchase Order",         t+timedelta(hours=2), "Procurement Agent",[rel(po, "purchase_order")]),
        event(next_ev(), "Approve Purchase Order",        t+timedelta(hours=4), "Procurement Order Manager", [rel(po, "purchase_order"), rel(q, "quotation")]),
        event(next_ev(), "Create Goods Receipt",          t+timedelta(days=5),  "Warehouse Department",      [rel(po, "purchase_order"), rel(gr, "goods receipt")]),
        event(next_ev(), "Create Invoice Receipt",        t+timedelta(days=6),  "Accounts Payable",          [rel(po, "purchase_order")]),
        event(next_ev(), "Perform Two-Way Match",         t+timedelta(days=7),  "Accounts Payable",          [rel(po, "purchase_order")]),
        event(next_ev(), "Execute Payment",               t+timedelta(days=8),  "Finance Department",        [rel(po, "purchase_order"), rel(p, "payment")]),
    ]


# ── CASE TYPE 2: PRICE MISMATCH – 5 cases (price 10x normal) ─────────────────
for i in range(5):
    t     = BASE + timedelta(days=200 + i * 15)
    po    = next_po(); mat = next_mat(); q = next_quot(); gr = next_gr(); p = next_pay()
    vendor = "Precision Gears Ltd"
    price, qty = 1000000.0, 1   # huge deviation from 20k

    objects.append({"id": po,  "type": "purchase_order", "attributes": make_po_attrs(vendor), "relationships": [{"objectId": mat, "qualifier": "Materials of Purchase Order"}, {"objectId": p, "qualifier": "order_pm"}]})
    objects.append({"id": mat, "type": "material",        "attributes": make_mat_attrs(price, qty), "relationships": []})
    objects.append({"id": q,   "type": "quotation",       "attributes": [], "relationships": [{"objectId": mat, "qualifier": "material"}, {"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": gr,  "type": "goods receipt",   "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": p,   "type": "payment",         "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})

    events += [
        event(next_ev(), "Create Request for Quotation",  t,                    "Buyer",                     [rel(q, "quotation")]),
        event(next_ev(), "Create Purchase Order",         t+timedelta(hours=2), "Procurement Agent",         [rel(po, "purchase_order")]),
        event(next_ev(), "Approve Purchase Order",        t+timedelta(hours=4), "Procurement Order Manager", [rel(po, "purchase_order"), rel(q, "quotation")]),
        event(next_ev(), "Create Goods Receipt",          t+timedelta(days=5),  "Warehouse Department",      [rel(po, "purchase_order"), rel(gr, "goods receipt")]),
        event(next_ev(), "Create Invoice Receipt",        t+timedelta(days=6),  "Accounts Payable",          [rel(po, "purchase_order")]),
        event(next_ev(), "Execute Payment",               t+timedelta(days=7),  "Finance Department",        [rel(po, "purchase_order"), rel(p, "payment")]),
    ]


# ── CASE TYPE 3: THREE-WAY MATCH FAILURE – 5 cases (no GR) ──────────────────
for i in range(5):
    t     = BASE + timedelta(days=280 + i * 12)
    po    = next_po(); mat = next_mat(); q = next_quot(); p = next_pay()
    vendor = "Spoke Suppliers Inc"
    price, qty = 15000.0, 1

    objects.append({"id": po,  "type": "purchase_order", "attributes": make_po_attrs(vendor), "relationships": [{"objectId": mat, "qualifier": "Materials of Purchase Order"}, {"objectId": p, "qualifier": "order_pm"}]})
    objects.append({"id": mat, "type": "material",        "attributes": make_mat_attrs(price, qty), "relationships": []})
    objects.append({"id": q,   "type": "quotation",       "attributes": [], "relationships": [{"objectId": mat, "qualifier": "material"}, {"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": p,   "type": "payment",         "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})

    events += [
        event(next_ev(), "Create Request for Quotation", t,                    "Buyer",                     [rel(q, "quotation")]),
        event(next_ev(), "Create Purchase Order",        t+timedelta(hours=2), "Procurement Agent",         [rel(po, "purchase_order")]),
        event(next_ev(), "Approve Purchase Order",       t+timedelta(hours=4), "Procurement Order Manager", [rel(po, "purchase_order"), rel(q, "quotation")]),
        # NO Goods Receipt or Invoice — skipped directly to payment (Severe LSTM violation)
        event(next_ev(), "Execute Payment",              t+timedelta(days=3),  "Finance Department",        [rel(po, "purchase_order"), rel(p, "payment")]),
    ]


# ── CASE TYPE 4: MAVERICK BUYING – 5 cases (short, no approval) ──────────────
for i in range(5):
    t     = BASE + timedelta(days=350 + i * 8)
    po    = next_po(); mat = next_mat(); gr = next_gr(); p = next_pay()
    vendor = "Spoke Suppliers Inc"
    price, qty = 15000.0, 1

    objects.append({"id": po,  "type": "purchase_order", "attributes": make_po_attrs(vendor), "relationships": [{"objectId": mat, "qualifier": "Materials of Purchase Order"}, {"objectId": p, "qualifier": "order_pm"}]})
    objects.append({"id": mat, "type": "material",        "attributes": make_mat_attrs(price, qty), "relationships": []})
    objects.append({"id": gr,  "type": "goods receipt",   "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": p,   "type": "payment",         "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})

    events += [
        # Skips RFQ, PR, and Approval – goes straight PO → GR → Pay
        event(next_ev(), "Create Purchase Order",  t,                   "Procurement Agent",    [rel(po, "purchase_order")]),
        # Extreme Maverick: PO then Payment immediately. No approval, no receipt.
        event(next_ev(), "Execute Payment",        t+timedelta(hours=1), "Finance Department",   [rel(po, "purchase_order"), rel(p, "payment")]),
    ]


# ── CASE TYPE 5: TEMPORAL DELAY – 5 cases (60-day gap between PO & GR) ───────
for i in range(5):
    t     = BASE + timedelta(days=400 + i * 20)
    po    = next_po(); mat = next_mat(); q = next_quot(); gr = next_gr(); p = next_pay()
    vendor = "Tire Titans Ltd"
    price, qty = 15000.0, 1

    objects.append({"id": po,  "type": "purchase_order", "attributes": make_po_attrs(vendor), "relationships": [{"objectId": mat, "qualifier": "Materials of Purchase Order"}, {"objectId": p, "qualifier": "order_pm"}]})
    objects.append({"id": mat, "type": "material",        "attributes": make_mat_attrs(price, qty), "relationships": []})
    objects.append({"id": q,   "type": "quotation",       "attributes": [], "relationships": [{"objectId": mat, "qualifier": "material"}, {"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": gr,  "type": "goods receipt",   "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": p,   "type": "payment",         "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})

    events += [
        event(next_ev(), "Create Request for Quotation", t,                    "Buyer",                     [rel(q, "quotation")]),
        event(next_ev(), "Create Purchase Order",        t+timedelta(hours=2), "Procurement Agent",         [rel(po, "purchase_order")]),
        event(next_ev(), "Approve Purchase Order",       t+timedelta(hours=4), "Procurement Order Manager", [rel(po, "purchase_order"), rel(q, "quotation")]),
        event(next_ev(), "Create Goods Receipt",         t+timedelta(days=300),"Warehouse Department",      [rel(po, "purchase_order"), rel(gr, "goods receipt")]),  # 300-day delay!
        event(next_ev(), "Create Invoice Receipt",       t+timedelta(days=301),"Accounts Payable",          [rel(po, "purchase_order")]),
        event(next_ev(), "Execute Payment",              t+timedelta(days=302),"Finance Department",        [rel(po, "purchase_order"), rel(p, "payment")]),
    ]


# ── CASE TYPE 6: DUPLICATE INVOICE – 5 cases (invoice created twice) ─────────
for i in range(5):
    t     = BASE + timedelta(days=510 + i * 15)
    po    = next_po(); mat = next_mat(); q = next_quot(); gr = next_gr(); p = next_pay()
    vendor = "Bearing Barons Inc"
    price, qty = 15000.0, 1

    objects.append({"id": po,  "type": "purchase_order", "attributes": make_po_attrs(vendor), "relationships": [{"objectId": mat, "qualifier": "Materials of Purchase Order"}, {"objectId": p, "qualifier": "order_pm"}]})
    objects.append({"id": mat, "type": "material",        "attributes": make_mat_attrs(price, qty), "relationships": []})
    objects.append({"id": q,   "type": "quotation",       "attributes": [], "relationships": [{"objectId": mat, "qualifier": "material"}, {"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": gr,  "type": "goods receipt",   "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": p,   "type": "payment",         "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})

    events += [
        event(next_ev(), "Create Request for Quotation", t,                    "Buyer",                     [rel(q, "quotation")]),
        event(next_ev(), "Create Purchase Order",        t+timedelta(hours=2), "Procurement Agent",         [rel(po, "purchase_order")]),
        event(next_ev(), "Approve Purchase Order",       t+timedelta(hours=4), "Procurement Order Manager", [rel(po, "purchase_order"), rel(q, "quotation")]),
        event(next_ev(), "Create Goods Receipt",         t+timedelta(days=5),  "Warehouse Department",      [rel(po, "purchase_order"), rel(gr, "goods receipt")]),
        event(next_ev(), "Create Invoice Receipt",       t+timedelta(days=6),  "Accounts Payable",          [rel(po, "purchase_order")]),  # first invoice
        event(next_ev(), "Create Invoice Receipt",       t+timedelta(days=6, hours=1), "Accounts Payable",  [rel(po, "purchase_order")]),  # duplicate!
        event(next_ev(), "Create Invoice Receipt",       t+timedelta(days=6, hours=2), "Accounts Payable",  [rel(po, "purchase_order")]),  # triplicate!
        event(next_ev(), "Execute Payment",              t+timedelta(days=8),  "Finance Department",        [rel(po, "purchase_order"), rel(p, "payment")]),
    ]


# ── CASE TYPE 7: UNAUTHORIZED VENDOR – 5 cases ───────────────────────────────
for i in range(5):
    t     = BASE + timedelta(days=590 + i * 15)
    po    = next_po(); mat = next_mat(); q = next_quot(); gr = next_gr(); p = next_pay()
    vendor = f"ShadySupplier_{i+1} LLC"
    price, qty = 15000.0, 1

    objects.append({"id": po,  "type": "purchase_order", "attributes": make_po_attrs(vendor), "relationships": [{"objectId": mat, "qualifier": "Materials of Purchase Order"}, {"objectId": p, "qualifier": "order_pm"}]})
    objects.append({"id": mat, "type": "material",        "attributes": make_mat_attrs(price, qty), "relationships": []})
    objects.append({"id": q,   "type": "quotation",       "attributes": [], "relationships": [{"objectId": mat, "qualifier": "material"}, {"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": gr,  "type": "goods receipt",   "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": p,   "type": "payment",         "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})

    events += [
        event(next_ev(), "Create Request for Quotation", t,                    "Buyer",                     [rel(q, "quotation")]),
        event(next_ev(), "Create Purchase Order",        t+timedelta(hours=2), "Procurement Agent",         [rel(po, "purchase_order")]),
        event(next_ev(), "Approve Purchase Order",       t+timedelta(hours=4), "Procurement Order Manager", [rel(po, "purchase_order"), rel(q, "quotation")]),
        event(next_ev(), "Create Goods Receipt",         t+timedelta(days=5),  "Warehouse Department",      [rel(po, "purchase_order"), rel(gr, "goods receipt")]),
        event(next_ev(), "Create Invoice Receipt",       t+timedelta(days=6),  "Accounts Payable",          [rel(po, "purchase_order")]),
        event(next_ev(), "Execute Payment",              t+timedelta(days=7),  "Finance Department",        [rel(po, "purchase_order"), rel(p, "payment")]),
    ]


# ── CASE TYPE 8: QUANTITY VARIANCE – 5 cases (qty 10x expected) ──────────────
for i in range(5):
    t     = BASE + timedelta(days=670 + i * 15)
    po    = next_po(); mat = next_mat(); q = next_quot(); gr = next_gr(); p = next_pay()
    vendor = "Spoke Suppliers Inc"
    price, qty = 15000.0, 1000   # huge deviation from 1

    objects.append({"id": po,  "type": "purchase_order", "attributes": make_po_attrs(vendor), "relationships": [{"objectId": mat, "qualifier": "Materials of Purchase Order"}, {"objectId": p, "qualifier": "order_pm"}]})
    objects.append({"id": mat, "type": "material",        "attributes": make_mat_attrs(price, qty), "relationships": []})
    objects.append({"id": q,   "type": "quotation",       "attributes": [], "relationships": [{"objectId": mat, "qualifier": "material"}, {"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": gr,  "type": "goods receipt",   "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})
    objects.append({"id": p,   "type": "payment",         "attributes": [], "relationships": [{"objectId": po, "qualifier": "purchase_order"}]})

    events += [
        event(next_ev(), "Create Request for Quotation", t,                    "Buyer",                     [rel(q, "quotation")]),
        event(next_ev(), "Create Purchase Order",        t+timedelta(hours=2), "Procurement Agent",         [rel(po, "purchase_order")]),
        event(next_ev(), "Approve Purchase Order",       t+timedelta(hours=4), "Procurement Order Manager", [rel(po, "purchase_order"), rel(q, "quotation")]),
        event(next_ev(), "Create Goods Receipt",         t+timedelta(days=5),  "Warehouse Department",      [rel(po, "purchase_order"), rel(gr, "goods receipt")]),
        event(next_ev(), "Create Invoice Receipt",       t+timedelta(days=6),  "Accounts Payable",          [rel(po, "purchase_order")]),
        event(next_ev(), "Execute Payment",              t+timedelta(days=7),  "Finance Department",        [rel(po, "purchase_order"), rel(p, "payment")]),
    ]


# ── Write OCEL2 JSON ──────────────────────────────────────────────────────────
ocel2 = {
    "ocel:global-log": {"ocel:attribute-names": [], "ocel:object-types": ["purchase_order", "material", "quotation", "goods receipt", "payment"]},
    "objects": objects,
    "events":  events,
}
out_json = OUT_DIR / "ocel2-p2p-anomaly-test.json"
with open(out_json, "w") as f:
    json.dump(ocel2, f, indent=2)
print(f"Written: {out_json}  ({len(objects)} objects, {len(events)} events)")


# ── Build CSV rows from the same cases ───────────────────────────────────────
# Re-run ingester to get the canonical flat DataFrame, then dump as CSV
import sys
sys.path.insert(0, str(OUT_DIR))
from ingestion.ocel2_ingester import OCEL2Ingester

df = OCEL2Ingester().ingest(open(str(out_json)))
out_csv = OUT_DIR / "p2p-anomaly-test.csv"
df.to_csv(str(out_csv), index=False)
print(f"Written: {out_csv}  ({len(df)} rows, {df['case_id'].nunique()} cases)")
print("\nCase breakdown:")
print(df.groupby('case_id')['activity'].apply(lambda x: list(x.unique())).head(10))
