import type { ReactNode } from 'react';

interface PhoneShellProps {
  children: ReactNode;
  /** Renders the dim lock-screen wallpaper + time instead of a live app screen. */
  locked?: boolean;
  className?: string;
}

// Realistic Android 15 phone frame — punch-hole camera, side keys, gesture
// bar — shared by every scene so the device chrome never has to be redrawn.
export const PhoneShell = ({ children, locked = false, className = '' }: PhoneShellProps) => {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: 300, height: 632 }}>
      {/* Side keys */}
      <div className="absolute -right-[3px] top-[132px] w-[3px] h-[64px] rounded-l bg-[#2a2a2e]" />
      <div className="absolute -left-[3px] top-[108px] w-[3px] h-[32px] rounded-r bg-[#2a2a2e]" />
      <div className="absolute -left-[3px] top-[150px] w-[3px] h-[56px] rounded-r bg-[#2a2a2e]" />

      {/* Titanium frame */}
      <div className="absolute inset-0 rounded-[46px] bg-gradient-to-b from-[#3a3a3e] to-[#1c1c1f] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-[3px] rounded-[43px] overflow-hidden bg-black">
          {/* Screen */}
          <div className="absolute inset-[10px] rounded-[34px] overflow-hidden bg-[#000]">
            <div className="relative w-full h-full overflow-hidden">
              {locked && (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(120% 90% at 50% 0%, #2a1608 0%, #150b05 45%, #050403 100%)',
                  }}
                />
              )}
              {children}

              {/* Punch-hole camera */}
              <div className="absolute left-1/2 top-[14px] -translate-x-1/2 w-[10px] h-[10px] rounded-full bg-black ring-[3px] ring-[#0a0a0a]" />

              {/* Gesture nav bar */}
              <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[120px] h-[4px] rounded-full bg-white/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AndroidStatusBar = ({ dark = false }: { dark?: boolean }) => {
  const tone = dark ? 'text-white' : 'text-[#1a1a1a]';
  return (
    <div className={`flex items-center justify-between px-6 pt-3 pb-1 text-[13px] font-medium tabular-nums ${tone}`}>
      <span style={{ letterSpacing: '0.2px' }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none"><path d="M1 8.5C4 4.5 13 4.5 16 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M4 10.2C6 7.8 11 7.8 13 10.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="8.5" cy="11.3" r="1" fill="currentColor"/></svg>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="1" y="5" width="2.4" height="6" rx="0.6" fill="currentColor"/><rect x="5" y="3" width="2.4" height="8" rx="0.6" fill="currentColor"/><rect x="9" y="1.5" width="2.4" height="9.5" rx="0.6" fill="currentColor" opacity="0.4"/><rect x="13" y="0" width="2.4" height="11" rx="0.6" fill="currentColor" opacity="0.4"/></svg>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none"><rect x="0.75" y="0.75" width="20.5" height="10.5" rx="2.5" stroke="currentColor" strokeWidth="1.2"/><rect x="2.25" y="2.25" width="14" height="7.5" rx="1.3" fill="currentColor"/><rect x="22" y="4" width="1.5" height="4" rx="0.75" fill="currentColor"/></svg>
      </div>
    </div>
  );
};
