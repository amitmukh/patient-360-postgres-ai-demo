"""
Patient 360 Backend - Clinical Actions Route

CRUD operations for clinical actions (AI-suggested, doctor-edited).
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import execute_one, execute_query, execute_command

logger = logging.getLogger(__name__)
router = APIRouter()


# Request/Response Models
class ActionCreate(BaseModel):
    action_text: str
    status: str = "pending"  # pending, in_progress, completed, dismissed
    priority: str = "normal"  # low, normal, high, urgent
    source: str = "ai_suggested"
    original_ai_text: Optional[str] = None
    related_question: Optional[str] = None
    related_sources: Optional[list] = None
    created_by: Optional[str] = None
    doctor_notes: Optional[str] = None


class ActionUpdate(BaseModel):
    action_text: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    doctor_notes: Optional[str] = None
    updated_by: Optional[str] = None


class ActionResponse(BaseModel):
    action_id: int
    patient_id: str
    action_text: str
    status: str
    priority: str
    source: str
    original_ai_text: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    doctor_notes: Optional[str] = None


class BulkActionCreate(BaseModel):
    actions: List[ActionCreate]
    related_question: Optional[str] = None
    related_sources: Optional[list] = None


@router.get("/{patient_id}/actions", response_model=List[ActionResponse])
async def get_patient_actions(
    patient_id: str,
    status: Optional[str] = None
) -> List[ActionResponse]:
    """Get all clinical actions for a patient, optionally filtered by status."""
    
    query = """
        SELECT action_id, patient_id, action_text, status, priority, source,
               original_ai_text, created_by, created_at, updated_at, doctor_notes
        FROM clinical_actions
        WHERE patient_id = $1
    """
    params = [patient_id]
    
    if status:
        query += " AND status = $2"
        params.append(status)
    
    query += " ORDER BY created_at DESC"
    
    results = await execute_query(query, *params)
    
    return [ActionResponse(**row) for row in results]


@router.post("/{patient_id}/actions", response_model=ActionResponse)
async def create_action(patient_id: str, action: ActionCreate) -> ActionResponse:
    """Create a new clinical action for a patient."""
    
    # Verify patient exists
    patient = await execute_one(
        "SELECT patient_id FROM patients WHERE patient_id = $1",
        patient_id
    )
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    result = await execute_one(
        """
        INSERT INTO clinical_actions (
            patient_id, action_text, status, priority, source, original_ai_text,
            related_question, related_sources, created_by, doctor_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING action_id, patient_id, action_text, status, priority, source,
                  original_ai_text, created_by, created_at, updated_at, doctor_notes
        """,
        patient_id,
        action.action_text,
        action.status,
        action.priority,
        action.source,
        action.original_ai_text,
        action.related_question,
        action.related_sources,
        action.created_by,
        action.doctor_notes
    )
    
    logger.info(f"Created action {result['action_id']} for patient {patient_id}")
    return ActionResponse(**result)


@router.post("/{patient_id}/actions/bulk", response_model=List[ActionResponse])
async def create_actions_bulk(patient_id: str, bulk: BulkActionCreate) -> List[ActionResponse]:
    """Create multiple clinical actions at once (for saving AI suggestions)."""
    
    # Verify patient exists
    patient = await execute_one(
        "SELECT patient_id FROM patients WHERE patient_id = $1",
        patient_id
    )
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    created_actions = []
    
    for action in bulk.actions:
        result = await execute_one(
            """
            INSERT INTO clinical_actions (
                patient_id, action_text, status, priority, source, original_ai_text,
                related_question, related_sources, created_by, doctor_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING action_id, patient_id, action_text, status, priority, source,
                      original_ai_text, created_by, created_at, updated_at, doctor_notes
            """,
            patient_id,
            action.action_text,
            action.status,
            action.priority,
            action.source,
            action.original_ai_text or action.action_text,  # Store original if not provided
            bulk.related_question or action.related_question,
            bulk.related_sources or action.related_sources,
            action.created_by,
            action.doctor_notes
        )
        created_actions.append(ActionResponse(**result))
    
    logger.info(f"Created {len(created_actions)} actions for patient {patient_id}")
    return created_actions


@router.put("/{patient_id}/actions/{action_id}", response_model=ActionResponse)
async def update_action(
    patient_id: str,
    action_id: int,
    update: ActionUpdate
) -> ActionResponse:
    """Update a clinical action (edit text, change status, add notes)."""
    
    # Build dynamic update query
    updates = []
    params = []
    param_idx = 1
    
    if update.action_text is not None:
        updates.append(f"action_text = ${param_idx}")
        params.append(update.action_text)
        param_idx += 1
    
    if update.status is not None:
        updates.append(f"status = ${param_idx}")
        params.append(update.status)
        param_idx += 1
        
        # Set completed_at if status is completed
        if update.status == "completed":
            updates.append(f"completed_at = NOW()")
    
    if update.priority is not None:
        updates.append(f"priority = ${param_idx}")
        params.append(update.priority)
        param_idx += 1
    
    if update.doctor_notes is not None:
        updates.append(f"doctor_notes = ${param_idx}")
        params.append(update.doctor_notes)
        param_idx += 1
    
    if update.updated_by is not None:
        updates.append(f"updated_by = ${param_idx}")
        params.append(update.updated_by)
        param_idx += 1
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    
    # Add WHERE clause params
    params.append(action_id)
    params.append(patient_id)
    
    query = f"""
        UPDATE clinical_actions
        SET {', '.join(updates)}
        WHERE action_id = ${param_idx} AND patient_id = ${param_idx + 1}
        RETURNING action_id, patient_id, action_text, status, priority, source,
                  original_ai_text, created_by, created_at, updated_at, doctor_notes
    """
    
    result = await execute_one(query, *params)
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    logger.info(f"Updated action {action_id} for patient {patient_id}")
    return ActionResponse(**result)


@router.delete("/{patient_id}/actions/{action_id}")
async def delete_action(patient_id: str, action_id: int):
    """Delete a clinical action."""
    
    result = await execute_one(
        """
        DELETE FROM clinical_actions
        WHERE action_id = $1 AND patient_id = $2
        RETURNING action_id
        """,
        action_id,
        patient_id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    logger.info(f"Deleted action {action_id} for patient {patient_id}")
    return {"message": "Action deleted", "action_id": action_id}
