import { Search, X } from 'lucide-react';
import type { EnquiryStage, EnquirySource } from '@schoolos/types';
import { SOURCE_LABEL } from './SourceBadge';
import { STAGE_LABEL, STAGE_ORDER } from './StageBadge';

const SOURCES: EnquirySource[] = [
  'walk_in', 'website', 'referral', 'social_media', 'phone', 'email', 'other',
];

export interface EnquiryFiltersState {
  search: string;
  stage: EnquiryStage | '';
  source: EnquirySource | '';
  interestedClass: string;
}

interface EnquiryFiltersProps {
  filters: EnquiryFiltersState;
  onChange: (filters: EnquiryFiltersState) => void;
}

export const EnquiryFilters = ({ filters, onChange }: EnquiryFiltersProps) => {
  const set = <K extends keyof EnquiryFiltersState>(key: K, value: EnquiryFiltersState[K]) =>
    onChange({ ...filters, [key]: value });

  const hasActive = filters.search || filters.stage || filters.source || filters.interestedClass;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Name, phone, class…"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm
                     focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Stage */}
      <select
        value={filters.stage}
        onChange={(e) => set('stage', e.target.value as EnquiryStage | '')}
        className="h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700
                   focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">All Stages</option>
        {STAGE_ORDER.map((s) => (
          <option key={s} value={s}>{STAGE_LABEL[s]}</option>
        ))}
      </select>

      {/* Source */}
      <select
        value={filters.source}
        onChange={(e) => set('source', e.target.value as EnquirySource | '')}
        className="h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700
                   focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">All Sources</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
        ))}
      </select>

      {/* Class */}
      <input
        type="text"
        value={filters.interestedClass}
        onChange={(e) => set('interestedClass', e.target.value)}
        placeholder="Class…"
        className="h-10 w-24 px-3 rounded-xl border border-gray-200 bg-white text-sm
                   focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />

      {/* Clear */}
      {hasActive && (
        <button
          type="button"
          onClick={() => onChange({ search: '', stage: '', source: '', interestedClass: '' })}
          className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-gray-200 bg-white
                     text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
};
