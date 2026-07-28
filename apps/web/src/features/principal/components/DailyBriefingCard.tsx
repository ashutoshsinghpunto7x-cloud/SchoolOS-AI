import { useState } from 'react';
import { Sparkles, Loader2, UserX, CalendarCheck2, ClipboardList, Wallet, UserPlus, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PrincipalDashboardData, TeachersSummaryData } from '@schoolos/types';
import { useLanguage } from '@/context/LanguageContext';
import { useBriefingSummary } from '../hooks/usePrincipal';
import { usePendingLeaveRequests } from '@/features/leave-requests/hooks/useLeaveRequests';
import { usePendingDiscounts } from '@/features/fees/hooks/useFeeStructure';
import { usePendingChangeRequests } from '@/features/student-change-requests/hooks/useStudentChangeRequests';
import { extractErrorMessage } from '@/services/api';

interface DailyBriefingCardProps {
  data?: PrincipalDashboardData;
  teachersSummary?: TeachersSummaryData;
  isLoading?: boolean;
}

// A single full-width "morning summary strip" above the AI chat hero — a
// Stripe/Linear-style stat row, not prose, so it stays scannable in a glance
// and reads as an ops console rather than a chatbot. Every number here is
// already fetched by usePrincipalDashboard()/useTeachersSummary() on the
// existing two endpoints (or the same cached queries PriorityCenter already
// uses for its pending-approvals total, deduped by react-query) — zero new
// backend surface for this view. The optional "Summarize with AI" button is
// the only part that hits the network again, and only on click.
export function DailyBriefingCard({ data, teachersSummary, isLoading }: DailyBriefingCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { mutate: summarize, data: summaryResult, isPending, error } = useBriefingSummary();
  const [showSummary, setShowSummary] = useState(false);
  const { data: leave } = usePendingLeaveRequests();
  const { data: discounts } = usePendingDiscounts();
  const { data: changeRequests } = usePendingChangeRequests();

  const pendingApprovals = (leave?.length ?? 0) + (discounts?.length ?? 0) + (changeRequests?.length ?? 0);
  const teachersAbsent = teachersSummary ? teachersSummary.total - teachersSummary.presentCount : undefined;

  const tiles = [
    {
      label: t('briefing.teachersAbsent'),
      value: teachersAbsent !== undefined ? String(teachersAbsent) : '—',
      danger: (teachersAbsent ?? 0) > 0,
      icon: UserX,
      linkLabel: t('briefing.viewDetails'),
      onClick: () => navigate('/principal/teachers-summary'),
    },
    {
      label: t('briefing.attendanceToday'),
      value: data ? `${data.attendance.today.attendanceRate}%` : '—',
      icon: CalendarCheck2,
      linkLabel: t('briefing.viewReport'),
      onClick: () => navigate('/attendance'),
    },
    {
      label: t('briefing.pendingApprovals'),
      value: pendingApprovals !== undefined ? String(pendingApprovals) : '—',
      danger: (pendingApprovals ?? 0) > 0,
      icon: ClipboardList,
      linkLabel: t('briefing.reviewNow'),
      onClick: () => navigate('/principal/approvals'),
    },
    {
      label: t('briefing.overdueFees'),
      value: data ? String(data.fees.overdueCount) : '—',
      danger: (data?.fees.overdueCount ?? 0) > 0,
      icon: Wallet,
      linkLabel: t('briefing.viewDetails'),
      onClick: () => navigate('/fees'),
    },
    {
      label: t('briefing.newAdmissions'),
      value: data ? String(data.admissions.newThisMonth) : '—',
      icon: UserPlus,
      linkLabel: t('briefing.viewEnquiries'),
      onClick: () => navigate('/enquiries'),
    },
    {
      label: t('briefing.nextEvent'),
      value: data?.upcomingEvents[0]?.title ?? t('briefing.noUpcomingEvents'),
      icon: CalendarClock,
      linkLabel: undefined,
      onClick: () => navigate('/calendar'),
    },
  ];

  const handleSummarize = () => {
    setShowSummary(true);
    if (!summaryResult) summarize();
  };

  const scrollToInsights = () => {
    document.getElementById('more-insights-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] px-6 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-semibold text-[#111827] tracking-tight">{t('briefing.title')}</h3>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={scrollToInsights}
            className="text-[11px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
          >
            {t('briefing.viewAllInsights')}
          </button>
          <button
            type="button"
            onClick={handleSummarize}
            disabled={isPending}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {t('briefing.summarizeWithAi')}
          </button>
        </div>
      </div>

      {showSummary && (
        <div className="mb-3 px-3 py-2.5 rounded-xl bg-[#A855F7]/5 border border-[#A855F7]/15">
          {isPending ? (
            <p className="text-[12px] text-[#6B7280]">{t('briefing.generating')}</p>
          ) : error ? (
            <p className="text-[12px] text-[#EF4444]">{extractErrorMessage(error)}</p>
          ) : (
            <p className="text-[13px] text-[#374151] leading-relaxed">{summaryResult?.summary}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)
        ) : (
          tiles.map((tile) => (
            <button
              key={tile.label}
              type="button"
              onClick={tile.onClick}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-black/[0.02] transition-colors text-left min-w-0"
            >
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                  tile.danger ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#7C3AED]/8 text-[#7C3AED]'
                }`}
              >
                <tile.icon className="w-4 h-4" strokeWidth={2} />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-[10px] font-medium text-[#6B7280] truncate w-full">{tile.label}</span>
                <span
                  className={`text-[15px] font-semibold tabular-nums truncate w-full ${tile.danger ? 'text-[#EF4444]' : 'text-[#111827]'}`}
                  title={tile.value}
                >
                  {tile.value}
                </span>
                {tile.linkLabel && (
                  <span className="text-[10px] font-semibold text-[#7C3AED] truncate w-full">{tile.linkLabel} ›</span>
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
