import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Send, X } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePrincipalDashboard } from '../hooks/usePrincipal';
import { useAnalytics } from '@/features/reports/hooks/useReports';
import { usePendingLeaveRequests } from '@/features/leave-requests/hooks/useLeaveRequests';
import { usePendingTestApprovals } from '@/features/mock-tests/hooks/useMockTests';
import { usePendingDiscounts } from '@/features/fees/hooks/useFeeStructure';
import { usePendingChangeRequests } from '@/features/student-change-requests/hooks/useStudentChangeRequests';
import { usePrincipalAssistant } from '@/features/principal-assistant/hooks/usePrincipalAssistant';
import { ChatMessage } from '@/features/principal-assistant/components/ChatMessage';
import { getPrincipalPagePath } from '@/components/topbar/AppLauncherModal';
import { extractErrorMessage } from '@/services/api';

// Principal home — every number on this page comes from the live API
// (/principal/dashboard, attendance analytics, and the four pending-approval
// queues). Nothing is hardcoded, and nothing here sends a WhatsApp message.
// All other screens are the real feature pages, opened from the launcher.

const QUICK_LINKS: { label: string; path: string; d: string }[] = [
  { label: 'Attendance', path: '/attendance', d: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { label: 'Leave', path: '/principal/leave-approvals', d: 'M5 6h14v13H5zM5 10h14M9 4v3M15 4v3M9 15l2 2 4-4' },
  { label: 'Messages', path: '/messages', d: 'M3 6h18v12H3zM3 7l9 7 9-7' },
  { label: 'Calendar', path: '/calendar', d: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5' },
  { label: 'Exams', path: '/exams', d: 'M5 4h11v16H5zM8 9h5M8 13h5M17 20l4-9-2-1-4 9z' },
  { label: 'Marks', path: '/principal/marks', d: 'M12 3a5 5 0 100 10 5 5 0 000-10zM9 12l-2 9 5-3 5 3-2-9' },
  { label: 'Transport', path: '/principal/transport', d: 'M5 4h14v13H5zM5 11h14M8 17v3M16 17v3' },
  { label: 'Teachers', path: '/principal/teachers', d: 'M3 4h18v11H3zM8 20l4-5 4 5M9 9h6' },
  { label: 'Academic Plan', path: '/principal/academic-plan', d: 'M12 6c-2-2-5-2-8-1v13c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1zM12 6v13' },
  { label: 'Timetable', path: '/timetable/school', d: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2' },
  { label: 'Enquiries', path: '/enquiries', d: 'M3 5h18v12H8l-5 4zM8 10h8M8 13h5' },
  { label: 'Hiring', path: '/principal/recruitment', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M19 8v6M22 11h-6' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const PrincipalWorkspace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = usePrincipalDashboard();
  const { data: analytics } = useAnalytics('attendance', {});
  const { data: leaves } = usePendingLeaveRequests();
  const { data: tests } = usePendingTestApprovals();
  const { data: discounts } = usePendingDiscounts();
  const { data: changeRequests } = usePendingChangeRequests();

  // AI assistant (real backend, same as the previous dashboard)
  const { messages, sendMessage, onEditField, onApprove, onCancel, isLoading: aiBusy, error: aiError } =
    usePrincipalAssistant();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (aiOpen) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [aiOpen, messages, aiBusy]);

  const send = (text?: string) => {
    const value = (text ?? aiInput).trim();
    if (!value || aiBusy) return;
    sendMessage(value);
    setAiInput('');
  };

  const lowest = useMemo(() => {
    const rows = analytics?.category === 'attendance' ? analytics.data.byClass : [];
    return [...rows].filter((c) => c.total > 0).sort((a, b) => a.rate - b.rate).slice(0, 3);
  }, [analytics]);

  // Old bookmarks / links of the form /principal?page=<id> go to the real page.
  const legacyPage = searchParams.get('page');
  if (legacyPage) {
    const target = getPrincipalPagePath(legacyPage);
    return <Navigate to={target ?? '/principal'} replace />;
  }

  const firstName = user?.firstName ?? '';
  const attendance = data?.attendance.today;
  const attendanceRate = attendance && attendance.total > 0 ? Math.round(attendance.attendanceRate) : null;
  const pendingLeaves = leaves?.length ?? 0;
  const pendingTests = tests?.length ?? 0;
  const pendingDiscounts = discounts?.length ?? 0;
  const pendingEdits = changeRequests?.length ?? 0;
  const newEnquiries = data?.admissions.newThisMonth ?? 0;
  const alerts = data?.alerts ?? [];

  const approvalRows = [
    { label: 'Staff leave requests', count: pendingLeaves, path: '/principal/leave-approvals' },
    { label: 'Test papers awaiting sign-off', count: pendingTests, path: '/principal/test-approvals' },
    { label: 'Fee discount requests', count: pendingDiscounts, path: '/principal/discount-approvals' },
    { label: 'Student record edit requests', count: pendingEdits, path: '/principal/approvals' },
  ];

  const card = 'bg-white border border-[#E8E2D6] rounded-[18px] shadow-xs';

  return (
    <div className="flex-1 w-full font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-[26px] md:text-[34px] font-medium text-[#1B2A4E] tracking-tight m-0">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#55607A] mt-1">Pick up where you left off.</p>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-red-600">{error.message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-8 px-3 shrink-0 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick launch */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-3">
          {QUICK_LINKS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => navigate(q.path)}
              className="group flex flex-col items-center gap-1.5 text-[11px] sm:text-[12px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="relative w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all group-hover:-translate-y-[2px] group-hover:bg-[#E2E8F5]">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d={q.d} />
                </svg>
                {q.label === 'Leave' && pendingLeaves > 0 && (
                  <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-[#D9822B] text-white text-[9px] font-bold flex items-center justify-center">
                    {pendingLeaves}
                  </span>
                )}
              </span>
              <span className="text-center leading-tight">{q.label}</span>
            </button>
          ))}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button type="button" onClick={() => navigate('/attendance')} className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}>
            <div className="text-[13px] text-[#55607A]">Attendance today</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">
              {isLoading ? '…' : attendanceRate === null ? '—' : `${attendanceRate}%`}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">
              {attendance && attendance.total > 0
                ? `${attendance.present} present · ${attendance.absent} absent`
                : isLoading
                  ? ''
                  : 'Not marked yet today'}
            </span>
          </button>
          <button type="button" onClick={() => navigate('/principal/leave-approvals')} className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}>
            <div className="text-[13px] text-[#55607A]">Leave requests</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">{leaves ? pendingLeaves : '…'}</div>
            <span className="text-[11px] font-semibold text-amber-600">
              {pendingLeaves > 0 ? `${pendingLeaves} awaiting your decision` : 'Nothing pending'}
            </span>
          </button>
          <button type="button" onClick={() => navigate('/enquiries')} className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}>
            <div className="text-[13px] text-[#55607A]">New enquiries this month</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">{isLoading ? '…' : newEnquiries}</div>
            <span className="text-[11px] font-semibold text-[#254A9A]">
              {data ? `${data.admissions.pendingFollowUp} need follow-up` : ''}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between pb-1">
              <div className="text-[16px] font-bold text-[#1B2A4E]">Lowest attendance today</div>
              <button type="button" onClick={() => navigate('/principal/insights')} className="text-[12px] font-semibold text-[#D9822B] hover:underline cursor-pointer">
                View insights →
              </button>
            </div>
            {lowest.length === 0 ? (
              <p className="text-sm text-[#55607A] py-4">No attendance has been marked yet today.</p>
            ) : (
              lowest.map((row) => (
                <button
                  key={`${row.class}-${row.section}`}
                  type="button"
                  onClick={() =>
                    navigate(`/attendance/class/${encodeURIComponent(row.class)}/${encodeURIComponent(row.section)}`)
                  }
                  className="w-full flex items-center gap-3.5 mt-3 text-left cursor-pointer"
                >
                  <span className="w-[96px] text-[14px] font-medium text-[#1B2A4E] shrink-0">
                    {row.class}–{row.section}
                  </span>
                  <div className="flex-1 h-[10px] rounded-full bg-[#F0EBDF] overflow-hidden">
                    <div className="h-full rounded-full bg-[#D9822B]" style={{ width: `${Math.min(100, Math.max(0, row.rate))}%` }} />
                  </div>
                  <b className="w-[42px] text-right text-[14px] font-bold text-[#1B2A4E] shrink-0">{row.rate}%</b>
                </button>
              ))
            )}
          </div>

          <div className={`${card} p-5`}>
            <div className="text-[16px] font-bold text-[#1B2A4E] pb-1">Waiting for you</div>
            {approvalRows.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => navigate(r.path)}
                className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60 text-left cursor-pointer hover:bg-[#FBF8F3] rounded-lg px-1"
              >
                <span className="text-[14px] text-[#1B2A4E]">{r.label}</span>
                <span className={`min-w-6 h-6 px-2 rounded-full text-[12px] font-bold flex items-center justify-center ${r.count > 0 ? 'bg-[#D9822B] text-white' : 'bg-[#F3EEE3] text-[#55607A]'}`}>
                  {r.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {alerts.length > 0 && (
          <div className={`${card} p-5`}>
            <div className="text-[16px] font-bold text-[#1B2A4E] pb-1">Alerts</div>
            {alerts.slice(0, 5).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => a.actionUrl && navigate(a.actionUrl)}
                className="w-full text-left py-2 border-b last:border-b-0 border-[#E8E2D6]/60 cursor-pointer"
              >
                <p className="text-[13px] font-semibold text-[#1B2A4E] m-0">{a.title}</p>
                <p className="text-[12px] text-[#55607A] m-0">{a.message}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI assistant — real backend */}
      {aiOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[520px] max-h-[calc(100vh-130px)] bg-white rounded-[24px] shadow-[0_20px_50px_rgba(27,42,78,0.28)] border border-[#E8E2D6] flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-[#1B2A4E] to-[#254A9A] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#F5B332]" />
              <h3 className="text-[15px] font-bold m-0">SchoolOS AI</h3>
            </div>
            <button type="button" onClick={() => setAiOpen(false)} aria-label="Close assistant" className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div ref={scrollRef} className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0 bg-[#FAF8F5]">
            {messages.length === 0 && (
              <p className="text-[13px] text-[#55607A]">
                Ask about today&apos;s attendance, pending approvals, fee collection, teachers on leave or admissions.
              </p>
            )}
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} onEditField={onEditField} onApprove={onApprove} onCancel={onCancel} onQuickReply={send} />
            ))}
            {aiBusy && <p className="text-[12px] text-[#55607A]">Thinking…</p>}
            {aiError && <p className="text-[12px] text-red-600">{extractErrorMessage(aiError)}</p>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 bg-white border-t border-[#E8E2D6] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask AI anything..."
              disabled={aiBusy}
              className="flex-1 bg-[#F3EEE3] rounded-full px-3.5 py-2 text-[13px] text-[#1B2A4E] outline-none"
            />
            <button type="submit" disabled={!aiInput.trim() || aiBusy} aria-label="Send" className="w-8 h-8 rounded-full bg-[#1B2A4E] text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setAiOpen((v) => !v)}
        aria-label="Ask AI Assistant"
        title="Ask AI Assistant"
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-[#1B2A4E] to-[#254A9A] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(27,42,78,0.28)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Sparkles className="w-6 h-6 text-[#F5B332]" />
      </button>
    </div>
  );
};
