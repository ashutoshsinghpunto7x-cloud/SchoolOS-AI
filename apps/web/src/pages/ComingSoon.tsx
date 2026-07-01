import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

const WORKSPACE_NAMES: Record<string, string> = {
  '/students': 'Students',
  '/communication': 'Communication',
  '/ai-assistant': 'AI Assistant',
  '/administration': 'Administration',
  '/settings': 'Settings',
};

const getWorkspaceName = (pathname: string): string => {
  const key = Object.keys(WORKSPACE_NAMES).find((k) => pathname.startsWith(k));
  return key ? WORKSPACE_NAMES[key] : 'This workspace';
};

const BUILD_ORDER: Record<string, string> = {
  '/students': 'Priority 5 — Sprint 4',
  '/communication': 'Priority 13 — Sprint 9',
  '/ai-assistant': 'Priority 20 — Sprint 13',
  '/administration': 'Priority 3 — Sprint 3',
  '/settings': 'Priority 4 — Sprint 3',
};

export const ComingSoon = () => {
  const location = useLocation();
  const name = getWorkspaceName(location.pathname);
  const buildPriority = BUILD_ORDER[location.pathname] ?? 'Planned';

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Construction}
          title={`${name} — Coming Soon`}
          description={`This workspace is in the build queue. Check the Implementation Playbook for the build order.`}
        />
        <div className="mt-4 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 font-medium">
          Build Order: {buildPriority}
        </div>
      </div>
    </PageContainer>
  );
};
