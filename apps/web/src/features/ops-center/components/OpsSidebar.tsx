import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  path?: string;
}

// Full spec nav — only items with a `path` are wired up in this phase.
// The rest render disabled with a "Soon" tag so the shell matches the
// eventual full Ops Center without dead links.
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/ops' },
  { label: 'Infrastructure', path: '/ops/infrastructure' },
  { label: 'Applications', path: '/ops/applications' },
  { label: 'Schools', path: '/ops/schools' },
  { label: 'Database' },
  { label: 'Communications' },
  { label: 'Security Center', path: '/ops/security' },
  { label: 'Logs', path: '/ops/logs' },
  { label: 'Alerts' },
  { label: 'Audit Trail', path: '/ops/audit-trail' },
  { label: 'Deployments' },
  { label: 'Users' },
  { label: 'Settings' },
];

export function OpsSidebar() {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#232D38] bg-[#0F141B] lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-[#232D38] px-5">
        <span className="text-sm font-semibold tracking-wide text-[#F4F6F8]">SchoolOS</span>
        <span className="text-sm text-[#64748B]">Ops Center</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) =>
          item.path ? (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/ops'}
              className={({ isActive }) =>
                cn(
                  'mb-0.5 flex items-center rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-white/[0.06] text-[#F4F6F8] font-medium'
                    : 'text-[#98A2B3] hover:bg-white/[0.03] hover:text-[#F4F6F8]',
                )
              }
            >
              {item.label}
            </NavLink>
          ) : (
            <div
              key={item.label}
              className="mb-0.5 flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[#64748B]/60"
            >
              <span>{item.label}</span>
              <span className="rounded border border-[#232D38] px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                Soon
              </span>
            </div>
          ),
        )}
      </nav>
    </aside>
  );
}
