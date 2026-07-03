import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarNavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  end?: boolean;
}

export const SidebarNavItem = ({ to, icon: Icon, label, badge, end }: SidebarNavItemProps) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
          'transition-all duration-150',
          isActive
            ? 'bg-[#5B5CEB]/10 text-[#5B5CEB] font-semibold'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'w-[18px] h-[18px] flex-shrink-0 transition-colors',
              isActive ? 'text-[#5B5CEB]' : 'text-gray-400'
            )}
            strokeWidth={isActive ? 2.25 : 1.75}
          />
          <span className="flex-1 leading-none">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                isActive
                  ? 'bg-[#5B5CEB] text-white'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          {isActive && !badge && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B5CEB] shrink-0" />
          )}
        </>
      )}
    </NavLink>
  );
};
