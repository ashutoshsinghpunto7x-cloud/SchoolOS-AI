import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, LogOut, Loader2, Phone, Clock, CalendarPlus,
  CheckCircle2, XCircle, DoorOpen, Printer,
} from 'lucide-react';
import type { Visitor, VisitorPurpose, VisitorStatus } from '@schoolos/types';
import { useVisitors, useCreateVisitor, useCheckOutVisitor, useUpdateVisitorStatus } from '../hooks/useVisitors';
import { useVisitorAppointments, useCancelVisitorAppointment, useMarkAppointmentNoShow } from '../hooks/useVisitorAppointments';
import { useArriveFromAppointment } from '../hooks/useVisitors';
import { StaffPicker } from '../components/StaffPicker';
import { VisitorStatusBadge } from '../components/VisitorStatusBadge';
import { VisitorPhotoIdCell } from '../components/VisitorPhotoIdCell';
import { VisitorPassModal } from '../components/VisitorPassModal';
import { VisitorHistoryModal } from '../components/VisitorHistoryModal';
import { BookAppointmentModal } from '../components/BookAppointmentModal';

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

const STATUS_FILTER_OPTIONS: { value: VisitorStatus | ''; label: string }[] = [
  { value: '',           label: 'All statuses' },
  { value: 'waiting',    label: 'Waiting' },
  { value: 'approved',   label: 'Approved' },
  { value: 'in_meeting', label: 'In Meeting' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
];

// Local YYYY-MM-DD — `toISOString` converts to UTC first, which silently
// shifts the date back a day in any timezone ahead of UTC (e.g. IST),
// desyncing this filter's default from the visitor's actual check-in day.
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const emptyForm = {
  name: '', contactNumber: '', purpose: 'meet_staff' as VisitorPurpose, purposeNote: '',
  personToVisit: '', personToVisitId: undefined as string | undefined,
};

// Per Reception Management Module SRD, Module 1: Waiting → Approved → In
// Meeting → Completed, or Cancelled out of Waiting/Approved. Rendering the
// buttons directly from this map keeps the UI from ever offering an
// impossible transition — the server enforces the same table independently.
const NEXT_ACTIONS: Record<VisitorStatus, { status: VisitorStatus; label: string; icon: typeof CheckCircle2 }[]> = {
  waiting:    [{ status: 'approved', label: 'Approve', icon: CheckCircle2 }],
  approved:   [{ status: 'in_meeting', label: 'Start Meeting', icon: DoorOpen }],
  in_meeting: [],
  completed:  [],
  cancelled:  [],
};

export function VisitorLogPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'log' | 'appointments'>('log');
  const [date, setDate] = useState(todayStr());
  const [onlyOnSite, setOnlyOnSite] = useState(false);
  const [statusFilter, setStatusFilter] = useState<VisitorStatus | ''>('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [passVisitor, setPassVisitor] = useState<Visitor | null>(null);
  const [historyVisitor, setHistoryVisitor] = useState<Visitor | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data, isLoading, isError } = useVisitors({
    date, onlyOnSite: onlyOnSite || undefined, status: statusFilter || undefined, limit: 100,
  });
  const { data: appointmentsData, isLoading: appointmentsLoading } = useVisitorAppointments({ status: 'scheduled', limit: 50 });
  const createVisitor = useCreateVisitor();
  const checkOut = useCheckOutVisitor();
  const updateStatus = useUpdateVisitorStatus();
  const arriveFromAppointment = useArriveFromAppointment();
  const cancelAppointment = useCancelVisitorAppointment();
  const markNoShow = useMarkAppointmentNoShow();

  const visitors = data?.data ?? [];
  const appointments = appointmentsData?.data ?? [];

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
        name:            form.name.trim(),
        contactNumber:   form.contactNumber.trim(),
        purpose:         form.purpose,
        purposeNote:     form.purposeNote.trim() || undefined,
        personToVisit:   form.personToVisit.trim(),
        personToVisitId: form.personToVisitId,
      });
      setForm(emptyForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record visitor');
    }
  }

  function handleCancel(visitor: Visitor) {
    const reason = window.prompt('Reason for cancelling (optional):') ?? undefined;
    updateStatus.mutate({ id: visitor._id, payload: { status: 'cancelled', cancelReason: reason || undefined } });
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
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Visitor Management</h1>
          <p className="text-sm text-gray-500">Check in, approve, and track everyone on campus</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setTab('log')}
            className={`px-3 h-8 rounded-md text-xs font-semibold transition-colors ${tab === 'log' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Visitor Log
          </button>
          <button
            onClick={() => setTab('appointments')}
            className={`px-3 h-8 rounded-md text-xs font-semibold transition-colors ${tab === 'appointments' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Appointments
          </button>
        </div>
      </div>

      {tab === 'log' ? (
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
              <StaffPicker
                value={form.personToVisit}
                onChangeText={(text) => setForm((f) => ({ ...f, personToVisit: text, personToVisitId: undefined }))}
                onPick={(id, name) => setForm((f) => ({ ...f, personToVisit: name, personToVisitId: id }))}
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as VisitorStatus | '')}
                className="h-9 px-2.5 rounded-lg border border-gray-200 text-xs bg-white"
              >
                {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Photo / ID</th>
                      <th className="py-2 pr-3">In</th>
                      <th className="py-2 pr-3">Out</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((v) => (
                      <tr key={v._id} className="border-b border-gray-50">
                        <td className="py-2.5 pr-3 font-medium text-gray-900">
                          <button onClick={() => setHistoryVisitor(v)} className="hover:underline decoration-dotted flex items-center gap-1" title="View visit history">
                            {v.name}
                          </button>
                        </td>
                        <td className="py-2.5 pr-3 text-gray-600">
                          <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{v.contactNumber}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-gray-600">{v.personToVisit}</td>
                        <td className="py-2.5 pr-3 text-gray-600">{PURPOSE_LABEL[v.purpose] ?? v.purpose}</td>
                        <td className="py-2.5 pr-3"><VisitorStatusBadge status={v.status} /></td>
                        <td className="py-2.5 pr-3"><VisitorPhotoIdCell visitor={v} /></td>
                        <td className="py-2.5 pr-3 text-gray-600">
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(v.checkInTime)}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-gray-600">{fmtTime(v.checkOutTime)}</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {NEXT_ACTIONS[v.status].map((action) => (
                              <button
                                key={action.status}
                                type="button"
                                onClick={() => updateStatus.mutate({ id: v._id, payload: { status: action.status } })}
                                disabled={updateStatus.isPending}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <action.icon className="w-3 h-3" /> {action.label}
                              </button>
                            ))}
                            {v.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => setPassVisitor(v)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                <Printer className="w-3 h-3" /> Pass
                              </button>
                            )}
                            {(v.status === 'approved' || v.status === 'in_meeting') && !v.checkOutTime && (
                              <button
                                type="button"
                                onClick={() => checkOut.mutate({ id: v._id })}
                                disabled={checkOut.isPending}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <LogOut className="w-3 h-3" /> Check Out
                              </button>
                            )}
                            {(v.status === 'waiting' || v.status === 'approved') && (
                              <button
                                type="button"
                                onClick={() => handleCancel(v)}
                                disabled={updateStatus.isPending}
                                className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                                title="Cancel"
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
      ) : (
        /* ── Appointments tab ─────────────────────────────────────────────── */
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-gray-900 flex-1">Upcoming Appointments</h2>
            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold"
            >
              <CalendarPlus className="w-3.5 h-3.5" /> Book Appointment
            </button>
          </div>

          {appointmentsLoading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No upcoming appointments booked.</div>
          ) : (
            <ul className="space-y-2">
              {appointments.map((a) => (
                <li key={a._id} className="flex flex-wrap items-center gap-3 border border-gray-100 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{a.visitorName}</p>
                    <p className="text-xs text-gray-500">
                      {fmtDateTime(a.scheduledFor)} · Visiting {a.personToVisit} · {PURPOSE_LABEL[a.purpose] ?? a.purpose}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => arriveFromAppointment.mutate(a._id)}
                      disabled={arriveFromAppointment.isPending}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Arrived
                    </button>
                    <button
                      type="button"
                      onClick={() => markNoShow.mutate(a._id)}
                      disabled={markNoShow.isPending}
                      className="h-8 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      No-show
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelAppointment.mutate({ id: a._id })}
                      disabled={cancelAppointment.isPending}
                      className="h-8 px-2 rounded-md text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {passVisitor && <VisitorPassModal visitor={passVisitor} onClose={() => setPassVisitor(null)} />}
      {historyVisitor && <VisitorHistoryModal visitor={historyVisitor} onClose={() => setHistoryVisitor(null)} />}
      {bookingOpen && <BookAppointmentModal purposeOptions={PURPOSE_OPTIONS} onClose={() => setBookingOpen(false)} />}
    </div>
  );
}
