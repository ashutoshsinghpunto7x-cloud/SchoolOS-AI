import { UserPlus, ClipboardList, Phone, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GreetingBanner } from '../components/GreetingBanner';
import { ReceptionActionCard } from '../components/ReceptionActionCard';
import { Timeline, TimelineEntry } from '../components/Timeline';
import { TaskCard, Task } from '../components/TaskCard';
import { AISidePanel } from '../components/AISidePanel';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { WorkspaceSection } from '@/components/workspace/WorkspaceSection';
import { PageContainer } from '@/components/workspace/PageContainer';

// ── Static data ──────────────────────────────────────────────────────────────

const ACTION_CARDS = [
  {
    id: 'admission',
    icon: UserPlus,
    title: 'New Admission',
    description: 'Register a new student and create their complete school profile.',
    buttonLabel: 'Start Admission',
    accent: 'blue' as const,
  },
  {
    id: 'followups',
    icon: ClipboardList,
    title: "Today's Follow-ups",
    description: 'View and act on all pending follow-up tasks assigned for today.',
    buttonLabel: 'View Follow-ups',
    accent: 'amber' as const,
    badge: '5 pending',
  },
  {
    id: 'call',
    icon: Phone,
    title: 'AI Call Parent',
    description: 'Let AI make a voice call to a parent on your behalf instantly.',
    buttonLabel: 'Call Parent',
    accent: 'green' as const,
  },
  {
    id: 'whatsapp',
    icon: MessageCircle,
    title: 'Send WhatsApp',
    description: 'Send bulk or individual WhatsApp messages to parents right now.',
    buttonLabel: 'Open Messages',
    accent: 'emerald' as const,
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
};

// ── ReceptionWorkspace ───────────────────────────────────────────────────────

export const ReceptionWorkspace = () => {
  const navigate = useNavigate();

  return (
    <PageContainer>
    <div className="flex flex-col gap-6">

      {/* Greeting banner — full width */}
      <GreetingBanner />

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
                  icon={card.icon}
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
          <TaskCard tasks={TASKS} />
        </div>
      </div>
    </div>
    </PageContainer>
  );
};
