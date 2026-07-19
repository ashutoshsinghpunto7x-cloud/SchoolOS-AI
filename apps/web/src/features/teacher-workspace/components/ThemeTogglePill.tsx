import { useCallback, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Premium theme toggle pill ─────────────────────────────────────────────────
// A pill-shaped track with a sliding thumb + sparkle burst on switch.

export function ThemeTogglePill({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  const [sparkling, setSparkling] = useState(false);
  const [sparkDir, setSparkDir] = useState<'to-dark' | 'to-light'>('to-dark');
  const sparkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (sparkTimer.current) clearTimeout(sparkTimer.current);
    setSparkDir(theme === 'light' ? 'to-dark' : 'to-light');
    setSparkling(false);
    // Force a reflow so the CSS animation restarts
    requestAnimationFrame(() => {
      setSparkling(true);
      sparkTimer.current = setTimeout(() => setSparkling(false), 600);
    });
    onToggle();
  }, [theme, onToggle]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/50 rounded-full"
    >
      {/* Sparkle burst */}
      <span
        className={cn(
          'theme-toggle-sparkle',
          sparkDir,
          sparkling && 'animate-sparkle'
        )}
      />

      {/* Pill track */}
      <span className="theme-toggle-pill" data-theme={theme}>
        {/* Thumb */}
        <span className="theme-toggle-thumb">
          {theme === 'dark' ? (
            <Moon className="w-3 h-3 text-white" strokeWidth={2} />
          ) : (
            <Sun className="w-3 h-3 text-amber-500" strokeWidth={2} />
          )}
        </span>
      </span>
    </button>
  );
}
