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

function StatTile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value ?? '–'}</p>
    </div>
  );
}

function ReceptionHome({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { data: waiting } = useVisitors({ status: 'waiting', limit: 1 });
  const { data: onSite } = useVisitors({ onlyOnSite: true, limit: 1 });
  const { data: tasks } = useReceptionTasks({ status: 'open', mine: true, limit: 1 });
  const { data: followUps } = useFollowUps({ status: 'pending', dueBy: todayEndISO(), limit: 1 });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Visitors Waiting" value={waiting?.meta.total} />
        <StatTile label="Visitors On Site" value={onSite?.meta.total} />
        <StatTile label="Open Tasks" value={tasks?.meta.total} />
        <StatTile label="Follow-ups Due" value={followUps?.meta.total} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Quick Access</h2>
        </div>
        <ul className="border-t border-gray-200 divide-y divide-gray-100">
          {RECEPTION_LINKS.map((l) => (
            <li key={l.to}>
              <button
                type="button"
                onClick={() => onNavigate(l.to)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">{l.title}</span>
                  <span className="block text-sm text-gray-500 truncate">{l.description}</span>
                </span>
                <span className="text-sm font-semibold text-[var(--brand-purple-dark)] flex-shrink-0">Open</span>
              </button>
            </li>
          ))}
        </ul>
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
