import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnquiryStage, StageCounts } from '@schoolos/types';
import { STAGE_LABEL, STAGE_ORDER } from './StageBadge';

interface PipelineOverviewProps {
  counts: StageCounts[];
  isLoading?: boolean;
  selectedStage: EnquiryStage | '';
  onStageSelect: (stage: EnquiryStage | '') => void;
}

const STAGE_COLOR: Record<EnquiryStage, { bg: string; text: string; activeBg: string; activeText: string; border: string }> = {
  new_enquiry:           { bg: 'bg-sky-50',     text: 'text-sky-600',    activeBg: 'bg-sky-600',     activeText: 'text-white', border: 'border-sky-200' },
  contacted:             { bg: 'bg-blue-50',    text: 'text-blue-600',   activeBg: 'bg-[#5B21B6]',    activeText: 'text-white', border: 'border-blue-200' },
  follow_up_scheduled:   { bg: 'bg-indigo-50',  text: 'text-indigo-600', activeBg: 'bg-indigo-600',  activeText: 'text-white', border: 'border-indigo-200' },
  campus_visit:          { bg: 'bg-purple-50',  text: 'text-purple-600', activeBg: 'bg-purple-600',  activeText: 'text-white', border: 'border-purple-200' },
  application_submitted: { bg: 'bg-amber-50',   text: 'text-amber-600',  activeBg: 'bg-amber-600',   activeText: 'text-white', border: 'border-amber-200' },
  documents_pending:     { bg: 'bg-orange-50',  text: 'text-orange-600', activeBg: 'bg-orange-600',  activeText: 'text-white', border: 'border-orange-200' },
  admission_approved:    { bg: 'bg-teal-50',    text: 'text-teal-600',   activeBg: 'bg-teal-600',    activeText: 'text-white', border: 'border-teal-200' },
  converted:             { bg: 'bg-green-50',   text: 'text-green-600',  activeBg: 'bg-green-600',   activeText: 'text-white', border: 'border-green-200' },
  lost:                  { bg: 'bg-red-50',     text: 'text-red-500',    activeBg: 'bg-red-500',     activeText: 'text-white', border: 'border-red-200' },
};

export const PipelineOverview = ({
  counts, isLoading, selectedStage, onStageSelect,
}: PipelineOverviewProps) => {
  const countMap = new Map(counts.map((c) => [c.stage, c.count]));
  const total    = counts.reduce((sum, c) => sum + c.count, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Pipeline</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{total} total</span>
          {selectedStage && (
            <button
              type="button"
              onClick={() => onStageSelect('')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {STAGE_ORDER.map((stage) => {
          const count     = countMap.get(stage) ?? 0;
          const isActive  = selectedStage === stage;
          const colors    = STAGE_COLOR[stage];

          return (
            <button
              key={stage}
              type="button"
              onClick={() => onStageSelect(isActive ? '' : stage)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-150',
                'hover:-translate-y-0.5 hover:shadow-sm',
                isActive
                  ? `${colors.activeBg} ${colors.activeText} border-transparent shadow-sm`
                  : `${colors.bg} ${colors.text} ${colors.border} hover:border-current`,
              )}
            >
              <span className={cn('text-xl font-bold leading-none', isActive ? 'text-white' : '')}>
                {count}
              </span>
              <span className={cn('text-[10px] font-semibold text-center leading-tight', isActive ? 'text-white/90' : 'text-gray-500')}>
                {STAGE_LABEL[stage]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
