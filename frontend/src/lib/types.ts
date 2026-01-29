/**
 * Patient 360 Frontend - TypeScript Type Definitions
 */

// =============================================================================
// Patient Types
// =============================================================================

export interface Patient {
  patient_id: string;
  display_name: string;
  dob: string;
  sex: string;
  mrn: string;
  age?: number;
}

export interface Problem {
  problem_id: number;
  display: string;
  status: string;
  onset_date?: string;
}

export interface Allergy {
  allergy_id: number;
  substance: string;
  reaction?: string;
  severity?: string;
}

export interface Medication {
  med_id: number;
  name: string;
  dose?: string;
  frequency?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  prescriber?: string;
  reason?: string;
}

export interface Vital {
  code: string;
  display: string;
  value?: string;
  unit?: string;
  observed_at?: string;
}

export interface PatientSnapshot {
  patient: Patient;
  problems: Problem[];
  allergies: Allergy[];
  active_medications: Medication[];
  key_vitals: Vital[];
  allow_raw_view: boolean;
}

// =============================================================================
// Timeline Types
// =============================================================================

export interface TimelineEvent {
  event_type: 'encounter' | 'note' | 'observation' | 'medication';
  event_id: number;
  event_time: string;
  event_subtype?: string;
  description?: string;
  details?: Record<string, unknown>;
}

export interface TimelineResponse {
  patient_id: string;
  events: TimelineEvent[];
  total_count: number;
}

// =============================================================================
// Note Types
// =============================================================================

export interface NoteDetail {
  note_id: number;
  patient_id: string;
  encounter_id?: number;
  note_type?: string;
  created_at: string;
  raw_text?: string;
  redacted_text: string;
  phi_entities?: PhiEntity[];
}

export interface PhiEntity {
  text: string;
  category: string;
  subcategory?: string;
  confidence: number;
  offset: number;
  length: number;
}

export interface NoteIngestRequest {
  raw_text: string;
  encounter_id?: number;
  note_type?: string;
  author?: string;
}

export interface NoteIngestResponse {
  note_id: number;
  patient_id: string;
  message: string;
  phi_entity_count: number;
}

// =============================================================================
// Copilot Types
// =============================================================================

export interface CopilotSource {
  source_type: 'note' | 'lab' | 'med';
  source_id: number;
  label: string;
  snippet: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface CopilotRequest {
  question: string;
  max_sources?: number;
}

export interface CopilotResponse {
  answer: string;
  next_actions: string[];
  sources: CopilotSource[];
  model_used?: string;
  retrieval_method: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: CopilotSource[];
  next_actions?: string[];
  retrieval_method?: string;
  isStreaming?: boolean;  // True while streaming response
}

// =============================================================================
// API Types
// =============================================================================

export interface HealthResponse {
  status: string;
  database: string;
  azure_ai: string;
  azure_openai: string;
  version: string;
}

export interface ApiError {
  error: string;
  detail?: string;
  code?: string;
}
