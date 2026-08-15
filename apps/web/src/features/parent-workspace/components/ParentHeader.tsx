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
    <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight text-gray-900">SchoolOS</span>
          <span className="hidden sm:inline text-sm text-gray-500">Parent Workspace</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-[18px] h-[18px] text-gray-700" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-600" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-label="Help"
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <HelpCircle className="w-[18px] h-[18px] text-gray-700" strokeWidth={1.75} />
          </button>
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5B21B6] to-[#7C3AED] text-white text-xs font-semibold flex items-center justify-center ml-1 shadow-sm"
          >
            {firstName[0]}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-5 sm:pb-6 pt-1">
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {getGreeting()}, {firstName}.
        </p>
        <p className="text-base text-gray-500 mt-1">
          Here's what's happening with {childFirst} today.
        </p>
        <p className="text-sm text-gray-400 mt-1">{TODAY}</p>
      </div>
    </header>
  );
}
