import { TrendingUp } from 'lucide-react';
import type { PrincipalAdmissionStats } from '@schoolos/types';

const STAGE_LABELS: Record<string, string> = {
  new_enquiry:          'New Enquiry',
  contacted:            'Contacted',
  follow_up_scheduled:  'Follow-up Scheduled',
  campus_visit:         'Campus Visit',
  application_submitted:'Application Submitted',
  documents_pending:    'Documents Pending',
  admission_approved:   'Admission Approved',
  converted:            'Converted',
  lost:                 'Lost',
};

interface Props {
  data?: PrincipalAdmissionStats;
  isLoading?: boolean;
}

export const AdmissionsWidget = ({ data, isLoading }: Props) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
      </div>
    );
  }

  const activeStages = Object.entries(data.byStage)
    .filter(([stage]) => stage !== 'lost' && stage !== 'converted')
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2.5 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-lg font-bold text-blue-700">{data.total}</p>
          <p className="text-[10px] font-medium text-blue-600 mt-0.5">Total</p>
        </div>
        <div className="text-center p-2.5 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-lg font-bold text-amber-700">{data.newThisMonth}</p>
          <p className="text-[10px] font-medium text-amber-600 mt-0.5">New This Month</p>
        </div>
        <div className="text-center p-2.5 bg-green-50 rounded-xl border border-green-100">
          <p className="text-lg font-bold text-green-700">{data.convertedThisMonth}</p>
          <p className="text-[10px] font-medium text-green-600 mt-0.5">Converted</p>
        </div>
      </div>

      {/* Pipeline stages */}
      {activeStages.length > 0 ? (
        <div className="space-y-2">
          {activeStages.map(([stage, count]) => (
            <div key={stage} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-600">{STAGE_LABELS[stage] ?? stage}</span>
              <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">No active pipeline enquiries.</p>
      )}

      {data.pendingFollowUp > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
          <TrendingUp className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" strokeWidth={2} />
          <p className="text-xs font-medium text-amber-700">{data.pendingFollowUp} follow-up{data.pendingFollowUp > 1 ? 's' : ''} due today</p>
        </div>
      )}
    </div>
  );
};
