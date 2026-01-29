# Patient 360 Backend

FastAPI backend service for the Patient 360 PHI-safe Copilot demo.

## Features

- RESTful API for patient data retrieval
- PHI-redacted note ingestion pipeline
- RAG-based Copilot with source citations
- Vector + keyword search over clinical data

## Prerequisites

- Python 3.11+
- Azure Database for PostgreSQL Flexible Server
- Azure AI Language resource (for PHI redaction)
- Azure OpenAI resource (optional, for embeddings and chat)

## Local Development

### Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

Create a `.env` file:

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/patient360?sslmode=require
AZURE_AI_ENDPOINT=https://your-ai-service.cognitiveservices.azure.com
AZURE_AI_KEY=your-azure-ai-key

# Optional - Azure OpenAI for embeddings and chat
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com
AZURE_OPENAI_KEY=your-openai-key
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o

# Optional - Demo settings
DEMO_ALLOW_RAW=false
CORS_ORIGINS=http://localhost:3000,https://your-frontend.azurewebsites.net
```

### Run

```bash
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/patients/{patient_id}/snapshot` | Patient summary with vitals, meds, allergies |
| GET | `/patients/{patient_id}/timeline` | Chronological clinical events |
| POST | `/patients/{patient_id}/notes:ingest` | Ingest new clinical note |
| POST | `/patients/{patient_id}/copilot:ask` | Ask Copilot a question |
| GET | `/patients/{patient_id}/notes/{note_id}` | Get specific note (raw or redacted) |

## Docker

```bash
# Build
docker build -t patient360-backend:latest .

# Run
docker run -p 8000:8000 \
  -e DATABASE_URL="..." \
  -e AZURE_AI_ENDPOINT="..." \
  -e AZURE_AI_KEY="..." \
  patient360-backend:latest
```
