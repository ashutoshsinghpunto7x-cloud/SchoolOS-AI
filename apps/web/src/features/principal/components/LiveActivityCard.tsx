import { useAuditLog } from '@/features/audit/hooks/useAudit';

function formatAction(action: string): string {
  return action.split('.').pop()!.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
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
  const { data, isLoading } = useAuditLog({ limit: 5 });
  const logs = data?.data ?? [];

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 h-[288px] flex flex-col">
      <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">Recent Activity</h3>
      <p className="text-[12px] text-[#6B7280] font-medium mb-2">Latest events across the school</p>

      <div className="flex-1 overflow-y-auto divide-y divide-black/[0.06]">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-gray-400">
            <p className="text-sm">Nothing recorded yet today</p>
          </div>
        ) : (
          logs.slice(0, 5).map((log) => (
            <div key={log._id} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-[#111827] truncate">{formatAction(log.action)}</p>
                <p className="text-[11px] text-[#6B7280] shrink-0">{relativeTime(log.createdAt)}</p>
              </div>
              <p className="text-[11px] text-[#6B7280] truncate">by {log.userDisplayName}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
