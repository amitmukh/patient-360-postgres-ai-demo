'use client';

import { useState, useEffect } from 'react';
import type { CopilotSource, NoteDetail } from '@/lib/types';
import { getNote, getSourceTypeLabel, formatDateTime } from '@/lib/api';

interface SourceDrawerProps {
  isOpen: boolean;
  source: CopilotSource | null;
  patientId: string;
  showRaw: boolean;
  allowRawView: boolean;
  onClose: () => void;
}

export function SourceDrawer({
  isOpen,
  source,
  patientId,
  showRaw,
  allowRawView,
  onClose,
}: SourceDrawerProps) {
  const [noteDetail, setNoteDetail] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && source && source.source_type === 'note') {
      loadNoteDetail();
    } else {
      setNoteDetail(null);
    }
  }, [isOpen, source, showRaw]);

  const loadNoteDetail = async () => {
    if (!source) return;

    setLoading(true);
    setError(null);

    try {
      const detail = await getNote(patientId, source.source_id, showRaw && allowRawView);
      setNoteDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load note');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Source Details</h3>
            {source && (
              <p className="text-sm text-gray-500">
                {getSourceTypeLabel(source.source_type)} • Score: {(source.score * 100).toFixed(0)}%
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!source ? (
            <p className="text-gray-500 text-center py-8">No source selected</p>
          ) : source.source_type === 'note' ? (
            <NoteSourceContent
              source={source}
              noteDetail={noteDetail}
              loading={loading}
              error={error}
              showRaw={showRaw}
              allowRawView={allowRawView}
            />
          ) : source.source_type === 'lab' ? (
            <LabSourceContent source={source} />
          ) : source.source_type === 'med' ? (
            <MedSourceContent source={source} />
          ) : (
            <GenericSourceContent source={source} />
          )}
        </div>
      </div>
    </>
  );
}

interface NoteSourceContentProps {
  source: CopilotSource;
  noteDetail: NoteDetail | null;
  loading: boolean;
  error: string | null;
  showRaw: boolean;
  allowRawView: boolean;
}

function NoteSourceContent({
  source,
  noteDetail,
  loading,
  error,
  showRaw,
  allowRawView,
}: NoteSourceContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900">{source.label}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
            Clinical Note
          </span>
          {noteDetail && (
            <span className="text-xs text-gray-500">
              {formatDateTime(noteDetail.created_at)}
            </span>
          )}
        </div>
      </div>

      {/* View Mode Indicator */}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded ${
          showRaw && allowRawView
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {showRaw && allowRawView ? '⚠️ Raw View (PHI Visible)' : '✓ PHI-Redacted View'}
        </span>
      </div>

      {/* Note Content */}
      <div className="bg-gray-50 rounded-lg p-4">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
          {noteDetail
            ? (showRaw && allowRawView && noteDetail.raw_text
                ? noteDetail.raw_text
                : noteDetail.redacted_text)
            : source.snippet}
        </pre>
      </div>

      {/* PHI Entities */}
      {noteDetail?.phi_entities && noteDetail.phi_entities.length > 0 && allowRawView && (
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-2">
            Detected PHI Entities ({noteDetail.phi_entities.length})
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {noteDetail.phi_entities.map((entity, idx) => (
              <div
                key={idx}
                className="text-xs p-2 bg-red-50 rounded border border-red-100"
              >
                <div className="font-medium text-red-800">{entity.category}</div>
                <div className="text-red-600 truncate">{entity.text}</div>
                <div className="text-red-400">
                  Confidence: {(entity.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relevance Score */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Relevance Score:</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${source.score * 100}%` }}
          />
        </div>
        <span className="font-medium text-gray-700">{(source.score * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

interface LabSourceContentProps {
  source: CopilotSource;
}

function LabSourceContent({ source }: LabSourceContentProps) {
  const metadata = source.metadata || {};

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold text-gray-900">{source.label}</h4>
        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
          Lab Result
        </span>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {source.snippet}
        </div>
        {!!metadata.code && (
          <div className="text-sm text-gray-500">Code: {metadata.code as string}</div>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        {!!metadata.observed_at && (
          <div>
            <div className="text-xs text-gray-500">Observed</div>
            <div className="text-sm font-medium">{formatDateTime(metadata.observed_at as string)}</div>
          </div>
        )}
        {!!metadata.unit && (
          <div>
            <div className="text-xs text-gray-500">Unit</div>
            <div className="text-sm font-medium">{metadata.unit as string}</div>
          </div>
        )}
      </div>

      {/* Relevance */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Relevance:</span>
        <span className="font-medium">{(source.score * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

interface MedSourceContentProps {
  source: CopilotSource;
}

function MedSourceContent({ source }: MedSourceContentProps) {
  const metadata = source.metadata || {};

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold text-gray-900">{source.label}</h4>
        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
          Medication
        </span>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-lg font-medium text-gray-900">{source.snippet}</div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        {!!metadata.status && (
          <div>
            <div className="text-xs text-gray-500">Status</div>
            <div className={`text-sm font-medium ${
              metadata.status === 'active' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {(metadata.status as string).charAt(0).toUpperCase() + (metadata.status as string).slice(1)}
            </div>
          </div>
        )}
        {!!metadata.dose && (
          <div>
            <div className="text-xs text-gray-500">Dose</div>
            <div className="text-sm font-medium">{metadata.dose as string}</div>
          </div>
        )}
        {!!metadata.frequency && (
          <div>
            <div className="text-xs text-gray-500">Frequency</div>
            <div className="text-sm font-medium">{metadata.frequency as string}</div>
          </div>
        )}
        {!!metadata.prescriber && (
          <div>
            <div className="text-xs text-gray-500">Prescriber</div>
            <div className="text-sm font-medium">{metadata.prescriber as string}</div>
          </div>
        )}
      </div>

      {!!metadata.reason && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Reason</div>
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
            {metadata.reason as string}
          </div>
        </div>
      )}

      {/* Relevance */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Relevance:</span>
        <span className="font-medium">{(source.score * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

interface GenericSourceContentProps {
  source: CopilotSource;
}

function GenericSourceContent({ source }: GenericSourceContentProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold text-gray-900">{source.label}</h4>
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
          {source.source_type}
        </span>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-700">{source.snippet}</p>
      </div>

      {source.metadata && Object.keys(source.metadata).length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-2">Metadata</h5>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(source.metadata, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Relevance:</span>
        <span className="font-medium">{(source.score * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
