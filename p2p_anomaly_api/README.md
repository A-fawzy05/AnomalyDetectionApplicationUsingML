# P2P Anomaly Detection API

A production-grade FastAPI application for detecting anomalies in Purchase-to-Pay (P2P) procurement event logs.

## Features
- Ingests CSV, XES, and OCEL 2.0 JSON event logs.
- Dual-model detection: Isolation Forest (Case-level) & LSTM Autoencoder (Sequence-level).
- Rule-based anomaly labeling and severity scoring.
- Comprehensive PostgreSQL persistence for historical analysis.
- Dashboard-ready JSON responses.

## Setup

### Prerequisites
- Python 3.11
- PostgreSQL 16
- Docker & Docker Compose (optional)

### Local Installation
1. Clone the repository.
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment:
   ```bash
   cp .env.example .env
   # Update DATABASE_URL in .env
   ```
5. Run migrations:
   ```bash
   alembic upgrade head
   ```
6. Copy ML models to `artifacts/` directory.

### Running the App
```bash
uvicorn p2p_anomaly_api.main:app --reload
```

## API Documentation
Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- Redoc: `http://localhost:8000/redoc`

## Example Usage

### Analyze Event Log
```bash
curl -X POST "http://localhost:8000/api/v1/analyze" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@sample_log.json"
```

### Get Past Runs
```bash
curl -X GET "http://localhost:8000/api/v1/runs"
```

### Health Check
```bash
curl -X GET "http://localhost:8000/api/v1/health"
```

## Docker
```bash
docker-compose up --build
```
