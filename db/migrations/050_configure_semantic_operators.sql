-- ============================================================================
-- Configure Azure AI Semantic Operators - Cohere Rerank
-- ============================================================================
-- Sets up azure_ai.rank() for semantic reranking of search results
-- ============================================================================

-- Configure the Cohere rerank endpoint
-- Note: The endpoint should point to the rerank API, not chat/completions
SELECT azure_ai.set_setting(
    'azure_ml.serverless_ranking_endpoint', 
    'https://ai-gateway-amitmukh.azure-api.net/foundrynextgen-resource/v1/rerank'
);

SELECT azure_ai.set_setting(
    'azure_ml.serverless_ranking_endpoint_key', 
    '86a359eedb16456ca4b161f442f0eff9'
);

-- Verify settings
SELECT azure_ai.get_setting('azure_ml.serverless_ranking_endpoint');
SELECT azure_ai.get_setting('azure_ml.serverless_ranking_endpoint_key');

-- Test the rank function
SELECT * FROM azure_ai.rank(
    'What happened during the emergency room visit?',
    ARRAY[
        'Patient presented to ED with chest pain and shortness of breath.',
        'Routine follow-up for hypertension and diabetes.',
        'Lab results show elevated potassium levels.'
    ]
);
https://foundrynextgen-resource.services.ai.azure.com/api/projects/foundrynextgen