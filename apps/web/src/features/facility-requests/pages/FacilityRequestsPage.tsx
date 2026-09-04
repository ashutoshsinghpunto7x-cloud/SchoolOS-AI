import { useState } from 'react';
import { Loader2, Plus, Wrench, UserCog, Play, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFacilityRequests, useFacilityRequestSla, useUpdateFacilityRequestStatus } from '../hooks/useFacilityRequests';
import { RaiseFacilityRequestModal } from '../components/RaiseFacilityRequestModal';
import { AssignFacilityRequestModal } from '../components/AssignFacilityRequestModal';
import type { FacilityRequest, FacilityRequestStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const STATUS_TABS: { value: FacilityRequestStatus | 'all'; label: string }[] = [
  { value: 'open',        label: 'Open' },
  { value: 'assigned',    label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'all',         label: 'All' },
];

const STATUS_BADGE: Record<FacilityRequestStatus, string> = {
  open:        'bg-rose-100 text-rose-800',
  assigned:    'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed:   'bg-emerald-100 text-emerald-800',
  cancelled:   'bg-gray-100 text-gray-600',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-800', urgent: 'bg-rose-100 text-rose-800',
};

export function FacilityRequestsPage() {
  const { user } = useAuth();
  const isTriager = user?.role === 'operations_manager' || user?.role === 'admin';

  const [status, setStatus] = useState<FacilityRequestStatus | 'all'>('open');
  const [showForm, setShowForm] = useState(false);
  const [assigningRequest, setAssigningRequest] = useState<FacilityRequest | null>(null);

  const { data, isLoading } = useFacilityRequests({ status: status === 'all' ? undefined : status, limit: 100 });
  const { data: sla } = useFacilityRequestSla(isTriager);
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateFacilityRequestStatus();

  const requests = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 sm:p-6">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Facility Requests</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              {isTriager ? 'All maintenance tickets — triage and resolve' : 'Your maintenance tickets'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isTriager && sla && (
              <div className="text-sm text-gray-500">
                Avg. resolution: <span className="font-semibold text-gray-900">
                  {sla.averageResolutionMinutes >= 60
                    ? `${(sla.averageResolutionMinutes / 60).toFixed(1)} hrs`
                    : `${sla.averageResolutionMinutes} min`}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> Raise Request
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors',
                status === t.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !requests.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700">No tickets here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-gray-900">{r.ticketNo}</span>
                      <span className={cn('inline-flex items-center rounded-full font-medium text-xs px-2.5 py-0.5', STATUS_BADGE[r.status])}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      <span className={cn('inline-flex items-center rounded-full font-medium text-xs px-2.5 py-0.5 capitalize', PRIORITY_BADGE[r.priority])}>
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 capitalize">
                      {r.issueType} issue · {r.location} · raised by {r.raisedByName}
                    </p>
                    {r.description && <p className="text-xs text-gray-400 mt-1">{r.description}</p>}
                    {r.assignedToName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned to: <span className="font-semibold">{r.assignedToName}</span> ({r.assignedToType})
                      </p>
                    )}
                  </div>

                  {isTriager && (r.status === 'open' || r.status === 'assigned' || r.status === 'in_progress') && (
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      {r.status === 'open' && (
                        <button
                          onClick={() => setAssigningRequest(r)}
                          className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <UserCog className="w-3.5 h-3.5" /> Assign
                        </button>
                      )}
                      {r.status === 'assigned' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => updateStatus({ id: r._id, payload: { status: 'in_progress' } }).catch((e) => toast.error(e.message))}
                          className="h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
                        >
                          <Play className="w-3.5 h-3.5" /> Start
                        </button>
                      )}
                      {r.status === 'in_progress' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => updateStatus({ id: r._id, payload: { status: 'completed' } }).then(() => toast.success('Ticket completed')).catch((e) => toast.error(e.message))}
                          className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <RaiseFacilityRequestModal onClose={() => setShowForm(false)} />}
      {assigningRequest && <AssignFacilityRequestModal request={assigningRequest} onClose={() => setAssigningRequest(null)} />}
    </div>
  );
}
