import { useState } from 'react';
import { Loader2, ShieldAlert, CalendarClock } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import {
  useMaintenanceState,
  useMaintenanceStatus,
  useScheduleMaintenance,
  useCancelScheduledMaintenance,
  useToggleMaintenance,
} from '../hooks/useMaintenance';
import { extractErrorMessage } from '@/services/api';

const inputClass =
  'w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50';

export function OpsMaintenancePage() {
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'super_admin';

  const { data: state, isLoading, isError } = useMaintenanceState();
  const { data: status } = useMaintenanceStatus();

  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [message, setMessage] = useState('SchoolOS is undergoing scheduled maintenance. Please check back shortly.');
  const [error, setError] = useState('');
  const [showToggleConfirm, setShowToggleConfirm] = useState<'on' | 'off' | null>(null);

  const scheduleMutation = useScheduleMaintenance();
  const cancelMutation = useCancelScheduledMaintenance();
  const toggleMutation = useToggleMaintenance();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-sm text-[#EF4444]">Failed to load maintenance status.</div>;
  }

  const submitSchedule = () => {
    setError('');
    if (!startAt || !endAt || !message.trim()) {
      setError('Start time, end time, and a message are all required.');
      return;
    }
    scheduleMutation.mutate(
      { startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), message: message.trim() },
      { onError: (err) => setError(extractErrorMessage(err)) },
    );
  };

  const confirmToggle = () => {
    if (!showToggleConfirm) return;
    setError('');
    toggleMutation.mutate(
      { isActive: showToggleConfirm === 'on', message: showToggleConfirm === 'on' ? message.trim() || undefined : undefined },
      { onSuccess: () => setShowToggleConfirm(null), onError: (err) => setError(extractErrorMessage(err)) },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Maintenance Mode</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Schedule a maintenance window or flip production into maintenance immediately. Teachers, reception, and
          accountant logins are blocked while it's active — admin, principal, and Ops staff still get in.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Current State"
          value={<StatusBadge status={status?.isActive ? 'critical' : 'healthy'} label={status?.isActive ? 'Maintenance Active' : 'Operational'} />}
        />
        <MetricCard label="Triggered By" value={status?.reason === 'manual' ? 'Manual toggle' : status?.reason === 'scheduled' ? 'Scheduled window' : '—'} />
        <MetricCard
          label="Scheduled Window"
          value={
            state?.scheduledStartAt && state?.scheduledEndAt
              ? `${new Date(state.scheduledStartAt).toLocaleString()} – ${new Date(state.scheduledEndAt).toLocaleString()}`
              : 'None'
          }
        />
      </div>

      {error && <p className="text-xs text-[#EF4444]">{error}</p>}

      {canManage && (
        <>
          <section className="rounded-2xl border border-[#232D38] bg-[#121922] p-4 sm:p-5">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">
              <CalendarClock className="h-3.5 w-3.5" /> Schedule a Maintenance Window
            </h2>
            <p className="mb-4 text-xs text-[#64748B]">
              Staff are notified as soon as this is saved. Maintenance turns on automatically at the start time and
              off at the end time — no need to remember to disable it.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start">
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputClass} />
              </Field>
              <Field label="End">
                <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Message shown to blocked users">
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className={inputClass} />
                </Field>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={submitSchedule}
                disabled={scheduleMutation.isPending}
                className="rounded-md bg-[#3B82F6] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {scheduleMutation.isPending ? 'Scheduling…' : 'Schedule & Notify Staff'}
              </button>
              {(state?.scheduledStartAt || state?.scheduledEndAt) && (
                <button
                  onClick={() => cancelMutation.mutate(undefined, { onError: (err) => setError(extractErrorMessage(err)) })}
                  disabled={cancelMutation.isPending}
                  className="rounded-md border border-[#232D38] px-3 py-2 text-sm text-[#98A2B3] hover:text-[#F4F6F8] disabled:opacity-40"
                >
                  Cancel Scheduled Window
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#EF4444]/30 bg-[#121922] p-4 sm:p-5">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">
              <ShieldAlert className="h-3.5 w-3.5 text-[#EF4444]" /> Immediate Toggle
            </h2>
            <p className="mb-4 text-xs text-[#64748B]">
              Bypasses the schedule entirely — turns maintenance on or off right now, for every non-exempt login.
            </p>
            {state?.manualActive ? (
              <button
                onClick={() => setShowToggleConfirm('off')}
                className="rounded-md bg-[#22C55E] px-3 py-2 text-sm font-medium text-white"
              >
                Turn Maintenance Off Now
              </button>
            ) : (
              <button
                onClick={() => setShowToggleConfirm('on')}
                className="rounded-md bg-[#EF4444] px-3 py-2 text-sm font-medium text-white"
              >
                Turn Maintenance On Now
              </button>
            )}
          </section>
        </>
      )}

      {showToggleConfirm && (
        <ConfirmModal
          title={showToggleConfirm === 'on' ? 'Enable Maintenance Mode' : 'Disable Maintenance Mode'}
          message={
            showToggleConfirm === 'on'
              ? 'This immediately blocks teacher, reception, and accountant logins and shows them the maintenance screen. Admin, principal, and Ops staff are unaffected.'
              : 'This immediately restores normal access for everyone.'
          }
          confirmLabel={showToggleConfirm === 'on' ? 'Enable Now' : 'Disable Now'}
          danger={showToggleConfirm === 'on'}
          isPending={toggleMutation.isPending}
          onCancel={() => setShowToggleConfirm(null)}
          onConfirm={confirmToggle}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-[#98A2B3]">{label}</span>
      {children}
    </label>
  );
}

function ConfirmModal({
  title, message, confirmLabel, danger, isPending, onCancel, onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#232D38] bg-[#121922] p-6">
        <h2 className="text-base font-semibold text-[#F4F6F8]">{title}</h2>
        <p className="mt-2 text-sm text-[#98A2B3]">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-[#232D38] px-3 py-1.5 text-sm text-[#98A2B3] hover:text-[#F4F6F8]">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 ${danger ? 'bg-[#EF4444]' : 'bg-[#3B82F6]'}`}
          >
            {isPending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
