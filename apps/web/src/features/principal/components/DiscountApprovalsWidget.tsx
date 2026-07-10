import { Check, X, Loader2, BadgePercent } from 'lucide-react';
import { usePendingDiscounts, useApproveDiscountRequest, useRejectDiscountRequest } from '@/features/fees/hooks/useFeeStructure';
import type { FeeDiscountRequest } from '@schoolos/types';

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function DiscountRow({ request }: { request: FeeDiscountRequest }) {
  const { mutateAsync: approve, isPending: approving } = useApproveDiscountRequest();
  const { mutateAsync: reject, isPending: rejecting } = useRejectDiscountRequest();
  const busy = approving || rejecting;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{request.studentName}</p>
        <p className="text-[11px] text-gray-400">
          Class {request.class}-{request.section} · {fmt(request.requestedAmount)}
        </p>
        <p className="text-[11px] text-gray-400 truncate">{request.reason}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button" disabled={busy}
          onClick={() => void approve({ id: request._id })}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 disabled:opacity-50"
          title="Approve"
        >
          {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button" disabled={busy}
          onClick={() => void reject({ id: request._id })}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50"
          title="Reject"
        >
          {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function DiscountApprovalsWidget() {
  const { data: requests, isLoading } = usePendingDiscounts();
  const pending = requests ?? [];

  return (
    <div className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 h-[288px] flex flex-col">
      <div className="mb-1">
        <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">Discount Approvals</h3>
        <p className="text-[12px] text-gray-400 font-medium">Fee discounts awaiting your review</p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E8]/60">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-gray-400">
            <BadgePercent className="w-6 h-6" />
            <p className="text-sm">No pending discount requests</p>
          </div>
        ) : (
          pending.map((request) => <DiscountRow key={request._id} request={request} />)
        )}
      </div>
    </div>
  );
}
