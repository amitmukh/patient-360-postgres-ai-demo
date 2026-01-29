"""
Patient 360 Backend - Patient Routes

Endpoints for patient snapshot and timeline data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db import execute_one, execute_query
from app.settings import get_settings
from app.schemas import (
    PatientSnapshot, PatientBase, Problem, Allergy, 
    Medication, Vital, TimelineResponse, TimelineEvent,
    NoteDetail
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{patient_id}/snapshot", response_model=PatientSnapshot)
async def get_patient_snapshot(patient_id: str) -> PatientSnapshot:
    """
    Get comprehensive patient snapshot for the dashboard.
    
    Includes:
    - Patient demographics
    - Active problems
    - Allergies
    - Active medications
    - Key vitals (BP, A1C, eGFR, etc.)
    """
    settings = get_settings()
    
    # Call the database function
    result = await execute_one(
        "SELECT get_patient_snapshot($1) as snapshot",
        patient_id
    )
    
    if not result or not result.get("snapshot"):
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    snapshot_data = result["snapshot"]
    
    # Handle if snapshot_data is a string (JSON)
    if isinstance(snapshot_data, str):
        snapshot_data = json.loads(snapshot_data)
    
    # Check if patient data exists
    if not snapshot_data.get("patient"):
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    patient_data = snapshot_data["patient"]
    
    return PatientSnapshot(
        patient=PatientBase(
            patient_id=patient_data.get("patient_id", patient_id),
            display_name=patient_data.get("display_name", "Unknown"),
            dob=patient_data.get("dob"),
            sex=patient_data.get("sex", "U"),
            mrn=patient_data.get("mrn", ""),
            age=patient_data.get("age")
        ),
        problems=[
            Problem(**p) for p in snapshot_data.get("problems", [])
        ],
        allergies=[
            Allergy(**a) for a in snapshot_data.get("allergies", [])
        ],
        active_medications=[
            Medication(**m) for m in snapshot_data.get("active_medications", [])
        ],
        key_vitals=[
            Vital(**v) for v in snapshot_data.get("key_vitals", [])
        ],
        allow_raw_view=settings.demo_allow_raw
    )


@router.get("/{patient_id}/timeline", response_model=TimelineResponse)
async def get_patient_timeline(
    patient_id: str,
    limit: int = Query(default=50, ge=1, le=200)
) -> TimelineResponse:
    """
    Get chronological timeline of clinical events.
    
    Includes encounters, notes, observations, and medication changes.
    """
    # Verify patient exists
    patient = await execute_one(
        "SELECT patient_id FROM patients WHERE patient_id = $1",
        patient_id
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    # Get timeline from database function
    result = await execute_one(
        "SELECT get_patient_timeline($1, $2) as timeline",
        patient_id, limit
    )
    
    timeline_data = result.get("timeline", []) if result else []
    
    # Handle if timeline_data is a string (JSON)
    if isinstance(timeline_data, str):
        timeline_data = json.loads(timeline_data)
    
    events = [
        TimelineEvent(
            event_type=e.get("event_type", "unknown"),
            event_id=e.get("event_id", 0),
            event_time=e.get("event_time"),
            event_subtype=e.get("event_subtype"),
            description=e.get("description"),
            details=e.get("details")
        )
        for e in timeline_data
    ]
    
    return TimelineResponse(
        patient_id=patient_id,
        events=events,
        total_count=len(events)
    )


@router.get("/{patient_id}/notes/{note_id}", response_model=NoteDetail)
async def get_note(
    patient_id: str,
    note_id: int,
    include_raw: bool = Query(default=False)
) -> NoteDetail:
    """
    Get a specific note by ID.
    
    Raw text is only included if DEMO_ALLOW_RAW is true AND include_raw is requested.
    """
    settings = get_settings()
    
    # Get PHI-redacted note
    note = await execute_one(
        """
        SELECT 
            np.note_id,
            np.patient_id,
            np.encounter_id,
            np.redacted_text,
            np.phi_entities,
            np.created_at,
            nr.note_type,
            nr.raw_text
        FROM notes_phi np
        JOIN notes_raw nr ON nr.note_id = np.note_id
        WHERE np.patient_id = $1 AND np.note_id = $2
        """,
        patient_id, note_id
    )
    
    if not note:
        raise HTTPException(status_code=404, detail=f"Note {note_id} not found")
    
    # Only include raw text if allowed and requested
    raw_text = None
    if settings.demo_allow_raw and include_raw:
        raw_text = note.get("raw_text")
    
    phi_entities = note.get("phi_entities", [])
    if isinstance(phi_entities, str):
        phi_entities = json.loads(phi_entities)
    
    return NoteDetail(
        note_id=note["note_id"],
        patient_id=note["patient_id"],
        encounter_id=note.get("encounter_id"),
        note_type=note.get("note_type"),
        created_at=note["created_at"],
        raw_text=raw_text,
        redacted_text=note["redacted_text"],
        phi_entities=phi_entities if settings.demo_allow_raw else None
    )


@router.get("/{patient_id}/medications", response_model=list[Medication])
async def get_medications(
    patient_id: str,
    status: Optional[str] = Query(default=None)
) -> list[Medication]:
    """Get all medications for a patient, optionally filtered by status."""
    
    if status:
        query = """
            SELECT med_id, name, dose, frequency, status, start_date, end_date, prescriber, reason
            FROM medications
            WHERE patient_id = $1 AND status = $2
            ORDER BY start_date DESC
        """
        results = await execute_query(query, patient_id, status)
    else:
        query = """
            SELECT med_id, name, dose, frequency, status, start_date, end_date, prescriber, reason
            FROM medications
            WHERE patient_id = $1
            ORDER BY start_date DESC
        """
        results = await execute_query(query, patient_id)
    
    return [Medication(**med) for med in results]


@router.get("/{patient_id}/observations", response_model=list[Vital])
async def get_observations(
    patient_id: str,
    code: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200)
) -> list[Vital]:
    """Get observations for a patient, optionally filtered by code."""
    
    if code:
        query = """
            SELECT code, display, 
                   COALESCE(value_text, value_num::text) as value,
                   unit, observed_at
            FROM observations
            WHERE patient_id = $1 AND code = $2
            ORDER BY observed_at DESC LIMIT $3
        """
        results = await execute_query(query, patient_id, code, limit)
    else:
        query = """
            SELECT code, display, 
                   COALESCE(value_text, value_num::text) as value,
                   unit, observed_at
            FROM observations
            WHERE patient_id = $1
            ORDER BY observed_at DESC LIMIT $2
        """
        results = await execute_query(query, patient_id, limit)
    
    return [Vital(**obs) for obs in results]
