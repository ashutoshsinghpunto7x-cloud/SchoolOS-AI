import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ParentHeaderProps {
  parentName: string;
  childName: string;
  unreadCount: number;
  onOpenNotifications: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function ParentHeader({ parentName, childName, unreadCount, onOpenNotifications }: ParentHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const firstName = parentName.split(' ')[0];
  const childFirst = childName.split(' ')[0];
  const initials = parentName
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight text-[#1B2A4E]">SchoolOS</span>
          <span className="hidden sm:inline text-sm text-[#55607A]">Parent Workspace</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F1E8] transition-colors cursor-pointer"
          >
            <Bell className="w-[18px] h-[18px] text-[#1B2A4E]" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D9822B]" aria-hidden="true" />
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B2A4E] to-[#254A9A] text-white text-xs font-bold flex items-center justify-center shadow-sm hover:ring-2 hover:ring-[#254A9A]/30 transition-all cursor-pointer select-none"
            >
              {initials || firstName[0]}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 bg-white rounded-2xl border border-[#E8E2D6] shadow-[0_16px_48px_rgba(27,42,78,0.14)] overflow-hidden py-1.5">
                <div className="px-4 py-2.5 border-b border-[#EFEAE0]">
                  <p className="text-sm font-semibold text-[#1B2A4E] truncate m-0">{parentName}</p>
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-5 sm:pb-6 pt-1">
        <p className="text-2xl sm:text-3xl font-bold text-[#1B2A4E] tracking-tight m-0">
          {getGreeting()}, {firstName}.
        </p>
        <p className="text-base text-[#55607A] m-0 mt-1">
          Here&apos;s what&apos;s happening with {childFirst} today.
        </p>
        <p className="text-sm text-[#7B859D] m-0 mt-1">{TODAY}</p>
      </div>
    </header>
  );
}
