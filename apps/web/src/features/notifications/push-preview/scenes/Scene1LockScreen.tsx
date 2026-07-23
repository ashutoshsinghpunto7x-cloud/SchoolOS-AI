import { Megaphone } from 'lucide-react';
import { PhoneShell } from '../components/PhoneShell';
import { NotificationCard } from '../components/NotificationCard';

// Scene 1 — the phone is locked; a high-priority push still lands on the
// lock screen because Android delivers FCM data even while the app (and the
// device) is fully closed.
export const Scene1LockScreen = () => {
  return (
    <PhoneShell locked>
      <div className="flex flex-col h-full pt-14 px-5">
        <div className="text-center mb-8">
          <p className="text-white text-[58px] font-medium leading-none tabular-nums" style={{ letterSpacing: '-1px' }}>9:41</p>
          <p className="text-white/60 text-[15px] mt-2">Wednesday, 23 July</p>
        </div>

        <NotificationCard
          priority="high"
          categoryIcon={<Megaphone size={16} strokeWidth={2.2} />}
          sender="Message from Principal"
          body="Staff meeting has been rescheduled to 8:15 AM tomorrow. Attendance is compulsory."
          time="now"
        />

        <div className="mt-auto mb-6 flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="6" y="10" width="12" height="10" rx="2" stroke="white" strokeWidth="1.8"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" stroke="white" strokeWidth="1.8"/></svg>
          </div>
          <p className="text-white/50 text-[12px]">Swipe up to unlock</p>
        </div>
      </div>
    </PhoneShell>
  );
};
