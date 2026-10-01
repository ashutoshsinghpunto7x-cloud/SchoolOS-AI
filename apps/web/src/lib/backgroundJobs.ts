import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';

// App-wide registry for long AI jobs (marks photo reading, paper generation,
// photo → questions). The work is owned by this module-level store, not by
// whichever modal/page started it — so closing the modal, backing out, or
// switching screens does not cancel it or lose its result. The server side of
// every one of these is already a durable job/saved record; this is the
// client half that keeps listening.
//
// Limit (by design): it lives in the page's JS memory. If the OS kills the tab
// outright, the in-flight upload is gone; a server job that already started
// still finishes, and generated papers still appear in the Papers list.

export type BackgroundJobStatus = 'running' | 'done' | 'failed';

export interface BackgroundJob<TMeta = unknown, TResult = unknown> {
  id: string;
  kind: string;
  label: string;
  status: BackgroundJobStatus;
  meta: TMeta;
  result?: TResult;
  error?: string;
  startedAt: number;
  /** Hidden from the tray once the user has dealt with it (saved / opened / dismissed). */
  dismissed: boolean;
  /** Called when the user taps the finished job's "View"/"Review" action. */
  onOpen?: (job: BackgroundJob<TMeta, TResult>) => void;
  openLabel: string;
}

// Which finished job the user has asked to look at — lets a feature-level host
// (e.g. the marks review modal) render itself for a job opened from the tray
// or a toast, without that job's original screen being mounted.
let viewingId: string | null = null;
// Jobs whose own screen/modal is currently open — the tray stays quiet for them.
const held = new Set<string>();

interface StartOptions<TMeta, TResult> {
  kind: string;
  label: string;
  meta: TMeta;
  run: () => Promise<TResult>;
  onOpen?: (job: BackgroundJob<TMeta, TResult>) => void;
  openLabel?: string;
  successMessage?: string;
  /** Skip the completion toast (e.g. when the starting screen shows the result itself). */
  silent?: boolean;
}

let jobs: BackgroundJob[] = [];
const listeners = new Set<() => void>();
let counter = 0;

function emit() {
  jobs = [...jobs];
  listeners.forEach((l) => l());
}

function patch(id: string, p: Partial<BackgroundJob>) {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...p } : j));
  listeners.forEach((l) => l());
}

export const backgroundJobs = {
  start<TMeta, TResult>(opts: StartOptions<TMeta, TResult>): string {
    const id = `bg-${Date.now()}-${++counter}`;
    jobs = [...jobs, {
      id,
      kind: opts.kind,
      label: opts.label,
      status: 'running',
      meta: opts.meta,
      startedAt: Date.now(),
      dismissed: false,
      onOpen: opts.onOpen as BackgroundJob['onOpen'],
      openLabel: opts.openLabel ?? 'View',
    }];
    emit();

    opts.run().then(
      (result) => {
        patch(id, { status: 'done', result });
        // Skip the toast when the starting screen is still open and showing the outcome itself.
        if (!opts.silent && !held.has(id)) {
          toast.success(opts.successMessage ?? `${opts.label} — ready`, {
            duration: 10_000,
            action: opts.onOpen
              ? { label: opts.openLabel ?? 'View', onClick: () => backgroundJobs.open(id) }
              : undefined,
          });
        }
      },
      (err) => {
        const error = err instanceof Error ? err.message : 'Something went wrong';
        patch(id, { status: 'failed', error });
        if (!opts.silent && !held.has(id)) toast.error(`${opts.label} — failed`, { description: error, duration: 10_000 });
      },
    );
    return id;
  },

  get(id: string): BackgroundJob | undefined {
    return jobs.find((j) => j.id === id);
  },

  open(id: string) {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    viewingId = id;
    listeners.forEach((l) => l());
    job.onOpen?.(job);
  },

  /** Mark a job as being shown by an open screen so the tray doesn't duplicate it; returns the release function. */
  hold(id: string): () => void {
    held.add(id);
    emit();
    return () => { held.delete(id); emit(); };
  },

  isHeld(id: string) {
    return held.has(id);
  },

  closeViewing() {
    viewingId = null;
    listeners.forEach((l) => l());
  },

  viewing() {
    return viewingId;
  },

  dismiss(id: string) {
    patch(id, { dismissed: true });
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },

  snapshot() {
    return jobs;
  },
};

export function useBackgroundJobs(): BackgroundJob[] {
  return useSyncExternalStore(backgroundJobs.subscribe, backgroundJobs.snapshot, backgroundJobs.snapshot);
}

export function useBackgroundJob<TMeta = unknown, TResult = unknown>(id: string | null): BackgroundJob<TMeta, TResult> | undefined {
  const all = useBackgroundJobs();
  return id ? (all.find((j) => j.id === id) as BackgroundJob<TMeta, TResult> | undefined) : undefined;
}

export function useViewingJobId(): string | null {
  return useSyncExternalStore(backgroundJobs.subscribe, backgroundJobs.viewing, backgroundJobs.viewing);
}
