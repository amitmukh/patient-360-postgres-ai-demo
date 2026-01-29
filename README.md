# Patient 360: PHI-safe Copilot powered by Azure Postgres AI

A production-quality demo showcasing Azure Database for PostgreSQL AI capabilities for healthcare scenarios.

## ✨ Key Features

1. **PHI-only Redaction from SQL** - Uses `azure_ai` extension + Azure AI Language (`domain='phi'`) to redact Protected Health Information directly in PostgreSQL
2. **Embeddings + Semantic Retrieval** - PHI-redacted notes are embedded and stored in PostgreSQL using `pgvector`
3. **Grounded Copilot Answers** - RAG-based responses with citations back to source rows (notes, labs, medications)

## 🏗️ Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────┐
│  Next.js         │     │  FastAPI         │     │  Azure PostgreSQL        │
│  Frontend        │────►│  Backend         │────►│  Flexible Server         │
│  (Web Apps)      │     │  (Container Apps)│     │  + azure_ai + pgvector   │
└──────────────────┘     └──────────────────┘     └──────────────────────────┘
                                                             │
                              ┌───────────────────────┬──────┴──────┐
                              ▼                       ▼             ▼
                    ┌──────────────────┐  ┌──────────────┐  ┌────────────┐
                    │ Azure AI Language│  │ Azure OpenAI │  │ pgvector   │
                    │ (PHI redaction)  │  │ (embeddings) │  │ (vectors)  │
                    └──────────────────┘  └──────────────┘  └────────────┘
```

## 📁 Repository Structure

```
patient-360-postgres-ai-demo/
├── README.md
├── demo-script.md
├── db/
│   └── migrations/
│       ├── 001_enable_extensions.sql
│       ├── 010_schema.sql
│       ├── 020_functions_redact_ingest.sql
│       └── 030_seed.sql
├── backend/
│   ├── README.md
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   └── src/app/
│       ├── main.py
│       ├── settings.py
│       ├── db.py
│       ├── schemas.py
│       ├── routes/
│       │   ├── health.py
│       │   ├── patients.py
│       │   ├── ingest.py
│       │   └── copilot.py
│       └── services/
│           ├── retrieval.py
│           └── llm.py
└── frontend/
    ├── README.md
    ├── Dockerfile
    ├── .dockerignore
    ├── package.json
    ├── next.config.js
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── app/
        │   ├── page.tsx
        │   ├── layout.tsx
        │   └── globals.css
        ├── components/
        │   ├── PatientHeader.tsx
        │   ├── Timeline.tsx
        │   ├── CopilotChat.tsx
        │   ├── SourceDrawer.tsx
        │   └── RawRedactedToggle.tsx
        └── lib/
            ├── api.ts
            └── types.ts
```

## 🚀 Quick Start

### Prerequisites

- Azure Database for PostgreSQL Flexible Server with:
  - `azure_ai` extension enabled
  - `vector` (pgvector) extension enabled
- Azure AI Language resource (for PHI redaction)
- Azure OpenAI resource (optional, for embeddings and chat)
- Docker (for containerized deployment)
- Node.js 20+ and Python 3.11+

### Local Development

#### 1. Database Setup

```bash
# Set your connection string
export PGHOST=your-server.postgres.database.azure.com
export PGDATABASE=patient360
export PGUSER=your-admin
export PGPASSWORD=your-password
export PGSSLMODE=require

# Run migrations in order
psql -f db/migrations/001_enable_extensions.sql
psql -f db/migrations/010_schema.sql
psql -f db/migrations/020_functions_redact_ingest.sql

# IMPORTANT: Configure Azure AI credentials before seeding
# Edit 005_configure_azure_ai.sql with your Azure AI Language endpoint and key
psql -f db/migrations/005_configure_azure_ai.sql

# Now seed the data (PHI redaction will work with proper credentials)
psql -f db/migrations/030_seed.sql
```

> **Note**: If you skip the Azure AI configuration, the seed script will still work but will use placeholder regex-based redaction instead of the full Azure AI Language PHI detection.

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run the server
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

Open http://localhost:3000 to view the application.

## 🔧 Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AZURE_AI_ENDPOINT` | Yes | Azure AI Language endpoint |
| `AZURE_AI_KEY` | Yes | Azure AI Language key |
| `AZURE_OPENAI_ENDPOINT` | No | Azure OpenAI endpoint (for embeddings/chat) |
| `AZURE_OPENAI_KEY` | No | Azure OpenAI key |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | No | Embedding model deployment name |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | No | Chat model deployment name |
| `DEMO_ALLOW_RAW` | No | Set to "true" to allow raw note viewing |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API URL (e.g., http://localhost:8000) |

## 🐳 Docker Deployment

### Build Images

```bash
# Build backend
cd backend
docker build -t patient360-backend:latest .

# Build frontend
cd ../frontend
docker build -t patient360-frontend:latest .
```

### Run Locally with Docker

```bash
# Backend
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" \
  -e AZURE_AI_ENDPOINT="https://your-ai.cognitiveservices.azure.com" \
  -e AZURE_AI_KEY="your-key" \
  patient360-backend:latest

# Frontend
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL="http://localhost:8000" \
  patient360-frontend:latest
```

## ☁️ Azure Deployment

This section provides step-by-step instructions to deploy the application to Azure:
- **Backend** → Azure Container Apps
- **Frontend** → Azure Web Apps (Container)

### Prerequisites

1. **Azure CLI** installed and logged in (`az login`)
2. **Docker** installed and running
3. **Azure Database for PostgreSQL** already created with extensions enabled
4. **Azure AI Language** resource created
5. **Azure OpenAI** resource created (optional, for chat)

### Quick Deploy (Automated Script)

We provide deployment scripts for both Bash and PowerShell:

```powershell
# Windows (PowerShell)
# 1. Edit the configuration section in deploy-azure.ps1
# 2. Run:
.\deploy-azure.ps1
```

```bash
# Linux/Mac (Bash)
chmod +x deploy-azure.sh
./deploy-azure.sh
```

### Manual Deployment Steps

#### Step 1: Create Resource Group and ACR

```powershell
$RESOURCE_GROUP = "patient360-rg"
$LOCATION = "eastus"
$ACR_NAME = "patient360acr"

az group create --name $RESOURCE_GROUP --location $LOCATION
az acr create --name $ACR_NAME --resource-group $RESOURCE_GROUP --sku Basic --admin-enabled true
az acr login --name $ACR_NAME

$ACR_LOGIN_SERVER = az acr show --name $ACR_NAME --query loginServer -o tsv
```

#### Step 2: Build and Push Images

```powershell
# Backend
cd backend
docker build -t "$ACR_LOGIN_SERVER/patient360-backend:latest" .
docker push "$ACR_LOGIN_SERVER/patient360-backend:latest"
cd ..

# Frontend (after backend is deployed, get the URL first)
cd frontend
docker build --build-arg NEXT_PUBLIC_API_BASE_URL="https://your-backend.azurecontainerapps.io" -t "$ACR_LOGIN_SERVER/patient360-frontend:latest" .
docker push "$ACR_LOGIN_SERVER/patient360-frontend:latest"
cd ..
```

#### Step 3: Deploy Backend to Container Apps

```powershell
az containerapp env create --name patient360-env --resource-group $RESOURCE_GROUP --location $LOCATION

az containerapp create `
    --name patient360-backend `
    --resource-group $RESOURCE_GROUP `
    --environment patient360-env `
    --image "$ACR_LOGIN_SERVER/patient360-backend:latest" `
    --target-port 8000 `
    --ingress external `
    --env-vars `
        "DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require" `
        "AZURE_AI_ENDPOINT=https://your-ai.cognitiveservices.azure.com" `
        "AZURE_AI_KEY=your-key"
```

#### Step 4: Deploy Frontend to Web Apps

```powershell
az appservice plan create --name patient360-plan --resource-group $RESOURCE_GROUP --is-linux --sku B1

az webapp create `
    --name patient360-frontend `
    --resource-group $RESOURCE_GROUP `
    --plan patient360-plan `
    --deployment-container-image-name "$ACR_LOGIN_SERVER/patient360-frontend:latest"

az webapp config appsettings set `
    --name patient360-frontend `
    --resource-group $RESOURCE_GROUP `
    --settings WEBSITES_PORT=3000
```

See [deploy-azure.ps1](./deploy-azure.ps1) for the complete automated script.

## 📖 Demo Script

See [demo-script.md](./demo-script.md) for a complete 5-minute talk track.

---

## 🧠 RAG Workflow: How the Copilot Works

This section explains the complete Retrieval-Augmented Generation (RAG) flow from user question to grounded answer. Use this for customer demos to walk through the architecture.

### End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: USER ASKS A QUESTION                                               │
│  "Why was the Lisinopril dose reduced from 20mg to 10mg?"                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Frontend → Backend API                                             │
│  POST /patients/pt-demo-001/copilot:ask                                     │
│  { "question": "Why was the Lisinopril dose reduced?" }                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: PostgreSQL creates embedding for query (azure_ai extension)       │
│                                                                             │
│  📍 File: db/migrations/020_functions_redact_ingest.sql                     │
│  📍 Function: retrieve_context() → generate_embedding()                     │
│                                                                             │
│  SQL: SELECT azure_openai.create_embeddings(                                │
│           'text-embedding-3-small',                                         │
│           'Why was Lisinopril dose reduced?'                                │
│       )                                                                     │
│                                                                             │
│  Returns: vector(1536) → [0.023, -0.041, 0.087, ...]                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: Vector Similarity Search with SQL Filters (pgvector)              │
│                                                                             │
│  📍 File: db/migrations/020_functions_redact_ingest.sql                     │
│  📍 Function: retrieve_context()                                            │
│                                                                             │
│  SQL:                                                                       │
│  SELECT note_id, redacted_text,                                             │
│         1 - (embedding <=> query_embedding) AS similarity  -- Cosine       │
│  FROM notes_phi                                                             │
│  WHERE patient_id = 'pt-demo-001'        -- 🔒 SQL Filter: Patient only    │
│    AND embedding IS NOT NULL                                                │
│  ORDER BY embedding <=> query_embedding  -- 📊 Vector ranking              │
│  LIMIT 5;                                -- 📊 Top-K results               │
│                                                                             │
│  Also searches: observations (labs), medications                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: Retrieved Context Returned to Backend                              │
│                                                                             │
│  📍 File: backend/src/app/services/retrieval.py                             │
│                                                                             │
│  Returns:                                                                   │
│  [                                                                          │
│    { source: "note", label: "progress (2025-12-15)",                       │
│      snippet: "...potassium 5.1 which is at upper limit. Will reduce       │
│                Lisinopril from 20mg to 10mg to protect kidney function..." │
│    },                                                                       │
│    { source: "note", label: "lab_review (2025-12-14)",                     │
│      snippet: "...elevated potassium level in combination with reduced     │
│                kidney function warrants medication adjustment..."           │
│    },                                                                       │
│    { source: "med", label: "Lisinopril 10mg",                              │
│      snippet: "Hypertension - dose reduced for kidney protection"          │
│    }                                                                        │
│  ]                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: Context + Question Sent to Azure OpenAI (Responses API)           │
│                                                                             │
│  📍 File: backend/src/app/services/llm.py                                   │
│                                                                             │
│  client.responses.create(                                                   │
│    model="gpt-4o",                                                          │
│    instructions="You are a clinical decision support assistant...",        │
│    input="""                                                                │
│      Patient: Robert Johnson                                                │
│      Question: Why was the Lisinopril dose reduced?                         │
│                                                                             │
│      Relevant Context:                                                      │
│      [Source 1 - NOTE] progress (2025-12-15):                              │
│        ...potassium 5.1 which is at upper limit. Will reduce               │
│        Lisinopril from 20mg to 10mg to protect kidney function...          │
│                                                                             │
│      [Source 2 - NOTE] lab_review (2025-12-14):                            │
│        ...elevated potassium level warrants medication adjustment...        │
│                                                                             │
│      [Source 3 - MED] Lisinopril 10mg:                                     │
│        Hypertension - dose reduced for kidney protection                    │
│    """                                                                      │
│  )                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 7: Azure OpenAI Generates Grounded Answer                            │
│                                                                             │
│  Response:                                                                  │
│  "The Lisinopril dose was reduced from 20 mg to 10 mg because his          │
│   potassium was elevated (K 5.1, upper limit), and the team wanted to      │
│   reduce hyperkalemia risk and protect kidney function in the setting      │
│   of CKD stage 3a. [Source 1] [Source 2]"                                  │
│                                                                             │
│  Suggested Next Actions:                                                    │
│  → Recheck basic metabolic panel (potassium and creatinine/eGFR)           │
│  → Continue home BP monitoring and review logs                              │
│  → Monitor for medication adverse effects (ankle edema from amlodipine)    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 8: Response Displayed in Frontend with Citations                     │
│                                                                             │
│  📍 File: frontend/src/components/CopilotChat.tsx                           │
│                                                                             │
│  • Answer text with [Source N] citations                                    │
│  • Clickable source pills (note, lab, med) for details                     │
│  • Editable "Suggested Next Actions" - doctor can modify & save to DB      │
│  • Retrieval method indicator (vector vs keyword search)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Azure PostgreSQL AI Features Used

| Feature | Extension | SQL Function | Purpose |
|---------|-----------|--------------|---------|
| **Embedding Generation** | `azure_ai` | `azure_openai.create_embeddings()` | Convert text to vectors |
| **PHI Redaction** | `azure_ai` | `azure_cognitive.recognize_pii_entities()` | Redact patient identifiers |
| **Vector Storage** | `pgvector` | `vector(1536)` column type | Store embeddings in PostgreSQL |
| **Similarity Search** | `pgvector` | `<=>` operator (cosine distance) | Find semantically similar content |

### SQL Filters in the RAG Pipeline

The retrieval function applies these filters to ensure relevant, secure results:

```sql
-- Patient isolation (security)
WHERE patient_id = p_patient_id

-- Score threshold (relevance)
WHERE src_score > 0

-- Result limit (efficiency)
LIMIT p_k  -- Default: 5

-- Vector ranking (semantic relevance)
ORDER BY embedding <=> query_embedding
```

### Demo Walkthrough Steps

1. **Show the Patient Dashboard** - Click on Robert Johnson
2. **Ask a Question** - "Why was the Lisinopril dose reduced?"
3. **Explain the Flow**:
   - "The question is converted to an embedding using Azure OpenAI"
   - "PostgreSQL performs vector similarity search to find relevant notes"
   - "Only this patient's data is retrieved (SQL filter)"
   - "The context is sent to Azure OpenAI to generate a grounded answer"
4. **Highlight the Citations** - Click on source pills to show actual records
5. **Show Editable Actions** - Doctor can edit and save AI suggestions
6. **Emphasize Security** - PHI is redacted before embedding, data never leaves Azure

---

## 🔒 Security Notes

- This demo uses synthetic data only
- No authentication is implemented (demo purposes)
- Raw note visibility controlled by `DEMO_ALLOW_RAW` environment variable
- All PHI redaction happens server-side in PostgreSQL
- Backend holds all secrets; frontend only has API URL

---

## 🔄 Redeployment

### Quick Redeploy Script

After making code changes, use the `redeploy.ps1` script to deploy to Azure:

```powershell
# Deploy frontend only
.\redeploy.ps1 -Component frontend

# Deploy backend only
.\redeploy.ps1 -Component backend

# Deploy both
.\redeploy.ps1 -Component both
```

The script:
- Builds Docker images in Azure Container Registry (no local Docker required)
- Deploys to Azure Container Apps (backend) or App Service (frontend)
- Takes ~2 minutes to complete

### Manual Deployment Commands

If you prefer manual commands:

```powershell
# Frontend
az acr build --registry patient360acr --image patient360-frontend:latest --build-arg NEXT_PUBLIC_API_BASE_URL="https://patient360-backend.ashystone-2d6419e3.eastus.azurecontainerapps.io" .\frontend\
az webapp restart -g patient360-rg -n patient360-frontend

# Backend
az acr build --registry patient360acr --image patient360-backend:latest .\backend\
az containerapp update -g patient360-rg -n patient360-backend --image patient360acr.azurecr.io/patient360-backend:latest
```

### Deployed URLs

- **Frontend**: https://patient360-frontend.azurewebsites.net
- **Backend**: https://patient360-backend.ashystone-2d6419e3.eastus.azurecontainerapps.io
- **API Docs**: https://patient360-backend.ashystone-2d6419e3.eastus.azurecontainerapps.io/docs

---

## 📄 License

MIT License - See LICENSE file for details.
