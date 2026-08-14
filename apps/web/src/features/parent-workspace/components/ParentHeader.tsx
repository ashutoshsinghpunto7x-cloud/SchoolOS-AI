import { Bell, HelpCircle } from 'lucide-react';

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
  const firstName = parentName.split(' ')[0];
  const childFirst = childName.split(' ')[0];

  return (
    <header className="border-b border-[#E7E4DE] bg-[#F5F1EB]/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-[#0D0D0D]">SchoolOS</span>
          <span className="hidden sm:inline text-sm text-[#6B6B6B]">Parent Workspace</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <Bell className="w-[18px] h-[18px] text-[#1A1A1A]" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#A6752F]" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-label="Help"
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <HelpCircle className="w-[18px] h-[18px] text-[#1A1A1A]" strokeWidth={1.75} />
          </button>
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-[#0D0D0D] text-white text-xs font-medium flex items-center justify-center ml-1"
          >
            {firstName[0]}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-6 pt-1">
        <p className="text-2xl sm:text-3xl font-medium text-[#0D0D0D] tracking-tight">
          {getGreeting()}, {firstName}.
        </p>
        <p className="text-base text-[#6B6B6B] mt-1">
          Here's what's happening with {childFirst} today.
        </p>
        <p className="text-sm text-[#6B6B6B] mt-1">{TODAY}</p>
      </div>
    </header>
  );
}
