-- ============================================================================
-- Run this script in Azure Portal Query Editor or pgAdmin
-- ============================================================================
-- 1. Go to Azure Portal > Your PostgreSQL server (dbcatalyst)
-- 2. Click "Query editor (preview)" in the left menu
-- 3. Login and paste this SQL
-- ============================================================================

-- Step 1: Configure Cohere Rerank Endpoint
SELECT azure_ai.set_setting(
    'azure_ml.serverless_ranking_endpoint', 
    'https://ai-gateway-amitmukh.azure-api.net/foundrynextgen-resource/v1/rerank'
);

SELECT azure_ai.set_setting(
    'azure_ml.serverless_ranking_endpoint_key', 
    '86a359eedb16456ca4b161f442f0eff9'
);

-- Step 2: Verify settings
SELECT azure_ai.get_setting('azure_ml.serverless_ranking_endpoint');

-- Step 3: Test the rank function (optional - to verify it works)
-- SELECT * FROM azure_ai.rank(
--     'What happened during the emergency room visit?',
--     ARRAY[
--         'Patient presented to ED with chest pain and shortness of breath.',
--         'Routine follow-up for hypertension and diabetes.',
--         'Lab results show elevated potassium levels.'
--     ]
-- );
