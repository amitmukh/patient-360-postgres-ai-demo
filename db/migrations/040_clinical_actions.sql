-- ============================================================================
-- Migration 040: Clinical Actions Table
-- ============================================================================
-- Stores doctor-reviewed and edited clinical actions from AI suggestions
-- ============================================================================

-- Table to store clinical actions (editable by doctors)
CREATE TABLE IF NOT EXISTS clinical_actions (
    action_id BIGSERIAL PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
    
    -- The action text (can be edited by doctor)
    action_text TEXT NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Origin tracking
    source TEXT NOT NULL DEFAULT 'ai_suggested' CHECK (source IN ('ai_suggested', 'manual')),
    original_ai_text TEXT,  -- Store original AI suggestion for audit
    
    -- Context
    related_question TEXT,  -- The question that generated this action
    related_sources JSONB,  -- Sources that were used
    
    -- Audit fields
    created_by TEXT,  -- Doctor who approved/created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Notes
    doctor_notes TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clinical_actions_patient ON clinical_actions(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_actions_status ON clinical_actions(status);
CREATE INDEX IF NOT EXISTS idx_clinical_actions_created ON clinical_actions(created_at DESC);

-- Function to get pending actions for a patient
CREATE OR REPLACE FUNCTION get_patient_actions(
    p_patient_id TEXT,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    action_id BIGINT,
    action_text TEXT,
    status TEXT,
    priority TEXT,
    source TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ,
    doctor_notes TEXT
)
LANGUAGE sql
AS $$
    SELECT 
        action_id,
        action_text,
        status,
        priority,
        source,
        created_by,
        created_at,
        doctor_notes
    FROM clinical_actions
    WHERE patient_id = p_patient_id
    AND (p_status IS NULL OR clinical_actions.status = p_status)
    ORDER BY 
        CASE priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
            WHEN 'low' THEN 4 
        END,
        created_at DESC;
$$;

COMMENT ON TABLE clinical_actions IS 'Stores doctor-reviewed clinical actions from AI suggestions';
COMMENT ON FUNCTION get_patient_actions IS 'Returns clinical actions for a patient, optionally filtered by status';
