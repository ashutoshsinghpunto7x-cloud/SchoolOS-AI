import { ChevronUp, ChevronDown, Trash2, RotateCw } from 'lucide-react';

export interface CapturedPage {
  id: string;
  file: File;
  previewUrl: string;
}

interface PageListProps {
  pages: CapturedPage[];
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRetake?: (id: string) => void;
}

/**
 * Simple button-based reordering (move up/down) rather than a drag-and-drop
 * library — keeps this dependency-free while still letting the teacher fix
 * page order, which matters a lot for paragraph flow/context (see plan).
 */
export function PageList({ pages, onDelete, onMoveUp, onMoveDown, onRetake }: PageListProps) {
  if (pages.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {pages.map((page, i) => (
        <div key={page.id} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
          <img src={page.previewUrl} alt={`Page ${i + 1}`} className="w-full aspect-[3/4] object-cover" />
          <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[11px] font-semibold rounded-md px-1.5 py-0.5">
            Page {i + 1}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1.5 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                type="button" disabled={i === 0} onClick={() => onMoveUp(page.id)}
                className="w-6 h-6 rounded-md bg-white/15 text-white flex items-center justify-center disabled:opacity-30"
                aria-label="Move page earlier"
              ><ChevronUp className="w-3.5 h-3.5" /></button>
              <button
                type="button" disabled={i === pages.length - 1} onClick={() => onMoveDown(page.id)}
                className="w-6 h-6 rounded-md bg-white/15 text-white flex items-center justify-center disabled:opacity-30"
                aria-label="Move page later"
              ><ChevronDown className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-1">
              {onRetake && (
                <button
                  type="button" onClick={() => onRetake(page.id)}
                  className="w-6 h-6 rounded-md bg-white/15 text-white flex items-center justify-center"
                  aria-label="Retake this page"
                ><RotateCw className="w-3.5 h-3.5" /></button>
              )}
              <button
                type="button" onClick={() => onDelete(page.id)}
                className="w-6 h-6 rounded-md bg-red-500/80 text-white flex items-center justify-center"
                aria-label="Delete this page"
              ><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
