# Patient 360 Demo Script

## 5-Minute Talk Track

### Opening (30 seconds)

> "Today I'm going to show you how Azure Database for PostgreSQL can power a PHI-safe Copilot for healthcare. The magic here is that **AI happens directly in the database** - PHI redaction, embeddings, and semantic search all execute as SQL, giving you governance, performance, and simplicity in one place."

### Screen: Patient 360 Dashboard

Point to the three main sections:
- **Left**: Patient snapshot with key clinical info
- **Center**: Clinical timeline with encounters, labs, and notes
- **Right**: Copilot chat interface

---

### Demo 1: "What changed in the last 90 days?" (90 seconds)

**Click**: Type in Copilot: `"What changed in the last 90 days?"`

**Say**:
> "I'll ask the Copilot a natural question. Watch what happens..."

**Point to the response**:
> "The Copilot retrieved relevant clinical notes and observations using **vector similarity search inside PostgreSQL**. Notice the answer includes:
> - A natural language summary
> - Specific next actions
> - **Citations back to source records**"

**Click on a source citation**:
> "Clicking a citation opens the Source Drawer showing the exact text the AI used. This is **grounded AI** - every claim traces back to data."

---

### Demo 2: "Why was lisinopril dose reduced?" (90 seconds)

**Click**: Type in Copilot: `"Why was lisinopril dose reduced?"`

**Say**:
> "This question requires understanding across multiple data types - medications, labs, and clinical notes. The retrieval function queries all three and merges results by relevance score."

**Point to sources**:
> "See how the AI found:
> - The medication change record
> - The relevant lab values (potassium, creatinine)
> - The clinical note documenting the decision
>
> This is **RAG (Retrieval-Augmented Generation)** with sources from your own PostgreSQL database - no external vector DB required."

---

### Demo 3: "List the top 3 risks and next best actions" (60 seconds)

**Click**: Type in Copilot: `"List the top 3 risks and next best actions"`

**Say**:
> "Clinical decision support in action. The Copilot synthesizes the patient's full context and provides actionable recommendations with evidence."

**Point to Next Actions section**:
> "These next actions are informed by the retrieved clinical context. A care team could use this to prioritize interventions."

---

### Demo 4: PHI Governance - Raw vs Redacted Toggle (60 seconds)

**Click**: Toggle "Show Raw / PHI-Redacted" switch

**Say**:
> "Here's the governance story. Watch as I toggle between raw and PHI-redacted views."

**Point to the redacted text**:
> "All PHI - patient names, dates of birth, MRNs, phone numbers, addresses, facility names - has been redacted. But notice we used `domain='phi'` so only **Protected Health Information** is redacted, not general PII."

**Key point**:
> "This redaction happens **inside PostgreSQL** using the `azure_ai` extension calling Azure AI Language. The SQL function `redact_phi()` is called during ingestion, so:
> - Raw notes stay in `notes_raw` (access-controlled)
> - Redacted notes go to `notes_phi` for AI operations
> - **Embeddings are computed only on redacted text**"

---

### Demo 5: Ingest New Note (30 seconds)

**Click**: "Ingest New Note" button

**Say**:
> "Let me show ingestion. I'll add a new clinical note..."

**Paste sample note** (or use pre-filled):
```
Patient John Smith (DOB 03/15/1958, MRN 12345678) presented today with improved blood pressure control. 
His wife Mary Smith (phone 555-123-4567) accompanied him. 
Discussed medication adherence. Continue current regimen. 
Follow up in 3 months at Seattle General Hospital.
```

**Click Submit**:
> "The `ingest_note()` SQL function:
> 1. Stores the raw note
> 2. Calls `redact_phi()` to remove PHI
> 3. Generates embeddings on the redacted text
> 4. Stores everything in PostgreSQL
>
> All in one transactional SQL call."

---

### Closing (30 seconds)

> "What you've seen today:
> 
> 1. **PHI-only redaction from SQL** - Azure AI Language integrated directly into PostgreSQL
> 2. **Embeddings and vector search inside Postgres** - No external vector database needed
> 3. **Grounded Copilot answers with citations** - Full auditability back to source records
>
> This is the power of Azure Database for PostgreSQL with AI extensions. Questions?"

---

## Key Messages to Emphasize

### Technical Differentiation
- **"AI from SQL"** - No need to move data out of the database
- **"Vectors inside Postgres"** - pgvector eliminates external vector DB complexity
- **"PHI-only redaction"** - Domain-specific intelligence, not generic PII removal

### Governance Story
- Raw notes protected, redacted notes used for AI
- Complete audit trail with source citations
- Access control via database roles (mention, don't demo)

### Architecture Benefits
- Single database as source of truth
- Transactional consistency for AI operations
- Familiar PostgreSQL ecosystem (psql, pg_dump, etc.)

---

## Backup Prompts

If you have extra time, try these:

1. `"Summarize this patient's kidney function trend"`
2. `"What allergies should I consider before prescribing?"`
3. `"When was the last A1C and what was the value?"`

---

## Troubleshooting

**Copilot returns generic response**:
- Azure OpenAI may not be configured; the demo falls back to template responses
- Check that embeddings exist in `notes_phi` table

**No sources returned**:
- Ensure seed data was loaded via `030_seed.sql`
- Check that `retrieve_context()` function exists

**Raw toggle doesn't work**:
- `DEMO_ALLOW_RAW` must be set to "true" on backend
- This is intentionally restrictive for governance demo
