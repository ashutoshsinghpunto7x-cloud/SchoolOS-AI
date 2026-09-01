import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Loader2, Briefcase, AlertTriangle, Send, XCircle, Eye,
} from 'lucide-react';
import type { CandidateSource, CandidateStatus } from '@schoolos/types';
import {
  useCandidates, useCreateCandidate, useCheckCandidateDuplicate,
  useForwardCandidate, useRejectCandidate, useMarkCandidateUnderReview,
} from '../hooks/useCandidates';

const SOURCE_OPTIONS: { value: CandidateSource; label: string }[] = [
  { value: 'walk_in',    label: 'Walk-in' },
  { value: 'email',      label: 'Email' },
  { value: 'referral',   label: 'Referral' },
  { value: 'job_portal', label: 'Job Portal' },
  { value: 'other',      label: 'Other' },
];

const STATUS_STYLES: Record<CandidateStatus, string> = {
  new:                     'bg-amber-50 text-amber-700 border-amber-200',
  forwarded_to_hr:         'bg-blue-50 text-blue-700 border-blue-200',
  forwarded_to_principal:  'bg-purple-50 text-purple-700 border-purple-200',
  under_review:            'bg-indigo-50 text-indigo-700 border-indigo-200',
  interview_scheduled:     'bg-teal-50 text-teal-700 border-teal-200',
  interview_completed:     'bg-cyan-50 text-cyan-700 border-cyan-200',
  selected:                'bg-green-50 text-green-700 border-green-200',
  hold:                    'bg-gray-100 text-gray-500 border-gray-200',
  rejected:                'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL: Record<CandidateStatus, string> = {
  new: 'New', forwarded_to_hr: 'Forwarded to HR', forwarded_to_principal: 'Forwarded to Principal',
  under_review: 'Under Review', interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed', selected: 'Selected', hold: 'On Hold', rejected: 'Rejected',
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const emptyForm = {
  name: '', mobile: '', email: '', positionApplied: '', department: '', qualification: '',
  experienceYears: '', source: 'walk_in' as CandidateSource,
};

export function CandidatesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | ''>('');
  const [form, setForm] = useState(emptyForm);
  const [resume, setResume] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  const { data, isLoading, isError } = useCandidates({ status: statusFilter || undefined, limit: 100 });
  const { data: duplicates } = useCheckCandidateDuplicate(form.mobile);
  const createCandidate = useCreateCandidate();
  const forwardCandidate = useForwardCandidate();
  const rejectCandidate = useRejectCandidate();
  const markUnderReview = useMarkCandidateUnderReview();

  const candidates = data?.data ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!resume) { setFormError('Attach a resume (PDF or image)'); return; }
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) { setFormError('Enter a valid 10-digit mobile number'); return; }
    try {
      await createCandidate.mutateAsync({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim() || undefined,
        positionApplied: form.positionApplied.trim(),
        department: form.department.trim() || undefined,
        qualification: form.qualification.trim() || undefined,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
        source: form.source,
        resume,
      });
      setForm(emptyForm);
      setResume(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to log candidate');
    }
  }

  function handleReject(id: string) {
    const reason = window.prompt('Reason for rejecting this candidate:');
    if (reason?.trim()) rejectCandidate.mutate({ id, payload: { rejectionReason: reason.trim() } });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/reception')}
          className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">CVs / Resumes</h1>
          <p className="text-sm text-gray-500">Log walk-in, emailed, or referred candidates and forward them on</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
        {/* ── Log CV form ──────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-600" /> Log a CV
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Candidate Name</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile</label>
            <input
              type="tel" required value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            {duplicates && duplicates.length > 0 && (
              <p className="mt-1.5 text-xs text-amber-600 flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Already on file: {duplicates.map((d) => `${d.name} (${d.positionApplied})`).join(', ')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email (optional)</label>
            <input
              type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Position Applied For</label>
            <input
              type="text" required value={form.positionApplied} placeholder="e.g. Primary Teacher — Maths"
              onChange={(e) => setForm((f) => ({ ...f, positionApplied: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
              <input
                type="text" value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Experience (yrs)</label>
              <input
                type="number" min="0" value={form.experienceYears}
                onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Qualification</label>
            <input
              type="text" value={form.qualification}
              onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Source</label>
            <select
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as CandidateSource }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
            >
              {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Resume (PDF or image)</label>
            <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 cursor-pointer hover:border-orange-400">
              <Upload className="w-4 h-4" />
              {resume ? resume.name : 'Choose a file…'}
              <input
                type="file" accept="application/pdf,image/*" className="hidden"
                onChange={(e) => setResume(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

          <button
            type="submit" disabled={createCandidate.isPending}
            className="w-full h-10 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {createCandidate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Log Candidate
          </button>
        </form>

        {/* ── CV inbox ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-gray-900 flex-1">CV Inbox</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CandidateStatus | '')}
              className="h-9 px-2.5 rounded-lg border border-gray-200 text-xs bg-white"
            >
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABEL) as CandidateStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-red-600 text-sm">Failed to load candidates.</div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No CVs logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3">Candidate</th>
                    <th className="py-2 pr-3">Position</th>
                    <th className="py-2 pr-3">Experience</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c._id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-3 font-medium text-gray-900">
                        <button onClick={() => navigate(`/reception/candidates/${c._id}`)} className="hover:underline decoration-dotted">
                          {c.name}
                        </button>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">{c.positionApplied}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{c.experienceYears != null ? `${c.experienceYears} yrs` : '—'}</td>
                      <td className="py-2.5 pr-3 text-gray-600 capitalize">{c.source.replace('_', ' ')}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{fmtDate(c.dateReceived)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[c.status]}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <a
                            href={c.resumeUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            <Eye className="w-3 h-3" /> Resume
                          </a>
                          {c.status === 'new' && (
                            <>
                              <button
                                type="button" onClick={() => forwardCandidate.mutate({ id: c._id, payload: { to: 'hr' } })}
                                disabled={forwardCandidate.isPending}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                              >
                                <Send className="w-3 h-3" /> To HR
                              </button>
                              <button
                                type="button" onClick={() => forwardCandidate.mutate({ id: c._id, payload: { to: 'principal' } })}
                                disabled={forwardCandidate.isPending}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50"
                              >
                                <Send className="w-3 h-3" /> To Principal
                              </button>
                            </>
                          )}
                          {(c.status === 'forwarded_to_hr' || c.status === 'forwarded_to_principal') && (
                            <button
                              type="button" onClick={() => markUnderReview.mutate(c._id)} disabled={markUnderReview.isPending}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Review
                            </button>
                          )}
                          {c.status !== 'rejected' && (
                            <button
                              type="button" onClick={() => handleReject(c._id)} disabled={rejectCandidate.isPending}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
