import { useState } from 'react';
import { Loader2, Plus, ShoppingCart, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { usePurchaseOrders, useReceivePurchaseOrder } from '../hooks/usePurchases';
import { CreatePurchaseOrderModal } from '../components/CreatePurchaseOrderModal';
import type { PurchaseOrderStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const STATUS_TABS: { value: PurchaseOrderStatus | 'all'; label: string }[] = [
  { value: 'issued',             label: 'Issued' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received',           label: 'Received' },
  { value: 'all',                label: 'All' },
];

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  issued:             'bg-amber-100 text-amber-800',
  partially_received: 'bg-blue-100 text-blue-800',
  received:           'bg-emerald-100 text-emerald-800',
  closed:             'bg-gray-100 text-gray-600',
};

export function PurchaseOrdersPage() {
  const [status, setStatus] = useState<PurchaseOrderStatus | 'all'>('issued');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = usePurchaseOrders({ status: status === 'all' ? undefined : status, limit: 100 });
  const { mutateAsync: receive, isPending: isReceiving } = useReceivePurchaseOrder();

  const orders = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 sm:p-6">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Issued to vendors, awaiting or confirming delivery</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Issue Order
          </button>
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
        ) : !orders.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700">No purchase orders here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-gray-900">{o.poNumber}</span>
                      <span className={cn('inline-flex items-center rounded-full font-medium text-xs px-2.5 py-0.5', STATUS_BADGE[o.status])}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {o.vendorName} · ₹{o.totalAmount.toLocaleString('en-IN')}
                      {o.deliveryDate ? ` · due ${new Date(o.deliveryDate).toLocaleDateString('en-IN')}` : ''}
                    </p>
                  </div>
                  {(o.status === 'issued' || o.status === 'partially_received') && (
                    <button
                      disabled={isReceiving}
                      onClick={() =>
                        receive({ id: o._id })
                          .then(() => toast.success('Receipt recorded — stock updated'))
                          .catch((e) => toast.error(e.message))
                      }
                      className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                    >
                      <PackageCheck className="w-3.5 h-3.5" /> Mark Received
                    </button>
                  )}
                </div>
                <div className="mt-3 divide-y divide-gray-50 border-t border-gray-50 pt-2">
                  {o.lineItems.map((li, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-700">{li.itemName}</span>
                      <span className="text-gray-400">
                        {li.quantityReceived}/{li.quantity} received · ₹{li.unitPrice} each
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <CreatePurchaseOrderModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
