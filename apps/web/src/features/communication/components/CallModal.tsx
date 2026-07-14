import { useEffect, useState } from 'react';
import { Phone, X, Calendar, Lightbulb, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useInitiateCall, useCommunicationById, communicationKeys } from '../hooks/useCommunication';
import type { Communication, Student } from '@schoolos/types';

type Phase = 'confirm' | 'calling' | 'complete' | 'failed';

interface CallModalProps {
  student: Student;
  onClose: () => void;
}

export const CallModal = ({ student, onClose }: CallModalProps) => {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [commId, setCommId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const qc = useQueryClient();
  const initiateCall = useInitiateCall();
  const { data: comm } = useCommunicationById(commId);

  // React to status changes from the polling hook
  useEffect(() => {
    if (!comm) return;
    if (comm.status === 'COMPLETED') {
      setPhase('complete');
      // Refresh the student's full timeline
      qc.invalidateQueries({ queryKey: communicationKeys.byStudent(student._id) });
    } else if (comm.status === 'FAILED' || comm.status === 'CANCELLED') {
      setPhase('failed');
      setErrorMsg('The call could not be completed. Please try again.');
    }
  }, [comm?.status, qc, student._id]);

  const handleConfirm = async () => {
    try {
      const created: Communication = await initiateCall.mutateAsync(student._id);
      setCommId(created._id);
      setPhase('calling');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start call');
      setPhase('failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={phase !== 'calling' ? onClose : undefined}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Confirm phase ─────────────────────────────────────────── */}
        {phase === 'confirm' && (
          <div className="px-6 py-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Call Parent</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Calling</p>
              <p className="text-base font-bold text-gray-900">{student.fatherName}</p>
              <p className="text-sm text-gray-500 mt-0.5">{student.parentPhone}</p>
              <p className="text-xs text-gray-400 mt-1">Re: {student.fullName} · Class {student.class}</p>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed">
              AI will call the parent, handle the conversation, and generate a summary for you.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={initiateCall.isPending}
                className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-sm font-bold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {initiateCall.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Starting…</>
                ) : (
                  <><Phone className="w-4 h-4" />Confirm Call</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Calling phase ─────────────────────────────────────────── */}
        {phase === 'calling' && (
          <div className="px-8 py-12 flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute w-36 h-36 rounded-full bg-green-500/10 animate-ping" />
              <div className="absolute w-28 h-28 rounded-full bg-green-500/15 animate-ping" style={{ animationDelay: '0.4s' }} />
              <div className="relative w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Phone className="w-9 h-9 text-white" strokeWidth={1.75} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Call in Progress</h2>
            <p className="text-sm text-gray-500 mt-2">
              AI is talking with <span className="font-semibold text-gray-700">{student.fatherName}</span>
            </p>
            <p className="text-xs text-gray-400 mt-4">Summary will appear automatically when the call ends</p>
            <div className="flex items-center gap-1.5 mt-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Complete phase ─────────────────────────────────────────── */}
        {phase === 'complete' && comm && (
          <div className="flex flex-col">
            <div className="px-6 pt-6 pb-4 bg-green-50 border-b border-green-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Call Complete</h2>
                <p className="text-xs text-gray-500 mt-0.5">{student.fullName} · {student.fatherName}</p>
              </div>
              <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Call Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed">{comm.summary}</p>
              </div>

              {comm.recommendation && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-2.5">
                  <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-0.5">AI Recommendation</p>
                    <p className="text-sm font-semibold text-gray-900">{comm.recommendation}</p>
                  </div>
                </div>
              )}

              {comm.nextFollowUp && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Next Follow-up: </span>
                  <span className="text-sm font-semibold text-gray-800">{comm.nextFollowUp}</span>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button onClick={onClose} className="w-full h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-sm font-bold transition-colors">
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── Failed phase ───────────────────────────────────────────── */}
        {phase === 'failed' && (
          <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Call Failed</h2>
              <p className="text-sm text-gray-500 mt-1">{errorMsg ?? 'Something went wrong. Please try again.'}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={onClose} className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors">
                Close
              </button>
              <button
                onClick={() => { setPhase('confirm'); setErrorMsg(null); setCommId(null); }}
                className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
