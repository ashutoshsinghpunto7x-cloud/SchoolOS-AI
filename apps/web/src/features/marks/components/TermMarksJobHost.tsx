import { backgroundJobs, useBackgroundJob, useViewingJobId } from '@/lib/backgroundJobs';
import { TERM_MARKS_JOB_KIND } from '../lib/termMarksJob';
import { TermAiCaptureModal } from './TermAiCaptureModal';

// Re-opens the combined-register review for a photo-reading job that was
// started earlier, from the tray or the "ready" toast — the screen that
// started it may be long gone by then.
export function TermMarksJobHost() {
  const viewingId = useViewingJobId();
  const job = useBackgroundJob(viewingId);
  if (!viewingId || !job || job.kind !== TERM_MARKS_JOB_KIND) return null;
  return (
    <TermAiCaptureModal
      key={viewingId}
      cls=""
      section=""
      subjectName=""
      exams={[]}
      resumeJobId={viewingId}
      onClose={() => backgroundJobs.closeViewing()}
    />
  );
}
