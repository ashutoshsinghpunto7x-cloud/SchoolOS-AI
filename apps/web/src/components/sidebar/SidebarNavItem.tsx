import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarNavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

export const SidebarNavItem = ({ to, icon: Icon, label, badge }: SidebarNavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          // Base
          'flex items-center gap-3 py-2.5 pr-3 rounded-xl text-sm font-medium',
          'transition-all duration-150',
          // Left border indicator (Linear-style active state)
          'border-l-[3px]',
          isActive
            ? 'bg-blue-50 text-blue-700 border-blue-600 pl-[9px] font-semibold'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent pl-3'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'w-[18px] h-[18px] flex-shrink-0 transition-colors',
              isActive ? 'text-blue-600' : 'text-gray-400'
            )}
            strokeWidth={isActive ? 2 : 1.75}
          />
          <span className="flex-1 leading-none">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              )}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};
