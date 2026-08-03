import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  path?: string;
}

// All 15 spec screens are wired up now — see MEMORY.md / project_ops_center
// for the "what's real vs simulated" notes behind Database/Deployments/
// Communications/Alerts/Settings.
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/ops' },
  { label: 'Feature Management', path: '/ops/feature-flags' },
  { label: 'Maintenance Mode', path: '/ops/maintenance' },
  { label: 'Infrastructure', path: '/ops/infrastructure' },
  { label: 'Applications', path: '/ops/applications' },
  { label: 'Schools', path: '/ops/schools' },
  { label: 'Database', path: '/ops/database' },
  { label: 'Communications', path: '/ops/communications' },
  { label: 'Security Center', path: '/ops/security' },
  { label: 'Logs', path: '/ops/logs' },
  { label: 'Error Monitoring', path: '/ops/errors' },
  { label: 'Alerts', path: '/ops/alerts' },
  { label: 'Performance Testing', path: '/ops/performance' },
  { label: 'Audit Trail', path: '/ops/audit-trail' },
  { label: 'Deployments', path: '/ops/deployments' },
  { label: 'Users', path: '/ops/users' },
  { label: 'Settings', path: '/ops/settings' },
];

export function OpsSidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  return (
    <>
      {/* Backdrop — mobile/tablet only, sidebar is permanently docked at lg: */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[240px] shrink-0 flex-col border-r border-[#232D38] bg-[#0F141B] transition-transform duration-200',
          'lg:static lg:z-auto lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-[#232D38] px-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide text-[#F4F6F8]">SchoolOS</span>
            <span className="text-sm text-[#64748B]">Ops Center</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1 text-[#98A2B3] hover:text-[#F4F6F8] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) =>
            item.path ? (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === '/ops'}
                onClick={onClose}
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
    </>
  );
}
