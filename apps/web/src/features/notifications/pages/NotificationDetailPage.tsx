import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Phone, IndianRupee, CalendarClock, Bell } from 'lucide-react';
import { useNotification, useUpdateCallStatus, useMarkNotificationRead } from '../hooks/useNotifications';
import { useStudent } from '@/features/students/hooks/useStudents';
import type { FeeDefaulter } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

type CallStatus = 'will_pay' | 'no_answer' | 'not_reached';

const CALL_STATUS_OPTIONS: { value: CallStatus; label: string; activeClasses: string }[] = [
  { value: 'will_pay',    label: 'Will Pay',     activeClasses: 'bg-emerald-600 border-emerald-600 text-white' },
  { value: 'no_answer',   label: 'No Answer',    activeClasses: 'bg-amber-600 border-amber-600 text-white' },
  { value: 'not_reached', label: 'Not Reached',  activeClasses: 'bg-gray-600 border-gray-600 text-white' },
];

// ── One defaulting student — contact/photo pulled from their full record ───────

function DefaulterCard({
  defaulter, notificationId, callStatus,
}: {
  defaulter: FeeDefaulter;
  notificationId: string;
  callStatus?: CallStatus;
}) {
  const { data: student, isLoading } = useStudent(defaulter.studentId);
  const { mutate: setStatus, isPending } = useUpdateCallStatus(notificationId);

  const initials = defaulter.studentName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const phone = student?.parentPhone;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#5B21B6]/10 flex items-center justify-center overflow-hidden shrink-0">
          {student?.photoUrl ? (
            <img src={student.photoUrl} alt={defaulter.studentName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-[#5B21B6]">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">{defaulter.studentName}</p>
          {isLoading ? (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading contact…</p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">
              {student?.fatherName ? `Father: ${student.fatherName}` : 'No guardian on file'}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <IndianRupee className="w-3 h-3" /> {fmt(defaulter.balance)}
            </span>
            {defaulter.daysOverdue > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> {defaulter.daysOverdue}d overdue
              </span>
            )}
          </div>
        </div>
        {phone && (
          <a
            href={`tel:${phone}`}
            title={`Call ${phone}`}
            className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 transition-colors"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Status:</span>
        {CALL_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={isPending}
            onClick={() => setStatus({ studentId: defaulter.studentId, status: opt.value })}
            className={cn(
              'h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors disabled:opacity-50',
              callStatus === opt.value ? opt.activeClasses : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function NotificationDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: notification, isLoading, isError } = useNotification(id);
  const markRead = useMarkNotificationRead();

  if (id && notification && !notification.isRead) markRead.mutate(id);

  const defaulters = notification?.payload?.students ?? [];
  const callStatuses = notification?.payload?.callStatus ?? {};
  const isDefaultersList = notification?.type === 'defaulters_list';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{notification?.title ?? 'Notification'}</h1>
          {notification && <p className="text-xs text-gray-500">From {notification.senderName}</p>}
        </div>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-4">
        {isLoading ? (
          <div className="space-y-2.5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : isError || !notification ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">Couldn't load this notification.</p>
          </div>
        ) : isDefaultersList ? (
          <>
            <p className="text-sm text-gray-600 bg-white rounded-2xl border border-gray-200 p-4">{notification.body}</p>
            {!defaulters.length ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No student details in this notification.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {defaulters.map((d) => (
                  <DefaulterCard key={d.studentId} defaulter={d} notificationId={notification._id} callStatus={callStatuses[d.studentId]} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm text-gray-700">{notification.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}
