import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface SidebarNavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  end?: boolean;
}

export const SidebarNavItem = ({ to, icon: Icon, label, badge, end }: SidebarNavItemProps) => {
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';
  const isPrincipal = user?.role === 'principal';
  // Accountant renders on the purple/pink liquid-glass sidebar (same as
  // Teacher) — the white/transparent nav-item styling here is built for
  // that background.
  const useDarkGlassSidebar = isAccountant;

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border border-transparent',
          'transition-all duration-200',
          useDarkGlassSidebar
            ? isActive
              ? 'liquid-glass-pill bg-white/10 text-white border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_8px_rgba(0,0,0,0.15),0_4px_18px_rgba(0,0,0,0.20)]'
              : 'text-white/70 hover:bg-white/5 hover:text-white hover:backdrop-blur-sm hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
            : isPrincipal
            ? isActive
              ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white font-semibold shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            : isActive
              ? 'bg-[#5B5CEB]/10 text-[#5B5CEB] font-semibold'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'w-[18px] h-[18px] flex-shrink-0 transition-all duration-200',
              useDarkGlassSidebar
                ? isActive ? 'text-white' : 'text-white/70'
                : isPrincipal
                ? isActive ? 'text-white' : 'text-gray-400'
                : isActive ? 'text-[#5B5CEB]' : 'text-gray-400'
            )}
            strokeWidth={useDarkGlassSidebar ? 1.5 : (isActive ? 2.25 : 1.75)}
          />
          <span className={cn("flex-1 leading-none font-medium", (useDarkGlassSidebar || isPrincipal) && isActive && "font-semibold")}>
            {label}
          </span>
          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center transition-colors',
                useDarkGlassSidebar
                  ? isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/60'
                  : isPrincipal
                  ? isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#A855F7]/10 text-[#5B21B6]'
                  : isActive
                    ? 'bg-[#5B5CEB] text-white'
                    : 'bg-gray-100 text-gray-500'
              )}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          {isActive && !badge && !useDarkGlassSidebar && !isPrincipal && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B5CEB] shrink-0" />
          )}
        </>
      )}
    </NavLink>
  );
};
