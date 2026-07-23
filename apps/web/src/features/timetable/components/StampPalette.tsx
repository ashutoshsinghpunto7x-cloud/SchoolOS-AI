import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StampType = 'subject' | 'class' | 'section';

interface StampRowProps {
  label: string;
  placeholder: string;
  values: string[];
  active: string | null;
  onSelect: (value: string) => void;
  onAdd: (value: string) => void;
}

function StampRow({ label, placeholder, values, active, onSelect, onAdd }: StampRowProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function commitAdd() {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft('');
    setAdding(false);
  }

  return (
    <div className="flex items-start gap-3">
      <span className="w-16 shrink-0 pt-1.5 text-[11px] font-bold text-[var(--tt-text-muted)] uppercase tracking-wider">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-semibold border transition-colors',
              active === v
                ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white'
                : 'bg-[var(--tt-bg-secondary)] border-[var(--tt-border)] text-[var(--tt-text-primary)] hover:border-[#7C5CFF]/50',
            )}
          >
            {v}
          </button>
        ))}

        {adding ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd();
                if (e.key === 'Escape') { setDraft(''); setAdding(false); }
              }}
              onBlur={commitAdd}
              placeholder={placeholder}
              className="h-8 w-28 rounded-full border border-[#7C5CFF]/50 bg-[var(--tt-bg-secondary)] px-3 text-xs text-[var(--tt-text-primary)] focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setDraft(''); setAdding(false); }}
              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--tt-text-muted)] hover:text-[var(--tt-text-primary)]"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-8 px-2.5 flex items-center gap-1 rounded-full border border-dashed border-[var(--tt-border)] text-xs font-semibold text-[var(--tt-text-muted)] hover:text-[#7C5CFF] hover:border-[#7C5CFF]/50 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>
    </div>
  );
}

interface Stamp {
  type: StampType;
  value: string;
}

interface StampPaletteProps {
  subjects: string[];
  classes: string[];
  sections: string[];
  active: Stamp | null;
  onSelect: (stamp: Stamp) => void;
  onAdd: (type: StampType, value: string) => void;
}

// Replaces the old Bulk Add modal: instead of filling subject/class/section
// per-row in a fixed sequence, the Principal builds up reusable palettes once
// and then "stamps" a value onto any period cell by selecting it here and
// clicking the cell — subjects, classes, and sections can each be filled
// across the whole grid in whatever order is convenient.
export function StampPalette({ subjects, classes, sections, active, onSelect, onAdd }: StampPaletteProps) {
  function toggle(type: StampType, value: string) {
    if (active?.type === type && active.value === value) {
      onSelect({ type, value: '' });
    } else {
      onSelect({ type, value });
    }
  }

  return (
    <div className="flex flex-col gap-3 bg-[var(--tt-card)] rounded-2xl border border-[var(--tt-border)] p-4">
      <p className="text-xs text-[var(--tt-text-muted)]">
        Select a subject, class, or section below, then click any period to fill it in — in whatever order you like.
        {active?.value && (
          <span className="ml-1.5 font-semibold text-[#7C5CFF]">
            Stamping "{active.value}" — click a period to apply.
          </span>
        )}
      </p>
      <StampRow label="Subjects" placeholder="e.g. Maths" values={subjects} active={active?.type === 'subject' ? active.value : null} onSelect={(v) => toggle('subject', v)} onAdd={(v) => onAdd('subject', v)} />
      <StampRow label="Classes" placeholder="e.g. 5" values={classes} active={active?.type === 'class' ? active.value : null} onSelect={(v) => toggle('class', v)} onAdd={(v) => onAdd('class', v)} />
      <StampRow label="Sections" placeholder="e.g. A" values={sections} active={active?.type === 'section' ? active.value : null} onSelect={(v) => toggle('section', v)} onAdd={(v) => onAdd('section', v)} />
    </div>
  );
}
