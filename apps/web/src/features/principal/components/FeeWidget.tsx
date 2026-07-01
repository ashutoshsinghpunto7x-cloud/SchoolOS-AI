import { IndianRupee, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeeCollectionSummary } from '@schoolos/types';

interface Props {
  data?: FeeCollectionSummary;
  isLoading?: boolean;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const FeeWidget = ({ data, isLoading }: Props) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-14 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const collectionRate = data.totalCharged > 0
    ? Math.round((data.totalCollected / data.totalCharged) * 100)
    : 0;

  const rateColor =
    collectionRate >= 80 ? 'text-green-600' :
    collectionRate >= 60 ? 'text-amber-600' :
    'text-red-600';

  return (
    <div className="space-y-4">
      {/* Collection rate highlight */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
          <IndianRupee className="w-5 h-5 text-amber-600" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium">Collection Rate</p>
          <p className={cn('text-2xl font-bold leading-tight', rateColor)}>{collectionRate}%</p>
          <div className="h-1.5 w-full bg-gray-200 rounded-full mt-1.5 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', collectionRate >= 80 ? 'bg-green-500' : collectionRate >= 60 ? 'bg-amber-500' : 'bg-red-500')}
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4-stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-[11px] font-medium text-green-700">Collected</p>
          <p className="text-base font-bold text-green-800 mt-0.5">{formatCurrency(data.totalCollected)}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[11px] font-medium text-gray-500">Total Charged</p>
          <p className="text-base font-bold text-gray-800 mt-0.5">{formatCurrency(data.totalCharged)}</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-[11px] font-medium text-amber-700">Outstanding</p>
          <p className="text-base font-bold text-amber-800 mt-0.5">{formatCurrency(data.totalOutstanding)}</p>
        </div>
        <div className={cn('p-3 rounded-xl border', data.overdueCount > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100')}>
          <div className="flex items-center gap-1">
            {data.overdueCount > 0 && <AlertCircle className="w-3 h-3 text-red-500" strokeWidth={2} />}
            <p className={cn('text-[11px] font-medium', data.overdueCount > 0 ? 'text-red-700' : 'text-gray-500')}>Overdue</p>
          </div>
          <p className={cn('text-base font-bold mt-0.5', data.overdueCount > 0 ? 'text-red-800' : 'text-gray-800')}>{data.overdueCount} records</p>
        </div>
      </div>
    </div>
  );
};
