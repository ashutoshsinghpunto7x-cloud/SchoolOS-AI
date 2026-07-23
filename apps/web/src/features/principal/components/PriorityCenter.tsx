import { useNavigate } from 'react-router-dom';
import { usePendingLeaveRequests } from '@/features/leave-requests/hooks/useLeaveRequests';
import { usePendingDiscounts } from '@/features/fees/hooks/useFeeStructure';
import { usePendingChangeRequests } from '@/features/student-change-requests/hooks/useStudentChangeRequests';
import type { PrincipalAlert } from '@schoolos/types';

interface PriorityCenterProps {
  alerts?: PrincipalAlert[];
  overdueFeeCount?: number;
  isLoading?: boolean;
}

// Single source of truth for "what needs my decision" — replaces the old
// Attention Required / Pending Approvals / Insights / Overdue Fees cards,
// which all rendered overlapping subsets of the same four counts. Structured
// rows cover the four real approvable/actionable categories; anything else
// server-computed (low attendance, upcoming events, follow-ups) rides below
// as a plain list, with the duplicate 'overdue_fees' alert type filtered out
// since the fee row above already surfaces that count.
export function PriorityCenter({ alerts, overdueFeeCount, isLoading }: PriorityCenterProps) {
  const navigate = useNavigate();
  const { data: leave } = usePendingLeaveRequests();
  const { data: discounts } = usePendingDiscounts();
  const { data: changeRequests } = usePendingChangeRequests();

  const rows = [
    { label: 'Leave Requests', count: leave?.length ?? 0, path: '/principal/leave-approvals' },
    { label: 'Student Edit Requests', count: changeRequests?.length ?? 0, path: '/principal/approvals' },
    { label: 'Fee Discount Approvals', count: discounts?.length ?? 0, path: '/principal/discount-approvals' },
    { label: 'Overdue Fee Payments', count: overdueFeeCount ?? 0, path: '/fees' },
  ];

  const otherAlerts = (alerts ?? []).filter((a) => a.type !== 'overdue_fees');
  const totalOpen = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 h-[288px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">Priority Center</h3>
        {totalOpen > 0 && (
          <span className="text-[11px] font-semibold text-[#EF4444]">{totalOpen} open</span>
        )}
      </div>

      <div className="flex flex-col divide-y divide-black/[0.06]">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-11 my-1 bg-gray-50 rounded-lg animate-pulse" />)
        ) : (
          rows.map(({ label, count, path }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
              className="flex items-center justify-between py-3 hover:bg-black/[0.02] transition-colors text-left -mx-1 px-1 rounded-lg"
            >
              <span className="text-sm font-medium text-[#374151]">{label}</span>
              <span className={count > 0 ? 'text-sm font-semibold text-[#111827]' : 'text-sm font-medium text-gray-300'}>
                {count}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex-1 mt-3 pt-3 border-t border-black/[0.06] overflow-y-auto overscroll-contain min-h-0">
        {otherAlerts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Everything else looks good today.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {otherAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => alert.actionUrl && navigate(alert.actionUrl)}
                disabled={!alert.actionUrl}
                className="text-left py-2 px-1 -mx-1 rounded-lg hover:bg-black/[0.02] transition-colors"
              >
                <p
                  className={
                    alert.severity === 'critical'
                      ? 'text-[13px] font-semibold text-[#EF4444]'
                      : alert.severity === 'warning'
                        ? 'text-[13px] font-semibold text-[#F59E0B]'
                        : 'text-[13px] font-semibold text-[#111827]'
                  }
                >
                  {alert.title}
                </p>
                <p className="text-[12px] text-[#6B7280] leading-snug">{alert.message}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
