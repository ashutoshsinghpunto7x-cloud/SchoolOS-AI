import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { goBackOrFallback } from '@/lib/navigation';
import type { ChildSummary } from '../types';
import { ChildSwitcher } from './ChildSwitcher';

interface ParentScreenHeaderProps {
  title: string;
  subtitle?: string;
  children?: ChildSummary[];
  activeChild?: ChildSummary;
  onSelectChild?: (id: string) => void;
  action?: ReactNode;
}

/** Shared top bar for the non-Home parent screens (Academics, Attendance,
 *  Fees, More) — includes a genuine Back button and profile dropdown with Sign Out. */
export function ParentScreenHeader({
  title,
  subtitle,
  children,
  activeChild,
  onSelectChild,
  action,
}: ParentScreenHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Parent';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-[#E8E2D6] bg-white/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => goBackOrFallback(navigate, '/parent')}
            aria-label="Go back to previous screen"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#FBF8F3] hover:bg-[#EFEAE0] border border-[#E8E2D6] text-[#1B2A4E] text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Back</span>
          </button>
          <span className="text-base font-bold tracking-tight text-[#1B2A4E] truncate">SchoolOS</span>
          <span className="hidden sm:inline text-sm text-[#55607A]">Parent Workspace</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {action}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B2A4E] to-[#254A9A] text-white text-xs font-bold flex items-center justify-center shadow-sm hover:ring-2 hover:ring-[#254A9A]/30 transition-all cursor-pointer select-none"
            >
              {initials || 'P'}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 bg-white rounded-2xl border border-[#E8E2D6] shadow-[0_16px_48px_rgba(27,42,78,0.14)] overflow-hidden py-1.5">
                <div className="px-4 py-2.5 border-b border-[#EFEAE0]">
                  <p className="text-sm font-semibold text-[#1B2A4E] truncate m-0">{fullName}</p>
                  <p className="text-xs text-[#7B859D] truncate m-0">{user?.email ?? 'Parent'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/parent/more');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#1B2A4E] hover:bg-[#FBF8F3] transition-colors text-left cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4 text-[#55607A]" />
                  Account &amp; More
                </button>
                <div className="border-t border-[#EFEAE0] mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-5 sm:pb-6 pt-1 flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-[#1B2A4E] tracking-tight m-0">{title}</p>
          {subtitle && <p className="text-base text-[#55607A] m-0 mt-1">{subtitle}</p>}
        </div>

        {children && activeChild && onSelectChild && (
          <div className="shrink-0 pt-1">
            <ChildSwitcher children={children} activeChild={activeChild} onSelect={onSelectChild} />
          </div>
        )}
      </div>
    </header>
  );
}
