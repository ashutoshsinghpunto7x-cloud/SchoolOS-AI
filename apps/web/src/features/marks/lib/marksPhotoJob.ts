import { backgroundJobs } from '@/lib/backgroundJobs';
import { marksApi } from '../api/marks.api';
import type { ComponentScore, ExtractedMarksRow, MarksBatchTarget, MarksExtractionResult } from '@schoolos/types';

export const MARKS_PHOTO_JOB_KIND = 'marks-photo';

export interface MarksPhotoJobMeta {
  target: MarksBatchTarget;
  /** Entry-page URL to return to when the finished job is opened from the tray / toast. */
  pathname: string;
  photoCount: number;
}

export function sameMarksTarget(a: MarksBatchTarget, b: MarksBatchTarget): boolean {
  return a.examId === b.examId && a.class === b.class && a.section === b.section && a.subjectName === b.subjectName;
}

const PHOTO_CONCURRENCY = 3;

/** Combines per-photo results of one register photographed in several shots. */
export function mergeMarksResults(results: MarksExtractionResult[], failures: string[]): MarksExtractionResult {
  const byStudent = new Map<string, ExtractedMarksRow>();
  const warnings: string[] = [...failures];
  const unmatched: MarksExtractionResult['unmatched'] = [];

  results.forEach((res, i) => {
    const tag = results.length > 1 ? `Photo ${i + 1}: ` : '';
    res.warnings.forEach((w) => warnings.push(`${tag}${w}`));
    unmatched.push(...res.unmatched);
    for (const row of res.extracted) {
      const prev = byStudent.get(row.studentId);
      if (!prev) { byStudent.set(row.studentId, { ...row, componentScores: [...row.componentScores] }); continue; }
      const scores: ComponentScore[] = [...prev.componentScores];
      for (const incoming of row.componentScores) {
        const idx = scores.findIndex((c) => c.componentName === incoming.componentName);
        if (idx === -1) { scores.push(incoming); continue; }
        if (scores[idx].score === undefined) scores[idx] = incoming;
        else if (incoming.score !== undefined && incoming.score !== scores[idx].score) {
          warnings.push(`${row.fullName} appears in more than one photo with different ${incoming.componentName} marks — kept the first reading, please check.`);
        }
      }
      byStudent.set(row.studentId, { ...prev, componentScores: scores });
    }
  });

  return { source: 'image', extracted: [...byStudent.values()], unmatched, warnings: [...new Set(warnings)] };
}

async function readAllPhotos(target: MarksBatchTarget, files: File[]): Promise<MarksExtractionResult> {
  const results: (MarksExtractionResult | null)[] = new Array(files.length).fill(null);
  const failures: string[] = [];
  let next = 0;
  async function worker() {
    while (next < files.length) {
      const i = next++;
      try {
        results[i] = await marksApi.extractFromImage(target, files[i]);
      } catch (err) {
        failures.push(`Photo ${i + 1} could not be read${err instanceof Error ? ` (${err.message})` : ''} — retake it or enter those students by hand.`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PHOTO_CONCURRENCY, files.length) }, worker));
  const ok = results.filter((r): r is MarksExtractionResult => r !== null);
  if (ok.length === 0) throw new Error(failures[0] ?? 'Could not read the photos');
  return mergeMarksResults(ok, failures);
}

export function startMarksPhotoJob(
  target: MarksBatchTarget,
  files: File[],
  pathname: string,
  onOpen: (pathname: string) => void,
): string {
  return backgroundJobs.start<MarksPhotoJobMeta, MarksExtractionResult>({
    kind: MARKS_PHOTO_JOB_KIND,
    label: `AI Fill — ${target.subjectName} (Class ${target.class}-${target.section})`,
    successMessage: `Marks read from ${files.length === 1 ? 'the photo' : `${files.length} photos`} — review and apply`,
    openLabel: 'Review',
    meta: { target, pathname, photoCount: files.length },
    run: () => readAllPhotos(target, files),
    // The entry page picks the finished job up (and opens the review) when it shows.
    onOpen: (job) => onOpen(job.meta.pathname),
  });
}
