import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Calendar, User, ChevronDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Enquiry, EnquiryStage } from '@schoolos/types';
import { StageBadge, STAGE_LABEL, STAGE_ORDER } from './StageBadge';
import { SourceBadge } from './SourceBadge';
import { useUpdateEnquiryStage } from '../hooks/useEnquiries';

interface EnquiryCardProps {
  enquiry: Enquiry;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const isOverdueFollowUp = (date?: string) =>
  date ? new Date(date) < new Date() : false;

export const EnquiryCard = ({ enquiry }: EnquiryCardProps) => {
  const navigate = useNavigate();
  const [showStageMenu, setShowStageMenu] = useState(false);
  const { mutate: updateStage, isPending } = useUpdateEnquiryStage(enquiry._id);

  const isConverted = enquiry.stage === 'converted';
  const followUpOverdue = isOverdueFollowUp(enquiry.followUpDate);

  function handleStageChange(stage: EnquiryStage) {
    setShowStageMenu(false);
    updateStage({ stage });
  }

  const availableStages = STAGE_ORDER.filter((s) => s !== enquiry.stage && s !== 'converted');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out p-5">
      <div className="flex flex-col gap-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 leading-tight truncate">
              {enquiry.studentName}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Class {enquiry.interestedClass}</p>
          </div>
          <StageBadge stage={enquiry.stage} size="sm" />
        </div>

        {/* Parent info */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{enquiry.parentName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>{enquiry.parentPhone}</span>
          </div>
          {enquiry.followUpDate && (
            <div className={cn('flex items-center gap-1.5 text-sm',
              followUpOverdue ? 'text-red-600 font-semibold' : 'text-gray-500')}>
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Follow-up: {fmtDate(enquiry.followUpDate)}</span>
              {followUpOverdue && <span className="text-xs">(overdue)</span>}
            </div>
          )}
        </div>

        {/* Source + counsellor */}
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={enquiry.source} />
          {enquiry.assignedCounsellor && (
            <span className="text-xs text-gray-400 font-medium">
              {enquiry.assignedCounsellor}
            </span>
          )}
          {enquiry.tags.slice(0, 2).map((tag) => (
            <span key={tag}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {tag}
            </span>
          ))}
        </div>

        {/* Action row */}
        <div className="flex gap-2 pt-1 border-t border-gray-50">
          <button
            type="button"
            onClick={() => navigate(`/enquiries/${enquiry._id}`)}
            className="flex-1 h-9 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95]
                       flex items-center justify-center gap-1.5
                       text-sm font-semibold text-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>

          {!isConverted && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStageMenu((v) => !v)}
                disabled={isPending}
                className="h-9 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200
                           flex items-center gap-1 text-sm font-semibold text-gray-600
                           transition-colors disabled:opacity-50"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {showStageMenu && (
                <div className="absolute right-0 bottom-10 z-20 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 overflow-hidden">
                  <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Move to stage
                  </p>
                  {availableStages.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => handleStageChange(stage)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors',
                        stage === 'lost' ? 'text-red-600' : 'text-gray-700',
                      )}
                    >
                      {STAGE_LABEL[stage]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isConverted && enquiry.conversionData?.studentId && (
            <button
              type="button"
              onClick={() => navigate(`/students/${enquiry.conversionData!.studentId}`)}
              className="h-9 px-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200
                         text-xs font-semibold text-green-700 transition-colors"
            >
              Student
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
