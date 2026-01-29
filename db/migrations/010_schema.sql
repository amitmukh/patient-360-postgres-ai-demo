-- ============================================================================
-- Migration 010: Create Schema
-- ============================================================================
-- Creates all tables for the Patient 360 demo application.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Patients Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    patient_id      TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,
    dob             DATE NOT NULL,
    sex             TEXT NOT NULL CHECK (sex IN ('M', 'F', 'O', 'U')),
    mrn             TEXT UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE patients IS 'Core patient demographic information';
COMMENT ON COLUMN patients.patient_id IS 'Unique patient identifier (UUID format)';
COMMENT ON COLUMN patients.display_name IS 'Patient display name (synthetic for demo)';
COMMENT ON COLUMN patients.mrn IS 'Medical Record Number';

-- ----------------------------------------------------------------------------
-- Encounters Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encounters (
    encounter_id    BIGSERIAL PRIMARY KEY,
    patient_id      TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    encounter_type  TEXT NOT NULL,
    reason          TEXT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    provider_name   TEXT,
    facility        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_start_time ON encounters(start_time DESC);

COMMENT ON TABLE encounters IS 'Clinical encounters (visits, admissions, telehealth)';

-- ----------------------------------------------------------------------------
-- Observations Table (Labs, Vitals, Measurements)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observations (
    obs_id          BIGSERIAL PRIMARY KEY,
    patient_id      TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    encounter_id    BIGINT REFERENCES encounters(encounter_id) ON DELETE SET NULL,
    code            TEXT NOT NULL,
    display         TEXT NOT NULL,
    value_text      TEXT,
    value_num       NUMERIC,
    unit            TEXT,
    observed_at     TIMESTAMPTZ NOT NULL,
    status          TEXT DEFAULT 'final',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observations_patient_id ON observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_observations_code ON observations(code);
CREATE INDEX IF NOT EXISTS idx_observations_observed_at ON observations(observed_at DESC);

COMMENT ON TABLE observations IS 'Clinical observations including labs, vitals, and measurements';

-- ----------------------------------------------------------------------------
-- Medications Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications (
    med_id          BIGSERIAL PRIMARY KEY,
    patient_id      TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    encounter_id    BIGINT REFERENCES encounters(encounter_id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    dose            TEXT,
    frequency       TEXT,
    route           TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped', 'on-hold')),
    start_date      DATE NOT NULL,
    end_date        DATE,
    prescriber      TEXT,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_status ON medications(status);
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);

COMMENT ON TABLE medications IS 'Patient medication records';

-- ----------------------------------------------------------------------------
-- Allergies Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allergies (
    allergy_id      BIGSERIAL PRIMARY KEY,
    patient_id      TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    substance       TEXT NOT NULL,
    reaction        TEXT,
    severity        TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'unknown')),
    status          TEXT DEFAULT 'active',
    onset_date      DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON allergies(patient_id);

COMMENT ON TABLE allergies IS 'Patient allergy and adverse reaction records';

-- ----------------------------------------------------------------------------
-- Notes Raw Table (Original clinical notes with PHI)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes_raw (
    note_id         BIGSERIAL PRIMARY KEY,
    patient_id      TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    encounter_id    BIGINT REFERENCES encounters(encounter_id) ON DELETE SET NULL,
    note_type       TEXT DEFAULT 'progress',
    raw_text        TEXT NOT NULL,
    author          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_raw_patient_id ON notes_raw(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_raw_created_at ON notes_raw(created_at DESC);

COMMENT ON TABLE notes_raw IS 'Original clinical notes containing PHI - access restricted';
COMMENT ON COLUMN notes_raw.raw_text IS 'Original note text with PHI - for audit/governance only';

-- ----------------------------------------------------------------------------
-- Notes PHI Table (PHI-redacted notes with embeddings)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes_phi (
    note_id         BIGINT PRIMARY KEY REFERENCES notes_raw(note_id) ON DELETE CASCADE,
    patient_id      TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    encounter_id    BIGINT REFERENCES encounters(encounter_id) ON DELETE SET NULL,
    redacted_text   TEXT NOT NULL,
    phi_entities    JSONB DEFAULT '[]'::jsonb,
    embedding       vector(1536),  -- Dimension for text-embedding-3-small/ada-002
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_phi_patient_id ON notes_phi(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_phi_created_at ON notes_phi(created_at DESC);

-- Create vector index for similarity search (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_notes_phi_embedding ON notes_phi 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search index for keyword fallback
CREATE INDEX IF NOT EXISTS idx_notes_phi_text_search ON notes_phi 
USING gin (to_tsvector('english', redacted_text));

COMMENT ON TABLE notes_phi IS 'PHI-redacted clinical notes safe for AI operations';
COMMENT ON COLUMN notes_phi.redacted_text IS 'Clinical note with PHI entities redacted';
COMMENT ON COLUMN notes_phi.phi_entities IS 'JSON array of detected PHI entities with offsets';
COMMENT ON COLUMN notes_phi.embedding IS 'Vector embedding of redacted text for semantic search';

-- ----------------------------------------------------------------------------
-- Problems/Conditions Table (for patient snapshot)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS problems (
    problem_id      BIGSERIAL PRIMARY KEY,
    patient_id      TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    code            TEXT,
    display         TEXT NOT NULL,
    status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'inactive')),
    onset_date      DATE,
    resolved_date   DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problems_patient_id ON problems(patient_id);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);

COMMENT ON TABLE problems IS 'Patient problem list / diagnoses';
