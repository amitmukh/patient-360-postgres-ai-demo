'use client';

import { useState } from 'react';
import type { PatientSnapshot } from '@/lib/types';
import { formatDate } from '@/lib/api';
import { RawRedactedToggle } from './RawRedactedToggle';
import { ingestNote } from '@/lib/api';

interface PatientHeaderProps {
  snapshot: PatientSnapshot;
  showRaw: boolean;
  onToggleRaw: (value: boolean) => void;
  onNoteIngested: () => void;
}

export function PatientHeader({
  snapshot,
  showRaw,
  onToggleRaw,
  onNoteIngested,
}: PatientHeaderProps) {
  const { patient, problems, allergies, active_medications, key_vitals, allow_raw_view } = snapshot;
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  const handleIngestNote = async () => {
    if (!noteText.trim()) return;
    
    setIngesting(true);
    setIngestError(null);
    setIngestSuccess(null);
    
    try {
      const result = await ingestNote(patient.patient_id, {
        raw_text: noteText,
        note_type: 'progress',
      });
      
      setIngestSuccess(result.message);
      setNoteText('');
      onNoteIngested();
      
      // Close modal after short delay
      setTimeout(() => {
        setShowIngestModal(false);
        setIngestSuccess(null);
      }, 2000);
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Failed to ingest note');
    } finally {
      setIngesting(false);
    }
  };

  // Get specific vitals
  const getVital = (code: string) => {
    return key_vitals.find(v => v.code === code);
  };

  const bp = getVital('BP');
  const a1c = getVital('A1C');
  const egfr = getVital('eGFR');

  return (
    <div className="space-y-4 p-4">
      {/* Patient Demographics Card */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm border border-gray-100 p-5 card-hover">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="text-xl font-bold text-white">
                {patient.display_name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {patient.display_name}
              </h2>
              <p className="text-sm text-gray-500">
                {patient.age}yo {patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : 'Other'} • MRN: {patient.mrn}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-2.5">
            <span className="text-xs text-gray-500 uppercase tracking-wide">DOB</span>
            <p className="font-semibold text-gray-800">{formatDate(patient.dob)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Sex</span>
            <p className="font-semibold text-gray-800">{patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : 'Other'}</p>
          </div>
        </div>
      </div>

      {/* Key Vitals */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm border border-gray-100 p-5 card-hover">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-700">Key Vitals</h3>
        </div>
        <div className="space-y-2">
          {bp && (
            <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Blood Pressure</span>
              <span className="text-sm font-bold text-gray-900 bg-white px-2.5 py-1 rounded-md shadow-sm">{bp.value}</span>
            </div>
          )}
          {a1c && (
            <div className="flex justify-between items-center py-2 px-3 bg-amber-50 rounded-lg border border-amber-100">
              <span className="text-sm text-gray-600">A1C</span>
              <span className="text-sm font-bold text-amber-700 bg-white px-2.5 py-1 rounded-md shadow-sm">{a1c.value}%</span>
            </div>
          )}
          {egfr && (
            <div className="flex justify-between items-center py-2 px-3 bg-red-50 rounded-lg border border-red-100">
              <span className="text-sm text-gray-600">eGFR</span>
              <span className="text-sm font-bold text-red-700 bg-white px-2.5 py-1 rounded-md shadow-sm">{egfr.value} {egfr.unit}</span>
            </div>
          )}
        </div>
      </div>

      {/* Problems */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm border border-gray-100 p-5 card-hover">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-700">Active Problems</h3>
          <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{problems.length}</span>
        </div>
        <ul className="space-y-2">
          {problems.map((problem) => (
            <li
              key={problem.problem_id}
              className="flex items-start gap-2 text-sm bg-red-50/50 px-3 py-2 rounded-lg border border-red-100/50"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
              <span className="text-gray-700">{problem.display}</span>
            </li>
          ))}
          {problems.length === 0 && (
            <li className="text-sm text-gray-500 italic">No active problems</li>
          )}
        </ul>
      </div>

      {/* Allergies */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm border border-gray-100 p-5 card-hover">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-700">Allergies</h3>
          <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{allergies.length}</span>
        </div>
        <ul className="space-y-2">
          {allergies.map((allergy) => (
            <li
              key={allergy.allergy_id}
              className="flex items-start gap-2 text-sm bg-amber-50/50 px-3 py-2 rounded-lg border border-amber-100/50"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></span>
              <div>
                <span className="font-medium text-gray-900">{allergy.substance}</span>
                {allergy.reaction && (
                  <span className="text-gray-500"> - {allergy.reaction}</span>
                )}
              </div>
            </li>
          ))}
          {allergies.length === 0 && (
            <li className="text-sm text-gray-500 italic">No known allergies</li>
          )}
        </ul>
      </div>

      {/* Active Medications */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm border border-gray-100 p-5 card-hover">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-700">Active Medications</h3>
          <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{active_medications.length}</span>
        </div>
        <ul className="space-y-2">
          {active_medications.map((med) => (
            <li
              key={med.med_id}
              className="text-sm bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100/50"
            >
              <div className="font-medium text-gray-900">{med.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">
                {med.dose} {med.frequency && `• ${med.frequency}`}
              </div>
            </li>
          ))}
          {active_medications.length === 0 && (
            <li className="text-sm text-gray-500 italic">No active medications</li>
          )}
        </ul>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-700">Demo Controls</h3>
        </div>
        
        {/* Raw/Redacted Toggle */}
        <RawRedactedToggle
          showRaw={showRaw}
          onToggle={onToggleRaw}
          disabled={!allow_raw_view}
        />

        {/* Ingest Note Button */}
        <button
          onClick={() => setShowIngestModal(true)}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ingest New Note
        </button>
      </div>

      {/* Ingest Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Ingest Clinical Note</h3>
              <button
                onClick={() => setShowIngestModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-3">
                Enter a clinical note with PHI. The system will automatically redact PHI and generate embeddings.
              </p>
              
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter clinical note text here...

Example:
Patient John Smith (DOB 03/15/1958, MRN 12345678) presented today for follow-up.
His wife Mary (phone 555-123-4567) accompanied him.
Blood pressure improved to 128/82. Continue current medications.
Follow up in 3 months at Seattle General Hospital."
                className="w-full h-64 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={ingesting}
              />
              
              {ingestError && (
                <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {ingestError}
                </div>
              )}
              
              {ingestSuccess && (
                <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  {ingestSuccess}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowIngestModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
                disabled={ingesting}
              >
                Cancel
              </button>
              <button
                onClick={handleIngestNote}
                disabled={!noteText.trim() || ingesting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {ingesting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Processing...
                  </>
                ) : (
                  'Ingest Note'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
