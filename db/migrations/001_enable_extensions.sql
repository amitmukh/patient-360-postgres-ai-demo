-- ============================================================================
-- Migration 001: Enable PostgreSQL Extensions
-- ============================================================================
-- This migration enables the required extensions for the Patient 360 demo.
-- Must be run by a user with sufficient privileges (azure_pg_admin on Azure).
-- ============================================================================

-- Enable azure_ai extension for PHI redaction via Azure AI Language
-- and embeddings via Azure OpenAI
CREATE EXTENSION IF NOT EXISTS azure_ai CASCADE;

-- Enable pgvector for vector storage and similarity search
CREATE EXTENSION IF NOT EXISTS vector CASCADE;

-- Optional: Enable pg_diskann for scalable approximate nearest neighbor search
-- Uncomment if your Azure PostgreSQL instance supports it
-- CREATE EXTENSION IF NOT EXISTS pg_diskann CASCADE;

-- Verify extensions are enabled
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'azure_ai') THEN
        RAISE EXCEPTION 'azure_ai extension is not enabled';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'vector extension is not enabled';
    END IF;
    
    RAISE NOTICE 'All required extensions are enabled successfully';
END $$;
