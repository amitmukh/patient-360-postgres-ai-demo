/**
 * Patient 360 Frontend - API Client
 */

import type {
  PatientSnapshot,
  TimelineResponse,
  NoteDetail,
  NoteIngestRequest,
  NoteIngestResponse,
  CopilotRequest,
  CopilotResponse,
  HealthResponse,
  ApiError,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * Custom error class for API errors
 */
export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly detail?: string;
  public readonly code?: string;

  constructor(message: string, status: number, detail?: string, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: ApiError | null = null;
    
    try {
      errorData = await response.json();
    } catch {
      // Response is not JSON
    }

    throw new ApiRequestError(
      errorData?.error || `Request failed with status ${response.status}`,
      response.status,
      errorData?.detail,
      errorData?.code
    );
  }

  return response.json();
}

// =============================================================================
// Health API
// =============================================================================

export async function getHealth(): Promise<HealthResponse> {
  return fetchApi<HealthResponse>('/health');
}

// =============================================================================
// Patient API
// =============================================================================

export async function getPatientSnapshot(patientId: string): Promise<PatientSnapshot> {
  return fetchApi<PatientSnapshot>(`/patients/${patientId}/snapshot`);
}

export async function getPatientTimeline(
  patientId: string,
  limit: number = 50
): Promise<TimelineResponse> {
  return fetchApi<TimelineResponse>(`/patients/${patientId}/timeline?limit=${limit}`);
}

// =============================================================================
// Notes API
// =============================================================================

export async function getNote(
  patientId: string,
  noteId: number,
  includeRaw: boolean = false
): Promise<NoteDetail> {
  return fetchApi<NoteDetail>(
    `/patients/${patientId}/notes/${noteId}?include_raw=${includeRaw}`
  );
}

export async function ingestNote(
  patientId: string,
  request: NoteIngestRequest
): Promise<NoteIngestResponse> {
  return fetchApi<NoteIngestResponse>(`/patients/${patientId}/notes:ingest`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// =============================================================================
// Copilot API
// =============================================================================

/**
 * Non-streaming Copilot request (fallback if streaming not supported)
 * @deprecated Use streamCopilot for better UX with real-time response display
 */
export async function askCopilot(
  patientId: string,
  request: CopilotRequest
): Promise<CopilotResponse> {
  return fetchApi<CopilotResponse>(`/patients/${patientId}/copilot:ask`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Streaming event types from the Copilot SSE endpoint
 */
export interface CopilotStreamEvent {
  type: 'metadata' | 'source' | 'delta' | 'actions' | 'done' | 'error';
  data: unknown;
}

export interface CopilotStreamCallbacks {
  onMetadata?: (data: { retrieval_method: string }) => void;
  onSource?: (source: import('./types').CopilotSource) => void;
  onDelta?: (text: string) => void;
  onActions?: (actions: string[]) => void;
  onDone?: (data: { model: string | null; retrieval_method: string }) => void;
  onError?: (error: string) => void;
}

/**
 * Stream a Copilot response using Server-Sent Events
 */
export async function streamCopilot(
  patientId: string,
  request: CopilotRequest,
  callbacks: CopilotStreamCallbacks
): Promise<void> {
  const url = `${API_BASE_URL}/patients/${patientId}/copilot:stream`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorData: ApiError | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Response is not JSON
    }
    throw new ApiRequestError(
      errorData?.error || `Request failed with status ${response.status}`,
      response.status,
      errorData?.detail,
      errorData?.code
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete events from buffer
      const lines = buffer.split('\n');
      buffer = '';
      
      let currentEvent = '';
      let currentData = '';
      
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6);
        } else if (line === '' && currentEvent && currentData) {
          // End of event, process it
          try {
            const parsedData = JSON.parse(currentData);
            
            switch (currentEvent) {
              case 'metadata':
                callbacks.onMetadata?.(parsedData);
                break;
              case 'source':
                callbacks.onSource?.(parsedData);
                break;
              case 'delta':
                callbacks.onDelta?.(parsedData.text);
                break;
              case 'actions':
                callbacks.onActions?.(parsedData.actions);
                break;
              case 'done':
                callbacks.onDone?.(parsedData);
                break;
              case 'error':
                callbacks.onError?.(parsedData.error);
                break;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', currentData, e);
          }
          
          currentEvent = '';
          currentData = '';
        } else if (line !== '') {
          // Incomplete line, add back to buffer
          buffer += line + '\n';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'encounter':
      return '🏥';
    case 'note':
      return '📝';
    case 'observation':
      return '🔬';
    case 'medication':
      return '💊';
    default:
      return '📋';
  }
}

export function getEventColor(eventType: string): string {
  switch (eventType) {
    case 'encounter':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'note':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'observation':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'medication':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getSourceTypeLabel(sourceType: string): string {
  switch (sourceType) {
    case 'note':
      return 'Clinical Note';
    case 'lab':
      return 'Lab Result';
    case 'med':
      return 'Medication';
    default:
      return 'Source';
  }
}
