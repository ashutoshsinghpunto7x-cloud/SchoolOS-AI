import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, ImageOff } from 'lucide-react';
import { tourImageUrl, type TourHotspot, type TourStop } from './tourStops';

const PLACEHOLDER_RATIO = 16 / 9;
const KEY_PAN_PX = 120;

interface TourSceneProps {
  stop: TourStop;
  hotspots: TourHotspot[];
  stopName: (id: string) => string;
  onGo: (id: string) => void;
  viewport: { width: number; height: number };
}

/**
 * One photo, always shown at full height and its own aspect ratio, so nothing is
 * cropped from the top or bottom. A photo wider than the screen is dragged
 * sideways to look around; a narrower one is centred over a blurred backdrop.
 */
export function TourScene({ stop, hotspots, stopName, onGo, viewport }: TourSceneProps) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  // How far the visitor has dragged away from the centred position.
  const [pan, setPan] = useState(0);
  const drag = useRef<{ pointerX: number; pan: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const src = tourImageUrl(stop);

  const width = viewport.height * (ratio ?? PLACEHOLDER_RATIO);
  const overflow = Math.max(0, width - viewport.width);
  const clamp = (value: number) => Math.min(overflow / 2, Math.max(-overflow / 2, value));
  const offset = (viewport.width - width) / 2 + clamp(pan);

  const startDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!overflow || (e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerX: e.clientX, pan: clamp(pan) };
  };
  const moveDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPan(clamp(drag.current.pan + e.clientX - drag.current.pointerX));
  };
  const endDrag = () => {
    drag.current = null;
  };
  const panWithKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!overflow || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    e.stopPropagation();
    setPan(clamp(pan + (e.key === 'ArrowLeft' ? KEY_PAN_PX : -KEY_PAN_PX)));
  };

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.6, ease: 'easeOut' }}
    >
      {!failed && (
        <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
      )}
      <div
        role="group"
        aria-label={`${stop.name} view`}
        tabIndex={0}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={panWithKeys}
        className={`absolute top-0 h-full touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300 ${overflow ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ width, left: offset }}
      >
        {failed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-700 to-slate-900 text-slate-200">
            <ImageOff className="h-10 w-10" aria-hidden />
            <p className="text-lg font-semibold">Photo coming soon</p>
          </div>
        ) : (
          <img
            src={src}
            alt={`${stop.name} at Florence Nightingale Inter College`}
            draggable={false}
            onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
            onError={() => setFailed(true)}
            className="h-full w-full"
          />
        )}

        {hotspots.map((spot) => (
          <button
            key={spot.to}
            type="button"
            onClick={() => onGo(spot.to)}
            aria-label={`Go to ${stopName(spot.to)}`}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 focus:outline-none [&:focus-visible>span:first-child]:ring-4 [&:focus-visible>span:first-child]:ring-amber-300"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-xl motion-safe:animate-pulse">
              <ArrowUp className="h-6 w-6" aria-hidden />
            </span>
            <span className="whitespace-nowrap rounded-full bg-slate-950/80 px-3 py-1 text-sm font-semibold text-white">
              {stopName(spot.to)}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
