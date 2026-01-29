-- ============================================================================
-- Migration 030: Seed Data
-- ============================================================================
-- Creates synthetic patient data for the Patient 360 demo.
-- All data is fictional - no real patient information.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Insert Synthetic Patient
-- ----------------------------------------------------------------------------
INSERT INTO patients (patient_id, display_name, dob, sex, mrn)
VALUES (
    'pt-demo-001',
    'Robert Johnson',
    '1958-03-15',
    'M',
    'MRN-12345678'
) ON CONFLICT (patient_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Insert Encounters
-- ----------------------------------------------------------------------------
INSERT INTO encounters (encounter_id, patient_id, encounter_type, reason, start_time, end_time, provider_name, facility)
VALUES 
(1, 'pt-demo-001', 'office_visit', 'Routine follow-up for hypertension and diabetes management', 
    '2025-12-15 09:00:00-08', '2025-12-15 09:45:00-08', 'Dr. Sarah Chen', 'Pacific Medical Center'),
(2, 'pt-demo-001', 'office_visit', 'Follow-up for medication adjustment and lab review', 
    '2026-01-20 10:30:00-08', '2026-01-20 11:15:00-08', 'Dr. Sarah Chen', 'Pacific Medical Center')
ON CONFLICT DO NOTHING;

-- Reset sequence
SELECT setval('encounters_encounter_id_seq', (SELECT MAX(encounter_id) FROM encounters));

-- ----------------------------------------------------------------------------
-- Insert Observations (Labs and Vitals)
-- ----------------------------------------------------------------------------
INSERT INTO observations (patient_id, encounter_id, code, display, value_text, value_num, unit, observed_at)
VALUES 
-- December visit observations
('pt-demo-001', 1, 'BP', 'Blood Pressure', '142/88', NULL, 'mmHg', '2025-12-15 09:10:00-08'),
('pt-demo-001', 1, 'HR', 'Heart Rate', NULL, 78, 'bpm', '2025-12-15 09:10:00-08'),
('pt-demo-001', 1, 'A1C', 'Hemoglobin A1C', NULL, 7.8, '%', '2025-12-14 08:00:00-08'),
('pt-demo-001', 1, 'eGFR', 'Estimated GFR', NULL, 62, 'mL/min/1.73m2', '2025-12-14 08:00:00-08'),
('pt-demo-001', 1, 'K', 'Potassium', NULL, 5.1, 'mEq/L', '2025-12-14 08:00:00-08'),
('pt-demo-001', 1, 'Cr', 'Creatinine', NULL, 1.4, 'mg/dL', '2025-12-14 08:00:00-08'),

-- January visit observations  
('pt-demo-001', 2, 'BP', 'Blood Pressure', '128/82', NULL, 'mmHg', '2026-01-20 10:40:00-08'),
('pt-demo-001', 2, 'HR', 'Heart Rate', NULL, 72, 'bpm', '2026-01-20 10:40:00-08'),
('pt-demo-001', 2, 'A1C', 'Hemoglobin A1C', NULL, 7.2, '%', '2026-01-19 07:30:00-08'),
('pt-demo-001', 2, 'eGFR', 'Estimated GFR', NULL, 65, 'mL/min/1.73m2', '2026-01-19 07:30:00-08'),
('pt-demo-001', 2, 'K', 'Potassium', NULL, 4.6, 'mEq/L', '2026-01-19 07:30:00-08'),
('pt-demo-001', 2, 'Cr', 'Creatinine', NULL, 1.3, 'mg/dL', '2026-01-19 07:30:00-08'),
('pt-demo-001', 2, 'BMI', 'Body Mass Index', NULL, 28.5, 'kg/m2', '2026-01-20 10:35:00-08'),
('pt-demo-001', 2, 'weight', 'Weight', NULL, 198, 'lbs', '2026-01-20 10:35:00-08')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Insert Medications
-- ----------------------------------------------------------------------------
INSERT INTO medications (patient_id, encounter_id, name, dose, frequency, route, status, start_date, end_date, prescriber, reason)
VALUES 
('pt-demo-001', 1, 'Lisinopril', '20 mg', 'once daily', 'oral', 'stopped', '2024-06-01', '2025-12-15', 'Dr. Sarah Chen', 'Hypertension - reduced due to elevated potassium'),
('pt-demo-001', 2, 'Lisinopril', '10 mg', 'once daily', 'oral', 'active', '2025-12-16', NULL, 'Dr. Sarah Chen', 'Hypertension - dose reduced for kidney protection'),
('pt-demo-001', NULL, 'Metformin', '1000 mg', 'twice daily', 'oral', 'active', '2023-01-15', NULL, 'Dr. Sarah Chen', 'Type 2 Diabetes'),
('pt-demo-001', NULL, 'Atorvastatin', '40 mg', 'once daily at bedtime', 'oral', 'active', '2023-03-20', NULL, 'Dr. Sarah Chen', 'Hyperlipidemia'),
('pt-demo-001', 2, 'Amlodipine', '5 mg', 'once daily', 'oral', 'active', '2025-12-16', NULL, 'Dr. Sarah Chen', 'Added for blood pressure control after lisinopril reduction')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Insert Allergies
-- ----------------------------------------------------------------------------
INSERT INTO allergies (patient_id, substance, reaction, severity, status, onset_date)
VALUES 
('pt-demo-001', 'Penicillin', 'Rash, hives', 'moderate', 'active', '1985-01-01')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Insert Problems/Conditions
-- ----------------------------------------------------------------------------
INSERT INTO problems (patient_id, code, display, status, onset_date)
VALUES 
('pt-demo-001', 'I10', 'Essential Hypertension', 'active', '2020-03-15'),
('pt-demo-001', 'E11.9', 'Type 2 Diabetes Mellitus without complications', 'active', '2022-11-01'),
('pt-demo-001', 'E78.5', 'Hyperlipidemia', 'active', '2023-03-01'),
('pt-demo-001', 'N18.3', 'Chronic Kidney Disease, Stage 3a', 'active', '2024-06-01')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Insert Raw Clinical Notes (with synthetic PHI)
-- These will be processed through ingest_note() to create PHI-redacted versions
-- ----------------------------------------------------------------------------

-- Note 1: Initial encounter note
INSERT INTO notes_raw (note_id, patient_id, encounter_id, note_type, raw_text, author, created_at)
VALUES (
    1,
    'pt-demo-001',
    1,
    'progress',
    'PROGRESS NOTE - December 15, 2025

Patient: Robert Johnson
DOB: 03/15/1958
MRN: 12345678

Chief Complaint: Follow-up for hypertension and diabetes management.

History of Present Illness:
Mr. Johnson is a 67-year-old male presenting for routine follow-up. He reports good medication compliance. 
His wife, Margaret Johnson, accompanied him today and notes he has been checking his blood pressure at home 
with readings averaging 140s/85. Patient reports occasional mild dizziness when standing quickly.

Phone contact: (555) 234-5678
Address: 1234 Oak Street, Seattle, WA 98101

Review of Systems:
- No chest pain, shortness of breath, or palpitations
- Occasional mild fatigue
- No polyuria or polydipsia
- No lower extremity edema

Physical Exam:
- BP: 142/88 mmHg (elevated)
- HR: 78 bpm, regular
- Weight: 200 lbs
- General: Well-appearing, in no distress

Assessment & Plan:
1. Hypertension - BP elevated today. Lab shows potassium 5.1 which is at upper limit. 
   Will reduce Lisinopril from 20mg to 10mg to protect kidney function and reduce hyperkalemia risk.
   Adding Amlodipine 5mg for additional BP control.

2. Type 2 Diabetes - A1C 7.8%, slightly above goal. Continue Metformin 1000mg BID.
   Dietary counseling provided.

3. CKD Stage 3a - eGFR 62, stable. Continue monitoring.

Follow-up in 4-6 weeks.

Electronically signed by: Dr. Sarah Chen, MD
Pacific Medical Center
Date: 12/15/2025',
    'Dr. Sarah Chen',
    '2025-12-15 09:45:00-08'
) ON CONFLICT (note_id) DO NOTHING;

-- Note 2: Lab review note
INSERT INTO notes_raw (note_id, patient_id, encounter_id, note_type, raw_text, author, created_at)
VALUES (
    2,
    'pt-demo-001',
    1,
    'lab_review',
    'LAB REVIEW NOTE - December 14, 2025

Patient: Robert Johnson (DOB: 03/15/1958, MRN: 12345678)

Labs drawn at LabCorp Seattle facility on 12/14/2025:

METABOLIC PANEL:
- Creatinine: 1.4 mg/dL (H) - Reference: 0.7-1.3
- eGFR: 62 mL/min/1.73m2 - Stage 3a CKD
- Potassium: 5.1 mEq/L (H) - Reference: 3.5-5.0
- Sodium: 140 mEq/L - Normal
- Glucose (fasting): 142 mg/dL (H) - Reference: 70-100

HBA1C: 7.8% - Above target of <7%

LIPID PANEL:
- Total Cholesterol: 195 mg/dL
- LDL: 110 mg/dL - At goal on statin
- HDL: 45 mg/dL
- Triglycerides: 180 mg/dL

Clinical Note: 
The elevated potassium level in combination with reduced kidney function warrants 
medication adjustment. Will discuss reducing ACE inhibitor dose at upcoming visit.
Patient contacted via phone at (555) 234-5678 to discuss results.

Reviewed by: Dr. Sarah Chen, MD
Pacific Medical Center, 500 University Street, Seattle, WA 98101',
    'Dr. Sarah Chen',
    '2025-12-14 14:30:00-08'
) ON CONFLICT (note_id) DO NOTHING;

-- Note 3: Telephone encounter
INSERT INTO notes_raw (note_id, patient_id, encounter_id, note_type, raw_text, author, created_at)
VALUES (
    3,
    'pt-demo-001',
    NULL,
    'telephone',
    'TELEPHONE ENCOUNTER - December 28, 2025

Patient: Robert Johnson
DOB: 03/15/1958
MRN: 12345678
Contact Number: (555) 234-5678

Call initiated by: Patient

Reason for Call:
Mr. Johnson called to report his home blood pressure readings since starting Amlodipine.
He has been monitoring daily as instructed.

Home BP Readings (Past Week):
12/22: 135/84
12/24: 132/80
12/26: 130/78
12/28: 128/80

Patient reports:
- No dizziness or lightheadedness
- Mild ankle swelling noted, began 3 days ago
- No chest pain or shortness of breath

Clinical Guidance Provided:
1. BP readings showing good improvement - continue current regimen
2. Mild ankle edema can be side effect of Amlodipine - monitor
3. If swelling worsens, call back or come in for evaluation
4. Keep follow-up appointment in January

Documented by: RN Patricia Williams
Reviewed by: Dr. Sarah Chen
Pacific Medical Center
Call Duration: 8 minutes',
    'RN Patricia Williams',
    '2025-12-28 10:15:00-08'
) ON CONFLICT (note_id) DO NOTHING;

-- Note 4: January follow-up note
INSERT INTO notes_raw (note_id, patient_id, encounter_id, note_type, raw_text, author, created_at)
VALUES (
    4,
    'pt-demo-001',
    2,
    'progress',
    'PROGRESS NOTE - January 20, 2026

Patient: Robert Johnson
DOB: 03/15/1958
MRN: 12345678
Insurance: Blue Cross Blue Shield, Policy #BCB-9876543

Chief Complaint: Follow-up for hypertension, diabetes, and medication adjustment review.

History of Present Illness:
Mr. Johnson returns for follow-up after medication changes made in December. He reports 
his blood pressure has been well-controlled at home, with most readings in the 125-135/75-82 range.
The previously noted ankle swelling has resolved. He denies dizziness or other side effects.

His daughter, Jennifer Johnson, accompanied him today and reports he has been more 
adherent with his low-sodium diet. She can be reached at (555) 345-6789 if needed.

Current Medications:
1. Lisinopril 10 mg daily (reduced from 20 mg in December)
2. Amlodipine 5 mg daily (started December)
3. Metformin 1000 mg BID
4. Atorvastatin 40 mg at bedtime

Vitals:
- BP: 128/82 mmHg - Improved!
- HR: 72 bpm
- Weight: 198 lbs (down 2 lbs)

Labs from January 19, 2026:
- A1C: 7.2% - Improved from 7.8%
- Creatinine: 1.3 mg/dL - Improved
- eGFR: 65 - Stable/improved
- Potassium: 4.6 mEq/L - Normalized!

Assessment & Plan:
1. Hypertension - Excellent response to medication adjustment. BP at goal.
   Continue Lisinopril 10mg and Amlodipine 5mg.

2. Type 2 Diabetes - A1C improved to 7.2%. Great progress!
   Continue Metformin. Reinforced dietary modifications.

3. CKD Stage 3a - eGFR stable at 65. Potassium normalized after dose reduction.
   The decision to reduce Lisinopril was appropriate.

4. Hyperlipidemia - Stable on Atorvastatin.

Great progress! Patient and family are pleased with improvements.
Follow-up in 3 months.

Electronically signed by: Dr. Sarah Chen, MD
Pacific Medical Center, 500 University Street, Seattle, WA 98101
Date: 01/20/2026',
    'Dr. Sarah Chen',
    '2026-01-20 11:15:00-08'
) ON CONFLICT (note_id) DO NOTHING;

-- Note 5: Care coordination note
INSERT INTO notes_raw (note_id, patient_id, encounter_id, note_type, raw_text, author, created_at)
VALUES (
    5,
    'pt-demo-001',
    2,
    'care_coordination',
    'CARE COORDINATION NOTE - January 20, 2026

Patient: Robert Johnson
DOB: 03/15/1958  
MRN: 12345678

Care Coordinator: Mary Thompson, RN, BSN
Contact: (555) 111-2222
Email: mary.thompson@pacificmedical.org

Care Team:
- PCP: Dr. Sarah Chen, MD - (555) 500-1000
- Nephrologist: Dr. James Wilson, MD - Seattle Kidney Care - (555) 600-2000
- Endocrinologist: Dr. Lisa Park, MD - Diabetes Care Associates - (555) 700-3000
- Pharmacy: Walgreens #4521 - (555) 800-4000

Care Plan Goals (90-day):
1. Maintain BP < 130/80
2. Achieve A1C < 7%
3. Preserve kidney function (eGFR > 60)
4. Weight loss goal: 5 lbs

Patient Resources Provided:
- Diabetes self-management class registration (Swedish Medical Center)
- Heart-healthy cookbook
- Home BP monitor instructions
- Medication reminder app recommendation

Next Steps:
- Nephrology referral appointment: February 15, 2026 at 2:00 PM
- Diabetes educator visit: February 1, 2026
- Lab recheck: March 15, 2026

Emergency Contact: Margaret Johnson (wife) - (555) 234-5678
Alternate Contact: Jennifer Johnson (daughter) - (555) 345-6789
Home Address: 1234 Oak Street, Seattle, WA 98101

Documented by: Mary Thompson, RN, BSN
Pacific Medical Center',
    'Mary Thompson, RN',
    '2026-01-20 12:00:00-08'
) ON CONFLICT (note_id) DO NOTHING;

-- Note 6: Patient education note
INSERT INTO notes_raw (note_id, patient_id, encounter_id, note_type, raw_text, author, created_at)
VALUES (
    6,
    'pt-demo-001',
    2,
    'education',
    'PATIENT EDUCATION NOTE - January 20, 2026

Patient: Robert Johnson
DOB: 03/15/1958
MRN: 12345678

Education Session Summary:

Topics Covered with Mr. Johnson and his daughter Jennifer:

1. UNDERSTANDING YOUR KIDNEY FUNCTION
   - Explained what eGFR means and current value of 65
   - Discussed importance of protecting kidneys with diabetes and hypertension
   - Reviewed why Lisinopril dose was reduced (potassium levels)

2. DIABETES MANAGEMENT
   - Reviewed carbohydrate counting basics
   - Discussed A1C goal and current improvement (7.8% → 7.2%)
   - Provided MyPlate handout for portion control
   - Recommended diabetes education class at Swedish Medical Center
     Class registration: (206) 555-8900

3. BLOOD PRESSURE MONITORING
   - Demonstrated proper technique for home BP monitoring
   - Reviewed target BP < 130/80
   - Created log sheet for recording readings
   - Patient demonstrated return understanding

4. MEDICATION SAFETY
   - Reviewed all current medications and timing
   - Discussed importance of taking Lisinopril even when feeling well
   - Cautioned about avoiding NSAIDs (ibuprofen, naproxen) due to kidney disease
   - Pharmacy contact: Walgreens #4521 - (555) 800-4000

Patient verbalized understanding of all topics.
Daughter Jennifer ((555) 345-6789) will assist with medication reminders.

Materials Provided:
- CKD diet guidelines
- Diabetes meal planning guide
- BP tracking log
- Medication list card for wallet

Educator: Susan Martinez, RN, CDE
Pacific Medical Center Diabetes Education Program
Direct line: (555) 500-1234',
    'Susan Martinez, RN',
    '2026-01-20 11:45:00-08'
) ON CONFLICT (note_id) DO NOTHING;

-- Reset note sequence
SELECT setval('notes_raw_note_id_seq', (SELECT MAX(note_id) FROM notes_raw));

-- ----------------------------------------------------------------------------
-- Process notes through PHI redaction pipeline
-- Note: This requires azure_ai extension to be properly configured.
-- If azure_ai is not configured, we'll insert placeholder data.
-- ----------------------------------------------------------------------------

-- First, try to process notes through the full pipeline
DO $$
DECLARE
    v_note RECORD;
    v_redact_result RECORD;
    v_embedding vector(1536);
BEGIN
    -- Check if azure_ai is properly configured by testing a simple call
    BEGIN
        -- Try to use the redact_phi function
        FOR v_note IN SELECT note_id, patient_id, encounter_id, raw_text FROM notes_raw LOOP
            BEGIN
                SELECT * INTO v_redact_result FROM redact_phi(v_note.raw_text, 'en');
                
                -- Try to generate embedding
                v_embedding := generate_embedding(v_redact_result.redacted_text);
                
                -- Insert into notes_phi
                INSERT INTO notes_phi (note_id, patient_id, encounter_id, redacted_text, phi_entities, embedding)
                VALUES (
                    v_note.note_id, 
                    v_note.patient_id, 
                    v_note.encounter_id, 
                    v_redact_result.redacted_text, 
                    v_redact_result.phi_entities, 
                    v_embedding
                )
                ON CONFLICT (note_id) DO UPDATE SET
                    redacted_text = EXCLUDED.redacted_text,
                    phi_entities = EXCLUDED.phi_entities,
                    embedding = EXCLUDED.embedding;
                    
                RAISE NOTICE 'Processed note % with PHI redaction', v_note.note_id;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not process note % through azure_ai: %', v_note.note_id, SQLERRM;
            END;
        END LOOP;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'azure_ai extension not configured. Inserting placeholder redacted data.';
    END;
END $$;

-- If notes_phi is empty (azure_ai not configured), insert demo placeholder data
INSERT INTO notes_phi (note_id, patient_id, encounter_id, redacted_text, phi_entities, embedding)
SELECT 
    nr.note_id,
    nr.patient_id,
    nr.encounter_id,
    -- Simple placeholder redaction (replace obvious PHI patterns)
    regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        nr.raw_text,
                        '\(\d{3}\)\s*\d{3}-\d{4}', '[PHONE]', 'g'
                    ),
                    '\d{1,2}/\d{1,2}/\d{4}', '[DATE]', 'g'
                ),
                'MRN[:\s]*\d+', '[MRN]', 'g'
            ),
            '\d+\s+\w+\s+Street[^,]*,\s*\w+,\s*\w{2}\s*\d{5}', '[ADDRESS]', 'g'
        ),
        'Robert Johnson|Margaret Johnson|Jennifer Johnson|Mary Thompson|Patricia Williams|Susan Martinez', 
        '[NAME]', 'g'
    ) as redacted_text,
    '[]'::jsonb as phi_entities,
    NULL as embedding
FROM notes_raw nr
WHERE NOT EXISTS (SELECT 1 FROM notes_phi np WHERE np.note_id = nr.note_id);

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Seed data loaded successfully. Check notes_phi for redacted notes.';
    RAISE NOTICE 'If azure_ai is configured, re-run ingest_note() for each raw note to get proper PHI redaction.';
END $$;
