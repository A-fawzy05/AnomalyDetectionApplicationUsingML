# P2P Process Mining Platform — Complete API Reference

Two backend services are documented here:

| Service | Base URL | Technology |
|---|---|---|
| **Anomaly Detection** | `http://localhost:8001/api/v1` | FastAPI |
| **Process Mining** | `http://localhost:8000/api/v1` | Django DRF |

---

## Table of Contents

### FastAPI — Anomaly Detection Service (`localhost:8001`)
1. [POST /analyze](#1-post-analyze)
2. [GET /cases](#2-get-cases)
3. [GET /runs](#3-get-runs)
4. [GET /runs/{run_id}](#4-get-runsrun_id)
5. [DELETE /runs/{run_id}](#5-delete-runsrun_id)
6. [DELETE /runs](#6-delete-runs)
7. [GET /health](#7-get-health)
8. [POST /runs/{run_id}/append](#8-post-runsrun_idappend)
9. [POST /runs/{run_id}/append/file](#9-post-runsrun_idappendfile)
10. [POST /runs/{run_id}/report](#10-post-runsrun_idreport)
11. [GET /debug/ocel2-qualifiers](#11-get-debugocel2-qualifiers)

### Django — Process Mining Service (`localhost:8000`)
12. [POST /event-logs/upload/](#12-post-event-logsupload)
13. [GET /event-logs/](#13-get-event-logs)
14. [GET /event-logs/{id}/status/](#14-get-event-logsidstatus)
15. [DELETE /event-logs/clear-all/](#15-delete-event-logsclear-all)
16. [GET /performance/summary/](#16-get-performancesummary)
17. [GET /performance/weekly-trends/](#17-get-performanceweekly-trends)
18. [GET /performance/activity-ranking/](#18-get-performanceactivity-ranking)
19. [GET /performance/process-flow/](#19-get-performanceprocess-flow)
20. [GET /performance/cases/](#20-get-performancecases)
21. [GET /performance/aggregate/](#21-get-performanceaggregate)
22. [GET /variants/summary/](#22-get-variantssummary)
23. [GET /variants/frequency-anomaly-scatter/](#23-get-variantsfrequency-anomaly-scatter)
24. [GET /variants/list/](#24-get-variantslist)
25. [GET /variants/{variant_id}/detail/](#25-get-variantsvariant_iddetail)
26. [GET /variants/anomaly-severity-distribution/](#26-get-variantsanomaly-severity-distribution)
27. [POST /variants/anomaly-severity/](#27-post-variantsanomaly-severity)
28. [POST /variants/aggregate/](#28-post-variantsaggregate)

---

# FastAPI — Anomaly Detection Service

Base URL: `http://localhost:8001/api/v1`

---

## 1. POST /analyze

**Purpose:** Upload a CSV, XES, or OCEL2 JSON event log and run the full anomaly detection pipeline (Isolation Forest + LSTM Autoencoder). Returns results synchronously.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Event log file (.csv, .xes, .json) |
| `file_type` | string | No | Override auto-detection: `csv`, `xes`, `ocel2_json` |

**Example request (curl):**
```bash
curl -X POST http://localhost:8001/api/v1/analyze \
  -F "file=@p2p-anomaly-test.csv" \
  -F "file_type=csv"
```

**Example response (200):**
```json
{
  "run_id": "c16e0342-ccd5-4715-8942-e6dd71c590e4",
  "summary": {
    "total_cases": 45,
    "anomalous_cases": 26,
    "anomaly_rate": 0.578,
    "avg_processing_time_days": 38.89,
    "delta_total_cases_pct": 0.0,
    "delta_anomalous_cases_pct": 0.0,
    "delta_anomaly_rate_pct": -0.004,
    "delta_avg_processing_time_pct": 0.00005
  },
  "anomaly_cases": [
    {
      "case_id": "purchase_order:test_11",
      "supplier": "Precision Gears Ltd",
      "amount": 1000000.0,
      "anomaly_type": "Price Mismatch",
      "severity_score": 1.0,
      "severity_label": "Critical",
      "status": "Open",
      "detected_at": "2026-05-28T17:05:35.619304Z",
      "flags": {
        "price_mismatch": true,
        "three_way_match_failure": false,
        "maverick_buying": false,
        "temporal_delay": false,
        "duplicate_invoice": false,
        "unauthorized_vendor": true,
        "quantity_variance": false
      }
    }
  ],
  "anomaly_type_counts": {
    "Three-Way Match Failure": 6,
    "Price Mismatch": 5,
    "Temporal Delay": 5,
    "Unauthorized Vendor": 5,
    "Quantity Variance": 5
  },
  "severity_counts": {
    "Critical (90-100%)": 6,
    "High (60-90%)": 12,
    "Medium (40-59%)": 11,
    "Low (0-39%)": 16
  },
  "process_flow_map": [
    {
      "phase": "Create Request for Quotation",
      "total_cases": 40,
      "anomalies": 21,
      "anomaly_rate": 0.525
    },
    {
      "phase": "Create Purchase Order",
      "total_cases": 40,
      "anomalies": 21,
      "anomaly_rate": 0.525
    },
    {
      "phase": "Create Goods Receipt",
      "total_cases": 35,
      "anomalies": 20,
      "anomaly_rate": 0.571
    },
    {
      "phase": "Execute Payment",
      "total_cases": 35,
      "anomalies": 20,
      "anomaly_rate": 0.571
    }
  ],
  "real_time_feed": [
    {
      "case_id": "purchase_order:test_11",
      "supplier": "Precision Gears Ltd",
      "anomaly_type": "Price Mismatch",
      "amount": 1000000.0,
      "severity_label": "Critical",
      "detected_at": "2026-05-28T17:05:35.619304Z"
    }
  ]
}
```

**Error responses:**
```json
{ "detail": "File too large" }          // 413
{ "detail": "<ingestion error message>" } // 422
{ "detail": "Internal analysis error" }  // 500
```

---

## 2. GET /cases

**Purpose:** List all cases for a completed run with filtering and pagination.

**Query parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `run_id` | UUID | Yes | — | Analysis run ID |
| `page` | int | No | 1 | Page number |
| `page_size` | int | No | 50 | Max 100 |
| `anomaly_type` | string | No | — | Filter by anomaly type (e.g. `Price Mismatch`) |
| `severity_label` | string | No | — | `Critical`, `High`, `Medium`, `Low` |
| `status` | string | No | — | `Open`, `Investigating`, `Resolved`, `False Positive` |
| `supplier` | string | No | — | Exact supplier name match |

**Example request:**
```
GET http://localhost:8001/api/v1/cases?run_id=c16e0342-ccd5-4715-8942-e6dd71c590e4&severity_label=Critical&page=1&page_size=10
```

**Example response (200):**
```json
{
  "items": [
    {
      "case_id": "purchase_order:test_11",
      "supplier": "Precision Gears Ltd",
      "amount": 1000000.0,
      "anomaly_type": "Price Mismatch",
      "severity_score": 1.0,
      "severity_label": "Critical",
      "status": "Open",
      "detected_at": "2026-05-28T17:05:35.619Z",
      "flags": {
        "price_mismatch": true,
        "three_way_match_failure": false,
        "maverick_buying": false,
        "temporal_delay": false,
        "duplicate_invoice": false,
        "unauthorized_vendor": true,
        "quantity_variance": false
      }
    }
  ],
  "total": 6,
  "page": 1,
  "page_size": 10
}
```

---

## 3. GET /runs

**Purpose:** List all analysis runs (most recent first).

**Query parameters:**

| Param | Type | Required | Default |
|---|---|---|---|
| `page` | int | No | 1 |
| `page_size` | int | No | 10 (max 50) |

**Example request:**
```
GET http://localhost:8001/api/v1/runs?page=1&page_size=5
```

**Example response (200):**
```json
[
  {
    "run_id": "c16e0342-ccd5-4715-8942-e6dd71c590e4",
    "created_at": "2026-05-28T17:05:30.000Z",
    "file_name": "p2p-anomaly-test.csv",
    "file_type": "csv",
    "total_cases": 45,
    "anomalous_cases": 26,
    "status": "completed",
    "duration_ms": 4321
  }
]
```

---

## 4. GET /runs/{run_id}

**Purpose:** Retrieve full analysis results for a completed run.

**Path parameter:** `run_id` — UUID of the run

**Example request:**
```
GET http://localhost:8001/api/v1/runs/c16e0342-ccd5-4715-8942-e6dd71c590e4
```

**Example response (200):** Same schema as `POST /analyze` response (AnalysisResponse).

**Error responses:**
```json
{ "detail": "Run not found" }               // 404
{ "detail": "Run status is processing" }    // 400
```

---

## 5. DELETE /runs/{run_id}

**Purpose:** Delete a single run and all its associated data (cases, flags, events, phases).

**Example request:**
```
DELETE http://localhost:8001/api/v1/runs/c16e0342-ccd5-4715-8942-e6dd71c590e4
```

**Example response (200):**
```json
{
  "message": "Run c16e0342-ccd5-4715-8942-e6dd71c590e4 deleted successfully"
}
```

**Error responses:**
```json
{ "detail": "Run not found" }  // 404
```

---

## 6. DELETE /runs

**Purpose:** Delete ALL runs and all data. Irreversible.

**Example request:**
```
DELETE http://localhost:8001/api/v1/runs
```

**Example response (200):**
```json
{
  "message": "Deleted 3 runs successfully"
}
```

---

## 7. GET /health

**Purpose:** Check service health, database connectivity, and ML model status.

**Example request:**
```
GET http://localhost:8001/api/v1/health
```

**Example response (200):**
```json
{
  "status": "ok",
  "db_connected": true,
  "models_loaded": true,
  "version": "1.0.0"
}
```

---

## 8. POST /runs/{run_id}/append

**Purpose:** Real-time streaming — append new JSON events to an existing completed run. Runs the full ML pipeline on the new batch and upserts results.

**Path parameter:** `run_id` — must be a completed run

**Request:** `application/json`

```json
{
  "events": [
    {
      "case_id": "purchase_order:new_101",
      "activity": "Create Purchase Order",
      "timestamp": "2026-05-28T14:00:00Z",
      "resource": "Buyer",
      "amount": 950000.0,
      "quantity": 1.0,
      "vendor": "ShadyNewVendor LLC",
      "document_type": null,
      "spend_area": null,
      "company": null,
      "item_category": null
    },
    {
      "case_id": "purchase_order:new_101",
      "activity": "Execute Payment",
      "timestamp": "2026-05-28T16:00:00Z",
      "resource": "Finance",
      "amount": 950000.0,
      "quantity": 1.0,
      "vendor": "ShadyNewVendor LLC"
    }
  ]
}
```

**Field reference for each event:**

| Field | Type | Required | Description |
|---|---|---|---|
| `case_id` | string | Yes | Procurement case identifier |
| `activity` | string | Yes | Activity/event name |
| `timestamp` | datetime | Yes | ISO 8601 with timezone |
| `resource` | string | No | User/system performing the activity |
| `amount` | float | No | Transaction amount (default 0.0) |
| `quantity` | float | No | Item quantity (default 1.0) |
| `vendor` | string | No | Vendor/supplier name |
| `document_type` | string | No | ERP document type |
| `spend_area` | string | No | Spend category |
| `company` | string | No | Company code |
| `item_category` | string | No | Item category |

**Example response (200):**
```json
{
  "run_id": "c16e0342-ccd5-4715-8942-e6dd71c590e4",
  "appended_cases": 1,
  "new_cases": 1,
  "updated_cases": 0,
  "new_anomalies": [
    {
      "case_id": "purchase_order:new_101",
      "supplier": "ShadyNewVendor LLC",
      "amount": 950000.0,
      "anomaly_type": "Unauthorized Vendor",
      "severity_score": 0.87,
      "severity_label": "High",
      "status": "Open",
      "detected_at": "2026-05-29T10:00:00Z",
      "flags": {
        "price_mismatch": false,
        "three_way_match_failure": false,
        "maverick_buying": true,
        "temporal_delay": false,
        "duplicate_invoice": false,
        "unauthorized_vendor": true,
        "quantity_variance": false
      }
    }
  ],
  "updated_summary": {
    "total_cases": 46,
    "anomalous_cases": 27,
    "anomaly_rate": 0.587,
    "avg_processing_time_days": 2.0,
    "delta_total_cases_pct": 0.0,
    "delta_anomalous_cases_pct": 0.0,
    "delta_anomaly_rate_pct": 0.0,
    "delta_avg_processing_time_pct": 0.0
  },
  "process_flow_map": [
    {
      "phase": "Create Purchase Order",
      "total_cases": 1,
      "anomalies": 1,
      "anomaly_rate": 1.0
    }
  ],
  "real_time_feed": [
    {
      "case_id": "purchase_order:new_101",
      "supplier": "ShadyNewVendor LLC",
      "anomaly_type": "Unauthorized Vendor",
      "amount": 950000.0,
      "severity_label": "High",
      "detected_at": "2026-05-29T10:00:00Z"
    }
  ]
}
```

**Error responses:**
```json
{ "detail": "Run c16e0342... not found." }                            // 404
{ "detail": "Run c16e0342... is in status 'processing'. ..." }       // 409
{ "detail": "events list must not be empty." }                        // 422
```

---

## 9. POST /runs/{run_id}/append/file

**Purpose:** Batch real-time append — upload a new CSV/XES/OCEL2 file and append its results to an existing run.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Event log file (.csv, .xes, .json) |
| `file_type` | string | No | Override: `csv`, `xes`, `ocel2_json` |

**Example request (curl):**
```bash
curl -X POST http://localhost:8001/api/v1/runs/c16e0342-ccd5-4715-8942-e6dd71c590e4/append/file \
  -F "file=@new-batch.csv"
```

**Example response (200):** Same schema as `POST /runs/{run_id}/append`.

---

## 10. POST /runs/{run_id}/report

**Purpose:** Publish the run's full analysis to Kafka topic `p2p.reports`. n8n consumes it, calls DeepSeek to generate AI-powered insights, creates a PDF, and sends it to the user's Telegram.

**Path parameter:** `run_id` — must be a completed run

**Request:** `application/json`

```json
{
  "telegram_phone": "+201234567890",
  "user_name": "Ahmed",
  "min_severity": "Medium"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `telegram_phone` | string | Yes | User's Telegram phone/chat_id |
| `user_name` | string | Yes | Display name in the PDF |
| `min_severity` | string | No | Minimum severity to include: `Low` (default), `Medium`, `High`, `Critical` |

**Example response (200):**
```json
{
  "run_id": "c16e0342-ccd5-4715-8942-e6dd71c590e4",
  "kafka_topic": "p2p.reports",
  "message": "Report queued successfully. You will receive a PDF on Telegram (+201234567890) shortly.",
  "telegram_phone": "+201234567890"
}
```

**Error responses:**
```json
{ "detail": "Run c16e0342... not found." }                        // 404
{ "detail": "Run c16e0342... is in status 'failed'. ..." }       // 409
{ "detail": "Kafka producer unavailable: ..." }                    // 503
```

---

## 11. GET /debug/ocel2-qualifiers

**Purpose:** Debug helper — inspect the qualifier types in an OCEL2 file to diagnose relationship resolution issues.

**Request:** `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `file` | File | Yes — OCEL2 JSON |

**Example response (200):**
```json
{
  "qualifier_counts": {
    "purchase_order": 150,
    "material": 80,
    "invoice": 40
  },
  "events_with_po_link": 120,
  "total_events_sampled": 100,
  "expected_case_count": 45
}
```

---

# Django — Process Mining Service

Base URL: `http://localhost:8000/api/v1`

---

## 12. POST /event-logs/upload/

**Purpose:** Upload a CSV, XES, or OCEL JSON event log. Synchronously processes all mining metrics (variants, bottlenecks, conformance, SLA, weekly trends) before returning.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | `.csv`, `.xes`, or `.json` |
| `name` | string | Yes | Human-readable log name |
| `sla_threshold_days` | int | No | SLA threshold (default 21 days) |

**Example request (curl):**
```bash
curl -X POST http://localhost:8000/api/v1/event-logs/upload/ \
  -F "file=@p2p-anomaly-test.csv" \
  -F "name=P2P Test Dataset May 2026" \
  -F "sla_threshold_days=21"
```

**Example response (200):**
```json
{
  "id": "8982f441-2bfc-4876-9bcc-5379d84c71c8",
  "name": "P2P Test Dataset May 2026",
  "format": "CSV",
  "uploaded_at": "2026-05-28T17:00:00Z",
  "status": "READY",
  "case_count": 45,
  "event_count": 312
}
```

**Error responses:**
```json
{ "error": "VALIDATION_ERROR", "message": "...", "status": 400 }
```

---

## 13. GET /event-logs/

**Purpose:** List all uploaded event logs, newest first.

**Example request:**
```
GET http://localhost:8000/api/v1/event-logs/
```

**Example response (200):**
```json
[
  {
    "id": "8982f441-2bfc-4876-9bcc-5379d84c71c8",
    "name": "P2P Test Dataset May 2026",
    "format": "CSV",
    "uploaded_at": "2026-05-28T17:00:00Z",
    "status": "READY",
    "case_count": 45,
    "event_count": 312
  }
]
```

---

## 14. GET /event-logs/{id}/status/

**Purpose:** Poll the processing status of a specific event log.

**Path parameter:** `id` — UUID of the event log

**Example request:**
```
GET http://localhost:8000/api/v1/event-logs/8982f441-2bfc-4876-9bcc-5379d84c71c8/status/
```

**Example response (200):**
```json
{
  "id": "8982f441-2bfc-4876-9bcc-5379d84c71c8",
  "status": "READY",
  "case_count": 45,
  "event_count": 312
}
```

**Possible status values:** `PENDING` → `PROCESSING` → `READY` or `FAILED`

---

## 15. DELETE /event-logs/clear-all/

**Purpose:** ⚠️ Development/testing only. Deletes ALL data from the database (event logs, cases, events, variants, metrics, anomaly severities).

**Example request:**
```
DELETE http://localhost:8000/api/v1/event-logs/clear-all/
```

**Example response (200):**
```json
{
  "message": "All data has been cleared from the database"
}
```

---

## 16. GET /performance/summary/

**Purpose:** Top-level KPI cards for the Performance Analysis Dashboard.

**Query parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `event_log_id` | UUID | Yes | — | Event log to analyse |
| `period` | string | No | `7d` | `7d`, `30d`, `90d` |

**Example request:**
```
GET http://localhost:8000/api/v1/performance/summary/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8
```

**Example response (200):**
```json
{
  "average_cycle_time": {
    "value": 18.5,
    "unit": "days",
    "change_pct": null,
    "trend": "neutral"
  },
  "processing_throughput": {
    "value": 45,
    "unit": "cases/total",
    "change_pct": null,
    "trend": "neutral"
  },
  "bottleneck_count": {
    "value": 2,
    "unit": "activities",
    "change_pct": null,
    "trend": "neutral"
  },
  "sla_compliance_rate": {
    "value": 62.2,
    "unit": "%",
    "change_pct": null,
    "trend": "neutral"
  },
  "activity_duration_variance": {
    "value": 34.2,
    "unit": "%",
    "change_pct": null,
    "trend": "neutral"
  },
  "process_efficiency_score": {
    "value": 78.5,
    "unit": "/100",
    "change_pct": null,
    "trend": "neutral"
  }
}
```

---

## 17. GET /performance/weekly-trends/

**Purpose:** Weekly cycle time and throughput data for the trend chart.

**Query parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `event_log_id` | UUID | Yes | — | |
| `weeks` | int | No | 7 | Number of weeks to return |
| `include_benchmark` | bool | No | `true` | Include industry benchmark line |

**Example request:**
```
GET http://localhost:8000/api/v1/performance/weekly-trends/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8&weeks=4&include_benchmark=true
```

**Example response (200):**
```json
{
  "weeks": [
    {
      "label": "Week 1",
      "week_start": "2026-01-05",
      "throughput_cases": 12,
      "avg_cycle_time_days": 23.1,
      "industry_benchmark_days": 19.0
    },
    {
      "label": "Week 2",
      "week_start": "2026-01-12",
      "throughput_cases": 10,
      "avg_cycle_time_days": 21.4,
      "industry_benchmark_days": 19.0
    }
  ],
  "benchmark_enabled": true
}
```

---

## 18. GET /performance/activity-ranking/

**Purpose:** Activities sorted by average duration descending with bottleneck flags and remediation recommendations.

**Query parameters:**

| Param | Type | Required | Default |
|---|---|---|---|
| `event_log_id` | UUID | Yes | — |
| `limit` | int | No | 10 |

**Example request:**
```
GET http://localhost:8000/api/v1/performance/activity-ranking/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8&limit=5
```

**Example response (200):**
```json
{
  "activities": [
    {
      "rank": 1,
      "activity_name": "Create Invoice Receipt",
      "avg_duration_days": 15.3,
      "min_duration_days": 1.0,
      "max_duration_days": 27.4,
      "variance_pct": 67.3,
      "is_bottleneck": true,
      "bottleneck_severity": "high",
      "recommendation": "This activity is a critical bottleneck. Review resource allocation and automation opportunities."
    },
    {
      "rank": 2,
      "activity_name": "Approve Purchase Order",
      "avg_duration_days": 8.7,
      "min_duration_days": 2.1,
      "max_duration_days": 18.5,
      "variance_pct": 45.2,
      "is_bottleneck": true,
      "bottleneck_severity": "medium",
      "recommendation": "Monitor this activity closely and consider process redesign."
    }
  ]
}
```

---

## 19. GET /performance/process-flow/

**Purpose:** Full ordered P2P stage list with severity color coding for the bottleneck heatmap.

**Query parameters:**

| Param | Type | Required |
|---|---|---|
| `event_log_id` | UUID | Yes |

**Example request:**
```
GET http://localhost:8000/api/v1/performance/process-flow/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8
```

**Example response (200):**
```json
{
  "stages": [
    {
      "step": 1,
      "activity_name": "Purchase Requisition Creation",
      "cases_processed": 0,
      "avg_duration_days": 0.0,
      "is_bottleneck": false,
      "severity": "low",
      "color_code": "green"
    },
    {
      "step": 4,
      "activity_name": "Purchase Order Creation",
      "cases_processed": 45,
      "avg_duration_days": 2.3,
      "is_bottleneck": false,
      "severity": "low",
      "color_code": "green"
    },
    {
      "step": 6,
      "activity_name": "Invoice Processing",
      "cases_processed": 35,
      "avg_duration_days": 15.3,
      "is_bottleneck": true,
      "severity": "high",
      "color_code": "red"
    }
  ],
  "severity_legend": {
    "low": "<5d",
    "medium": "5-10d",
    "high": ">10d"
  }
}
```

---

## 20. GET /performance/cases/

**Purpose:** Paginated case-level performance table with filtering, search, and sorting.

**Query parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `event_log_id` | UUID | Yes | — | |
| `search` | string | No | — | Search case_id or supplier name |
| `status` | string | No | — | `In Progress`, `Completed`, `Delayed` |
| `sort_by` | string | No | `cycle_time` | `cycle_time`, `start_date` |
| `order` | string | No | `desc` | `asc`, `desc` |
| `page` | int | No | 1 | |
| `page_size` | int | No | 20 | |

**Example request:**
```
GET http://localhost:8000/api/v1/performance/cases/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8&status=In+Progress&sort_by=cycle_time&order=desc&page=1
```

**Example response (200):**
```json
{
  "count": 20,
  "next": "http://localhost:8000/api/v1/performance/cases/?page=2&...",
  "previous": null,
  "results": [
    {
      "case_id": "purchase_order:test_11",
      "supplier": "Precision Gears Ltd",
      "period_start": "2024-01-10",
      "period_end": null,
      "status": "In Progress",
      "cycle_time_days": 81.0,
      "activity_count": 6,
      "bottleneck_count": 0,
      "sla_breached": true
    }
  ]
}
```

---

## 21. GET /performance/aggregate/

**Purpose:** All performance analysis data in one request — summary, weekly trends, activity ranking, process flow, and cases.

**Query parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `event_log_id` | UUID | Yes | — | |
| `period` | string | No | `7d` | `7d`, `30d`, `90d` |
| `weeks` | int | No | 7 | Number of weeks for trend chart |
| `include_benchmark` | bool | No | `true` | |
| `activity_limit` | int | No | 10 | Max activities in ranking |
| `case_page` | int | No | 1 | Page for cases table |
| `case_page_size` | int | No | 20 | |

**Example request:**
```
GET http://localhost:8000/api/v1/performance/aggregate/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8
```

**Example response (200):**
```json
{
  "summary": {
    "average_cycle_time": { "value": 18.5, "unit": "days", "change_pct": null, "trend": "neutral" },
    "processing_throughput": { "value": 45, "unit": "cases/total", "change_pct": null, "trend": "neutral" },
    "bottleneck_count": { "value": 2, "unit": "activities", "change_pct": null, "trend": "neutral" },
    "sla_compliance_rate": { "value": 62.2, "unit": "%", "change_pct": null, "trend": "neutral" },
    "activity_duration_variance": { "value": 34.2, "unit": "%", "change_pct": null, "trend": "neutral" },
    "process_efficiency_score": { "value": 78.5, "unit": "/100", "change_pct": null, "trend": "neutral" }
  },
  "weekly_trends": {
    "weeks": [
      { "label": "Week 1", "week_start": "2026-01-05", "throughput_cases": 12, "avg_cycle_time_days": 23.1, "industry_benchmark_days": 19.0 }
    ],
    "benchmark_enabled": true
  },
  "activity_ranking": {
    "activities": [
      { "rank": 1, "activity_name": "Create Invoice Receipt", "avg_duration_days": 15.3, "is_bottleneck": true, "bottleneck_severity": "high", "recommendation": "..." }
    ]
  },
  "process_flow": {
    "stages": [
      { "step": 1, "activity_name": "Purchase Requisition Creation", "cases_processed": 0, "avg_duration_days": 0.0, "is_bottleneck": false, "severity": "low", "color_code": "green" }
    ],
    "severity_legend": { "low": "<5d", "medium": "5-10d", "high": ">10d" }
  },
  "cases": {
    "count": 45,
    "next": null,
    "previous": null,
    "results": [
      { "case_id": "purchase_order:test_1", "supplier": "Precision Gears Ltd", "status": "Completed", "cycle_time_days": 7.0, "activity_count": 8, "sla_breached": false }
    ]
  }
}
```

---

## 22. GET /variants/summary/

**Purpose:** The 4 KPI cards at the top of the Variant Analysis Dashboard.

**Query parameters:**

| Param | Type | Required | Default |
|---|---|---|---|
| `event_log_id` | UUID | Yes | — |
| `period` | string | No | `7d` |

**Example request:**
```
GET http://localhost:8000/api/v1/variants/summary/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8
```

**Example response (200):**
```json
{
  "total_variants_detected": {
    "value": 5,
    "benchmark": 0,
    "benchmark_label": "0 variants (baseline)",
    "change": 3,
    "trend": "up"
  },
  "most_frequent_variant": {
    "variant_id": 0,
    "frequency_pct": 44.44,
    "benchmark_label": "Standard P2P flow",
    "change_pct": 0.0,
    "trend": "neutral"
  },
  "highest_anomaly_rate_variant": {
    "variant_id": 0,
    "anomaly_rate_pct": 100.0,
    "benchmark_threshold_pct": 15.0,
    "change_pct": 0.0,
    "trend": "neutral"
  },
  "conformance_fitness": {
    "value_pct": 80.0,
    "benchmark_pct": 85.0,
    "benchmark_label": "85% target",
    "change_pct": 0.0,
    "trend": "down"
  }
}
```

---

## 23. GET /variants/frequency-anomaly-scatter/

**Purpose:** Bubble scatter chart data — each bubble is one variant (x = frequency, y = anomaly rate, size = case count).

**Query parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `event_log_id` | UUID | Yes | — | |
| `period` | string | No | — | |
| `min_frequency` | float | No | 0 | Filter variants below this frequency % |
| `max_frequency` | float | No | 100 | Filter variants above this frequency % |
| `conformance_threshold` | float | No | 0 | Filter variants below this conformance score |

**Example request:**
```
GET http://localhost:8000/api/v1/variants/frequency-anomaly-scatter/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8
```

**Example response (200):**
```json
{
  "variants": [
    {
      "variant_id": 0,
      "name": "Create Request for Quotation → Execute Payment",
      "frequency_pct": 44.44,
      "anomaly_rate_pct": 100.0,
      "case_count": 20,
      "conformance_score": 100.0,
      "color_category": "high"
    },
    {
      "variant_id": 3,
      "name": "Create Purchase Order → Execute Payment",
      "frequency_pct": 11.11,
      "anomaly_rate_pct": 100.0,
      "case_count": 5,
      "conformance_score": 33.33,
      "color_category": "high"
    }
  ],
  "color_legend": {
    "low": "<8%",
    "medium": "8-15%",
    "high": ">15%"
  }
}
```

---

## 24. GET /variants/list/

**Purpose:** Paginated variant comparison table with sorting and filtering.

**Query parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `event_log_id` | UUID | Yes | — | |
| `sort_by` | string | No | `frequency` | `frequency`, `anomaly_rate`, `conformance`, `cases`, `avg_duration` |
| `order` | string | No | `desc` | `asc`, `desc` |
| `filter` | string | No | — | `high_frequency` (≥20%), `high_conformance` (≥85%), `rare_variants` (<5%), `low_conformance` (<70%) |
| `period` | string | No | — | |
| `page` | int | No | 1 | |
| `page_size` | int | No | 20 | |

**Example request:**
```
GET http://localhost:8000/api/v1/variants/list/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8&sort_by=anomaly_rate&order=desc
```

**Example response (200):**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "variant_id": 0,
      "name": "Create Request for Quotation → Execute Payment",
      "activity_sequence": [
        "Create Request for Quotation",
        "Create Purchase Order",
        "Approve Purchase Order",
        "Create Goods Receipt",
        "Create Invoice Receipt",
        "Execute Payment"
      ],
      "frequency_pct": 44.44,
      "anomaly_rate_pct": 100.0,
      "conformance_score": 100.0,
      "case_count": 20,
      "avg_duration_days": 81.0
    },
    {
      "variant_id": 3,
      "name": "Create Purchase Order → Execute Payment",
      "activity_sequence": ["Create Purchase Order", "Execute Payment"],
      "frequency_pct": 11.11,
      "anomaly_rate_pct": 100.0,
      "conformance_score": 33.33,
      "case_count": 5,
      "avg_duration_days": 7.0
    }
  ]
}
```

---

## 25. GET /variants/{variant_id}/detail/

**Purpose:** Full detail for a single variant including severity breakdown and rule-based quick insights.

**Path parameter:** `variant_id` — integer index of the variant

**Query parameters:**

| Param | Type | Required |
|---|---|---|
| `event_log_id` | UUID | Yes |

**Example request:**
```
GET http://localhost:8000/api/v1/variants/0/detail/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8
```

**Example response (200):**
```json
{
  "variant_id": 0,
  "name": "Create Request for Quotation → Execute Payment",
  "activity_sequence": [
    "Create Request for Quotation",
    "Create Purchase Order",
    "Approve Purchase Order",
    "Create Goods Receipt",
    "Create Invoice Receipt",
    "Execute Payment"
  ],
  "frequency_pct": 44.44,
  "anomaly_rate_pct": 100.0,
  "conformance_score": 100.0,
  "case_count": 20,
  "avg_duration_days": 81.0,
  "severity_breakdown": {
    "critical": { "count": 3, "pct": 23.1 },
    "high": { "count": 8, "pct": 61.5 },
    "medium": { "count": 2, "pct": 15.4 },
    "low": { "count": 0, "pct": 0.0 }
  },
  "quick_insights": [
    {
      "type": "warning",
      "title": "High Anomaly Concentration",
      "description": "This variant has a 100.0% anomaly rate, exceeding the 15.0% threshold."
    },
    {
      "type": "info",
      "title": "Above-Average Cycle Time",
      "description": "Average duration of 81.0 days is above the 10-day benchmark."
    }
  ]
}
```

**Error responses:**
```json
{ "error": "VARIANT_NOT_FOUND", "message": "No variant 99 in event log ...", "status": 404 }
```

---

## 26. GET /variants/anomaly-severity-distribution/

**Purpose:** Global or per-variant severity pie chart data.

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `event_log_id` | UUID | Yes | |
| `variant_id` | int | No | If provided, scopes to that variant only |
| `period` | string | No | |

**Example request (global):**
```
GET http://localhost:8000/api/v1/variants/anomaly-severity-distribution/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8
```

**Example request (per-variant):**
```
GET http://localhost:8000/api/v1/variants/anomaly-severity-distribution/?event_log_id=8982f441-2bfc-4876-9bcc-5379d84c71c8&variant_id=0
```

**Example response (200):**
```json
{
  "total_cases": 26,
  "anomalous_cases": 26,
  "severity_distribution": [
    { "level": "critical", "count": 6,  "pct": 23.1, "color": "#ef4444" },
    { "level": "high",     "count": 12, "pct": 46.2, "color": "#f97316" },
    { "level": "medium",   "count": 8,  "pct": 30.8, "color": "#eab308" },
    { "level": "low",      "count": 0,  "pct": 0.0,  "color": "#22c55e" }
  ]
}
```

---

## 27. POST /variants/anomaly-severity/

**Purpose:** Receive anomaly severity data pushed from the FastAPI service and upsert `CaseAnomalySeverity` records per case.

**Request:** `application/json`

```json
{
  "case_id": "550e8400-e29b-41d4-a716-446655440000",
  "severity": "high",
  "anomaly_score": 0.87,
  "anomaly_count": 2,
  "flagged_by": ["isolation_forest", "lstm_autoencoder"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `case_id` | UUID | Yes | UUID primary key of the P2PCase in Django DB |
| `severity` | string | Yes | `critical`, `high`, `medium`, `low`, `none` |
| `anomaly_score` | float | No | Score from 0.0 to 1.0 |
| `anomaly_count` | int | No | Number of anomaly flags |
| `flagged_by` | list | No | Algorithm names that flagged the case |

**Example response (201):**
```json
{
  "status": "ok"
}
```

**Error responses:**
```json
{ "error": "CASE_NOT_FOUND", "message": "No P2PCase with id ...", "status": 404 }
{ "error": "VALIDATION_ERROR", "message": "...", "status": 400 }
```

---

## 28. POST /variants/aggregate/

**Purpose:** All variant analysis in one request. Accepts FastAPI anomaly data in the body, processes it, auto-recomputes conformance if needed, updates anomaly rates, and returns the complete variant dashboard data.

**Request:** `application/json`

```json
{
  "event_log_id": "8982f441-2bfc-4876-9bcc-5379d84c71c8",
  "run_id": "c16e0342-ccd5-4715-8942-e6dd71c590e4",
  "recompute_conformance": false,
  "anomaly_data": {
    "anomaly_cases": [
      {
        "case_id": "purchase_order:test_11",
        "severity_label": "Critical",
        "severity_score": 1.0,
        "flags": {
          "price_mismatch": true,
          "three_way_match_failure": false,
          "maverick_buying": false,
          "temporal_delay": false,
          "duplicate_invoice": false,
          "unauthorized_vendor": true,
          "quantity_variance": false
        }
      }
    ]
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `event_log_id` | UUID | Yes | Django event log UUID |
| `run_id` | UUID | No | FastAPI run ID (stored for traceability) |
| `recompute_conformance` | bool | No | Force conformance recomputation (default `false`, auto-triggers if all scores are 0) |
| `anomaly_data` | object | No | FastAPI response with `anomaly_cases` array |

**Optional query parameters (for filtering/paging the embedded lists):**

| Param | Default | Description |
|---|---|---|
| `min_frequency` | 0 | Filter scatter by min frequency % |
| `max_frequency` | 100 | Filter scatter by max frequency % |
| `conformance_threshold` | 0 | Filter scatter by min conformance score |
| `sort_by` | `frequency` | Sort variants list |
| `order` | `desc` | `asc` or `desc` |
| `filter` | — | `high_frequency`, `high_conformance`, `rare_variants`, `low_conformance` |
| `variant_page` | 1 | Page for variants list |
| `variant_page_size` | 20 | |

**Example response (200):**
```json
{
  "summary": {
    "total_variants_detected": { "value": 5, "benchmark": 0, "benchmark_label": "0 variants (baseline)", "change": 3, "trend": "up" },
    "most_frequent_variant": { "variant_id": 0, "frequency_pct": 44.44, "benchmark_label": "Standard P2P flow", "change_pct": 0.0, "trend": "neutral" },
    "highest_anomaly_rate_variant": { "variant_id": 0, "anomaly_rate_pct": 100.0, "benchmark_threshold_pct": 15.0, "change_pct": 0.0, "trend": "neutral" },
    "conformance_fitness": { "value_pct": 80.0, "benchmark_pct": 85.0, "benchmark_label": "85% target", "change_pct": 0.0, "trend": "down" }
  },
  "frequency_anomaly_scatter": {
    "variants": [
      { "variant_id": 0, "name": "Create Request for Quotation → Execute Payment", "frequency_pct": 44.44, "anomaly_rate_pct": 100.0, "case_count": 20, "conformance_score": 100.0, "color_category": "high" },
      { "variant_id": 3, "name": "Create Purchase Order → Execute Payment", "frequency_pct": 11.11, "anomaly_rate_pct": 100.0, "case_count": 5, "conformance_score": 33.33, "color_category": "high" }
    ],
    "color_legend": { "low": "<8%", "medium": "8-15%", "high": ">15%" }
  },
  "variants_list": {
    "count": 5,
    "next": null,
    "previous": null,
    "results": [
      { "variant_id": 0, "name": "Create Request for Quotation → Execute Payment", "activity_sequence": ["Create Request for Quotation", "Create Purchase Order", "Approve Purchase Order", "Create Goods Receipt", "Create Invoice Receipt", "Execute Payment"], "frequency_pct": 44.44, "anomaly_rate_pct": 100.0, "conformance_score": 100.0, "case_count": 20, "avg_duration_days": 81.0 }
    ]
  },
  "anomaly_severity_distribution": {
    "total_cases": 26,
    "anomalous_cases": 26,
    "severity_distribution": [
      { "level": "critical", "count": 6,  "pct": 23.1, "color": "#ef4444" },
      { "level": "high",     "count": 12, "pct": 46.2, "color": "#f97316" },
      { "level": "medium",   "count": 8,  "pct": 30.8, "color": "#eab308" },
      { "level": "low",      "count": 0,  "pct": 0.0,  "color": "#22c55e" }
    ]
  },
  "anomaly_data_processed": true,
  "conformance_recomputed": true,
  "run_id": "c16e0342-ccd5-4715-8942-e6dd71c590e4"
}
```

---

## Error Response Format

Both services return consistent error objects on failure:

**FastAPI:**
```json
{ "detail": "Human-readable error message" }
```

**Django:**
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "status": 404
}
```

**Common HTTP status codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 404 | Resource not found |
| 409 | Conflict (e.g. run not completed) |
| 413 | File too large |
| 422 | Unprocessable entity / ingestion error |
| 500 | Internal server error |
| 503 | Downstream service unavailable (e.g. Kafka) |
