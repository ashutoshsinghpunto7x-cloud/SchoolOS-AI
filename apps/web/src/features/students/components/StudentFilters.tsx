import type { AdmissionStatus, Gender, StudentListOptions } from '@schoolos/types';

const LIFECYCLE_STATUSES: { value: AdmissionStatus; label: string }[] = [
  { value: 'enquiry',           label: 'Enquiry' },
  { value: 'application',       label: 'Application' },
  { value: 'admission_pending', label: 'Admission Pending' },
  { value: 'active',            label: 'Active' },
  { value: 'transferred',       label: 'Transferred' },
  { value: 'graduated',         label: 'Graduated' },
  { value: 'inactive',          label: 'Inactive' },
];

const CLASS_OPTIONS = [
  'Nursery', 'LKG', 'UKG',
  '1', '2', '3', '4', '5', '6',
  '7', '8', '9', '10', '11', '12',
];

const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

const selectClass =
  'h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7] ' +
  'hover:border-gray-300 transition-colors cursor-pointer appearance-none';

interface StudentFiltersProps {
  filters: StudentListOptions;
  onChange: (filters: StudentListOptions) => void;
}

export const StudentFilters = ({ filters, onChange }: StudentFiltersProps) => {
  const set = (key: keyof StudentListOptions, value: string) => {
    onChange({ ...filters, [key]: value || undefined, page: 1 });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={filters.class ?? ''}
        onChange={(e) => set('class', e.target.value)}
        className={selectClass}
        aria-label="Filter by class"
      >
        <option value="">All Classes</option>
        {CLASS_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {isNaN(Number(c)) ? c : `Class ${c}`}
          </option>
        ))}
      </select>

      <select
        value={filters.section ?? ''}
        onChange={(e) => set('section', e.target.value)}
        className={selectClass}
        aria-label="Filter by section"
      >
        <option value="">All Sections</option>
        {SECTION_OPTIONS.map((s) => (
          <option key={s} value={s}>Section {s}</option>
        ))}
      </select>

      <select
        value={filters.status ?? ''}
        onChange={(e) => set('status', e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {LIFECYCLE_STATUSES.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select
        value={filters.gender ?? ''}
        onChange={(e) => set('gender', e.target.value as Gender)}
        className={selectClass}
        aria-label="Filter by gender"
      >
        <option value="">All Genders</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>

      {(filters.class || filters.section || filters.status || filters.gender) && (
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
