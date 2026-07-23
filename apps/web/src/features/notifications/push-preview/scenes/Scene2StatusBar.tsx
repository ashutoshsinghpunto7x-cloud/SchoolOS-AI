import { Volume2, Wifi, Sun, Bluetooth, Speaker } from 'lucide-react';
import { PhoneShell, AndroidStatusBar } from '../components/PhoneShell';
import { NotificationCard } from '../components/NotificationCard';

const QUICK_TILES = [
  { icon: Wifi, label: 'Wi-Fi', active: true },
  { icon: Bluetooth, label: 'Bluetooth', active: true },
  { icon: Sun, label: 'Auto-brightness', active: false },
  { icon: Volume2, label: 'Sound', active: true },
  { icon: Speaker, label: 'Cast', active: false },
];

// Scene 2 — phone unlocked to the home screen; a heads-up banner slides
// down over live quick-settings while the user is mid-task.
export const Scene2StatusBar = () => {
  return (
    <PhoneShell>
      <div className="h-full bg-gradient-to-b from-[#1a1d29] to-[#0f1117]">
        <AndroidStatusBar dark />

        <div className="px-4 pt-3">
          <div className="grid grid-cols-3 gap-2.5">
            {QUICK_TILES.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 ${active ? 'bg-[#F97316]/90' : 'bg-white/10'}`}
              >
                <Icon size={16} className={active ? 'text-white' : 'text-white/70'} strokeWidth={2} />
                <span className={`text-[11px] font-medium truncate ${active ? 'text-white' : 'text-white/70'}`}>{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 h-1 w-24 rounded-full bg-white/20 mx-auto" />
        </div>

        <div className="px-3 mt-5">
          <div className="animate-[fade-up_0.4s_ease-out]">
            <NotificationCard
              priority="normal"
              categoryIcon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-8-8 18-2-8-8-2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/></svg>
              }
              sender="New announcement"
              body="Tomorrow is a holiday due to heavy rainfall."
              time="now"
            />
          </div>
        </div>
      </div>
    </PhoneShell>
  );
};
