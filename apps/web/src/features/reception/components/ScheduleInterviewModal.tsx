import { useState } from 'react';
import { X, CalendarPlus, Loader2 } from 'lucide-react';
import type { InterviewMode } from '@schoolos/types';
import { StaffPicker } from './StaffPicker';
import { useScheduleInterview } from '../hooks/useInterviews';

interface ScheduleInterviewModalProps {
  candidateId: string;
  onClose: () => void;
}

export function ScheduleInterviewModal({ candidateId, onClose }: ScheduleInterviewModalProps) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [mode, setMode] = useState<InterviewMode>('in_person');
  const [interviewers, setInterviewers] = useState<{ id: string; name: string }[]>([]);
  const [pickerText, setPickerText] = useState('');
  const [error, setError] = useState('');
  const scheduleInterview = useScheduleInterview();

  function handleSubmit() {
    setError('');
    if (!scheduledAt) { setError('Pick a date and time'); return; }
    if (interviewers.length === 0) { setError('Assign at least one interviewer'); return; }
    scheduleInterview.mutate(
      {
        candidateId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        mode,
        interviewerIds: interviewers.map((i) => i.id),
      },
      { onSuccess: () => onClose(), onError: (err) => setError(err instanceof Error ? err.message : 'Failed to schedule') },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-orange-600" /> Schedule Interview
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date & Time</label>
            <input
              type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mode</label>
            <select
              value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
            >
              <option value="in_person">In Person</option>
              <option value="phone">Phone</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Interviewer(s)</label>
            <StaffPicker
              value={pickerText}
              onChangeText={setPickerText}
              onPick={(id, name) => {
                if (!interviewers.some((i) => i.id === id)) setInterviewers((prev) => [...prev, { id, name }]);
                setPickerText('');
              }}
              placeholder="Search staff to add as interviewer"
            />
            {interviewers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {interviewers.map((i) => (
                  <span key={i.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-medium text-orange-700">
                    {i.name}
                    <button type="button" onClick={() => setInterviewers((prev) => prev.filter((x) => x.id !== i.id))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>

        <div className="px-5 pb-5">
          <button
            type="button" onClick={handleSubmit} disabled={scheduleInterview.isPending}
            className="w-full h-10 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {scheduleInterview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
            Schedule Interview
          </button>
        </div>
      </div>
    </div>
  );
}
