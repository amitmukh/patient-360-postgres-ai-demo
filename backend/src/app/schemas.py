"""
Patient 360 Backend - Pydantic Schemas

Defines all request/response models for the API.
"""

from datetime import date, datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# =============================================================================
# Patient Schemas
# =============================================================================

class PatientBase(BaseModel):
    """Base patient information."""
    patient_id: str
    display_name: str
    dob: date
    sex: str
    mrn: str
    age: Optional[int] = None


class Problem(BaseModel):
    """Patient problem/diagnosis."""
    problem_id: int
    display: str
    status: str
    onset_date: Optional[date] = None


class Allergy(BaseModel):
    """Patient allergy record."""
    allergy_id: int
    substance: str
    reaction: Optional[str] = None
    severity: Optional[str] = None


class Medication(BaseModel):
    """Patient medication record."""
    med_id: int
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    prescriber: Optional[str] = None
    reason: Optional[str] = None


class Vital(BaseModel):
    """Patient vital sign / observation."""
    code: str
    display: str
    value: Optional[str] = None
    unit: Optional[str] = None
    observed_at: Optional[datetime] = None


class PatientSnapshot(BaseModel):
    """Complete patient snapshot for dashboard."""
    patient: PatientBase
    problems: list[Problem] = []
    allergies: list[Allergy] = []
    active_medications: list[Medication] = []
    key_vitals: list[Vital] = []
    allow_raw_view: bool = False


# =============================================================================
# Timeline Schemas
# =============================================================================

class TimelineEvent(BaseModel):
    """Single timeline event."""
    event_type: str  # encounter, note, observation, medication
    event_id: int
    event_time: datetime
    event_subtype: Optional[str] = None
    description: Optional[str] = None
    details: Optional[dict[str, Any]] = None


class TimelineResponse(BaseModel):
    """Timeline response."""
    patient_id: str
    events: list[TimelineEvent]
    total_count: int


# =============================================================================
# Note Schemas
# =============================================================================

class NoteIngestRequest(BaseModel):
    """Request to ingest a new clinical note."""
    raw_text: str = Field(..., min_length=10, max_length=50000)
    encounter_id: Optional[int] = None
    note_type: str = "progress"
    author: Optional[str] = None


class NoteIngestResponse(BaseModel):
    """Response after ingesting a note."""
    note_id: int
    patient_id: str
    message: str
    phi_entity_count: int


class NoteDetail(BaseModel):
    """Detailed note information."""
    note_id: int
    patient_id: str
    encounter_id: Optional[int] = None
    note_type: Optional[str] = None
    created_at: datetime
    # Conditionally included based on permissions
    raw_text: Optional[str] = None
    redacted_text: str
    phi_entities: Optional[list[dict]] = None


# =============================================================================
# Copilot Schemas
# =============================================================================

class CopilotSource(BaseModel):
    """A source citation for Copilot answer."""
    source_type: str  # note, lab, med
    source_id: int
    label: str
    snippet: str
    score: float
    metadata: Optional[dict[str, Any]] = None


class CopilotRequest(BaseModel):
    """Request to ask Copilot a question."""
    question: str = Field(..., min_length=3, max_length=2000)
    max_sources: int = Field(default=5, ge=1, le=20)


class CopilotResponse(BaseModel):
    """Copilot response with answer and citations."""
    answer: str
    next_actions: list[str]
    sources: list[CopilotSource]
    model_used: Optional[str] = None
    retrieval_method: str  # vector, keyword, hybrid


# =============================================================================
# Health Check
# =============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    database: str
    azure_ai: str
    azure_openai: str
    version: str = "1.0.0"


# =============================================================================
# Error Response
# =============================================================================

class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
