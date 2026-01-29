'use client';

import { useState, useEffect } from 'react';
import { PatientHeader } from '@/components/PatientHeader';
import { Timeline } from '@/components/Timeline';
import { CopilotChat } from '@/components/CopilotChat';
import { SourceDrawer } from '@/components/SourceDrawer';
import { getPatientSnapshot, getPatientTimeline } from '@/lib/api';
import type { PatientSnapshot, TimelineResponse, CopilotSource, NoteDetail } from '@/lib/types';

// Demo patient ID - in production this would come from routing
const DEMO_PATIENT_ID = 'pt-demo-001';

export default function Patient360Page() {
  const [snapshot, setSnapshot] = useState<PatientSnapshot | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Source drawer state
  const [selectedSource, setSelectedSource] = useState<CopilotSource | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // View mode
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [snapshotData, timelineData] = await Promise.all([
        getPatientSnapshot(DEMO_PATIENT_ID),
        getPatientTimeline(DEMO_PATIENT_ID, 50),
      ]);
      
      setSnapshot(snapshotData);
      setTimeline(timelineData);
    } catch (err) {
      console.error('Error loading patient data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleSourceClick = (source: CopilotSource) => {
    setSelectedSource(source);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSource(null);
  };

  const handleNoteIngested = () => {
    // Refresh timeline after note ingestion
    loadPatientData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-160px)]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-700 font-medium">Loading patient data...</p>
          <p className="text-sm text-gray-500 mt-1">Connecting to Azure PostgreSQL</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-160px)]">
        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Patient Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadPatientData}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-160px)]">
        <p className="text-gray-600">No patient data available</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-160px)] overflow-hidden">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Left Column - Patient Header */}
        <div className="col-span-3 overflow-y-auto chat-scroll">
          <PatientHeader
            snapshot={snapshot}
            showRaw={showRaw}
            onToggleRaw={setShowRaw}
            onNoteIngested={handleNoteIngested}
          />
        </div>

        {/* Middle Column - Timeline */}
        <div className="col-span-5 overflow-y-auto chat-scroll">
          <Timeline
            timeline={timeline}
            showRaw={showRaw}
            allowRawView={snapshot.allow_raw_view}
            patientId={DEMO_PATIENT_ID}
          />
        </div>

        {/* Right Column - Copilot */}
        <div className="col-span-4 overflow-hidden">
          <div className="panel h-full flex flex-col">
            <CopilotChat
              patientId={DEMO_PATIENT_ID}
              patientName={snapshot.patient.display_name}
              onSourceClick={handleSourceClick}
            />
          </div>
        </div>
      </div>

      {/* Source Drawer */}
      <SourceDrawer
        isOpen={isDrawerOpen}
        source={selectedSource}
        patientId={DEMO_PATIENT_ID}
        showRaw={showRaw}
        allowRawView={snapshot.allow_raw_view}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
