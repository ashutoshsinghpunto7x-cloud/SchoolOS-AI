import { useNavigate } from 'react-router-dom';
import { PrincipalHeaderWidget } from '@/features/principal/components/PrincipalHeaderWidget';
import { ReceptionActionCard } from '../components/ReceptionActionCard';
import { Timeline, TimelineEntry } from '../components/Timeline';
import { TaskCard, Task } from '../components/TaskCard';
import { AISidePanel } from '../components/AISidePanel';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { WorkspaceSection } from '@/components/workspace/WorkspaceSection';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAttendanceSummary } from '@/features/attendance/hooks/useAttendance';
import { AttendanceSummaryCard } from '@/features/attendance/components/AttendanceSummaryCard';
import { useVisitors } from '../hooks/useVisitors';
import { useReceptionTasks } from '../hooks/useReceptionTasks';
import { useFollowUps } from '@/features/enquiries/hooks/useFollowUps';
import { UpcomingEventsWidget } from '@/features/events/components/UpcomingEventsWidget';

// ── Static data ──────────────────────────────────────────────────────────────

const ACTION_CARDS = [
  {
    id: 'admission',
    title: 'New Admission',
    description: 'Register a new student and create their complete school profile.',
    buttonLabel: 'Start Admission',
    accent: 'purple' as const,
  },
  {
    id: 'followups',
    title: "Today's Follow-ups",
    description: 'View and act on all pending follow-up tasks assigned for today.',
    buttonLabel: 'View Follow-ups',
    accent: 'amber' as const,
    badge: '5 pending',
  },
  {
    id: 'call',
    title: 'AI Call Parent',
    description: 'Let AI make a voice call to a parent on your behalf instantly.',
    buttonLabel: 'Call Parent',
    accent: 'green' as const,
  },
  {
    id: 'whatsapp',
    title: 'Send WhatsApp',
    description: 'Send bulk or individual WhatsApp messages to parents right now.',
    buttonLabel: 'Open Messages',
    accent: 'emerald' as const,
  },
  {
    id: 'visitors',
    title: 'Visitor Log',
    description: 'Record a visitor check-in with their purpose of visit, and check them out.',
    buttonLabel: 'Open Visitor Log',
    accent: 'blue' as const,
  },
  {
    id: 'attendance',
    title: 'Attendance Records',
    description: "View any class's attendance and print or save it as a PDF for offline records.",
    buttonLabel: 'View Attendance',
    accent: 'amber' as const,
  },
] as const;

const TIMELINE_ENTRIES: TimelineEntry[] = [
  {
    id: 't1',
    type: 'admission',
    title: 'Admission Created',
    subtitle: 'Riya Sharma · Class 5',
    time: '9:15 AM',
  },
  {
    id: 't2',
    type: 'call',
    title: 'Parent Called',
    subtitle: 'Mr. Patel · Fee follow-up',
    time: '8:45 AM',
  },
  {
    id: 't3',
    type: 'whatsapp',
    title: 'WhatsApp Sent',
    subtitle: 'Holiday notice · 142 parents',
    time: '8:30 AM',
  },
  {
    id: 't4',
    type: 'update',
    title: 'Student Profile Updated',
    subtitle: 'Aryan Kumar · Contact info',
    time: '8:00 AM',
  },
];

const TASKS: Task[] = [
  { id: 'task1', time: '10:30 AM', title: 'Call Rahul Sharma', tag: 'Follow-up' },
  { id: 'task2', time: '11:15 AM', title: 'Campus Visit', tag: 'Admission' },
  { id: 'task3', time: '2:00 PM', title: 'Fee Reminder', tag: 'Finance' },
];

// ── Action handlers map ───────────────────────────────────────────────────────

const ACTION_ROUTES: Record<string, string> = {
  admission: '/students/new',
  followups: '/communication',
  call: '/communication',
  whatsapp: '/communication',
  visitors: '/reception/visitors',
  attendance: '/reception/attendance',
};

// ── Reception home (clean stat tiles + flat list) ────────────────────────────

const RECEPTION_LINKS = [
  { title: 'Visitor Log', description: 'Record a visitor check-in with their purpose of visit, and check them out.', to: '/reception/visitors' },
  { title: 'Attendance Records', description: "View any class's attendance and print or save it as a PDF for offline records.", to: '/reception/attendance' },
  { title: 'My Tasks', description: 'Everything you need to follow up on today, including tasks raised automatically.', to: '/reception/tasks' },
  { title: "Today's Follow-ups", description: 'Every pending admission lead follow-up, overdue ones first.', to: '/reception/follow-ups' },
  { title: 'CVs / Resumes', description: "Log a candidate's resume and forward it to HR or the Principal.", to: '/reception/candidates' },
  { title: 'Reports & Analytics', description: 'Admissions, recruitment, and visitor trends for the front office.', to: '/reception/reports' },
];

function todayEndISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const RECEPTION_QUICK_LINKS: { label: string; path: string; d: string }[] = [
  { label: 'Visitor Log', path: '/reception/visitors', d: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3' },
  { label: 'Admission', path: '/students/new', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 11h-6M19 8v6' },
  { label: 'Enquiries', path: '/enquiries', d: 'M3 5h18v12H8l-5 4zM8 10h8M8 13h5' },
  { label: 'Follow-ups', path: '/reception/follow-ups', d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z' },
  { label: 'My Tasks', path: '/reception/tasks', d: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { label: 'Attendance', path: '/reception/attendance', d: 'M5 6h14v13H5zM5 10h14M9 4v3M15 4v3M9 15l2 2 4-4' },
  { label: 'Resumes', path: '/reception/candidates', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { label: 'Messages', path: '/communication', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { label: 'Staff Chat', path: '/messages', d: 'M3 6h18v12H3zM3 7l9 7 9-7' },
  { label: 'Reports', path: '/reception/reports', d: 'M18 20V10M12 20V4M6 20v-6' },
];

function ReceptionHome({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { user } = useAuth();
  const { data: waiting } = useVisitors({ status: 'waiting', limit: 1 });
  const { data: onSite } = useVisitors({ onlyOnSite: true, limit: 1 });
  const { data: tasks } = useReceptionTasks({ status: 'open', mine: true, limit: 1 });
  const { data: followUps } = useFollowUps({ status: 'pending', dueBy: todayEndISO(), limit: 1 });
  const firstName = user?.firstName ?? '';
  const card = 'bg-white border border-[#E8E2D6] rounded-[18px] shadow-xs';

  return (
    <div className="flex-1 w-full bg-[#FBF8F3] font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-[26px] md:text-[34px] font-medium text-[#1B2A4E] tracking-tight m-0">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#55607A] mt-1">
            Front office, visitors &amp; daily follow-ups.
          </p>
        </div>

        {/* Quick launch */}
        <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3">
          {RECEPTION_QUICK_LINKS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => onNavigate(q.path)}
              className="group flex flex-col items-center gap-1.5 text-[11px] sm:text-[12px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="relative w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all group-hover:-translate-y-[2px] group-hover:bg-[#E2E8F5]">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d={q.d} />
                </svg>
              </span>
              <span className="text-center leading-tight">{q.label}</span>
            </button>
          ))}
        </div>

        {/* 3 Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button type="button" onClick={() => onNavigate('/reception/visitors')} className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}>
            <div className="text-[13px] text-[#55607A]">Visitors Waiting</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">{waiting?.meta.total ?? '—'}</div>
            <span className="text-[11px] font-semibold text-emerald-600">
              {onSite?.meta.total ?? 0} visitor{(onSite?.meta.total ?? 0) === 1 ? '' : 's'} on site
            </span>
          </button>

          <button type="button" onClick={() => onNavigate('/reception/tasks')} className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}>
            <div className="text-[13px] text-[#55607A]">Open Tasks</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">{tasks?.meta.total ?? '—'}</div>
            <span className="text-[11px] font-semibold text-amber-600">
              {(tasks?.meta.total ?? 0) > 0 ? `${tasks?.meta.total} assigned to you` : 'All caught up'}
            </span>
          </button>

          <button type="button" onClick={() => onNavigate('/reception/follow-ups')} className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}>
            <div className="text-[13px] text-[#55607A]">Follow-ups Due</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">{followUps?.meta.total ?? '—'}</div>
            <span className="text-[11px] font-semibold text-[#254A9A]">
              Admission leads due today
            </span>
          </button>
        </div>

        {/* 2-Column Action Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${card} p-5`}>
            <div className="text-[16px] font-bold text-[#1B2A4E] pb-1">Front Desk</div>
            {RECEPTION_LINKS.slice(0, 3).map((l) => (
              <button
                key={l.to}
                type="button"
                onClick={() => onNavigate(l.to)}
                className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60 text-left cursor-pointer hover:bg-[#FBF8F3] rounded-lg px-1"
              >
                <span className="min-w-0 pr-3">
                  <span className="block text-[14px] text-[#1B2A4E]">{l.title}</span>
                  <span className="block text-[11px] text-[#55607A] truncate">{l.description}</span>
                </span>
                <span className="text-[12px] font-semibold text-[#254A9A] shrink-0">Open →</span>
              </button>
            ))}
          </div>

          <div className={`${card} p-5`}>
            <div className="text-[16px] font-bold text-[#1B2A4E] pb-1">Follow-ups &amp; Records</div>
            {RECEPTION_LINKS.slice(3).map((l) => (
              <button
                key={l.to}
                type="button"
                onClick={() => onNavigate(l.to)}
                className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60 text-left cursor-pointer hover:bg-[#FBF8F3] rounded-lg px-1"
              >
                <span className="min-w-0 pr-3">
                  <span className="block text-[14px] text-[#1B2A4E]">{l.title}</span>
                  <span className="block text-[11px] text-[#55607A] truncate">{l.description}</span>
                </span>
                <span className="text-[12px] font-semibold text-[#D9822B] shrink-0">Open →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ReceptionWorkspace ───────────────────────────────────────────────────────

// This route is shared by two audiences: the reception role's own home page,
// and admin's broader "Reception" nav link (see NAV_ITEMS_ALL in Sidebar.tsx).
// Reception's nav was trimmed to just Visitor Log + Attendance Records
// (2026-08-17) — this page mirrors that for the reception role specifically,
// while admin still gets the fuller dashboard below unchanged.
export const ReceptionWorkspace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isReception = user?.role === 'reception';

  // Today's attendance, as submitted by teachers across every class — admin
  // needs visibility into this without having to open the separate
  // Attendance workspace. Reception's own GET access to this endpoint isn't
  // role-restricted server-side either, but reception gets the trimmed view
  // below and never renders this, so there's no need to fetch it for them.
  const { data: attendanceSummary } = useAttendanceSummary(
    {
      dateFrom: new Date().toISOString().slice(0, 10),
      dateTo: new Date().toISOString().slice(0, 10),
    },
    isAdmin,
  );

  // Reception's dashboard: plain stat tiles + a flat list of destinations,
  // no icons or decoration (2026-10-03 feedback: match the clean Vought 7
  // admin dashboard style).
  if (isReception) {
    return (
      <PageContainer>
        <ReceptionHome onNavigate={navigate} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
    <div className="flex flex-col gap-6">

      {/* Daily command-centre header — same as Principal/Teacher. Weather is
          hidden here (admin/reception has no use for it, per feedback) —
          the principal dashboard still shows it via its own default. */}
      <PrincipalHeaderWidget showWeather={false} />

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* Today's Work — 2×2 grid of action cards */}
          <WorkspaceSection>
            <SectionHeader
              title="Today's Work"
              subtitle="Quick actions for your reception duties"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ACTION_CARDS.map((card) => (
                <ReceptionActionCard
                  key={card.id}
                  title={card.title}
                  description={card.description}
                  buttonLabel={card.buttonLabel}
                  accent={card.accent}
                  badge={'badge' in card ? card.badge : undefined}
                  onClick={() => navigate(ACTION_ROUTES[card.id])}
                />
              ))}
            </div>
          </WorkspaceSection>

          {/* Search */}
          <WorkspaceSection>
            <SectionHeader
              title="Quick Search"
              subtitle="Find any student, parent or record"
            />
            <SearchBar
              placeholder="Search students, parents, admissions…"
              onSearch={(q) =>
                navigate(q.trim() ? `/students?q=${encodeURIComponent(q.trim())}` : '/students')
              }
            />
          </WorkspaceSection>

          {/* Admin-only: today's attendance across every class, as submitted
              by teachers — same summary shown on the Attendance workspace,
              surfaced here too so admin doesn't have to leave the dashboard. */}
          {isAdmin && attendanceSummary && (
            <WorkspaceSection>
              <SectionHeader
                title="Today's Attendance"
                subtitle="Submitted by teachers across every class"
              />
              <AttendanceSummaryCard summary={attendanceSummary} />
            </WorkspaceSection>
          )}

          {/* Activity timeline */}
          <WorkspaceSection>
            <SectionHeader
              title="Recent Activity"
              subtitle="Everything that happened today"
            />
            <Timeline entries={TIMELINE_ENTRIES} />
          </WorkspaceSection>
        </div>

        {/* ── Right column ── */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
          <AISidePanel />
          {/* School-wide upcoming events (holidays, exams, etc.) */}
          <UpcomingEventsWidget />
          <TaskCard tasks={TASKS} />
        </div>
      </div>
    </div>
    </PageContainer>
  );
};
