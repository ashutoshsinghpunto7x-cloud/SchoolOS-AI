import { useAuditLog } from '@/features/audit/hooks/useAudit';
import { useLanguage } from '@/context/LanguageContext';

function formatAction(action: string): string {
  return action.split('.').pop()!.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Colors the left accent bar by the audit action's domain prefix (e.g.
// "leave_request.approved" -> "leave_request") so the list reads at a
// glance, same idea as the category dots in the reference dashboard mock —
// purely cosmetic, no new data. Prefixes taken from the actual action
// strings services log (see e.g. leave-request.service.ts, fee.service.ts).
const CATEGORY_COLORS: Record<string, string> = {
  leave_request: '#F59E0B',
  fee: '#10B981',
  salary: '#10B981',
  payroll: '#10B981',
  enquiry: '#6D4AFF',
  student: '#3B82F6',
  attendance: '#3B82F6',
  staff_attendance: '#3B82F6',
  teacher: '#3B82F6',
  behavior: '#F59E0B',
};

function categoryColor(action: string): string {
  const domain = action.split('.')[0];
  return CATEGORY_COLORS[domain] ?? '#9CA3AF';
}

function relativeTime(iso: string, justNow: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return justNow;
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Reuses the real school-wide audit log (leave approvals, fee payments,
// attendance, discount decisions, staff check-ins, etc.) — not a fabricated
// "visitor entered / bus arrived" feed, since no visitor or transport
// feature exists in this system yet.
export function LiveActivityCard() {
  const { t } = useLanguage();
  const { data, isLoading } = useAuditLog({ limit: 5 });
  const logs = data?.data ?? [];

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 h-[288px] flex flex-col">
      <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">{t('activity.title')}</h3>
      <p className="text-[12px] text-[#6B7280] font-medium mb-2">{t('activity.subtitle')}</p>

      <div className="flex-1 overflow-y-auto divide-y divide-black/[0.06]">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">{t('activity.loading')}</div>
        ) : logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-gray-400">
            <p className="text-sm">{t('activity.empty')}</p>
          </div>
        ) : (
          logs.slice(0, 5).map((log) => (
            <div key={log._id} className="py-2.5 pl-3 relative">
              <span
                className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
                style={{ backgroundColor: categoryColor(log.action) }}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-[#111827] truncate">{formatAction(log.action)}</p>
                <p className="text-[11px] text-[#6B7280] shrink-0">{relativeTime(log.createdAt, t('activity.justNow'))}</p>
              </div>
              <p className="text-[11px] text-[#6B7280] truncate">{t('activity.by')} {log.userDisplayName}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
