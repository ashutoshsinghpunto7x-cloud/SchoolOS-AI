import type { CapturedPage } from '../components/ChapterCapture/PageList';

// Captured page images are held client-side only (see plan: "no server-side
// image storage" — this app has no object storage and runs serverless). This
// module-level store hands the in-memory File/blob-URL objects from the
// capture page to the review page within the same tab/session — File objects
// don't survive router navigation `state` reliably across all history
// backends, and there's no reason to round-trip them through
// sessionStorage/IndexedDB for a same-tab, same-session handoff.
//
// Tradeoff (flagged in the plan): if the tab is closed before "Save Chapter"
// is clicked, captured-but-unsaved pages are lost — same as today's single-
// image upload flow, just more visible given multi-page capture.

interface ChapterCaptureSession {
  class: string;
  subject: string;
  chapterName?: string;
  pages: CapturedPage[];
}

let session: ChapterCaptureSession | null = null;

export function setChapterCaptureSession(data: ChapterCaptureSession): void {
  session = data;
}

export function getChapterCaptureSession(): ChapterCaptureSession | null {
  return session;
}

export function clearChapterCaptureSession(): void {
  session = null;
}
