import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const ROOT_ID = 'exam-print-root';

/** Mounts `children` directly under <body>, opens the print dialog, and hides the rest of the app
 * on paper. Printing from outside the app layout lets long papers flow onto further A4 pages
 * instead of being clipped by a scroll container or padded out with blank sheets. */
export function PrintPortal({ onDone, children }: { onDone: () => void; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    const finish = () => doneRef.current();
    window.addEventListener('afterprint', finish);
    // The logo and any question figures must be decoded first, or they print as empty boxes.
    const images = Array.from(rootRef.current?.querySelectorAll('img') ?? []);
    void Promise.all(images.map((img) => img.decode().catch(() => undefined))).then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => { if (!cancelled) window.print(); }));
    });
    return () => { cancelled = true; window.removeEventListener('afterprint', finish); };
  }, []);

  return createPortal(
    <div id={ROOT_ID} ref={rootRef}>
      <style>{`
        #${ROOT_ID} { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
          body > *:not(#${ROOT_ID}) { display: none !important; }
          #${ROOT_ID} { display: block; }
          #${ROOT_ID} .exam-sheet { width: auto !important; min-height: 0 !important; padding: 0 !important; }
        }
      `}</style>
      {children}
    </div>,
    document.body,
  );
}
