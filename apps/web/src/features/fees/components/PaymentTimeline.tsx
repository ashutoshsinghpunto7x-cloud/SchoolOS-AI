import { IndianRupee, CreditCard, Landmark, Smartphone, FileCheck, Banknote } from 'lucide-react';
import type { FeePayment, PaymentMode } from '@schoolos/types';

interface Props {
  payments: FeePayment[];
}

const MODE_CONFIG: Record<PaymentMode, { label: string; icon: React.ReactNode }> = {
  cash:          { label: 'Cash',          icon: <Banknote    className="w-4 h-4" /> },
  cheque:        { label: 'Cheque',        icon: <FileCheck   className="w-4 h-4" /> },
  bank_transfer: { label: 'Bank Transfer', icon: <Landmark    className="w-4 h-4" /> },
  online:        { label: 'Online',        icon: <Smartphone  className="w-4 h-4" /> },
  demand_draft:  { label: 'Demand Draft',  icon: <CreditCard  className="w-4 h-4" /> },
};

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function PaymentTimeline({ payments }: Props) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-gray-400">
        <IndianRupee className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No payments recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gray-100" />

      <div className="space-y-4">
        {payments.map((p) => {
          const mode = MODE_CONFIG[p.paymentMode] ?? { label: p.paymentMode, icon: <IndianRupee className="w-4 h-4" /> };
          return (
            <div key={p._id} className="flex gap-4 relative">
              {/* Timeline dot */}
              <div className="w-10 h-10 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center shrink-0 relative z-10 text-green-600">
                {mode.icon}
              </div>

              <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-base font-bold text-green-700">{fmt(p.amount)}</span>
                    <span className="ml-2 text-sm text-gray-500">{mode.label}</span>
                    {p.referenceNumber && (
                      <span className="ml-2 text-xs text-gray-400">Ref: {p.referenceNumber}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">{fmtDate(p.paymentDate)}</div>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span>By {p.recordedByName}</span>
                  {p.remarks && <span>· {p.remarks}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
