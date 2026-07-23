import { useRef } from 'react';
import { Scene1LockScreen } from '../scenes/Scene1LockScreen';
import { Scene2StatusBar } from '../scenes/Scene2StatusBar';
import { Scene3Drawer } from '../scenes/Scene3Drawer';
import { Scene4MessageDetail } from '../scenes/Scene4MessageDetail';
import { Scene5AdminPanel } from '../scenes/Scene5AdminPanel';
import { Scene6Analytics } from '../scenes/Scene6Analytics';

const SECTIONS = [
  { id: 'lock-screen', step: '01', title: 'Lock screen', desc: 'Principal sends a high-priority push. It lands even while the phone is locked and the app is fully closed.' },
  { id: 'status-bar', step: '02', title: 'Status bar', desc: 'A normal-priority announcement banners in over whatever the teacher is already doing.' },
  { id: 'drawer', step: '03', title: 'Notification drawer', desc: "Pulled down, every queued alert sits together — newest first, priority colour-coded." },
  { id: 'tap-through', step: '04', title: 'Tap-through', desc: 'Tapping skips the home screen and deep-links straight to the message it refers to.' },
  { id: 'composer', step: '05', title: 'Compose & preview', desc: "The Principal's send screen, with the Android preview updating live as they type." },
  { id: 'analytics', step: '06', title: 'Delivery analytics', desc: 'Delivered, opened, pending and failed counts, plus read and click rate, per send.' },
] as const;

// This is a visual specification for the push-notification experience —
// every scene is a real, static React component so it can be reviewed and
// iterated on directly in the app, but nothing here calls FCM or the
// notifications API yet. Wiring it up to a live send is a separate build.
export const PushNotificationDesignPage = () => {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const scrollTo = (id: string) => {
    refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <header className="sticky top-0 z-20 bg-[#FAFAF7]/90 backdrop-blur-xl border-b border-[#EEEBE4] px-8 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#F97316]">SchoolOS AI &middot; Push notifications</p>
        <h1 className="text-[26px] font-semibold text-[#18181B] mt-1">From the Principal's send to the teacher's tap</h1>
        <p className="text-[14px] text-[#78716C] mt-1 max-w-2xl">
          Real Android push delivered via Firebase Cloud Messaging — not an in-app banner. This walks the full journey, screen by screen.
        </p>
      </header>

      <div className="flex">
        <nav className="hidden lg:flex flex-col gap-1 w-64 shrink-0 px-6 py-8 sticky top-[97px] self-start h-[calc(100vh-97px)] overflow-y-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className="flex items-start gap-3 text-left px-3 py-3 rounded-xl hover:bg-white transition-colors group"
            >
              <span className="text-[12px] font-semibold text-[#F97316] tabular-nums mt-0.5">{s.step}</span>
              <span>
                <span className="block text-[13.5px] font-medium text-[#18181B]">{s.title}</span>
                <span className="block text-[12px] text-[#a8a29e] group-hover:text-[#78716C]">{s.desc.split('.')[0]}.</span>
              </span>
            </button>
          ))}
        </nav>

        <main className="flex-1 min-w-0 px-6 lg:px-10 py-10 flex flex-col gap-20">
          <section id="lock-screen" ref={(el) => { refs.current['lock-screen'] = el; }}>
            <SectionHeading step="01" title="Lock screen" desc={SECTIONS[0].desc} />
            <div className="rounded-[32px] bg-[#0B0B0D] p-12 flex justify-center">
              <Scene1LockScreen />
            </div>
          </section>

          <section id="status-bar" ref={(el) => { refs.current['status-bar'] = el; }}>
            <SectionHeading step="02" title="Status bar" desc={SECTIONS[1].desc} />
            <div className="rounded-[32px] bg-[#0B0B0D] p-12 flex justify-center">
              <Scene2StatusBar />
            </div>
          </section>

          <section id="drawer" ref={(el) => { refs.current['drawer'] = el; }}>
            <SectionHeading step="03" title="Notification drawer" desc={SECTIONS[2].desc} />
            <div className="rounded-[32px] bg-[#0B0B0D] p-12 flex justify-center">
              <Scene3Drawer />
            </div>
          </section>

          <section id="tap-through" ref={(el) => { refs.current['tap-through'] = el; }}>
            <SectionHeading step="04" title="Tap-through" desc={SECTIONS[3].desc} />
            <div className="rounded-[32px] bg-[#0B0B0D] p-12 flex justify-center">
              <Scene4MessageDetail />
            </div>
          </section>

          <section id="composer" ref={(el) => { refs.current['composer'] = el; }}>
            <SectionHeading step="05" title="Compose & preview" desc={SECTIONS[4].desc} />
            <Scene5AdminPanel />
          </section>

          <section id="analytics" ref={(el) => { refs.current['analytics'] = el; }}>
            <SectionHeading step="06" title="Delivery analytics" desc={SECTIONS[5].desc} />
            <Scene6Analytics />
          </section>
        </main>
      </div>
    </div>
  );
};

const SectionHeading = ({ step, title, desc }: { step: string; title: string; desc: string }) => (
  <div className="flex items-start gap-4 mb-6">
    <span className="text-[13px] font-semibold text-[#F97316] tabular-nums mt-1 shrink-0">{step}</span>
    <div>
      <h2 className="text-[20px] font-semibold text-[#18181B]">{title}</h2>
      <p className="text-[13.5px] text-[#78716C] mt-0.5 max-w-xl">{desc}</p>
    </div>
  </div>
);
