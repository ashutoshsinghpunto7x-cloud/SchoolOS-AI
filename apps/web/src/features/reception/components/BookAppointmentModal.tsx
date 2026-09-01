import { useState, FormEvent } from 'react';
import { X, CalendarPlus, Loader2 } from 'lucide-react';
import type { VisitorPurpose } from '@schoolos/types';
import { StaffPicker } from './StaffPicker';
import { useCreateVisitorAppointment } from '../hooks/useVisitorAppointments';

interface BookAppointmentModalProps {
  purposeOptions: { value: VisitorPurpose; label: string }[];
  onClose: () => void;
}

const emptyForm = {
  visitorName: '', visitorPhone: '', purpose: 'admission_enquiry' as VisitorPurpose,
  purposeNote: '', scheduledFor: '', personToVisit: '', personToVisitId: undefined as string | undefined,
};

export function BookAppointmentModal({ purposeOptions, onClose }: BookAppointmentModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const createAppointment = useCreateVisitorAppointment();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[6-9]\d{9}$/.test(form.visitorPhone.trim())) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!form.scheduledFor) {
      setError('Pick a date and time');
      return;
    }
    try {
      await createAppointment.mutateAsync({
        visitorName:     form.visitorName.trim(),
        visitorPhone:    form.visitorPhone.trim(),
        purpose:         form.purpose,
        purposeNote:     form.purposeNote.trim() || undefined,
        scheduledFor:    new Date(form.scheduledFor).toISOString(),
        personToVisit:   form.personToVisit.trim(),
        personToVisitId: form.personToVisitId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-orange-600" /> Book Appointment
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Visitor Name</label>
            <input
              type="text" required value={form.visitorName}
              onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
            <input
              type="tel" required value={form.visitorPhone}
              onChange={(e) => setForm((f) => ({ ...f, visitorPhone: e.target.value }))}
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">Purpose</label>
            <select
              value={form.purpose}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value as VisitorPurpose }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              {purposeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date & Time</label>
            <input
              type="datetime-local" required value={form.scheduledFor}
              onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Note (optional)</label>
            <textarea
              value={form.purposeNote} rows={2}
              onChange={(e) => setForm((f) => ({ ...f, purposeNote: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>

        <div className="px-5 pb-5">
          <button
            type="submit"
            disabled={createAppointment.isPending}
            className="w-full h-10 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {createAppointment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
            Book Appointment
          </button>
        </div>
      </form>
    </div>
  );
}
