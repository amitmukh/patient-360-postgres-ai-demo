'use client';

import { useState, useEffect } from 'react';
import type { TimelineResponse, TimelineEvent, NoteDetail } from '@/lib/types';
import { formatDateTime, getEventIcon, getEventColor, getNote } from '@/lib/api';

interface TimelineProps {
  timeline: TimelineResponse | null;
  showRaw: boolean;
  allowRawView: boolean;
  patientId: string;
}

export function Timeline({ timeline, showRaw, allowRawView, patientId }: TimelineProps) {
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [noteDetail, setNoteDetail] = useState<NoteDetail | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);

  const handleNoteClick = async (noteId: number) => {
    if (expandedNote === noteId) {
      setExpandedNote(null);
      setNoteDetail(null);
      return;
    }

    setExpandedNote(noteId);
    setLoadingNote(true);

    try {
      const detail = await getNote(patientId, noteId, showRaw && allowRawView);
      setNoteDetail(detail);
    } catch (err) {
      console.error('Error loading note:', err);
    } finally {
      setLoadingNote(false);
    }
  };

  // Reload note when raw/redacted toggle changes
  useEffect(() => {
    if (expandedNote && allowRawView) {
      handleNoteClick(expandedNote);
    }
  }, [showRaw]);

  if (!timeline) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm border border-gray-100 p-8">
        <p className="text-gray-500 text-center">No timeline data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Clinical Timeline</h3>
              <p className="text-xs text-gray-500">Patient health events and records</p>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{timeline.total_count} events</span>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[calc(100vh-280px)] overflow-y-auto chat-scroll p-2">
        {timeline.events.map((event) => (
          <TimelineEventCard
            key={`${event.event_type}-${event.event_id}`}
            event={event}
            isExpanded={expandedNote === event.event_id && event.event_type === 'note'}
            noteDetail={noteDetail}
            loadingNote={loadingNote}
            showRaw={showRaw}
            allowRawView={allowRawView}
            onNoteClick={() => event.event_type === 'note' && handleNoteClick(event.event_id)}
          />
        ))}
        
        {timeline.events.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No clinical events found
          </div>
        )}
      </div>
    </div>
  );
}

interface TimelineEventCardProps {
  event: TimelineEvent;
  isExpanded: boolean;
  noteDetail: NoteDetail | null;
  loadingNote: boolean;
  showRaw: boolean;
  allowRawView: boolean;
  onNoteClick: () => void;
}

function TimelineEventCard({
  event,
  isExpanded,
  noteDetail,
  loadingNote,
  showRaw,
  allowRawView,
  onNoteClick,
}: TimelineEventCardProps) {
  const icon = getEventIcon(event.event_type);
  const colorClass = getEventColor(event.event_type);

  const isNote = event.event_type === 'note';
  const isClickable = isNote;

  return (
    <div
      className={`m-2 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={isClickable ? onNoteClick : undefined}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${colorClass}`}>
          <span className="text-base">{icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${colorClass}`}>
                  {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                </span>
                {event.event_subtype && (
                  <span className="text-xs text-gray-500 font-medium">
                    {event.event_subtype}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                {event.description}
              </p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md">
              {formatDateTime(event.event_time)}
            </span>
          </div>

          {/* Expanded Note Content */}
          {isNote && isExpanded && (
            <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-100">
              {loadingNote ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                  Loading note...
                </div>
              ) : noteDetail ? (
                <div>
                  {/* View Mode Indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${showRaw && allowRawView ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {showRaw && allowRawView ? '⚠️ Raw (PHI Visible)' : '🔒 PHI-Redacted'}
                    </span>
                    {noteDetail.phi_entities && noteDetail.phi_entities.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                        {noteDetail.phi_entities.length} PHI entities detected
                      </span>
                    )}
                  </div>
                  
                  {/* Note Text */}
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white p-4 rounded-xl border border-gray-200 max-h-64 overflow-y-auto shadow-inner">
                    {showRaw && allowRawView && noteDetail.raw_text
                      ? noteDetail.raw_text
                      : noteDetail.redacted_text}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Unable to load note content</p>
              )}
            </div>
          )}

          {/* Click hint for notes */}
          {isNote && !isExpanded && (
            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Click to expand note
            </p>
          )}

          {/* Additional details for other event types */}
          {!isNote && event.details && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(event.details).map(([key, value]) => {
                if (!value || key === 'encounter_id') return null;
                return (
                  <span
                    key={key}
                    className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-medium"
                  >
                    {key}: {String(value)}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
