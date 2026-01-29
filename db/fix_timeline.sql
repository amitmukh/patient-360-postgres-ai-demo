-- Fix get_patient_timeline function
CREATE OR REPLACE FUNCTION get_patient_timeline(
    p_patient_id TEXT,
    p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
AS $func$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'event_type', event_type,
                'event_id', event_id,
                'event_time', event_time,
                'event_subtype', event_subtype,
                'description', description,
                'details', details
            ) ORDER BY event_time DESC
        ), '[]'::jsonb)
        FROM (
            SELECT 
                'encounter'::text as event_type,
                encounter_id::bigint as event_id,
                start_time as event_time,
                encounter_type as event_subtype,
                reason as description,
                jsonb_build_object(
                    'provider', provider_name,
                    'facility', facility,
                    'end_time', end_time
                ) as details
            FROM encounters
            WHERE patient_id = p_patient_id
            
            UNION ALL
            
            SELECT 
                'note'::text as event_type,
                note_id::bigint as event_id,
                created_at as event_time,
                'clinical_note' as event_subtype,
                LEFT(redacted_text, 150) || '...' as description,
                jsonb_build_object(
                    'encounter_id', encounter_id,
                    'phi_count', COALESCE(jsonb_array_length(phi_entities), 0)
                ) as details
            FROM notes_phi
            WHERE patient_id = p_patient_id
            
            UNION ALL
            
            SELECT 
                'observation'::text as event_type,
                obs_id::bigint as event_id,
                observed_at as event_time,
                code as event_subtype,
                display || ': ' || COALESCE(value_text, value_num::text, '') || ' ' || COALESCE(unit, '') as description,
                jsonb_build_object(
                    'code', code,
                    'value_num', value_num,
                    'unit', unit
                ) as details
            FROM observations
            WHERE patient_id = p_patient_id
            
            UNION ALL
            
            SELECT 
                'medication'::text as event_type,
                med_id::bigint as event_id,
                start_date::timestamptz as event_time,
                status as event_subtype,
                name || ' ' || COALESCE(dose, '') || ' started' as description,
                jsonb_build_object(
                    'dose', dose,
                    'frequency', frequency,
                    'prescriber', prescriber,
                    'reason', reason
                ) as details
            FROM medications
            WHERE patient_id = p_patient_id
        ) AS events
        LIMIT p_limit
    );
END;
$func$;
