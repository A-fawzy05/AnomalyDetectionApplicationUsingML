# P2P Process Mining & Anomaly Detection Platform - COMPLETE PROJECT SPECIFICATION

## 🎯 Project Overview
Enterprise platform for Purchase-to-Pay (P2P) procurement process analysis using **object-centric process mining** + **anomaly detection** (ML/DL). Analyses requisition → purchase order → goods receipt → invoice → payment workflows.

**Key Problems Solved:**
- Maverick buying (unauthorized orders)
- Three-way match failures (invoice fraud)
- Performance bottlenecks (delays)
- Compliance deviations (missing approvals)
- Multi-object relationships (PO ↔ Invoice ↔ Payment)

## 🏗️ System Architecture (Microservices)
Frontend: Next.js (React 19, App Router, TypeScript)
├── API Gateway: Node.js (Express + Socket.io) ← Auth, routing, WebSocket
├── Process Mining Service: Django (DRF) + PostgreSQL/TimescaleDB ← Performance, conformance, variants
├── Anomaly Service: FastAPI (Python) + ML/DL models ← Primary focus
├── Kafka: Event streaming (p2p.events.raw → p2p.events.enriched → p2p.anomalies)
├── n8n: Automation (SAP extraction → Telegram alerts)
├── Docker + Kubernetes: Containerization & orchestration

text

## 🔐 Authentication (Login/Signup)
**Node.js Gateway handles auth:**
POST /auth/signup → JWT token + user roles (admin, analyst, viewer)
POST /auth/login → JWT token
Middleware: JWT verification on all protected routes
Roles: admin (upload datasets), analyst (run analysis), viewer (view dashboards)

text

## 📤 File Upload Flow (XES/CSV → Services)
Frontend → POST /upload (Node.js Gateway)

Gateway →
├── Forward to Django: /event-logs/upload (stores in PostgreSQL)
├── Forward to FastAPI: /score (immediate anomaly detection)

Django: Process mining → conformance, bottlenecks, variants

FastAPI: ML/DL anomaly detection → Kafka p2p.anomalies

Frontend: Real-time results via WebSocket

text

## 🎛️ Core Features

### 1. **Anomaly Detection (FastAPI - PRIMARY)**
**Primary Model**: Isolation Forest + LSTM Autoencoder Ensemble
**Secondary Model**: GMM + XGBoost
Endpoints:
/models/list → List available models
/models/train → Train on uploaded dataset
/score → Score cases (batch or streaming)
/explain/{case_id} → Anomaly explanation + features

text

**ML/DL Libraries:**
scikit-learn: Isolation Forest, OC-SVM, GMM, DBSCAN
xgboost: Ensemble boosting
tensorflow/pytorch: LSTM Autoencoder
joblib: Model serialization
pandas/numpy: Feature engineering
pm4py: Event log preprocessing



### 2. **Process Mining (Django)**
**GitHub Base**: https://github.com/namanag97/process-mining-toolkit
**Extend for multiple datasets:**
Datasets:

BPI Challenge 2019 (1.5M events) - Primary

Procurement KPI Dataset (Kaggle) - Supplier performance

Request for Payment (Celonis) - Invoice workflows

pm4py implementation:

Discovery: Inductive Miner, Directly-Follows Graph

Conformance: Fitness, Precision, Alignment

Performance: Cycle time, waiting time, bottleneck scores

Variants: Top-K variants by frequency

text

**Django Models:**
```python
class EventLog(models.Model):
    name = models.CharField()
    file_path = models.FileField()
    case_count = models.IntegerField()

class ProcessModel(models.Model):
    log = models.ForeignKey(EventLog)
    fitness = models.FloatField()
    variant_count = models.IntegerField()

class Variant(models.Model):
    model = models.ForeignKey(ProcessModel)
    variant_id = models.CharField()
    frequency_pct = models.FloatField()


3. Real-Time Data Logs

Kafka Flow:
n8n → SAP/ERP → `p2p.events.raw` (raw events)
FastAPI Consumer → preprocess → score → `p2p.anomalies`
Node.js Gateway → WebSocket → Frontend (live alerts)

Frontend: useSWR + Socket.io-client for real-time updates
🛠️ Tech Stack & Libraries
Frontend (Next.js)
text
next@15, react@19, typescript@5
shadcn/ui, lucide-react (icons)
recharts (charts), d3 (process graphs)
zustand (state), react-hook-form
socket.io-client, swr (data fetching)
tailwindcss@3, clsx, twMerge

Backend Gateway (Node.js)
express@4, cors, helmet
jsonwebtoken, bcryptjs
socket.io, kafka-node
joi (validation)
winston (logging)

Django Process Mining

Django 5.0, djangorestframework
django-cors-headers, drf-spectacular (OpenAPI)
pm4py (process mining core)
celery + redis (background tasks)
psycopg2 (PostgreSQL)
django-filter (querying)
FastAPI Anomaly Detection
text
fastapi@0.115, uvicorn
pydantic@2, alembic (if needed)
scikit-learn@1.5, xgboost@2.1
tensorflow@2.16 OR torch@2.4 (LSTM Autoencoder)
pm4py@2024.11, pandas@2.2, numpy@2.0
kafka-python@2.0.2, aiokafka (async)
joblib@1.4, mlflow (model registry)
Infrastructure
text
Docker Compose (local dev)
Kubernetes (Helm charts)
Kafka + Zookeeper
PostgreSQL + TimescaleDB
Redis (Celery)
n8n@1.60
Prometheus + Grafana (monitoring)
📁 Project Structure
text
p2p-process-mining/
├── frontend/ (Next.js)
├── backend/
│   ├── gateway/ (Node.js)
│   ├── process-mining/ (Django)
│   └── anomaly-detection/ (FastAPI)
├── workflows/ (n8n)
├── infra/ (docker-compose.yml, k8s/)
└── datasets/
    ├── bpi-challenge-2019.xes
    ├── procurement-kpi.csv
    └── request-for-payment.xes
🚀 Setup Instructions
text
1. docker-compose up (starts Kafka, Postgres, Redis, n8n)
2. Backend services: docker-compose up django fastapi gateway
3. Frontend: cd frontend && npm run dev
4. n8n: http://localhost:5678 → import workflows
5. Upload dataset → Django stores + FastAPI scores → Real-time dashboard
🔬 Expected Analysis Outputs
Process Model: Object-centric DFG showing P2P flow

Variants: Top-5 variants by frequency

Performance: Bottleneck scores, cycle times

Anomalies: Scored cases + explanations (IF+LSTM primary)

Alerts: Real-time via WebSocket + Telegram

📚 Key Research Papers (for context)
Berti et al. (2023): Object-centric P2P mining [web:5]

GMM + XGBoost: 95% accuracy [web:41]

LSTM Autoencoder: 98% financial fraud [web:54]

AI IDE Instructions: Use shadcn/ui components, Tailwind, TypeScript everywhere. Focus on FastAPI anomaly service first (ML models). Extend Django from process-mining-toolkit repo. Implement auth in Node.js gateway. Real-time via Kafka + Socket.io.