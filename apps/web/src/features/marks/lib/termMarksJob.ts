import { backgroundJobs } from '@/lib/backgroundJobs';
import { marksApi } from '../api/marks.api';
import type { TermExtractedRow, TermExtractionTarget, TermMarksExtractionResult } from '@schoolos/types';

export interface TermMarksJobMeta {
  cls: string;
  section: string;
  /** Already skill-qualified (e.g. "English - Literature") when the subject is skill-split. */
  subjectName: string;
  unitTest1ExamId: string;
  unitTest2ExamId: string;
  mainExamId: string;
  photoCount: number;
}

export const TERM_MARKS_JOB_KIND = 'term-marks';

// How many photos are read at once — the server already throttles OpenAI, this
// just avoids firing a dozen heavy uploads together on a mobile connection.
const PHOTO_CONCURRENCY = 3;

/** Combines the per-photo results of one register that was photographed in several shots (e.g. a long class split across pages). */
export function mergeTermResults(results: TermMarksExtractionResult[], failures: string[]): TermMarksExtractionResult {
  const byStudent = new Map<string, TermExtractedRow>();
  const warnings: string[] = [...failures];
  const unmatched: TermMarksExtractionResult['unmatched'] = [];

  results.forEach((res, i) => {
    const tag = results.length > 1 ? `Photo ${i + 1}: ` : '';
    res.warnings.forEach((w) => warnings.push(`${tag}${w}`));
    unmatched.push(...res.unmatched);
    for (const row of res.rows) {
      const prev = byStudent.get(row.studentId);
      if (!prev) { byStudent.set(row.studentId, { ...row }); continue; }
      const merged: TermExtractedRow = { ...prev };
      for (const field of ['unitTest1', 'unitTest2', 'mainExam'] as const) {
        const incoming = row[field];
        if (incoming === undefined) continue;
        if (merged[field] === undefined) merged[field] = incoming;
        else if (merged[field] !== incoming) {
          warnings.push(`${row.fullName} appears in more than one photo with different values — kept the first reading, please check.`);
        }
      }
      // Absent only if every photo that mentions the student says so.
      merged.absent = prev.absent && row.absent;
      byStudent.set(row.studentId, merged);
    }
  });

  const rows = [...byStudent.values()].map((r) => {
    const best = r.unitTest1 !== undefined && r.unitTest2 !== undefined
      ? Math.max(r.unitTest1, r.unitTest2)
      : (r.unitTest1 ?? r.unitTest2);
    const total = best !== undefined && r.mainExam !== undefined ? best + r.mainExam : undefined;
    return { ...r, bestUnitTest: best, total };
  });

  return { rows, unmatched, warnings: [...new Set(warnings)], exams: results[0].exams };
}

async function readAllPhotos(target: TermExtractionTarget, files: File[]): Promise<TermMarksExtractionResult> {
  const results: (TermMarksExtractionResult | null)[] = new Array(files.length).fill(null);
  const failures: string[] = [];
  let next = 0;

  async function worker() {
    while (next < files.length) {
      const i = next++;
      try {
        results[i] = await marksApi.extractTermFromImage(target, files[i]);
      } catch (err) {
        failures.push(`Photo ${i + 1} could not be read${err instanceof Error ? ` (${err.message})` : ''} — retake it or enter those students by hand.`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PHOTO_CONCURRENCY, files.length) }, worker));

  const ok = results.filter((r): r is TermMarksExtractionResult => r !== null);
  if (ok.length === 0) throw new Error(failures[0] ?? 'Could not read the photos');
  return mergeTermResults(ok, failures);
}

/** Kicks off reading one or more register photos in the background; returns the job id. */
export function startTermMarksJob(meta: Omit<TermMarksJobMeta, 'photoCount'>, files: File[]): string {
  const target: TermExtractionTarget = {
    class: meta.cls,
    section: meta.section,
    subjectName: meta.subjectName,
    unitTest1ExamId: meta.unitTest1ExamId,
    unitTest2ExamId: meta.unitTest2ExamId,
    mainExamId: meta.mainExamId,
  };
  return backgroundJobs.start<TermMarksJobMeta, TermMarksExtractionResult>({
    kind: TERM_MARKS_JOB_KIND,
    label: `AI Fill — ${meta.subjectName} (Class ${meta.cls}-${meta.section})`,
    successMessage: `Marks read from ${files.length === 1 ? 'the photo' : `${files.length} photos`} — review and save`,
    openLabel: 'Review',
    meta: { ...meta, photoCount: files.length },
    run: () => readAllPhotos(target, files),
    // Opening is handled by TermMarksJobHost (see below) via the viewing id.
    onOpen: () => {},
  });
}
