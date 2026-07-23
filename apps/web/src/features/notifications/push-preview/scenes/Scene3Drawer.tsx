import { Megaphone, Clock, BookOpen, MessageCircle, Wallet } from 'lucide-react';
import { PhoneShell, AndroidStatusBar } from '../components/PhoneShell';
import { NotificationCard, type NotificationPriority } from '../components/NotificationCard';

const NOTIFICATIONS: Array<{
  icon: typeof Megaphone;
  priority: NotificationPriority;
  sender: string;
  body: string;
  time: string;
}> = [
  { icon: Megaphone, priority: 'high', sender: 'Principal', body: 'Staff meeting tomorrow at 8:15 AM', time: '2m' },
  { icon: Clock, priority: 'high', sender: 'Reminder', body: 'Attendance submission due in 15 minutes', time: '15m' },
  { icon: BookOpen, priority: 'normal', sender: 'Homework', body: 'Homework assigned to Class 8 Science', time: '1h' },
  { icon: MessageCircle, priority: 'normal', sender: 'Vice Principal', body: 'Please review the exam seating plan.', time: '2h' },
  { icon: Wallet, priority: 'emergency', sender: 'Fee alert', body: '3 students have pending fee payments.', time: '3h' },
];

// Scene 3 — the notification drawer, pulled down to show everything queued
// for this teacher, newest first.
export const Scene3Drawer = () => {
  return (
    <PhoneShell>
      <div className="h-full bg-gradient-to-b from-[#242730] to-[#121319]">
        <AndroidStatusBar dark />
        <div className="px-3 pt-2 pb-2 flex items-center justify-between">
          <span className="text-white/85 text-[13px] font-medium">Today</span>
          <span className="text-white/50 text-[12px]">Clear all</span>
        </div>
        <div className="px-3 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 500 }}>
          {NOTIFICATIONS.map((n, i) => (
            <NotificationCard
              key={i}
              compact
              priority={n.priority}
              categoryIcon={<n.icon size={14} strokeWidth={2.2} />}
              sender={n.sender}
              body={n.body}
              time={n.time}
            />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
};
