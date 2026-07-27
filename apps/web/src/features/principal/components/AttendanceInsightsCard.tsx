import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAnalytics } from '@/features/reports/hooks/useReports';

// Descriptive-only: lowest-attendance classes today, sourced from the same
// analytics endpoint the Reports workspace already uses (GET /reports/analytics/attendance).
// No prediction, no per-student threshold breakdown yet (that would need a new
// per-student aggregation — left for a later pass).
export function AttendanceInsightsCard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: analytics, isLoading } = useAnalytics('attendance', {});

  const byClass = analytics?.category === 'attendance' ? analytics.data.byClass : [];
  const lowest = [...byClass].filter((c) => c.total > 0).sort((a, b) => a.rate - b.rate).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
      <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">{t('attendanceInsights.title')}</h3>
      <p className="text-[12px] text-[#6B7280] font-medium mb-3">{t('attendanceInsights.subtitle')}</p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-9 bg-gray-50 rounded-xl animate-pulse" />)}
        </div>
      ) : lowest.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('attendanceInsights.empty')}</p>
      ) : (
        <div className="flex flex-col divide-y divide-black/[0.04]">
          {lowest.map((row) => (
            <button
              key={`${row.class}-${row.section}`}
              type="button"
              onClick={() => navigate('/attendance')}
              className="flex items-center justify-between py-2 hover:bg-black/[0.02] transition-colors text-left -mx-1 px-1 rounded-lg"
            >
              <span className="text-sm font-medium text-[#374151]">{row.class} - {row.section}</span>
              <span className={`text-sm font-semibold ${row.rate < 75 ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                {row.rate}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
