import type { FeeListOptions, FeeStatus, FeeHead } from '@schoolos/types';

interface Props {
  filters: FeeListOptions;
  onChange: (filters: FeeListOptions) => void;
}

const STATUS_OPTIONS: { value: FeeStatus | ''; label: string }[] = [
  { value: '',               label: 'All Statuses' },
  { value: 'pending',        label: 'Pending' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'paid',           label: 'Paid' },
  { value: 'overdue',        label: 'Overdue' },
  { value: 'waived',         label: 'Waived' },
];

const FEE_HEAD_OPTIONS: { value: FeeHead | ''; label: string }[] = [
  { value: '',              label: 'All Fee Heads' },
  { value: 'tuition',      label: 'Tuition' },
  { value: 'admission',    label: 'Admission' },
  { value: 'examination',  label: 'Examination' },
  { value: 'transport',    label: 'Transport' },
  { value: 'hostel',       label: 'Hostel' },
  { value: 'miscellaneous',label: 'Miscellaneous' },
];

const SORT_OPTIONS = [
  { value: 'dueDate',     label: 'Due Date' },
  { value: 'createdAt',   label: 'Created' },
  { value: 'totalAmount', label: 'Amount' },
  { value: 'balance',     label: 'Balance' },
];

const selectCls = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 min-w-0';

export function FeeFilters({ filters, onChange }: Props) {
  const set = (patch: Partial<FeeListOptions>) =>
    onChange({ ...filters, ...patch, page: 1 });

  const hasFilters = !!(filters.status || filters.feeHead || filters.class);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={filters.status ?? ''}
        onChange={(e) => set({ status: (e.target.value as FeeStatus) || undefined })}
        className={selectCls}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.feeHead ?? ''}
        onChange={(e) => set({ feeHead: (e.target.value as FeeHead) || undefined })}
        className={selectCls}
      >
        {FEE_HEAD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Class"
        value={filters.class ?? ''}
        onChange={(e) => set({ class: e.target.value || undefined })}
        className={`${selectCls} w-20`}
      />

      <input
        type="text"
        placeholder="Section"
        value={filters.section ?? ''}
        onChange={(e) => set({ section: e.target.value || undefined })}
        className={`${selectCls} w-24`}
      />

      <input
        type="text"
        placeholder="Year (2024-25)"
        value={filters.academicYear ?? ''}
        onChange={(e) => set({ academicYear: e.target.value || undefined })}
        className={`${selectCls} w-36`}
      />

      <select
        value={filters.sortBy ?? 'dueDate'}
        onChange={(e) => set({ sortBy: e.target.value as FeeListOptions['sortBy'] })}
        className={selectCls}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>Sort: {o.label}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange({ page: 1, limit: filters.limit })}
          className="text-sm text-gray-500 hover:text-gray-800 underline px-1"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
