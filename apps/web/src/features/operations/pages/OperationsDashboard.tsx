import { useNavigate } from 'react-router-dom';
import { Loader2, Users, UserX, Clock, ClipboardList, PackageX, ShoppingCart, Boxes, Plus, Wrench, ClipboardCheck } from 'lucide-react';
import { useOperationsSummary } from '../hooks/useOperations';
import { cn } from '@/lib/utils';

interface KpiTileProps {
  label: string;
  value: number;
  icon: typeof Users;
  tone?: 'default' | 'warn' | 'critical' | 'good';
}

const TONE_CLASSES: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default:  'bg-white border-gray-100',
  good:     'bg-emerald-50 border-emerald-100',
  warn:     'bg-amber-50 border-amber-100',
  critical: 'bg-rose-50 border-rose-100',
};

const TONE_VALUE_CLASSES: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default:  'text-gray-900',
  good:     'text-emerald-700',
  warn:     'text-amber-700',
  critical: 'text-rose-700',
};

function KpiTile({ label, value, icon: Icon, tone = 'default' }: KpiTileProps) {
  return (
    <div className={cn('rounded-2xl border shadow-sm p-4', TONE_CLASSES[tone])}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className={cn('text-2xl font-bold tabular-nums', TONE_VALUE_CLASSES[tone])}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export function OperationsDashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useOperationsSummary();

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-base text-gray-500 mt-1">Today's overview of staff, procurement, and stock</p>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiTile label="Staff Present" value={summary?.staffPresent ?? 0} icon={Users} tone="good" />
            <KpiTile label="Staff Absent"  value={summary?.staffAbsent ?? 0}  icon={UserX} tone="critical" />
            <KpiTile label="Late Arrivals" value={summary?.staffLate ?? 0}    icon={Clock} tone="warn" />
            <KpiTile label="Total Staff"   value={summary?.totalStaff ?? 0}   icon={Users} />
            <KpiTile label="Pending Purchase Requests" value={summary?.pendingPurchaseRequests ?? 0} icon={ClipboardList} tone={summary?.pendingPurchaseRequests ? 'warn' : 'default'} />
            <KpiTile label="Low Stock Alerts" value={summary?.lowStockItems ?? 0} icon={PackageX} tone={summary?.lowStockItems ? 'critical' : 'default'} />
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiTile label="Assets Under Repair" value={summary?.assetsUnderRepair ?? 0} icon={Wrench} tone={summary?.assetsUnderRepair ? 'warn' : 'default'} />
            <KpiTile label="Maintenance Requests Open" value={summary?.openFacilityRequests ?? 0} icon={ClipboardCheck} tone={summary?.openFacilityRequests ? 'warn' : 'default'} />
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/operations/purchase-requests?new=1')}
              className="h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Raise Purchase Request
            </button>
            <button
              onClick={() => navigate('/operations/purchase-orders')}
              className="h-12 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> Purchase Orders
            </button>
            <button
              onClick={() => navigate('/operations/inventory?new=1')}
              className="h-12 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <Boxes className="w-4 h-4" /> Add Inventory Item
            </button>
            <button
              onClick={() => navigate('/accountant/vendors')}
              className="h-12 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              Vendor Directory
            </button>
            <button
              onClick={() => navigate('/operations/assets?new=1')}
              className="h-12 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" /> Add Asset
            </button>
            <button
              onClick={() => navigate('/operations/facility-requests')}
              className="h-12 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" /> Facility Requests
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
