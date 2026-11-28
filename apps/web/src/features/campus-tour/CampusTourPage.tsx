import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import fnicLogo from '@/assets/illustrations/fnic-logo.webp';
import { TourScene } from './TourScene';
import { TOUR_STOPS, tourImageUrl } from './tourStops';

const stopName = (id: string) => TOUR_STOPS.find((s) => s.id === id)?.name ?? id;

/** Public, no-login photo tour of the campus. */
export function CampusTourPage() {
  const [params, setParams] = useSearchParams();
  const index = Math.max(0, TOUR_STOPS.findIndex((s) => s.id === params.get('stop')));
  const stop = TOUR_STOPS[index];
  const previous = TOUR_STOPS[(index - 1 + TOUR_STOPS.length) % TOUR_STOPS.length];
  const next = TOUR_STOPS[(index + 1) % TOUR_STOPS.length];

  const go = useCallback((id: string) => setParams({ stop: id }, { replace: true }), [setParams]);

  const viewerRef = useRef<HTMLElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useLayoutEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const measure = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Campus Tour — Florence Nightingale Inter College';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(previous.id);
      if (e.key === 'ArrowRight') go(next.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, previous.id, next.id]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Keep the current stop visible in the strip, and fetch the next photo early.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
    new Image().src = tourImageUrl(next);
  }, [next]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  const roundButton =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300';

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 text-white">
      <header className="flex items-center gap-3 px-4 py-3">
        <img src={fnicLogo} alt="" className="h-11 w-11 rounded-full bg-white object-contain" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-tight sm:text-lg">Florence Nightingale Inter College</h1>
          <p className="text-sm leading-snug text-slate-300">Campus tour · Triveni Nagar, Lucknow</p>
        </div>
        {document.fullscreenEnabled && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className={roundButton}
            aria-label={isFullscreen ? 'Exit full screen' : 'View full screen'}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" aria-hidden /> : <Maximize2 className="h-5 w-5" aria-hidden />}
          </button>
        )}
      </header>

      <main ref={viewerRef} className="relative min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {viewport.height > 0 && (
            <TourScene
              key={stop.id}
              stop={stop}
              hotspots={stop.hotspots ?? [{ to: next.id, x: 50, y: 74 }]}
              stopName={stopName}
              onGo={go}
              viewport={viewport}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => go(previous.id)} className={roundButton} aria-label={`Previous: ${previous.name}`}>
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <div className="min-w-0 flex-1 text-center" aria-live="polite">
            <p className="text-lg font-bold">
              {stop.name}
              <span className="ml-2 text-sm font-medium text-slate-400">
                {index + 1} of {TOUR_STOPS.length}
              </span>
            </p>
            <p className="text-sm text-slate-300">{stop.caption}</p>
          </div>
          <button type="button" onClick={() => go(next.id)} className={roundButton} aria-label={`Next: ${next.name}`}>
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <nav aria-label="Tour stops" className="mt-3 overflow-x-auto">
          <ul className="mx-auto flex w-max gap-2 pb-1">
            {TOUR_STOPS.map((s) => (
              <li key={s.id}>
                <button
                  ref={s.id === stop.id ? activeTabRef : undefined}
                  type="button"
                  onClick={() => go(s.id)}
                  aria-current={s.id === stop.id ? 'true' : undefined}
                  className={`min-h-[44px] whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300 ${
                    s.id === stop.id ? 'bg-amber-300 text-slate-950' : 'bg-white/10 text-slate-100 hover:bg-white/20'
                  }`}
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </div>
  );
}
