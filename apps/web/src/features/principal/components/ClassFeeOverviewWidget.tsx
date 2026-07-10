import { GraduationCap } from 'lucide-react';
import { useClassFeeOverview } from '@/features/school-classes/hooks/useSchoolClasses';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export function ClassFeeOverviewWidget() {
  const { data: rows, isLoading } = useClassFeeOverview();

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="py-6 text-center">
        <GraduationCap className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-700">No classes set up yet</p>
        <p className="text-xs text-gray-400 mt-1">Add classes under Classes &amp; Sections to see fee breakdowns here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
      {rows.map((r) => (
        <div key={`${r.class}-${r.section}`} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Class {r.class}-{r.section}</p>
            <p className="text-xs text-gray-400">{r.studentCount} student{r.studentCount === 1 ? '' : 's'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-emerald-600">{fmt(r.collected)} collected</p>
            <p className={`text-xs font-semibold ${r.pending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {r.pending > 0 ? `${fmt(r.pending)} pending` : 'Fully collected'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
