import { useNavigate } from 'react-router-dom';
import { PrincipalHeaderWidget } from '@/features/principal/components/PrincipalHeaderWidget';
import { ReceptionActionCard } from '@/features/reception/components/ReceptionActionCard';
import { AISidePanel } from '@/features/reception/components/AISidePanel';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { WorkspaceSection } from '@/components/workspace/WorkspaceSection';
import { PageContainer } from '@/components/workspace/PageContainer';
import { UpcomingEventsWidget } from '@/features/events/components/UpcomingEventsWidget';

// ── Static data ──────────────────────────────────────────────────────────────

const ACTION_CARDS = [
  {
    id: 'users',
    title: 'Manage Users',
    description: 'Create, edit, and manage login access for staff and admin accounts.',
    buttonLabel: 'Open Users',
    accent: 'purple' as const,
    path: '/administration/users',
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    description: 'Review and adjust what each role is allowed to see and do.',
    buttonLabel: 'Manage Roles',
    accent: 'blue' as const,
    path: '/administration/roles',
  },
  {
    id: 'automation',
    title: 'Automation Jobs',
    description: 'Check the status of scheduled and background automation jobs.',
    buttonLabel: 'View Jobs',
    accent: 'amber' as const,
    path: '/administration/automation',
  },
  {
    id: 'recovery',
    title: 'Recovery Requests',
    description: 'Review pending account recovery requests awaiting approval.',
    buttonLabel: 'View Requests',
    accent: 'green' as const,
    path: '/administration/recovery-requests',
  },
] as const;

// ── AdminDashboardPage ───────────────────────────────────────────────────────

export const AdminDashboardPage = () => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PrincipalHeaderWidget showWeather={false} />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <WorkspaceSection>
              <SectionHeader
                title="Administration"
                subtitle="Quick access to the tools you manage"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ACTION_CARDS.map((card) => (
                  <ReceptionActionCard
                    key={card.id}
                    title={card.title}
                    description={card.description}
                    buttonLabel={card.buttonLabel}
                    accent={card.accent}
                    onClick={() => navigate(card.path)}
                  />
                ))}
              </div>
            </WorkspaceSection>
          </div>

          {/* ── Right column ── */}
          <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
            <AISidePanel />
            <UpcomingEventsWidget />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
