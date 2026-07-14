import type { EmploymentStatus, TeacherListOptions } from '@schoolos/types';

const EMPLOYMENT_STATUSES: { value: EmploymentStatus; label: string }[] = [
  { value: 'applicant', label: 'Applicant' },
  { value: 'active',    label: 'Active' },
  { value: 'on_leave',  label: 'On Leave' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'resigned',  label: 'Resigned' },
  { value: 'retired',   label: 'Retired' },
  { value: 'inactive',  label: 'Inactive' },
];

const selectClass =
  'h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7] ' +
  'hover:border-gray-300 transition-colors cursor-pointer appearance-none';

interface TeacherFiltersProps {
  filters: TeacherListOptions;
  onChange: (filters: TeacherListOptions) => void;
}

export const TeacherFilters = ({ filters, onChange }: TeacherFiltersProps) => {
  const set = (key: keyof TeacherListOptions, value: string) =>
    onChange({ ...filters, [key]: value || undefined, page: 1 });

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="text"
        placeholder="Department…"
        value={filters.department ?? ''}
        onChange={(e) => set('department', e.target.value)}
        className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7] placeholder:text-gray-400 w-36"
      />

      <input
        type="text"
        placeholder="Subject…"
        value={filters.subject ?? ''}
        onChange={(e) => set('subject', e.target.value)}
        className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7] placeholder:text-gray-400 w-32"
      />

      <select
        value={filters.status ?? ''}
        onChange={(e) => set('status', e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {EMPLOYMENT_STATUSES.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select
        value={filters.sortBy ?? 'createdAt'}
        onChange={(e) => set('sortBy', e.target.value)}
        className={selectClass}
        aria-label="Sort by"
      >
        <option value="createdAt">Joined Recently</option>
        <option value="fullName">Name A–Z</option>
        <option value="joiningDate">Joining Date</option>
      </select>

      {(filters.department || filters.subject || filters.status) && (
        <button
          type="button"
          onClick={() => onChange({ page: 1, limit: filters.limit })}
          className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};
