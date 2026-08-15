import type { ChildSummary } from '../types';
import { ChildSwitcher } from './ChildSwitcher';

interface ChildStatusProps {
  children: ChildSummary[];
  activeChild: ChildSummary;
  onSelect: (id: string) => void;
}

const STATUS_COPY: Record<ChildSummary['status'], string> = {
  present: 'Present today',
  absent: 'Absent today',
  late: 'Checked in late',
  holiday: 'No school today',
};

const STATUS_DOT: Record<ChildSummary['status'], string> = {
  present: 'bg-emerald-600',
  absent: 'bg-red-600',
  late: 'bg-amber-500',
  holiday: 'bg-gray-400',
};

export function ChildStatus({ children, activeChild, onSelect }: ChildStatusProps) {
  const stats: { label: string; value: string; sub: string }[] = [
    { label: 'Attendance', value: `${activeChild.attendancePercent}%`, sub: 'This term' },
    { label: 'Academic average', value: activeChild.academicAverage.toFixed(1), sub: 'Current average' },
    {
      label: 'Fees',
      value: activeChild.feeStatus === 'paid' ? 'Paid' : activeChild.feeStatus === 'due' ? 'Due' : 'Overdue',
      sub: activeChild.feeStatus === 'paid' ? 'No outstanding dues' : `₹${activeChild.feeDueAmount?.toLocaleString('en-IN')} pending`,
    },
    {
      label: 'Next',
      value: activeChild.nextEvent?.date ?? '—',
      sub: activeChild.nextEvent?.label ?? 'Nothing scheduled',
    },
  ];

  return (
    <section aria-label="Child overview" className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-7 sm:py-7">
      <div className="flex items-start justify-between gap-4">
        <ChildSwitcher children={children} activeChild={activeChild} onSelect={onSelect} />

        <div className="flex items-center gap-2 pt-1 shrink-0">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[activeChild.status]}`} aria-hidden="true" />
          <span className="text-sm text-gray-700">{STATUS_COPY[activeChild.status]}</span>
        </div>
      </div>

      {activeChild.checkedInAt && (
        <p className="text-sm text-gray-500 mt-1">Checked in at {activeChild.checkedInAt}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-5 mt-6 pt-6 border-t border-gray-100">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">{stat.label}</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
