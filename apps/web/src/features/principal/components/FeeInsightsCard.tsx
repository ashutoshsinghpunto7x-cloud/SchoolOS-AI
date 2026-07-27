import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useClassFeeOverview } from '@/features/school-classes/hooks/useSchoolClasses';
import { useOutstandingFees } from '@/features/fees/hooks/useFees';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// Descriptive-only fee breakdown: pending-by-class/section (reusing the same
// data ClassFeeOverviewWidget already renders) and the largest individual
// pending accounts (reusing GET /fees/outstanding, sorted client-side by
// balance — the server's own dueDate sort is left untouched for other callers).
export function FeeInsightsCard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: classFees, isLoading: classLoading } = useClassFeeOverview();
  const { data: outstanding, isLoading: outstandingLoading } = useOutstandingFees({ limit: 50 });

  const topPendingClasses = [...(classFees ?? [])].sort((a, b) => b.pending - a.pending).slice(0, 4);
  const largestAccounts = [...(outstanding?.data ?? [])].sort((a, b) => b.balance - a.balance).slice(0, 4);

  const isLoading = classLoading || outstandingLoading;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col gap-4">
      <div>
        <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">{t('feeInsights.title')}</h3>
        <p className="text-[12px] text-[#6B7280] font-medium">{t('feeInsights.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-9 bg-gray-50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div>
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">{t('feeInsights.byClass')}</p>
            {topPendingClasses.length === 0 ? (
              <p className="text-sm text-gray-400 py-1">{t('feeInsights.empty')}</p>
            ) : (
              <div className="flex flex-col divide-y divide-black/[0.04]">
                {topPendingClasses.map((row) => (
                  <button
                    key={`${row.class}-${row.section}`}
                    type="button"
                    onClick={() => navigate('/fees')}
                    className="flex items-center justify-between py-1.5 hover:bg-black/[0.02] transition-colors text-left -mx-1 px-1 rounded-lg"
                  >
                    <span className="text-sm font-medium text-[#374151]">{row.class} - {row.section}</span>
                    <span className="text-sm font-semibold text-[#111827]">{formatCurrency(row.pending)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">{t('feeInsights.largestAccounts')}</p>
            {largestAccounts.length === 0 ? (
              <p className="text-sm text-gray-400 py-1">{t('feeInsights.empty')}</p>
            ) : (
              <div className="flex flex-col divide-y divide-black/[0.04]">
                {largestAccounts.map((rec) => (
                  <button
                    key={rec._id}
                    type="button"
                    onClick={() => navigate('/fees')}
                    className="flex items-center justify-between py-1.5 hover:bg-black/[0.02] transition-colors text-left -mx-1 px-1 rounded-lg"
                  >
                    <span className="text-sm font-medium text-[#374151] truncate">{rec.studentName}</span>
                    <span className="text-sm font-semibold text-[#EF4444] shrink-0 ml-2">{formatCurrency(rec.balance)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
