-- ============================================================================
-- Migration 005: Configure Azure AI Extension
-- ============================================================================
-- This script configures the azure_ai extension with Azure AI Language 
-- and Azure OpenAI credentials for PHI redaction and embeddings.
--
-- IMPORTANT: Run this script BEFORE 030_seed.sql
--
-- Replace the placeholder values below with your actual Azure credentials.
-- ============================================================================

-- ============================================================================
-- AZURE AI LANGUAGE CONFIGURATION (Required for PHI Redaction)
-- ============================================================================
-- Get these values from your Azure AI Language resource in the Azure Portal:
-- - Endpoint: Found in "Keys and Endpoint" section
-- - Key: Found in "Keys and Endpoint" section (use Key 1 or Key 2)

-- Set the Azure AI Language endpoint
SELECT azure_ai.set_setting('azure_cognitive.endpoint', 'https://YOUR-AI-LANGUAGE-RESOURCE.cognitiveservices.azure.com');

-- Set the Azure AI Language subscription key
SELECT azure_ai.set_setting('azure_cognitive.subscription_key', 'YOUR-AZURE-AI-LANGUAGE-KEY');

-- ============================================================================
-- AZURE OPENAI CONFIGURATION (Optional - for Embeddings)
-- ============================================================================
-- Get these values from your Azure OpenAI resource in the Azure Portal:
-- - Endpoint: Found in "Keys and Endpoint" section  
-- - Key: Found in "Keys and Endpoint" section
-- - Deployment: The name of your text-embedding model deployment

-- Uncomment and configure these if you want vector embeddings:

-- SELECT azure_ai.set_setting('azure_openai.endpoint', 'https://YOUR-OPENAI-RESOURCE.openai.azure.com');
-- SELECT azure_ai.set_setting('azure_openai.subscription_key', 'YOUR-AZURE-OPENAI-KEY');

-- ============================================================================
-- VERIFY CONFIGURATION
-- ============================================================================
-- Check that settings were applied correctly

DO $$
DECLARE
    v_endpoint TEXT;
    v_has_key BOOLEAN;
BEGIN
    -- Check Azure Cognitive settings
    v_endpoint := azure_ai.get_setting('azure_cognitive.endpoint');
    v_has_key := azure_ai.get_setting('azure_cognitive.subscription_key') IS NOT NULL 
                 AND azure_ai.get_setting('azure_cognitive.subscription_key') != '';
    
    IF v_endpoint IS NULL OR v_endpoint = '' OR v_endpoint LIKE '%YOUR-%' THEN
        RAISE WARNING 'Azure AI Language endpoint not configured properly!';
        RAISE WARNING 'Please update the endpoint in this script with your actual Azure AI Language endpoint.';
    ELSE
        RAISE NOTICE 'Azure AI Language endpoint configured: %', v_endpoint;
    END IF;
    
    IF NOT v_has_key THEN
        RAISE WARNING 'Azure AI Language subscription key not configured!';
    ELSE
        RAISE NOTICE 'Azure AI Language subscription key is set';
    END IF;
    
    -- Check Azure OpenAI settings (optional)
    v_endpoint := azure_ai.get_setting('azure_openai.endpoint');
    IF v_endpoint IS NOT NULL AND v_endpoint != '' THEN
        RAISE NOTICE 'Azure OpenAI endpoint configured: %', v_endpoint;
    ELSE
        RAISE NOTICE 'Azure OpenAI not configured - embeddings will be skipped';
    END IF;
END $$;

-- ============================================================================
-- TEST PHI REDACTION (Optional)
-- ============================================================================
-- Uncomment to test that PHI redaction is working:

/*
SELECT * FROM azure_cognitive.recognize_pii_entities(
    'Patient John Smith (DOB: 01/15/1960, MRN: 12345678) was seen today. Phone: (555) 123-4567.',
    'en',
    domain => 'phi'
);
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Settings are stored at the server level and persist across sessions
-- 2. For production, consider using Azure Managed Identity instead of keys
-- 3. To use Managed Identity, don't set subscription_key and ensure your
--    PostgreSQL server has a managed identity with proper RBAC roles
-- 4. For Managed Identity, grant "Cognitive Services User" role to the
--    PostgreSQL managed identity on your Azure AI Language resource
-- ============================================================================
