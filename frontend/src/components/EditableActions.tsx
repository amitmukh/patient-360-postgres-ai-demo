'use client';

import { useState } from 'react';

interface ActionItem {
  id?: number;  // Database ID - undefined for new actions, set after saving
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  originalText?: string;  // Original AI-generated text
}

interface EditableActionsProps {
  actions: string[];
  patientId: string;
  question?: string;
  onSaved?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'dismissed', label: 'Dismissed', color: 'bg-gray-100 text-gray-600' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-gray-500' },
  { value: 'normal', label: 'Normal', color: 'text-blue-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
];

export function EditableActions({ actions, patientId, question, onSaved }: EditableActionsProps) {
  const [editableActions, setEditableActions] = useState<ActionItem[]>(
    actions.map(text => ({ text, status: 'pending', priority: 'normal', originalText: text }))
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);  // Track if we've done initial save

  const handleActionChange = (index: number, field: keyof ActionItem, value: string) => {
    const updated = [...editableActions];
    updated[index] = { ...updated[index], [field]: value };
    setEditableActions(updated);
  };

  const handleRemoveAction = (index: number) => {
    setEditableActions(editableActions.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    setEditableActions([...editableActions, { text: '', status: 'pending', priority: 'normal' }]);
  };

  const handleSave = async () => {
    // Filter out empty actions
    const actionsToSave = editableActions.filter(a => a.text.trim());
    
    if (actionsToSave.length === 0) {
      setError('At least one action is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    // Helper to strip source citations
    const stripCitations = (text: string) => 
      text.replace(/\s*\[Source\s*\d+(?:,?\s*Source\s*\d+)*\]/gi, '').trim();

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      
      // Separate existing actions (have ID) from new actions (no ID)
      const existingActions = actionsToSave.filter(a => a.id !== undefined);
      const newActions = actionsToSave.filter(a => a.id === undefined);
      
      const updatedActions: ActionItem[] = [];
      
      // Update existing actions with PUT
      for (const action of existingActions) {
        const response = await fetch(`${API_BASE}/patients/${patientId}/actions/${action.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action_text: stripCitations(action.text),
            status: action.status,
            priority: action.priority,
            updated_by: 'Dr. Current User',
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update action ${action.id}`);
        }
        
        const result = await response.json();
        updatedActions.push({
          id: result.action_id,
          text: action.text,
          status: action.status,
          priority: action.priority,
          originalText: action.originalText,
        });
      }
      
      // Create new actions with POST bulk
      if (newActions.length > 0) {
        const response = await fetch(`${API_BASE}/patients/${patientId}/actions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actions: newActions.map((action) => ({
              action_text: stripCitations(action.text),
              status: action.status,
              priority: action.priority,
              source: 'ai_suggested',
              original_ai_text: action.originalText || action.text,
              created_by: 'Dr. Current User',
            })),
            related_question: question,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save new actions');
        }
        
        const results = await response.json();
        results.forEach((result: { action_id: number }, idx: number) => {
          updatedActions.push({
            id: result.action_id,
            text: newActions[idx].text,
            status: newActions[idx].status,
            priority: newActions[idx].priority,
            originalText: newActions[idx].originalText,
          });
        });
      }
      
      // Update state with IDs from database
      setEditableActions(updatedActions);
      setHasSavedOnce(true);

      const now = new Date();
      setSavedTime(now.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      }));
      setSaved(true);
      setIsEditing(false);
      onSaved?.();
      
      // Reset saved status after 5 seconds
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // If we've saved before, restore to saved state; otherwise restore original AI actions
    if (!hasSavedOnce) {
      setEditableActions(actions.map(text => ({ text, status: 'pending', priority: 'normal', originalText: text })));
    }
    setIsEditing(false);
    setError(null);
  };

  // Strip source citations like [Source 1], [Source 2, Source 3], etc.
  const stripSourceCitations = (text: string): string => {
    return text.replace(/\s*\[Source\s*\d+(?:,?\s*Source\s*\d+)*\]/gi, '').trim();
  };

  // Render markdown for display mode
  const renderMarkdown = (text: string) => {
    // First strip source citations
    const cleanText = stripSourceCitations(text);
    const parts = cleanText.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Get status display info
  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  // Get priority display info
  const getPriorityInfo = (priority: string) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1];
  };

  if (saved) {
    return (
      <div className="mt-3 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium">Actions saved to patient record</span>
          </div>
          {savedTime && (
            <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">
              {savedTime}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Suggested Actions</h5>
        </div>
        <div className="flex gap-1.5">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200"
                title="Edit actions"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all duration-200"
                title="Save to patient record"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 shadow-sm"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {editableActions.map((action, idx) => (
          <li key={idx} className="text-sm text-blue-800">
            {isEditing ? (
              <div className="bg-white rounded-lg border border-blue-200 p-3 shadow-sm space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 mt-2 font-bold">→</span>
                  <input
                    type="text"
                    value={action.text}
                    onChange={(e) => handleActionChange(idx, 'text', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 bg-white"
                    placeholder="Enter action..."
                  />
                  <button
                    onClick={() => handleRemoveAction(idx)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Remove action"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* Status and Priority selectors */}
                <div className="flex items-center gap-3 pl-6">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-500">Status:</label>
                    <select
                      value={action.status}
                      onChange={(e) => handleActionChange(idx, 'status', e.target.value)}
                      className={`text-xs px-2 py-1 rounded-lg border border-gray-200 ${getStatusInfo(action.status).color}`}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-500">Priority:</label>
                    <select
                      value={action.priority}
                      onChange={(e) => handleActionChange(idx, 'priority', e.target.value)}
                      className={`text-xs px-2 py-1 rounded-lg border border-gray-200 ${getPriorityInfo(action.priority).color}`}
                    >
                      {PRIORITY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-white/60 px-3 py-2.5 rounded-lg w-full">
                <span className="text-blue-500 font-bold">→</span>
                <div className="flex-1">
                  <span>{renderMarkdown(action.text)}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusInfo(action.status).color}`}>
                      {getStatusInfo(action.status).label}
                    </span>
                    <span className={`text-xs ${getPriorityInfo(action.priority).color}`}>
                      {getPriorityInfo(action.priority).label} priority
                    </span>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isEditing && (
        <button
          onClick={handleAddAction}
          className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-lg hover:bg-white transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add action
        </button>
      )}
    </div>
  );
}
