"""
Patient 360 Backend - Note Ingestion Route

Handles ingestion of clinical notes through the PHI-safe pipeline.
"""

import json
import logging

from fastapi import APIRouter, HTTPException

from app.db import execute_one, execute_scalar, execute_query, execute_command, get_connection
from app.schemas import NoteIngestRequest, NoteIngestResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{patient_id}/notes:ingest", response_model=NoteIngestResponse)
async def ingest_note(patient_id: str, request: NoteIngestRequest) -> NoteIngestResponse:
    """
    Ingest a new clinical note through the PHI-safe pipeline.
    
    The ingestion process:
    1. Stores raw note in notes_raw table
    2. Calls redact_phi() to remove PHI using Azure AI Language
    3. Generates embedding for redacted text using Azure OpenAI
    4. Stores redacted note with embedding in notes_phi
    
    All processing happens in the database via the ingest_note() SQL function.
    """
    # Verify patient exists
    patient = await execute_one(
        "SELECT patient_id FROM patients WHERE patient_id = $1",
        patient_id
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    # Validate encounter if provided
    if request.encounter_id:
        encounter = await execute_one(
            "SELECT encounter_id FROM encounters WHERE encounter_id = $1 AND patient_id = $2",
            request.encounter_id, patient_id
        )
        if not encounter:
            raise HTTPException(
                status_code=400, 
                detail=f"Encounter {request.encounter_id} not found for patient {patient_id}"
            )
    
    try:
        # Call the ingest_note SQL function
        note_id = await execute_scalar(
            "SELECT ingest_note($1, $2, $3, $4, $5)",
            patient_id,
            request.encounter_id,
            request.raw_text,
            request.note_type,
            request.author
        )
        
        if not note_id:
            raise HTTPException(status_code=500, detail="Failed to ingest note")
        
        # Get PHI entity count
        phi_result = await execute_one(
            "SELECT phi_entities FROM notes_phi WHERE note_id = $1",
            note_id
        )
        
        phi_entities = phi_result.get("phi_entities", []) if phi_result else []
        if isinstance(phi_entities, str):
            phi_entities = json.loads(phi_entities)
        
        phi_count = len(phi_entities) if phi_entities else 0
        
        logger.info(f"Successfully ingested note {note_id} for patient {patient_id}, detected {phi_count} PHI entities")
        
        return NoteIngestResponse(
            note_id=note_id,
            patient_id=patient_id,
            message=f"Note ingested successfully. Detected and redacted {phi_count} PHI entities.",
            phi_entity_count=phi_count
        )
        
    except Exception as e:
        logger.error(f"Error ingesting note for patient {patient_id}: {str(e)}")
        
        # Check if it's a known error type
        error_msg = str(e)
        
        if "azure_cognitive" in error_msg.lower() or "azure_ai" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Azure AI Language service unavailable. Please check configuration."
            )
        
        raise HTTPException(status_code=500, detail=f"Failed to ingest note: {error_msg}")


@router.post("/{patient_id}/notes:reprocess")
async def reprocess_notes(patient_id: str) -> dict:
    """
    Reprocess all raw notes for a patient through the PHI pipeline.
    
    Useful if Azure AI was not configured during initial ingestion
    and you want to regenerate redacted notes with proper PHI detection.
    """
    # Verify patient exists
    patient = await execute_one(
        "SELECT patient_id FROM patients WHERE patient_id = $1",
        patient_id
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    # Get all raw notes for the patient
    raw_notes = await execute_query(
        "SELECT note_id, encounter_id, raw_text, note_type, author FROM notes_raw WHERE patient_id = $1",
        patient_id
    )
    
    if not raw_notes:
        return {"message": "No notes found to reprocess", "processed": 0}
    
    processed = 0
    errors = []
    
    for note in raw_notes:
        try:
            # Delete existing PHI note if exists
            await execute_command(
                "DELETE FROM notes_phi WHERE note_id = $1",
                note["note_id"]
            )
            
            # Reprocess through ingest (but note already exists in raw)
            # We need to call redact and embed directly
            result = await execute_one(
                """
                WITH redaction AS (
                    SELECT * FROM redact_phi($1, 'en')
                )
                INSERT INTO notes_phi (note_id, patient_id, encounter_id, redacted_text, phi_entities, embedding)
                SELECT 
                    $2,
                    $3,
                    $4,
                    r.redacted_text,
                    r.phi_entities,
                    generate_embedding(r.redacted_text)
                FROM redaction r
                RETURNING note_id
                """,
                note["raw_text"], note["note_id"], patient_id, note.get("encounter_id")
            )
            
            if result:
                processed += 1
                
        except Exception as e:
            errors.append({"note_id": note["note_id"], "error": str(e)})
    
    return {
        "message": f"Reprocessed {processed} of {len(raw_notes)} notes",
        "processed": processed,
        "total": len(raw_notes),
        "errors": errors if errors else None
    }
