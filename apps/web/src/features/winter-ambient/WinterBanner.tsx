import '@/features/teacher-workspace/winter/winter.css';
import { WinterHero } from '@/features/teacher-workspace/winter/WinterHero';
import { levelInfo } from '@/features/teacher-workspace/winter/winterStore';

const TIPS = [
  'Brr! Have a great day ❄',
  'Stay warm out there ☕',
  'Tap me for a little winter cheer!',
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Slim snowy banner (Frosty included) shown at the top of non-teacher dashboards. */
export function WinterBanner({ firstName, onTurnOff }: { firstName: string; onTurnOff: () => void }) {
  return (
    <div className="tw-ambient-banner">
      <WinterHero
        compact
        greeting={greeting()}
        firstName={firstName}
        dateStr={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        streak={0}
        nextLabel={null}
        level={levelInfo(0)}
        points={0}
        tips={TIPS}
        onTurnOff={onTurnOff}
      />
    </div>
  );
}
