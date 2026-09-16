import { marksService } from './marks.service';
import { entryTableQuerySchema, termExtractionQuerySchema } from './marks.validation';
import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { openaiWhisperProvider } from '../ai/providers/stt/openai-whisper.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { ComponentStatus, IComponentScore } from './marks.model';
import { ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { aiExtractionJobRepository } from './ai-extraction-job.repository';

// ── Output shapes ─────────────────────────────────────────────────────────────

export interface ExtractedMarksRow {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  componentScores: IComponentScore[];
}

export interface UnmatchedExtraction {
  rawName?: string;
  rawRollNumber?: string;
  scores: Record<string, number>;
}

export interface MarksExtractionResult {
  source: 'image' | 'voice';
  extracted: ExtractedMarksRow[];
  unmatched: UnmatchedExtraction[];
  warnings: string[];
  transcript?: string;
}

// ── Term (multi-exam) capture output shapes ────────────────────────────────────
// One combined register photo covering Unit Test 1 + Unit Test 2 + Half
// Yearly (main exam) for a single subject — as opposed to the single-exam
// capture above, which only ever fills one exam's components. "Best" and
// "Total" are read off the sheet only to cross-check the arithmetic
// (Best = max(UT1, UT2), Total = Best + Half Yearly); the values actually
// applied always come from the computed arithmetic, with a warning raised
// whenever the sheet disagrees.

export interface TermExtractedRow {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  unitTest1?: number;
  unitTest2?: number;
  bestUnitTest?: number;
  mainExam?: number;
  total?: number;
  absent: boolean;
}

export interface TermExamRef {
  examId: string;
  componentName: string;
}

export interface TermMarksExtractionResult {
  rows: TermExtractedRow[];
  unmatched: UnmatchedExtraction[];
  warnings: string[];
  exams: { unitTest1: TermExamRef; unitTest2: TermExamRef; mainExam: TermExamRef };
}

// ── Raw shape the model is asked to return ─────────────────────────────────────

interface RawExtractedEntry {
  rollNumber?: string | null;
  name?: string | null;
  absent?: boolean;
  scores?: Record<string, number | string | null>;
}

interface RawTermEntry {
  rollNumber?: string | null;
  name?: string | null;
  absent?: boolean;
  unitTest1?: number | string | null;
  unitTest2?: number | string | null;
  best?: number | string | null;
  halfYearly?: number | string | null;
  total?: number | string | null;
}

// ── Prompt building ────────────────────────────────────────────────────────────

function buildSystemPrompt(components: { name: string; maxMarks: number }[]): string {
  return `You read a teacher's handwritten or dictated student marks and convert them into structured JSON.

The exam has these components (score out of, in brackets): ${components.map((c) => `"${c.name}" (max ${c.maxMarks})`).join(', ')}.

For each student you can identify, return one entry with:
- "rollNumber": the student's roll number if visible/mentioned, else null
- "name": the student's name if visible/mentioned, else null
- "absent": true only if explicitly marked absent, else false
- "scores": an object mapping each component name to the numeric score given (omit components not mentioned)

Return ONLY a valid JSON object: {"entries": [...]}. No markdown, no explanation. If you cannot confidently read a value, omit that field rather than guessing.`;
}

function buildTermSystemPrompt(maxMarks: { ut1: number; ut2: number; main: number }): string {
  return `You read a teacher's handwritten term mark register (a combined result sheet) and convert it into structured JSON.

This register has five score columns, in this exact left-to-right order:
1. "Unit Test 1" (max ${maxMarks.ut1})
2. "Unit Test 2" (max ${maxMarks.ut2})
3. "Best" — the higher of Unit Test 1 and Unit Test 2
4. "Half Yearly" (max ${maxMarks.main})
5. "Total" — Best + Half Yearly

The students are handwritten in whatever order the teacher filled the sheet in — this is NOT the roll-number or attendance-list order. Identify each row by the name written next to it, not by its position on the page.

For each student row you can identify, return one entry with:
- "rollNumber": the roll number if visible, else null
- "name": the student's name as written, else null
- "absent": true only if explicitly marked absent, else false
- "unitTest1", "unitTest2", "best", "halfYearly", "total": the number actually written in that column, or null if blank/illegible — report only what is written, never calculate a value yourself

Return ONLY a valid JSON object: {"entries": [...]}. No markdown, no explanation. If you cannot confidently read a value, use null for it rather than guessing.`;
}

function parseEntries<T>(raw: string): T[] {
  try {
    const body = JSON.parse(raw);
    const entries = Array.isArray(body) ? body : body.entries;
    if (!Array.isArray(entries)) return [];
    return entries;
  } catch (err) {
    logger.error('[MarksExtraction] Failed to parse AI response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not read a result from the AI — try a clearer photo or recording.');
  }
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Handwriting/OCR misreads a letter or two often enough (e.g. "DWIVEDI" ->
// "DWIWEDI") that a strict equality match would push otherwise-obvious
// matches into the unmatched pile. A short edit-distance tolerance recovers
// those without risking cross-matching genuinely different students.
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function findClosestName(
  nameKey: string,
  byName: Map<string, { studentId: string; fullName: string; rollNumber?: string }>,
): { studentId: string; fullName: string; rollNumber?: string } | undefined {
  const maxDistance = nameKey.length <= 8 ? 1 : 2;
  let best: { studentId: string; fullName: string; rollNumber?: string } | undefined;
  let bestDistance = maxDistance + 1;
  for (const [candidateKey, student] of byName) {
    const distance = levenshtein(nameKey, candidateKey);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = student;
    }
  }
  return bestDistance <= maxDistance ? best : undefined;
}

// ── Matching + score reconciliation ────────────────────────────────────────────

function reconcile(
  entries: RawExtractedEntry[],
  roster: { studentId: string; fullName: string; rollNumber?: string }[],
  components: { name: string; maxMarks: number }[],
): { extracted: ExtractedMarksRow[]; unmatched: UnmatchedExtraction[]; warnings: string[] } {
  const byRoll = new Map(roster.filter((r) => r.rollNumber).map((r) => [normalize(r.rollNumber!), r]));
  const byName = new Map(roster.map((r) => [normalize(r.fullName), r]));
  const maxByComponent = new Map(components.map((c) => [c.name, c.maxMarks]));
  const validComponentNames = new Set(components.map((c) => c.name));

  const extracted: ExtractedMarksRow[] = [];
  const unmatched: UnmatchedExtraction[] = [];
  const warnings: string[] = [];

  for (const entry of entries) {
    const rollKey = entry.rollNumber ? normalize(String(entry.rollNumber)) : undefined;
    const nameKey = entry.name ? normalize(entry.name) : undefined;
    // Match by name first, roll number only as a fallback. The sheet's
    // student order is not the roster/attendance order — names get written
    // in whatever order the teacher filled them in — so a roll number read
    // off the page is the less reliable signal here; the name the teacher
    // actually wrote next to each score is what should drive the match.
    const student = (nameKey && byName.get(nameKey))
      || (nameKey && findClosestName(nameKey, byName))
      || (rollKey && byRoll.get(rollKey));

    const cleanScores: Record<string, number> = {};
    for (const [componentName, value] of Object.entries(entry.scores ?? {})) {
      if (!validComponentNames.has(componentName)) continue;
      const num = typeof value === 'string' ? Number(value) : value;
      if (typeof num !== 'number' || Number.isNaN(num)) continue;
      const max = maxByComponent.get(componentName) ?? 0;
      if (num > max) {
        warnings.push(`${entry.name ?? entry.rollNumber ?? 'A student'}: ${componentName} read as ${num}, exceeds max ${max} — capped, please verify.`);
        cleanScores[componentName] = max;
      } else {
        cleanScores[componentName] = num;
      }
    }

    if (!student) {
      if (Object.keys(cleanScores).length > 0 || entry.name || entry.rollNumber) {
        unmatched.push({
          rawName: entry.name ?? undefined,
          rawRollNumber: entry.rollNumber ?? undefined,
          scores: cleanScores,
        });
      }
      continue;
    }

    const status: ComponentStatus = entry.absent ? 'absent' : 'present';
    extracted.push({
      studentId: student.studentId,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      componentScores: components.map((c) => ({
        componentName: c.name,
        score: status === 'present' ? cleanScores[c.name] : undefined,
        status,
      })),
    });
  }

  return { extracted, unmatched, warnings };
}

function toNumberOrUndefined(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = typeof value === 'string' ? Number(value) : value;
  return typeof num === 'number' && !Number.isNaN(num) ? num : undefined;
}

/** Same name-first matching as reconcile() above, but for a combined
 *  UT1+UT2+Half-Yearly register. Best/Total are read off the sheet only to
 *  flag arithmetic disagreements — the values actually returned always come
 *  from computing Best = max(UT1, UT2) and Total = Best + Half Yearly, never
 *  from a possibly-misread Best/Total column. */
function reconcileTerm(
  entries: RawTermEntry[],
  roster: { studentId: string; fullName: string; rollNumber?: string }[],
  maxMarks: { ut1: number; ut2: number; main: number },
): { rows: TermExtractedRow[]; unmatched: UnmatchedExtraction[]; warnings: string[] } {
  const byRoll = new Map(roster.filter((r) => r.rollNumber).map((r) => [normalize(r.rollNumber!), r]));
  const byName = new Map(roster.map((r) => [normalize(r.fullName), r]));

  const rows: TermExtractedRow[] = [];
  const unmatched: UnmatchedExtraction[] = [];
  const warnings: string[] = [];

  for (const entry of entries) {
    const rollKey = entry.rollNumber ? normalize(String(entry.rollNumber)) : undefined;
    const nameKey = entry.name ? normalize(entry.name) : undefined;
    const student = (nameKey && byName.get(nameKey))
      || (nameKey && findClosestName(nameKey, byName))
      || (rollKey && byRoll.get(rollKey));
    const who = entry.name ?? entry.rollNumber ?? 'A student';

    let unitTest1 = toNumberOrUndefined(entry.unitTest1);
    let unitTest2 = toNumberOrUndefined(entry.unitTest2);
    let bestUnitTest = toNumberOrUndefined(entry.best);
    let mainExam = toNumberOrUndefined(entry.halfYearly);
    let total = toNumberOrUndefined(entry.total);

    if (unitTest1 !== undefined && unitTest1 > maxMarks.ut1) {
      warnings.push(`${who}: Unit Test 1 read as ${unitTest1}, exceeds max ${maxMarks.ut1} — capped, please verify.`);
      unitTest1 = maxMarks.ut1;
    }
    if (unitTest2 !== undefined && unitTest2 > maxMarks.ut2) {
      warnings.push(`${who}: Unit Test 2 read as ${unitTest2}, exceeds max ${maxMarks.ut2} — capped, please verify.`);
      unitTest2 = maxMarks.ut2;
    }
    if (mainExam !== undefined && mainExam > maxMarks.main) {
      warnings.push(`${who}: Half Yearly read as ${mainExam}, exceeds max ${maxMarks.main} — capped, please verify.`);
      mainExam = maxMarks.main;
    }

    if (unitTest1 !== undefined && unitTest2 !== undefined) {
      const expectedBest = Math.max(unitTest1, unitTest2);
      if (bestUnitTest !== undefined && Math.abs(bestUnitTest - expectedBest) > 0.01) {
        warnings.push(`${who}: sheet shows Best=${bestUnitTest}, but the higher of Unit Test 1/2 is ${expectedBest} — using ${expectedBest}, please verify.`);
      }
      bestUnitTest = expectedBest;
    } else {
      bestUnitTest = unitTest1 ?? unitTest2 ?? bestUnitTest;
    }

    if (bestUnitTest !== undefined && mainExam !== undefined) {
      const expectedTotal = bestUnitTest + mainExam;
      if (total !== undefined && Math.abs(total - expectedTotal) > 0.01) {
        warnings.push(`${who}: sheet shows Total=${total}, but Best+Half Yearly is ${expectedTotal} — using ${expectedTotal}, please verify.`);
      }
      total = expectedTotal;
    }

    if (!student) {
      if (unitTest1 !== undefined || unitTest2 !== undefined || mainExam !== undefined || entry.name || entry.rollNumber) {
        unmatched.push({
          rawName: entry.name ?? undefined,
          rawRollNumber: entry.rollNumber ?? undefined,
          scores: {
            ...(unitTest1 !== undefined ? { unitTest1 } : {}),
            ...(unitTest2 !== undefined ? { unitTest2 } : {}),
            ...(mainExam !== undefined ? { halfYearly: mainExam } : {}),
          },
        });
      }
      continue;
    }

    rows.push({
      studentId: student.studentId,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      unitTest1: entry.absent ? undefined : unitTest1,
      unitTest2: entry.absent ? undefined : unitTest2,
      bestUnitTest: entry.absent ? undefined : bestUnitTest,
      mainExam: entry.absent ? undefined : mainExam,
      total: entry.absent ? undefined : total,
      absent: !!entry.absent,
    });
  }

  return { rows, unmatched, warnings };
}

// ── Service ────────────────────────────────────────────────────────────────────

export const marksExtractionService = {
  async extractFromImage(
    rawQuery: unknown,
    imageDataUri: string,
    ctx: AuthContext,
  ): Promise<MarksExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    const target = entryTableQuerySchema.parse(rawQuery);
    const table = await marksService.getEntryTable(target, ctx); // also enforces teacher scope

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(table.exam.components),
      userPrompt: 'Read the marks sheet in this photo and extract every student you can identify.',
      imageDataUri,
      temperature: 0.1,
      maxTokens: 2000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const entries = parseEntries<RawExtractedEntry>(result.content);
    const roster = table.rows.map((r) => ({ studentId: r.studentId, fullName: r.fullName, rollNumber: r.rollNumber }));
    const { extracted, unmatched, warnings } = reconcile(entries, roster, table.exam.components);

    return { source: 'image', extracted, unmatched, warnings };
  },

  /**
   * One photo of a combined term register (Unit Test 1 + Unit Test 2 + Half
   * Yearly columns for one subject) filling all three underlying exams at
   * once, instead of the single-exam extractFromImage above. Each of the
   * three exams must currently have exactly one score component — a
   * combined register has one number per exam per student, so a
   * multi-component exam can't be unambiguously filled from it.
   */
  async extractTermFromImage(
    rawQuery: unknown,
    imageDataUri: string,
    ctx: AuthContext,
  ): Promise<TermMarksExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    const target = termExtractionQuerySchema.parse(rawQuery);

    const [ut1Table, ut2Table, mainTable] = await Promise.all([
      marksService.getEntryTable({ examId: target.unitTest1ExamId, class: target.class, section: target.section, subjectName: target.subjectName }, ctx),
      marksService.getEntryTable({ examId: target.unitTest2ExamId, class: target.class, section: target.section, subjectName: target.subjectName }, ctx),
      marksService.getEntryTable({ examId: target.mainExamId, class: target.class, section: target.section, subjectName: target.subjectName }, ctx),
    ]);

    for (const [label, table] of [['Unit Test 1', ut1Table], ['Unit Test 2', ut2Table], ['Half Yearly', mainTable]] as const) {
      if (table.exam.components.length !== 1) {
        throw new ValidationError(
          `The ${label} exam must have exactly one score component to use combined AI capture (it has ${table.exam.components.length}). Use single-exam AI Fill for this exam instead.`,
        );
      }
    }

    const ut1Component = ut1Table.exam.components[0];
    const ut2Component = ut2Table.exam.components[0];
    const mainComponent = mainTable.exam.components[0];

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildTermSystemPrompt({ ut1: ut1Component.maxMarks, ut2: ut2Component.maxMarks, main: mainComponent.maxMarks }),
      userPrompt: 'Read the combined term mark register in this photo and extract every student row you can identify.',
      imageDataUri,
      temperature: 0.1,
      maxTokens: 3000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const entries = parseEntries<RawTermEntry>(result.content);
    const roster = ut1Table.rows.map((r) => ({ studentId: r.studentId, fullName: r.fullName, rollNumber: r.rollNumber }));
    const { rows, unmatched, warnings } = reconcileTerm(entries, roster, { ut1: ut1Component.maxMarks, ut2: ut2Component.maxMarks, main: mainComponent.maxMarks });

    return {
      rows,
      unmatched,
      warnings,
      exams: {
        unitTest1: { examId: target.unitTest1ExamId, componentName: ut1Component.name },
        unitTest2: { examId: target.unitTest2ExamId, componentName: ut2Component.name },
        mainExam: { examId: target.mainExamId, componentName: mainComponent.name },
      },
    };
  },

  async extractFromVoice(
    rawQuery: unknown,
    audio: { buffer: Buffer; mimetype: string; filename: string },
    ctx: AuthContext,
  ): Promise<MarksExtractionResult> {
    if (!openaiProvider.isAvailable() || !openaiWhisperProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    const target = entryTableQuerySchema.parse(rawQuery);
    const table = await marksService.getEntryTable(target, ctx); // also enforces teacher scope

    const { text: transcript } = await openaiWhisperProvider.transcribe(audio);
    if (!transcript.trim()) {
      throw new ValidationError('Could not hear anything in that recording — try again in a quieter spot.');
    }

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(table.exam.components),
      userPrompt: `Dictated by the teacher:\n"${transcript}"`,
      temperature: 0.1,
      maxTokens: 2000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const entries = parseEntries<RawExtractedEntry>(result.content);
    const roster = table.rows.map((r) => ({ studentId: r.studentId, fullName: r.fullName, rollNumber: r.rollNumber }));
    const { extracted, unmatched, warnings } = reconcile(entries, roster, table.exam.components);

    return { source: 'voice', extracted, unmatched, warnings, transcript };
  },

  /**
   * Same as extractFromVoice but skips Whisper entirely — used for the live
   * in-browser dictation flow, where the transcript already comes from the
   * Web Speech API as the teacher talks (English/Latin script by construction).
   */
  async extractFromTranscript(
    rawQuery: unknown,
    transcript: string,
    ctx: AuthContext,
  ): Promise<MarksExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    if (!transcript.trim()) {
      throw new ValidationError('Could not hear anything yet — keep dictating.');
    }
    const target = entryTableQuerySchema.parse(rawQuery);
    const table = await marksService.getEntryTable(target, ctx); // also enforces teacher scope

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(table.exam.components),
      userPrompt: `Dictated by the teacher:\n"${transcript}"`,
      temperature: 0.1,
      maxTokens: 2000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const entries = parseEntries<RawExtractedEntry>(result.content);
    const roster = table.rows.map((r) => ({ studentId: r.studentId, fullName: r.fullName, rollNumber: r.rollNumber }));
    const { extracted, unmatched, warnings } = reconcile(entries, roster, table.exam.components);

    return { source: 'voice', extracted, unmatched, warnings, transcript };
  },

  /**
   * Starts image extraction in the background and returns a job id
   * immediately instead of holding the request open for the OpenAI round
   * trip — poll getExtractionJob(jobId) for the result.
   */
  async enqueueExtractFromImage(
    rawQuery: unknown,
    imageDataUri: string,
    ctx: AuthContext,
  ): Promise<{ jobId: string }> {
    const job = await aiExtractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'image' });
    const jobId = job._id.toString();

    marksExtractionService.extractFromImage(rawQuery, imageDataUri, ctx)
      .then((result) => aiExtractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[MarksExtraction] Background image extraction failed', { jobId, err });
        aiExtractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  /** Same as enqueueExtractFromImage, for the voice-note path (Whisper + GPT — the slowest of the two). */
  async enqueueExtractFromVoice(
    rawQuery: unknown,
    audio: { buffer: Buffer; mimetype: string; filename: string },
    ctx: AuthContext,
  ): Promise<{ jobId: string }> {
    const job = await aiExtractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'voice' });
    const jobId = job._id.toString();

    marksExtractionService.extractFromVoice(rawQuery, audio, ctx)
      .then((result) => aiExtractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[MarksExtraction] Background voice extraction failed', { jobId, err });
        aiExtractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  /** Same background-job pattern, for the combined term (UT1+UT2+Half Yearly) register capture. */
  async enqueueExtractTermFromImage(
    rawQuery: unknown,
    imageDataUri: string,
    ctx: AuthContext,
  ): Promise<{ jobId: string }> {
    const job = await aiExtractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'term-image' });
    const jobId = job._id.toString();

    marksExtractionService.extractTermFromImage(rawQuery, imageDataUri, ctx)
      .then((result) => aiExtractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[MarksExtraction] Background term-image extraction failed', { jobId, err });
        aiExtractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  async getExtractionJob(jobId: string, ctx: AuthContext) {
    const job = await aiExtractionJobRepository.findById(jobId, ctx.schoolId);
    if (!job) throw new ValidationError('Extraction job not found or expired');
    if (job.userId !== ctx.userId) throw new ValidationError('Extraction job not found or expired');
    return { status: job.status, result: job.result, error: job.error };
  },
};
