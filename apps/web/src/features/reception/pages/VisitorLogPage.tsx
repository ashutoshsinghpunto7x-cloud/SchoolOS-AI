import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, LogOut, Loader2, Phone, Clock } from 'lucide-react';
import type { VisitorPurpose } from '@schoolos/types';
import { useVisitors, useCreateVisitor, useCheckOutVisitor } from '../hooks/useVisitors';

const PURPOSE_OPTIONS: { value: VisitorPurpose; label: string }[] = [
  { value: 'meet_student',      label: 'Meet a Student' },
  { value: 'meet_staff',        label: 'Meet Staff/Teacher' },
  { value: 'admission_enquiry', label: 'Admission Enquiry' },
  { value: 'fee_payment',       label: 'Fee Payment' },
  { value: 'delivery',          label: 'Delivery' },
  { value: 'vendor',            label: 'Vendor / Supplier' },
  { value: 'interview',         label: 'Interview' },
  { value: 'other',             label: 'Other' },
];

const PURPOSE_LABEL: Record<VisitorPurpose, string> = Object.fromEntries(
  PURPOSE_OPTIONS.map((o) => [o.value, o.label])
) as Record<VisitorPurpose, string>;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const emptyForm = { name: '', contactNumber: '', purpose: 'meet_staff' as VisitorPurpose, purposeNote: '', personToVisit: '' };

export function VisitorLogPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayStr());
  const [onlyOnSite, setOnlyOnSite] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const { data, isLoading, isError } = useVisitors({ date, onlyOnSite: onlyOnSite || undefined, limit: 100 });
  const createVisitor = useCreateVisitor();
  const checkOut = useCheckOutVisitor();

  const visitors = data?.data ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.personToVisit.trim()) return;
    if (!/^[6-9]\d{9}$/.test(form.contactNumber.trim())) {
      setFormError('Enter a valid 10-digit mobile number');
      return;
    }
    try {
      await createVisitor.mutateAsync({
        name:          form.name.trim(),
        contactNumber: form.contactNumber.trim(),
        purpose:       form.purpose,
        purposeNote:   form.purposeNote.trim() || undefined,
        personToVisit: form.personToVisit.trim(),
      });
      setForm(emptyForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record visitor');
    }
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
          <h1 className="text-xl font-bold text-gray-900">Visitor Log</h1>
          <p className="text-sm text-gray-500">Record and track everyone checking in at the front desk</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
        {/* ── Check-in form ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-orange-600" /> Check In a Visitor
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Visitor Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              required
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
            <input
              type="tel"
              value={form.contactNumber}
              onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
              placeholder="10-digit mobile number"
              required
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Whom are they visiting?</label>
            <input
              type="text"
              value={form.personToVisit}
              onChange={(e) => setForm((f) => ({ ...f, personToVisit: e.target.value }))}
              placeholder="Student, teacher, or department"
              required
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Purpose of Visit</label>
            <select
              value={form.purpose}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value as VisitorPurpose }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              {PURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Note (optional)</label>
            <textarea
              value={form.purposeNote}
              onChange={(e) => setForm((f) => ({ ...f, purposeNote: e.target.value }))}
              placeholder="Any additional detail"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={createVisitor.isPending}
            className="w-full h-10 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {createVisitor.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Check In
          </button>
        </form>

        {/* ── Today's log ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-gray-900 flex-1">Visitor Log</h2>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={onlyOnSite}
                onChange={(e) => setOnlyOnSite(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              On campus only
            </label>
          </div>

          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-red-600 text-sm">Failed to load visitor log.</div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No visitors recorded for this date.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3">Visitor</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Visiting</th>
                    <th className="py-2 pr-3">Purpose</th>
                    <th className="py-2 pr-3">In</th>
                    <th className="py-2 pr-3">Out</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v) => (
                    <tr key={v._id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-3 font-medium text-gray-900">{v.name}</td>
                      <td className="py-2.5 pr-3 text-gray-600">
                        <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{v.contactNumber}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">{v.personToVisit}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{PURPOSE_LABEL[v.purpose] ?? v.purpose}</td>
                      <td className="py-2.5 pr-3 text-gray-600">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(v.checkInTime)}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">{fmtTime(v.checkOutTime)}</td>
                      <td className="py-2.5 pr-3 text-right">
                        {!v.checkOutTime && (
                          <button
                            type="button"
                            onClick={() => checkOut.mutate({ id: v._id })}
                            disabled={checkOut.isPending}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <LogOut className="w-3 h-3" /> Check Out
                          </button>
                        )}
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
