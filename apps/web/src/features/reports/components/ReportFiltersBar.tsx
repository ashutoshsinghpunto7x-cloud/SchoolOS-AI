import { ReportFilters } from '@schoolos/types';

interface ReportFiltersBarProps {
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
  showClass?: boolean;
  showAcademicYear?: boolean;
}

export const ReportFiltersBar = ({
  filters,
  onChange,
  showClass = true,
  showAcademicYear = false,
}: ReportFiltersBarProps) => {
  const update = (key: keyof ReportFilters, value: string) =>
    onChange({ ...filters, [key]: value || undefined });

  return (
    <div className="flex flex-wrap gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => update('dateFrom', e.target.value)}
          className="h-9 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => update('dateTo', e.target.value)}
          className="h-9 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
        />
      </div>

      {showClass && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          <input
            type="text"
            placeholder="e.g. 5"
            value={filters.class ?? ''}
            onChange={(e) => update('class', e.target.value)}
            className="h-9 px-3 w-20 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
          />
        </div>
      )}

      {showClass && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
          <input
            type="text"
            placeholder="e.g. A"
            value={filters.section ?? ''}
            onChange={(e) => update('section', e.target.value)}
            className="h-9 px-3 w-20 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
          />
        </div>
      )}

      {showAcademicYear && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Academic Year</label>
          <input
            type="text"
            placeholder="2024-25"
            value={filters.academicYear ?? ''}
            onChange={(e) => update('academicYear', e.target.value)}
            className="h-9 px-3 w-28 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
          />
        </div>
      )}

      {Object.values(filters).some(Boolean) && (
        <div className="flex items-end">
          <button
            onClick={() => onChange({})}
            className="h-9 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            type="button"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
