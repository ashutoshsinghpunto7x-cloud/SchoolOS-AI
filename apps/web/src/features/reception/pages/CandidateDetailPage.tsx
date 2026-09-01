import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CalendarPlus, CheckCircle2, XCircle, Star, User2, Briefcase,
} from 'lucide-react';
import type { InterviewRecommendation } from '@schoolos/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCandidate, useSetCandidateFinalDecision } from '../hooks/useCandidates';
import { useInterviewsByCandidate, useSetInterviewStatus, useSubmitInterviewFeedback } from '../hooks/useInterviews';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';

const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function FeedbackForm({ interviewId }: { interviewId: string }) {
  const [score, setScore] = useState('7');
  const [comments, setComments] = useState('');
  const [recommendation, setRecommendation] = useState<InterviewRecommendation>('yes');
  const submitFeedback = useSubmitInterviewFeedback();

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-600">Score (1-10)</label>
        <input type="number" min="1" max="10" value={score} onChange={(e) => setScore(e.target.value)} className="w-16 h-8 px-2 rounded border border-gray-200 text-sm" />
      </div>
      <select value={recommendation} onChange={(e) => setRecommendation(e.target.value as InterviewRecommendation)} className="h-8 px-2 rounded border border-gray-200 text-sm bg-white">
        <option value="strong_yes">Strong Yes</option>
        <option value="yes">Yes</option>
        <option value="hold">Hold</option>
        <option value="no">No</option>
      </select>
      <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Comments…" rows={2} className="px-2 py-1.5 rounded border border-gray-200 text-sm" />
      {submitFeedback.isError && <p className="text-xs text-red-600">{submitFeedback.error.message}</p>}
      <button
        type="button"
        onClick={() => submitFeedback.mutate({ id: interviewId, payload: { score: Number(score), comments: comments.trim() || undefined, recommendation } })}
        disabled={submitFeedback.isPending}
        className="h-8 rounded-lg bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-semibold disabled:opacity-50"
      >
        {submitFeedback.isPending ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </div>
  );
}

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDecide = user?.role === 'admin' || user?.role === 'principal';

  const { data: candidate, isLoading } = useCandidate(id!);
  const { data: interviews = [] } = useInterviewsByCandidate(id!);
  const setInterviewStatus = useSetInterviewStatus();
  const setFinalDecision = useSetCandidateFinalDecision();
  const [scheduling, setScheduling] = useState(false);
  const [offeredSalary, setOfferedSalary] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [notes, setNotes] = useState('');

  if (isLoading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-orange-600" /></div>;
  if (!candidate) return <div className="text-center py-32 text-gray-400">Candidate not found.</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      <button
        onClick={() => navigate('/reception/candidates')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> CV Inbox
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{candidate.name}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                  <Briefcase className="w-3.5 h-3.5" /> {candidate.positionApplied}
                  {candidate.department && ` · ${candidate.department}`}
                </p>
              </div>
              <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                View Résumé
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 text-sm">
              <div><p className="text-xs text-gray-400">Mobile</p><p className="font-semibold text-gray-800">{candidate.mobile}</p></div>
              <div><p className="text-xs text-gray-400">Email</p><p className="font-semibold text-gray-800">{candidate.email || '—'}</p></div>
              <div><p className="text-xs text-gray-400">Experience</p><p className="font-semibold text-gray-800">{candidate.experienceYears != null ? `${candidate.experienceYears} yrs` : '—'}</p></div>
              <div><p className="text-xs text-gray-400">Qualification</p><p className="font-semibold text-gray-800">{candidate.qualification || '—'}</p></div>
              <div><p className="text-xs text-gray-400">Status</p><p className="font-semibold text-gray-800 capitalize">{candidate.status.replace(/_/g, ' ')}</p></div>
            </div>
          </div>

          {/* Interviews */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">Interviews</h2>
              {candidate.status !== 'rejected' && candidate.status !== 'selected' && (
                <button onClick={() => setScheduling(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold">
                  <CalendarPlus className="w-3.5 h-3.5" /> Schedule
                </button>
              )}
            </div>
            {interviews.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No interviews scheduled yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {interviews.map((iv) => (
                  <div key={iv._id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-semibold text-gray-900">Round {iv.round} · {iv.mode.replace('_', ' ')}</p>
                      <span className="text-xs text-gray-500">{fmtDateTime(iv.scheduledAt)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><User2 className="w-3 h-3" /> {iv.interviewerNames.join(', ')}</p>
                    <p className="text-xs font-semibold uppercase mt-1 text-gray-500">{iv.status.replace('_', ' ')}</p>

                    {iv.status === 'scheduled' && (
                      <button
                        onClick={() => setInterviewStatus.mutate({ id: iv._id, payload: { status: 'completed' } })}
                        disabled={setInterviewStatus.isPending}
                        className="mt-2 h-7 px-2.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                    )}

                    {iv.feedback.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {iv.feedback.map((f) => (
                          <div key={f._id} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                            <Star className="w-3 h-3 text-amber-500" />
                            <span className="font-semibold">{f.interviewerName}</span>
                            <span>{f.score}/10</span>
                            <span className="uppercase text-gray-400">{f.recommendation.replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(iv.status === 'scheduled' || iv.status === 'completed') && (
                      <div className="mt-2">
                        <FeedbackForm interviewId={iv._id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Final decision */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-fit">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Decision</h2>
          {candidate.status === 'selected' ? (
            <div className="text-sm text-green-700">
              <p className="font-bold">Selected</p>
              {candidate.offeredSalary != null && <p>Offered: ₹{candidate.offeredSalary}</p>}
              {candidate.joiningDate && <p>Joining: {fmtDate(candidate.joiningDate)}</p>}
            </div>
          ) : candidate.status === 'rejected' ? (
            <p className="text-sm text-red-600">Rejected{candidate.rejectionReason ? `: ${candidate.rejectionReason}` : ''}</p>
          ) : !canDecide ? (
            <p className="text-sm text-gray-400">Only the Principal/Admin can record a final decision.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              <input type="number" placeholder="Offered salary (₹)" value={offeredSalary} onChange={(e) => setOfferedSalary(e.target.value)} className="h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
              <input type="date" placeholder="Joining date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} className="h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
              <textarea placeholder="Salary discussion notes (private)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm" />
              <button
                onClick={() => setFinalDecision.mutate({ id: candidate._id, payload: { decision: 'selected', offeredSalary: offeredSalary ? Number(offeredSalary) : undefined, joiningDate: joiningDate || undefined, salaryDiscussionNotes: notes.trim() || undefined } })}
                disabled={setFinalDecision.isPending}
                className="h-9 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Select Candidate
              </button>
              <button
                onClick={() => setFinalDecision.mutate({ id: candidate._id, payload: { decision: 'hold' } })}
                disabled={setFinalDecision.isPending}
                className="h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Put on Hold
              </button>
              <button
                onClick={() => {
                  const reason = window.prompt('Reason for rejecting:');
                  if (reason?.trim()) setFinalDecision.mutate({ id: candidate._id, payload: { decision: 'rejected', rejectionReason: reason.trim() } });
                }}
                disabled={setFinalDecision.isPending}
                className="h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              {setFinalDecision.isError && <p className="text-xs text-red-600">{setFinalDecision.error.message}</p>}
            </div>
          )}
        </div>
      </div>

      {scheduling && <ScheduleInterviewModal candidateId={id!} onClose={() => setScheduling(false)} />}
    </div>
  );
}
