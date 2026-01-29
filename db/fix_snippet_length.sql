-- Fix: Increase snippet length from 300 to 1500 characters for better context retrieval

CREATE OR REPLACE FUNCTION retrieve_context(
    p_patient_id TEXT,
    p_query_text TEXT,
    p_k INT DEFAULT 5
)
RETURNS TABLE (
    source_type TEXT,
    source_id BIGINT,
    label TEXT,
    snippet TEXT,
    score DOUBLE PRECISION,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_query_embedding vector(1536);
    v_use_vector_search BOOLEAN := false;
    v_search_terms TEXT[];
BEGIN
    -- Try to generate embedding for the query
    v_query_embedding := generate_embedding(p_query_text);
    
    -- Check if we have any notes with embeddings
    IF v_query_embedding IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM notes_phi 
            WHERE patient_id = p_patient_id 
            AND embedding IS NOT NULL
            LIMIT 1
        ) INTO v_use_vector_search;
    END IF;
    
    -- Extract search terms for keyword fallback
    v_search_terms := regexp_split_to_array(lower(p_query_text), '\s+');
    
    RETURN QUERY
    WITH note_results AS (
        -- Vector search over notes (if available)
        SELECT 
            'note'::TEXT as src_type,
            np.note_id as src_id,
            COALESCE(nr.note_type, 'note') || ' (' || to_char(np.created_at, 'YYYY-MM-DD') || ')' as src_label,
            LEFT(np.redacted_text, 1500) as src_snippet,  -- Increased from 300 to 1500
            CASE 
                WHEN v_use_vector_search AND np.embedding IS NOT NULL THEN
                    1 - (np.embedding <=> v_query_embedding)  -- Cosine similarity
                ELSE
                    -- Keyword matching score (simple)
                    (
                        SELECT COUNT(*)::float / GREATEST(array_length(v_search_terms, 1), 1)
                        FROM unnest(v_search_terms) term
                        WHERE lower(np.redacted_text) LIKE '%' || term || '%'
                    )
            END as src_score,
            jsonb_build_object(
                'encounter_id', np.encounter_id,
                'created_at', np.created_at,
                'phi_entity_count', jsonb_array_length(np.phi_entities),
                'note_type', nr.note_type
            ) as src_metadata
        FROM notes_phi np
        LEFT JOIN notes_raw nr ON nr.note_id = np.note_id
        WHERE np.patient_id = p_patient_id
    ),
    observation_results AS (
        -- Keyword search over observations (labs, vitals)
        SELECT 
            'lab'::TEXT as src_type,
            o.obs_id as src_id,
            o.display || ' (' || to_char(o.observed_at, 'YYYY-MM-DD') || ')' as src_label,
            COALESCE(o.value_text, o.value_num::text) || ' ' || COALESCE(o.unit, '') as src_snippet,
            (
                SELECT COUNT(*)::float / GREATEST(array_length(v_search_terms, 1), 1)
                FROM unnest(v_search_terms) term
                WHERE lower(o.display) LIKE '%' || term || '%'
                   OR lower(COALESCE(o.value_text, '')) LIKE '%' || term || '%'
                   OR lower(o.code) LIKE '%' || term || '%'
            ) as src_score,
            jsonb_build_object(
                'code', o.code,
                'value_num', o.value_num,
                'unit', o.unit,
                'observed_at', o.observed_at,
                'encounter_id', o.encounter_id
            ) as src_metadata
        FROM observations o
        WHERE o.patient_id = p_patient_id
    ),
    medication_results AS (
        -- Keyword search over medications
        SELECT 
            'med'::TEXT as src_type,
            m.med_id as src_id,
            m.name || ' ' || COALESCE(m.dose, '') as src_label,
            m.name || ' ' || COALESCE(m.dose, '') || ' ' || COALESCE(m.frequency, '') || 
            ' (Status: ' || m.status || ') - ' || COALESCE(m.reason, '') as src_snippet,  -- Added reason
            (
                SELECT COUNT(*)::float / GREATEST(array_length(v_search_terms, 1), 1)
                FROM unnest(v_search_terms) term
                WHERE lower(m.name) LIKE '%' || term || '%'
                   OR lower(COALESCE(m.reason, '')) LIKE '%' || term || '%'
            ) as src_score,
            jsonb_build_object(
                'dose', m.dose,
                'frequency', m.frequency,
                'status', m.status,
                'start_date', m.start_date,
                'end_date', m.end_date,
                'prescriber', m.prescriber,
                'reason', m.reason
            ) as src_metadata
        FROM medications m
        WHERE m.patient_id = p_patient_id
    ),
    all_results AS (
        SELECT * FROM note_results
        UNION ALL
        SELECT * FROM observation_results  
        UNION ALL
        SELECT * FROM medication_results
    )
    SELECT 
        src_type,
        src_id,
        src_label,
        src_snippet,
        src_score,
        src_metadata
    FROM all_results
    WHERE src_score > 0
    ORDER BY src_score DESC
    LIMIT p_k;
END;
$$;

COMMENT ON FUNCTION retrieve_context IS 'Retrieves relevant context for RAG using vector/keyword search - with extended snippet length';
