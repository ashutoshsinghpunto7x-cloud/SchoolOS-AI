import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { usageEventRepository } from '../../lib/usage-event.repository';
import { ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { extractionJobRepository } from './extraction-job.repository';
import { questionSourceRepository } from './question-source.repository';
import { chapterRepository } from './chapter.repository';
import { questionRepository } from './question.repository';
import { IQuestionSource } from './question-source.model';
import { QuestionType, QuestionDifficulty, BloomsLevel } from './question.model';
import type { ITopicNode } from './chapter.model';
import { normalizeOptions } from './option-text';
import type { ContentBlock, ChapterPage, ChapterCaptureJobResult, BlockConfidence, ListBlockItem, QuestionGenerationOptions, LanguageComplexity, PageFigure, QuestionImageRef, QuestionImageRequirement } from '@schoolos/types';
import { languageStyleGuide, TEACHER_VOICE_RULES, SELF_CHECK_INSTRUCTION, imageAvailabilityInstruction, imageAvailabilityInstructionSelfDetect } from './teacher-voice';
import { saveImage } from '../../lib/image-store';
import type { ChapterFigure } from './figure-lookup';

// ── Output shapes ──────────────────────────────────────────────────────────────

export interface ExtractedQuestionDraft {
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  estimatedTimeMinutes: number;
  bloomsLevel: BloomsLevel;
  keywords: string[];
  chapterName: string;
  topic?: string;
  // Best-effort match of `topic` against the chapter's derived topicTree — see
  // matchTopicIds. Left unset (never guessed) when there's no exact match.
  topicId?: string;
  subtopicId?: string;
  source?: string;
  imageRef?: QuestionImageRef;
  imageRequirement?: QuestionImageRequirement;
}

export interface QuestionExtractionResult {
  sourceType: 'image' | 'pdf_text';
  extracted: ExtractedQuestionDraft[];
  warnings: string[];
  /** Id of the permanent QuestionSource row this upload's converted text was saved under — pass to re-extraction to reuse it without re-uploading. */
  sourceId?: string;
}

/** Result of an upload that only transcribes/stores text — no question structuring happens yet. */
export interface TextExtractionResult {
  sourceId: string;
  sourceType: 'image' | 'pdf_text';
  fileName?: string;
  extractedText: string;
  warnings: string[];
}

// ── Raw shape the model is asked to return ─────────────────────────────────────

interface RawExtractedQuestion {
  questionText?: string | null;
  questionType?: string | null;
  options?: string[] | null;
  correctAnswer?: string | null;
  difficulty?: string | null;
  marks?: number | string | null;
  estimatedTimeMinutes?: number | string | null;
  bloomsLevel?: string | null;
  keywords?: string[] | null;
  chapterName?: string | null;
  topic?: string | null;
  source?: string | null;
  /** Set by the model only when a figure list was offered in this call's prompt — the exact figureId it picked, never invented. */
  imageFigureId?: string | null;
  imageRequired?: boolean | null;
  imagePrompt?: string | null;
}

const QUESTION_TYPES: QuestionType[] = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
  'multi_correct', 'match_following', 'one_word', 'competency_based', 'application_based', 'activity_based',
  'observation_based', 'diagram_based', 'picture_based', 'label_diagram', 'complete_diagram', 'numerical',
  'word_problem', 'oral', 'revision', 'sequence_arrangement', 'odd_one_out', 'passage_based',
];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

/**
 * Target question count fed to structureFromText on a chapter-capture source's first-ever fresh
 * processing pass (see extractFromSourceText's isChapterCapture branch) — overrides whatever the
 * teacher typed into "How many questions?" for that one pass, since the process-once hash guard
 * means this pass is effectively the bank's only shot at this content. Sized as ~2 questions for
 * every type in QUESTION_TYPES (26 types → ~52): a generous ceiling, not a target the prompt is
 * told to force — buildSystemPrompt's comprehensiveTypeCoverage framing explicitly tells the model
 * to skip types the content can't honestly support, so the actual count returned is normally well
 * under this. allocateByWeight/splitIntoBatches already spread a number this size safely across
 * chunks/batches, so no other machinery needs to change to accommodate it.
 */
const COMPREHENSIVE_COVERAGE_TARGET = QUESTION_TYPES.length * 2;
const BLOOMS_LEVELS: BloomsLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

/**
 * Sizing/batching constants for AI question generation. Together these are what make
 * generation safe at any scale — from "5 questions off a one-page worksheet" up to
 * "60 questions for a full yearly paper spread across a 20-page upload":
 *
 * - MAX_BATCH_COUNT caps how many questions any single AI call is ever asked for, so a
 *   completion's JSON body stays comfortably inside its token budget and never gets cut
 *   off mid-string (the original bug: a 5-question ask exactly hit its 1400-token budget
 *   and produced unparseable truncated JSON). A bigger request is split into several
 *   sequential batch calls instead of one large one.
 * - CHUNK_CHAR_LIMIT bounds how much source text goes into a single call's prompt. Text
 *   longer than this (a multi-page chapter upload) is split into chunks on paragraph
 *   boundaries and processed independently instead of silently slicing to the first N
 *   characters and dropping the rest.
 * - TOKENS_PER_QUESTION/BASE budget the completion generously (with headroom) per question
 *   so batches don't brush the truncation edge the way the old tighter budget did.
 * - MAX_RETRIES_ON_TRUNCATION governs completeQuestionsWithRetry's automatic recovery: if a
 *   call's response is truncated (either OpenAI's own finishReason:"length" signal, or a
 *   JSON parse failure), it retries with a smaller ask and more budget headroom, and as a
 *   last resort salvages whatever complete question objects it can from the truncated JSON
 *   rather than losing the whole batch. All of this happens automatically — the teacher
 *   never sees a truncation failure or has to manually "continue" a stalled generation.
 */
const TOKENS_PER_QUESTION = 320;
const BASE_STRUCTURING_TOKENS = 500;
const MAX_STRUCTURING_TOKENS = 6000;
const MAX_BATCH_COUNT = 8;
const CHUNK_CHAR_LIMIT = 12_000;
const CHUNK_CONCURRENCY = 3;
const MAX_RETRIES_ON_TRUNCATION = 2;
// Extra budget on top of structuringTokenBudget for the one-shot vision path (buildDirectExtractionPrompt),
// whose response also carries the full verbatim page transcription ("pageText") alongside the questions —
// completeQuestionsWithRetry's plain text-only calls never need this since the text is already on the
// caller's side, not echoed back.
const PAGE_TEXT_TOKEN_ALLOWANCE = 1800;

function structuringTokenBudget(count: number, headroomMultiplier = 1): number {
  return Math.min(MAX_STRUCTURING_TOKENS, Math.round((count * TOKENS_PER_QUESTION + BASE_STRUCTURING_TOKENS) * headroomMultiplier));
}

/** Splits a large request into a run of per-call batch sizes, each within MAX_BATCH_COUNT, that sum back to `count`. */
export function splitIntoBatches(count: number, maxBatch: number = MAX_BATCH_COUNT): number[] {
  const batches: number[] = [];
  let remaining = count;
  while (remaining > 0) {
    const size = Math.min(maxBatch, remaining);
    batches.push(size);
    remaining -= size;
  }
  return batches;
}

/** Splits `total` across `weights.length` slots proportional to each weight (e.g. chunk character length), using the largest-remainder method so the parts always sum exactly to `total`. */
export function allocateByWeight(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sumW = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (sumW > 0 ? (w / sumW) * total : total / weights.length));
  const floors = raw.map(Math.floor);
  const distributed = floors.reduce((a, b) => a + b, 0);
  const remainder = total - distributed;
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder && k < order.length; k++) floors[order[k].i] += 1;
  return floors;
}

/** Splits long source text into chunks no larger than maxChars, breaking on paragraph boundaries so a chunk boundary never lands mid-sentence. A single paragraph longer than maxChars is hard-sliced as a last resort. */
export function chunkText(text: string, maxChars: number = CHUNK_CHAR_LIMIT): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const paragraphs = trimmed.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = '';
  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = para;
    } else {
      current = candidate;
    }
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Runs `fn` over `items` with at most `limit` in flight at once — bounded concurrency without pulling in a dependency. */
async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Drops duplicate questions (normalized on trimmed/lowercased text) — a safety net for the rare case where two batches over overlapping/adjacent chunks legitimately extract the same question. */
export function dedupeQuestions(list: ExtractedQuestionDraft[]): ExtractedQuestionDraft[] {
  const seen = new Set<string>();
  const out: ExtractedQuestionDraft[] = [];
  for (const q of list) {
    const key = q.questionText.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/** Normalizes extracted source text for the process-once content hash (see extractFromSourceText) —
 *  trim + collapse whitespace is stable/cheap and tolerant of harmless re-transcription noise
 *  (extra blank lines, trailing spaces) that shouldn't itself count as "content changed". */
export function computeContentHash(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex');
}

/** Turns the AI's raw `topics` response into a stable ITopicNode[] tree — ids are short random
 *  tokens (not slugs, since two same-named topics/subtopics from noisy OCR text are otherwise
 *  indistinguishable) generated once here and then reused for the life of the chapter. */
export function buildTopicTree(raw: RawTopicNode[]): ITopicNode[] {
  return raw
    .map((t) => t.name?.trim())
    .map((name, i) => {
      const t = raw[i];
      if (!name) return null;
      const subtopics = (t.subtopics ?? [])
        .map((s) => s?.trim())
        .filter((s): s is string => Boolean(s))
        .map((name, order) => ({ subtopicId: `st_${randomUUID().slice(0, 8)}`, name, order }));
      return { topicId: `t_${randomUUID().slice(0, 8)}`, name, order: i, subtopics };
    })
    .filter((t): t is ITopicNode => t !== null);
}

/** Best-effort match of a draft's free-text `topic` against the chapter's derived topic tree —
 *  exact (case/whitespace-insensitive) match only, checking subtopic names first (most specific)
 *  then topic names; left unset rather than guessed wrong when nothing matches exactly. */
export function matchTopicIds(topic: string | undefined, tree: ITopicNode[]): { topicId?: string; subtopicId?: string } {
  if (!topic?.trim()) return {};
  const key = topic.trim().toLowerCase();
  for (const t of tree) {
    const sub = t.subtopics.find((s) => s.name.trim().toLowerCase() === key);
    if (sub) return { topicId: t.topicId, subtopicId: sub.subtopicId };
  }
  const t = tree.find((t) => t.name.trim().toLowerCase() === key);
  if (t) return { topicId: t.topicId };
  return {};
}

export function buildSystemPrompt(
  cls: string, subject: string,
  options: { count: number; difficulty: QuestionDifficulty | 'mixed'; languageComplexity?: LanguageComplexity; includeImages?: boolean; figures?: PageFigure[]; requestTopics?: boolean; comprehensiveTypeCoverage?: boolean },
  excludeTexts: string[] = [],
): string {
  const difficultyInstruction = options.difficulty === 'mixed'
    ? 'a mix of easy, medium, and hard difficulty'
    : `"${options.difficulty}" difficulty only`;

  const excludeBlock = excludeTexts.length
    ? `\n\nThese questions were already extracted from this same document in an earlier pass — do NOT repeat them or near-duplicates of them:\n${excludeTexts.slice(0, 30).map((t) => `- ${t.slice(0, 150)}`).join('\n')}\n`
    : '';

  // Only true on a chapter-capture source's first-ever fresh processing pass (see
  // extractFromSourceText) — the process-once hash guard means whatever this pass produces is,
  // in practice, permanently all the bank will ever have for this chapter's raw content, so the
  // usual "pick a small handful" framing is swapped for "cover the type taxonomy this content
  // genuinely supports" instead of a flat count ceiling. Every other instruction below (teacher
  // voice, language style, image availability, dedup-across-batches, JSON shape) is unchanged.
  const countInstruction = options.comprehensiveTypeCoverage
    ? `This is this chapter's first-ever processing pass — the questions generated now are effectively permanent for this content (the system never re-runs extraction on unchanged text), so aim for genuine, comprehensive coverage rather than a small handful. Read the whole page and consider every one of these question types: ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}. For each type this specific content actually, honestly supports, write roughly 1-3 questions of that type, across ${difficultyInstruction}. Do NOT force a type the content can't support — e.g. no "diagram_based" / "picture_based" / "label_diagram" / "complete_diagram" / "observation_based" questions when there is no usable diagram or figure on the page${options.includeImages ? '' : ' (image-based questions are off for this run)'}; skip "numerical" / "word_problem" for content with no numbers or quantities to work with; skip "match_following" or "sequence_arrangement" when there's nothing sensible to pair or order; and so on for every type — the same "never invent" discipline as always, just applied per type instead of just per fact. Treat ${options.count} as a generous upper ceiling for this call, not a target to hit — if the content is thin, return fewer questions across fewer types rather than padding, forcing, or inventing content to fill it out.`
    : `Pick out up to ${options.count} of the clearest, most answerable question(s) on the page, at ${difficultyInstruction}. If the page has fewer than ${options.count} actual questions, return only as many as genuinely exist — never invent extra ones or split one question into several to hit the count. Keep every field concise; do not pad or over-elaborate simple content (e.g. a short Class 1-2 story or worksheet) just to fill space.`;

  // Asked for on only one call per chapter-capture job (see structureFromText's `deriveTopics`) —
  // never repeated per-chunk/page, so this never adds extra AI calls of its own.
  const topicsInstruction = options.requestTopics
    ? `\n\nAlso return "topics": an array describing this chapter's topic/subtopic hierarchy, based on everything covered by this text — each entry shaped { "name": "topic name", "subtopics": ["subtopic name", ...] }. Keep it concise (typically 2-6 topics); only include a subtopic where the text clearly supports it, otherwise leave "subtopics" empty. Never invent topics unrelated to this content.`
    : '';

  return `You are an experienced school teacher reading textbook pages, worksheets, or previous exam papers for Class ${cls} ${subject} and picking out questions to reuse — not an AI summarizing a document.

${languageStyleGuide(cls, options.languageComplexity)}

${TEACHER_VOICE_RULES}

${imageAvailabilityInstruction(options.figures ?? [], options.includeImages ?? false)}

${countInstruction}
${excludeBlock}
For each question, return:
- "questionText": the full question text
- "questionType": one of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}
- "options": array of option strings, only if questionType is "mcq"
- "correctAnswer": the correct answer. If it is visible on the page use that; otherwise write a short, correct answer yourself based only on this page's content (needed for the answer key) — never leave it blank unless the question type has no single answer (e.g. an open "write two sentences" question).
- "difficulty": one of ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')} — estimate based on the question's complexity
- "marks": the marks this question is worth (a number). If not stated, estimate a reasonable value based on question type and length
- "estimatedTimeMinutes": estimated minutes a student would need
- "bloomsLevel": one of ${BLOOMS_LEVELS.map((b) => `"${b}"`).join(', ')} — Bloom's Taxonomy level
- "keywords": 2-5 key terms from the question
- "chapterName": the chapter this question belongs to, if visible/inferable from the page (e.g. a heading), else your best guess from the content
- "topic": the specific topic within the chapter, if identifiable
- "source": where this came from if visible (e.g. "NCERT Page 54", "2024 Half Yearly Paper"), else omit
- "imageFigureId" / "imageRequired" + "imagePrompt": only as described above — omit both for an ordinary text question

Also return "pageText": the full raw text of everything readable on the page, transcribed verbatim, so it can be cached and re-used later.
${topicsInstruction}

${SELF_CHECK_INSTRUCTION}

Return ONLY a valid JSON object: {"pageText": "...", "questions": [...]${options.requestTopics ? ', "topics": [...]' : ''}}. No markdown, no explanation. Skip anything that is not actually a question (headings, instructions, page numbers).`;
}

/**
 * One-shot vision equivalent of buildSystemPrompt: reads a photographed page directly and drafts
 * questions from it in the same call, instead of a separate transcribe-then-structure pass (see
 * buildTranscribePrompt above, and extractFromImage/extractStructuredPage's callers). Kept as its
 * own function rather than a flag on buildSystemPrompt because the one thing that genuinely differs
 * is figure handling: buildSystemPrompt is always handed an already-known `figures` list (detected
 * in an earlier call), while here figure detection and question-drafting happen together — see
 * imageAvailabilityInstructionSelfDetect. Every other instruction (teacher voice, language level,
 * count/coverage framing, JSON field list, topics, self-check) is identical in spirit to
 * buildSystemPrompt, just phrased for "read this photo" instead of "read this text".
 */
export function buildDirectExtractionPrompt(
  cls: string, subject: string,
  options: { count: number; difficulty: QuestionDifficulty | 'mixed'; languageComplexity?: LanguageComplexity; detectImages?: boolean; requestTopics?: boolean; comprehensiveTypeCoverage?: boolean },
  excludeTexts: string[] = [],
): string {
  const difficultyInstruction = options.difficulty === 'mixed'
    ? 'a mix of easy, medium, and hard difficulty'
    : `"${options.difficulty}" difficulty only`;

  const excludeBlock = excludeTexts.length
    ? `\n\nThese questions were already extracted from this same upload in an earlier pass — do NOT repeat them or near-duplicates of them:\n${excludeTexts.slice(0, 30).map((t) => `- ${t.slice(0, 150)}`).join('\n')}\n`
    : '';

  const countInstruction = options.comprehensiveTypeCoverage
    ? `This is this chapter's first-ever processing pass — the questions generated now are effectively permanent for this content (the system never re-runs extraction on unchanged content), so aim for genuine, comprehensive coverage rather than a small handful. Read the whole page and consider every one of these question types: ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}. For each type this specific page actually, honestly supports, write roughly 1-3 questions of that type, across ${difficultyInstruction}. Do NOT force a type the page can't support — e.g. no "diagram_based" / "picture_based" / "label_diagram" / "complete_diagram" / "observation_based" questions when there is no usable diagram or figure on the page${options.detectImages ? '' : ' (image-based questions are off for this run)'}; skip "numerical" / "word_problem" for content with no numbers or quantities to work with; skip "match_following" or "sequence_arrangement" when there's nothing sensible to pair or order; and so on for every type — the same "never invent" discipline as always, just applied per type instead of just per fact. Treat ${options.count} as a generous upper ceiling for this call, not a target to hit — if the page is thin, return fewer questions across fewer types rather than padding, forcing, or inventing content to fill it out.`
    : `Pick out up to ${options.count} of the clearest, most answerable question(s) on the page, at ${difficultyInstruction}. If the page has fewer than ${options.count} actual questions, return only as many as genuinely exist — never invent extra ones or split one question into several to hit the count. Keep every field concise; do not pad or over-elaborate simple content (e.g. a short Class 1-2 story or worksheet) just to fill space.`;

  const topicsInstruction = options.requestTopics
    ? `\n\nAlso return "topics": an array describing this chapter's topic/subtopic hierarchy, based on everything covered by this page, each entry shaped { "name": "topic name", "subtopics": ["subtopic name", ...] }. Keep it concise (typically 2-6 topics); only include a subtopic where the page clearly supports it, otherwise leave "subtopics" empty. Never invent topics unrelated to this content.`
    : '';

  return `You are an experienced school teacher reading a photographed textbook page, worksheet, or previous exam paper for Class ${cls} ${subject} and picking out questions to reuse — not an AI summarizing a document.

${languageStyleGuide(cls, options.languageComplexity)}

${TEACHER_VOICE_RULES}

${imageAvailabilityInstructionSelfDetect(options.detectImages ?? false)}

${countInstruction}
${excludeBlock}
For each question, return:
- "questionText": the full question text
- "questionType": one of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}
- "options": array of option strings, only if questionType is "mcq"
- "correctAnswer": the correct answer. If it is visible on the page use that; otherwise write a short, correct answer yourself based only on this page's content (needed for the answer key) — never leave it blank unless the question type has no single answer (e.g. an open "write two sentences" question).
- "difficulty": one of ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')} — estimate based on the question's complexity
- "marks": the marks this question is worth (a number). If not stated, estimate a reasonable value based on question type and length
- "estimatedTimeMinutes": estimated minutes a student would need
- "bloomsLevel": one of ${BLOOMS_LEVELS.map((b) => `"${b}"`).join(', ')} — Bloom's Taxonomy level
- "keywords": 2-5 key terms from the question
- "chapterName": the chapter this question belongs to, if visible/inferable from the page (e.g. a heading), else your best guess from the content
- "topic": the specific topic within the chapter, if identifiable
- "source": where this came from if visible (e.g. "NCERT Page 54", "2024 Half Yearly Paper"), else omit
- "imageFigureId" / "imageRequired" + "imagePrompt": only as described above — omit both for an ordinary text question

Also return "pageText": everything readable on the page, transcribed verbatim (preserve numbering/structure as line breaks) — used to detect if this same page is ever uploaded again, never shown to the teacher directly.
${topicsInstruction}

${SELF_CHECK_INSTRUCTION}

Return ONLY a valid JSON object: {"pageText": "...", "questions": [...]${options.detectImages ? ', "figures": [...]' : ''}${options.requestTopics ? ', "topics": [...]' : ''}}. No markdown, no explanation. Skip anything that is not actually a question (headings, instructions, page numbers).`;
}

/**
 * Asks the model to write brand-new questions for a chapter, rather than extract them from a page.
 * Used by the paper generator when the bank doesn't have enough questions at a requested marks
 * value — the model must never refuse for "not enough content"; it should combine/extend the
 * chapter's concepts (multi-part, detailed-answer, etc.) to legitimately reach the requested marks.
 */
export function buildSynthesisPrompt(
  cls: string, subject: string, chapterName: string, marks: number, count: number,
  questionType?: QuestionType, difficulty?: QuestionDifficulty, languageComplexity?: LanguageComplexity,
  includeImages?: boolean, figures?: PageFigure[],
): string {
  return `You are an experienced school teacher writing ${count} new, original exam question(s) for Class ${cls} ${subject}, chapter "${chapterName}", each worth exactly ${marks} mark(s)${questionType ? ` and of question type "${questionType}"` : ''}.

${languageStyleGuide(cls, languageComplexity)}

${TEACHER_VOICE_RULES}

${imageAvailabilityInstruction(figures ?? [], includeImages ?? false)}

Use the reference material below (existing questions and/or textbook excerpts from this chapter) as your syllabus content — do not invent facts outside it. You must always produce exactly ${count} question(s) worth ${marks} marks each, no matter how little reference material is given. Never refuse or claim there isn't enough content for the requested mark value: if the chapter's material is thin for a high-mark question, write a multi-part or detailed-answer question (e.g. "Explain X. Give two examples. What is its significance?") that legitimately deserves ${marks} marks by combining and extending the chapter's concepts.
${difficulty ? `\nThe teacher specifically asked for "${difficulty}" difficulty here — every one of these ${count} question(s) MUST be "${difficulty}" difficulty, no exceptions. If this chapter's material looks too basic to naturally reach that difficulty, don't soften the difficulty or skip the question instead — stretch it there yourself (deeper application, a multi-step or multi-part twist, combining two ideas from the chapter, an unfamiliar scenario using the same concept) until it genuinely earns "${difficulty}". The teacher is counting on getting exactly ${count} "${difficulty}" question(s) back, not fewer and not a different difficulty.\n` : ''}
For each question, return the same JSON shape used for extraction:
- "questionText"
- "questionType": ${questionType ? `must be exactly "${questionType}"` : `one of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}`}
- "options": array of option strings, only if questionType is "mcq"
- "correctAnswer": a short, correct model answer for this question, grounded only in the reference material — always include this (it powers the paper's answer key), even for short/long-answer question types
- "difficulty": ${difficulty ? `must be exactly "${difficulty}"` : `one of ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')}`}
- "marks": must be exactly ${marks}
- "estimatedTimeMinutes", "bloomsLevel": one of ${BLOOMS_LEVELS.map((b) => `"${b}"`).join(', ')}
- "keywords": 2-5 key terms
- "chapterName": "${chapterName}"
- "topic": the specific topic within the chapter, if identifiable
- "imageFigureId" / "imageRequired" + "imagePrompt": only as described above — omit both for an ordinary text question

${SELF_CHECK_INSTRUCTION}

Return ONLY a valid JSON object: {"questions": [...]}. No markdown, no explanation.`;
}

// ── Structured chapter capture (layout-aware OCR) ──────────────────────────────
// This is the OCR layer: "what is present on the page?" — never the question-
// structuring layer above. Keep the two responsibilities separate (Rule 9):
// this prompt only transcribes structure, it never drafts questions.
//
// Not currently called — chapter capture was reverted to plain transcription
// (see extractStructuredPage) for speed/cost. Kept + exported rather than deleted
// in case structured capture is re-enabled later; normalizeBlock/parseStructuredPage
// below are the matching parse-side utilities and stay covered by existing tests.

export function buildStructuredTranscribePrompt(): string {
  return `You are a document-structure OCR engine for school textbook pages. Read the image and reconstruct it as an ordered list of content blocks that preserve the page's actual layout, hierarchy, and reading order — including multi-column layouts, sidebars, and boxed callouts, which you must reorder into correct logical reading order (not raw left-to-right/top-to-bottom pixel order).

Rules (do not break these):
1. Never invent content that is not visibly present on the page.
2. Never silently change the meaning of anything you transcribe.
3. Preserve the original ordering of content exactly as a reader would encounter it.
4. Preserve heading/subheading hierarchy using "level" (1 = chapter/top title, 2 = section, 3 = subsection).
5. Tables must become "table" blocks with real headers/rows — never flatten a table into paragraph text.
6. Numbered/bulleted lists must become "list" blocks with "ordered" set correctly — never flatten a list into a paragraph. Nested sub-items go in a child "items" array.
7. Mathematical expressions/equations must become "equation" blocks with a "latex" field (standard LaTeX) and a plain "displayText" fallback — never lose subscripts/superscripts/fractions by flattening them into plain text.
8. Diagrams/figures become "figure" blocks — capture the figure number, caption, and any labels you can read, but do not describe the image's visual content beyond what's textually labeled.
9. If a block is hard to read (blurry, cut off, ambiguous), still transcribe your best reading but set "confidence" to "review" or "low" rather than guessing confidently and marking it "high". Only mark "high" when you are certain.
10. Definitions, "Note:", callout boxes, and important-point boxes become "note" blocks. Quoted passages become "quote" blocks.

Each block is one of:
{"type":"heading","level":1|2|3,"text":"...","confidence":"high|review|low"}
{"type":"paragraph","text":"... may use **bold** or *italic* ...","confidence":"..."}
{"type":"list","ordered":true|false,"items":[{"text":"...","items":[{"text":"..."}]}],"confidence":"..."}
{"type":"table","caption":"optional","headers":["..."],"rows":[["...","..."]],"confidence":"..."}
{"type":"equation","latex":"E = mc^2","displayText":"E = mc²","confidence":"..."}
{"type":"figure","figureNumber":"3.2","caption":"...","labels":["..."],"confidence":"..."}
{"type":"note","text":"..."} or {"type":"quote","text":"..."}

Return ONLY a valid JSON object: {"documentTitle": "... or omit if none visible", "language": "e.g. English / Hindi / Mixed", "blocks": [...]}. No markdown, no explanation, no commentary.`;
}

const BLOCK_TYPES = new Set(['heading', 'paragraph', 'list', 'table', 'equation', 'figure', 'note', 'quote']);
const CONFIDENCES = new Set<BlockConfidence>(['high', 'review', 'low']);

function normalizeConfidence(v: unknown): BlockConfidence | undefined {
  return typeof v === 'string' && CONFIDENCES.has(v as BlockConfidence) ? (v as BlockConfidence) : undefined;
}

/** Validates/coerces one raw block from the AI response. Drops anything unusable rather than guessing — mirrors clean()'s "skip, don't hallucinate" approach. Exported for unit testing. */
export function normalizeBlock(raw: unknown): ContentBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.type !== 'string' || !BLOCK_TYPES.has(b.type)) return null;
  const confidence = normalizeConfidence(b.confidence);

  switch (b.type) {
    case 'heading': {
      if (typeof b.text !== 'string' || !b.text.trim()) return null;
      const level = [1, 2, 3].includes(b.level as number) ? (b.level as 1 | 2 | 3) : 1;
      return { type: 'heading', level, text: b.text.trim(), confidence };
    }
    case 'paragraph': {
      if (typeof b.text !== 'string' || !b.text.trim()) return null;
      return { type: 'paragraph', text: b.text.trim(), confidence };
    }
    case 'list': {
      const normalizeItems = (items: unknown): ListBlockItem[] =>
        Array.isArray(items)
          ? items
              .map((it): ListBlockItem | null => {
                if (typeof it === 'string') return { text: it.trim() };
                if (it && typeof it === 'object' && typeof (it as Record<string, unknown>).text === 'string') {
                  const nested = (it as Record<string, unknown>).items;
                  return { text: (it as Record<string, unknown>).text as string, items: Array.isArray(nested) ? normalizeItems(nested) : undefined };
                }
                return null;
              })
              .filter((x): x is ListBlockItem => x !== null && x.text.trim().length > 0)
          : [];
      const items = normalizeItems(b.items);
      if (items.length === 0) return null;
      return { type: 'list', ordered: Boolean(b.ordered), items, confidence };
    }
    case 'table': {
      const headers = Array.isArray(b.headers) ? b.headers.map(String) : [];
      const rows = Array.isArray(b.rows) ? b.rows.filter(Array.isArray).map((r) => (r as unknown[]).map(String)) : [];
      if (headers.length === 0 && rows.length === 0) return null;
      return { type: 'table', headers, rows, caption: typeof b.caption === 'string' ? b.caption : undefined, confidence };
    }
    case 'equation': {
      if (typeof b.latex !== 'string' || !b.latex.trim()) return null;
      return { type: 'equation', latex: b.latex.trim(), displayText: typeof b.displayText === 'string' ? b.displayText : undefined, confidence };
    }
    case 'figure': {
      return {
        type: 'figure',
        figureNumber: typeof b.figureNumber === 'string' ? b.figureNumber : undefined,
        caption: typeof b.caption === 'string' ? b.caption : undefined,
        labels: Array.isArray(b.labels) ? b.labels.map(String) : undefined,
        confidence,
      };
    }
    case 'note':
    case 'quote': {
      if (typeof b.text !== 'string' || !b.text.trim()) return null;
      return { type: b.type as 'note' | 'quote', text: b.text.trim(), confidence };
    }
    default:
      return null;
  }
}

/** Exported for unit testing — see question-extraction.service.test.ts. */
export function parseStructuredPage(raw: string): { documentTitle?: string; language?: string; blocks: ContentBlock[] } {
  try {
    const body = JSON.parse(raw);
    const blocks = Array.isArray(body?.blocks)
      ? (body.blocks as unknown[]).map(normalizeBlock).filter((b): b is ContentBlock => b !== null)
      : [];
    return {
      documentTitle: typeof body?.documentTitle === 'string' ? body.documentTitle : undefined,
      language: typeof body?.language === 'string' ? body.language : undefined,
      blocks,
    };
  } catch (err) {
    logger.error('[QuestionExtraction] Failed to parse structured page response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not read the structure of that page — try a clearer photo.');
  }
}

/** Flattens structured blocks back to plain text so `QuestionSource.extractedText` (a required field, and the input to existing question-structuring/search/synthesis prompts) stays populated regardless of whether structured capture is used. */
export function flattenBlocksToText(blocks: ContentBlock[]): string {
  const lines: string[] = [];
  const stripMd = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');

  const renderItems = (items: { text: string; items?: unknown[] }[], depth: number, ordered: boolean) => {
    items.forEach((it, i) => {
      const bullet = ordered ? `${i + 1}.` : '-';
      lines.push(`${'  '.repeat(depth)}${bullet} ${stripMd(it.text)}`);
      if (Array.isArray(it.items) && it.items.length) renderItems(it.items as { text: string; items?: unknown[] }[], depth + 1, ordered);
    });
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': lines.push(stripMd(block.text)); break;
      case 'paragraph': lines.push(stripMd(block.text)); break;
      case 'list': renderItems(block.items as { text: string; items?: unknown[] }[], 0, block.ordered); break;
      case 'table': {
        if (block.caption) lines.push(block.caption);
        if (block.headers.length) lines.push(block.headers.join(' | '));
        for (const row of block.rows) lines.push(row.join(' | '));
        break;
      }
      case 'equation': lines.push(block.displayText || block.latex); break;
      case 'figure': lines.push(`[Figure${block.figureNumber ? ` ${block.figureNumber}` : ''}${block.caption ? ` — ${block.caption}` : ''}]`); break;
      case 'note': case 'quote': lines.push(stripMd(block.text)); break;
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

/** Renders blocks back to lightweight Markdown (tables/lists stay structured) for feeding into the question-structuring prompt, instead of the fully flattened plain text — so that prompt still sees tables as tables. */
export function blocksToMarkdown(blocks: ContentBlock[]): string {
  const lines: string[] = [];
  const renderItems = (items: { text: string; items?: unknown[] }[], depth: number, ordered: boolean) => {
    items.forEach((it, i) => {
      const bullet = ordered ? `${i + 1}.` : '-';
      lines.push(`${'  '.repeat(depth)}${bullet} ${it.text}`);
      if (Array.isArray(it.items) && it.items.length) renderItems(it.items as { text: string; items?: unknown[] }[], depth + 1, ordered);
    });
  };
  for (const block of blocks) {
    switch (block.type) {
      case 'heading': lines.push(`${'#'.repeat(block.level)} ${block.text}`); break;
      case 'paragraph': lines.push(block.text); break;
      case 'list': renderItems(block.items as { text: string; items?: unknown[] }[], 0, block.ordered); break;
      case 'table': {
        if (block.caption) lines.push(`_${block.caption}_`);
        if (block.headers.length) {
          lines.push(`| ${block.headers.join(' | ')} |`);
          lines.push(`| ${block.headers.map(() => '---').join(' | ')} |`);
        }
        for (const row of block.rows) lines.push(`| ${row.join(' | ')} |`);
        break;
      }
      case 'equation': lines.push(`$${block.latex}$`); break;
      case 'figure': lines.push(`[Figure${block.figureNumber ? ` ${block.figureNumber}` : ''}${block.caption ? ` — ${block.caption}` : ''}]`); break;
      case 'note': case 'quote': lines.push(`> ${block.text}`); break;
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

function pageWordCount(blocks: ContentBlock[]): number {
  return flattenBlocksToText(blocks).split(/\s+/).filter(Boolean).length;
}

/** Splits plain transcribed page text into paragraph blocks on blank lines, so the review screen still gets readable chunks instead of one giant blob — used by the (now plain-text) chapter capture flow. */
function textToParagraphBlocks(text: string): ContentBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: 'paragraph' as const, text: p }));
}

/** Raw shape of one entry in an AI response's optional `"topics"` array (see buildSystemPrompt's `requestTopics`). */
export interface RawTopicNode {
  name?: string | null;
  subtopics?: (string | null)[] | null;
}

/** Parses the model's `{"questions": [...]}` response, non-throwing — returns null instead of raising, so callers (completeQuestionsWithRetry) can decide whether to retry rather than fail immediately. */
function tryParseQuestions(raw: string): { questions: RawExtractedQuestion[]; topics?: RawTopicNode[] } | null {
  try {
    const body = JSON.parse(raw);
    const questions = Array.isArray(body) ? body : body.questions;
    if (!Array.isArray(questions)) return null;
    const topics = !Array.isArray(body) && Array.isArray(body.topics) ? (body.topics as RawTopicNode[]) : undefined;
    return { questions, topics };
  } catch {
    return null;
  }
}

/**
 * Recovers as many complete question objects as possible from a truncated `{"questions": [...]}`
 * response — used as a last-resort fallback when a completion hit its token budget mid-object and
 * ordinary JSON.parse fails. Walks the raw text tracking bracket depth (respecting quoted strings
 * and escapes) and collects only objects that fully closed before the cutoff; the one dangling,
 * incomplete object at the end is discarded rather than guessed at.
 */
export function salvageTruncatedQuestions(raw: string): RawExtractedQuestion[] {
  const questionsIdx = raw.indexOf('"questions"');
  if (questionsIdx === -1) return [];
  const arrStart = raw.indexOf('[', questionsIdx);
  if (arrStart === -1) return [];

  const objectStrings: string[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = arrStart + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escapeNext) escapeNext = false;
      else if (ch === '\\') escapeNext = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { if (depth === 0) objStart = i; depth++; }
    else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        objectStrings.push(raw.slice(objStart, i + 1));
        objStart = -1;
      } else if (depth < 0) {
        break; // hit the array's closing bracket (or malformed input) — stop
      }
    }
  }

  const recovered: RawExtractedQuestion[] = [];
  for (const objStr of objectStrings) {
    try { recovered.push(JSON.parse(objStr)); } catch { /* skip the odd malformed object, keep the rest */ }
  }
  return recovered;
}

/**
 * Shared, retry-safe AI call for one batch of question drafts (structuring or synthesis). Detects
 * truncation via OpenAI's own finishReason:"length" signal as well as JSON parse failure, and
 * automatically recovers rather than surfacing a failure to the teacher:
 *   1. Retry with a smaller batch count (more budget per question) and extra token headroom.
 *   2. On the final attempt, salvage whatever complete question objects survived truncation.
 *   3. Only if nothing could be salvaged does it give up on that batch — and even then it returns
 *      an empty result with a warning rather than throwing, so sibling batches (other chunks/pages)
 *      still get returned to the teacher.
 */
async function completeQuestionsWithRetry(
  buildPrompts: (count: number) => { systemPrompt: string; userPrompt: string },
  initialCount: number,
  ctx: AuthContext,
): Promise<{ extracted: ExtractedQuestionDraft[]; warnings: string[]; topics?: RawTopicNode[] }> {
  let attemptCount = initialCount;
  let headroom = 1;

  for (let attempt = 0; attempt <= MAX_RETRIES_ON_TRUNCATION; attempt++) {
    const { systemPrompt, userPrompt } = buildPrompts(attemptCount);
    const start = Date.now();
    const maxTokens = structuringTokenBudget(attemptCount, headroom);
    const result = await openaiProvider.complete({ systemPrompt, userPrompt, temperature: 0.2, maxTokens, jsonResponse: true });

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

    const truncated = result.finishReason === 'length';
    const parsed = tryParseQuestions(result.content);
    const isLastAttempt = attempt === MAX_RETRIES_ON_TRUNCATION;

    if (parsed && !truncated) return { ...clean(parsed.questions), topics: parsed.topics };

    if (parsed && truncated && !isLastAttempt) {
      // Parsed fine (model happened to close its brackets right at the limit) but flagged as
      // truncated — still worth a clean retry with more headroom rather than risking a partially
      // cut-off question sneaking through on a technicality.
      attemptCount = Math.max(1, Math.ceil(attemptCount / 2));
      headroom += 0.75;
      continue;
    }
    if (parsed) return { ...clean(parsed.questions), topics: parsed.topics };

    if (isLastAttempt) {
      const salvaged = salvageTruncatedQuestions(result.content);
      if (salvaged.length > 0) {
        const { extracted, warnings } = clean(salvaged);
        warnings.push(`The AI's response was cut off after ${extracted.length} question(s) in this section — the rest were recovered from the partial reply.`);
        return { extracted, warnings };
      }
      logger.error('[QuestionExtraction] AI response unparseable after retries', { raw: result.content.slice(0, 500) });
      return { extracted: [], warnings: ['Part of the uploaded content could not be turned into questions — the AI response was incomplete. Try again, or split this upload into smaller pages.'] };
    }

    attemptCount = Math.max(1, Math.ceil(attemptCount / 2));
    headroom += 0.75;
  }

  return { extracted: [], warnings: [] };
}

// ── User-facing error sanitization ──────────────────────────────────────────────
// Chapter capture reports page/job failures as plain *data* (ChapterPage.pageError,
// ExtractionJob.error) rather than as thrown HTTP errors, so they never pass through the
// central errorHandler's "unknown error -> generic 500 message" fallback (see
// middlewares/errorHandler.ts) — anything stored here goes to the teacher's screen verbatim.
// ValidationError messages are deliberately teacher-facing (e.g. "no readable text found") and
// pass through unchanged; everything else (OpenAI/network/provider errors — rate limits,
// timeouts, outages) is replaced with one calm, retryable message. Full detail is always logged
// server-side by the caller before this runs, so nothing is lost for debugging.
function toUserSafeErrorMessage(err: unknown): string {
  if (err instanceof ValidationError) return err.message;
  return "We couldn't process this page right now — please try again.";
}

interface RawFigure {
  boundingBox?: { x?: number; y?: number; width?: number; height?: number } | null;
  figureType?: string | null;
  caption?: string | null;
  description?: string | null;
  usableForQuestion?: boolean | null;
  /** Only present on the one-shot vision path (buildDirectExtractionPrompt) — the model's own
   * scratch-work id for this figure, used to remap a question's imageFigureId to the stable
   * server-issued figureId. Never persisted itself. */
  figureId?: string | null;
}

const FIGURE_TYPES = new Set(['decorative', 'content_supporting', 'diagram', 'chart_table', 'map', 'illustration']);

function isFractional(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
}

/** Validates/coerces one raw figure from the transcription response — drops anything unusable
 * (missing description, out-of-range bounding box) rather than guessing, same "skip, don't
 * hallucinate" approach as normalizeBlock. `pageNumber`/`index` build the stable figureId a
 * question's imageRef later points at. */
function normalizeFigure(raw: RawFigure, pageNumber: number, index: number): PageFigure | null {
  const bb = raw.boundingBox;
  if (!bb || !isFractional(bb.x) || !isFractional(bb.y) || !isFractional(bb.width) || !isFractional(bb.height)) return null;
  if (!raw.description?.trim()) return null;
  const figureType = FIGURE_TYPES.has(raw.figureType as string) ? (raw.figureType as PageFigure['figureType']) : 'illustration';

  return {
    figureId: `p${pageNumber}_fig${index + 1}`,
    pageNumber,
    boundingBox: { x: bb.x, y: bb.y, width: bb.width, height: bb.height },
    figureType,
    caption: raw.caption?.trim() || undefined,
    description: raw.description.trim(),
    usableForQuestion: raw.usableForQuestion !== false,
  };
}

/** Parsed shape of a buildDirectExtractionPrompt response — pageText/figures/questions/topics all
 * from one AI call. Throws on malformed JSON (same contract as JSON.parse) so the retry wrapper
 * below can tell a parse failure apart from a legitimately empty result. */
function parseDirectExtraction(raw: string, pageNumber = 1): { pageText: string; figures: PageFigure[]; questions: RawExtractedQuestion[]; topics?: RawTopicNode[] } {
  const body = JSON.parse(raw);
  const pageText = typeof body?.pageText === 'string' ? body.pageText : '';
  const questions: RawExtractedQuestion[] = Array.isArray(body?.questions) ? body.questions : [];
  const rawFigures: RawFigure[] = Array.isArray(body?.figures) ? body.figures : [];

  // The model invents its own scratch figureId per response (see imageAvailabilityInstructionSelfDetect)
  // since figures aren't known ahead of a one-shot call — remap those to the stable, server-issued
  // figureId (same p{page}_fig{n} shape parseTranscription uses) before anything is persisted, and drop
  // any imageFigureId reference to a figure that got filtered out below (not usableForQuestion) or that
  // the model never actually listed — never save a dangling reference.
  const idMap = new Map<string, string>();
  const figures: PageFigure[] = [];
  rawFigures.forEach((f, i) => {
    const normalized = normalizeFigure(f, pageNumber, i);
    if (!normalized || !normalized.usableForQuestion) return;
    if (f.figureId?.trim()) idMap.set(f.figureId.trim(), normalized.figureId);
    figures.push(normalized);
  });

  const remappedQuestions = questions.map((q) => ({
    ...q,
    imageFigureId: q.imageFigureId && idMap.has(q.imageFigureId) ? idMap.get(q.imageFigureId) : undefined,
  }));

  return { pageText, figures, questions: remappedQuestions, topics: Array.isArray(body?.topics) ? (body.topics as RawTopicNode[]) : undefined };
}

function tryParseDirectExtraction(raw: string, pageNumber: number): ReturnType<typeof parseDirectExtraction> | null {
  try { return parseDirectExtraction(raw, pageNumber); } catch { return null; }
}

/**
 * Vision-call counterpart to completeQuestionsWithRetry: reads a photographed page directly into
 * question drafts in one call (see buildDirectExtractionPrompt), with the same truncation-recovery
 * contract (shrink the ask, add headroom, salvage on the last attempt) — except here a total parse
 * failure is fatal (thrown), not swallowed, since callers need the transcribed pageText to even
 * save a QuestionSource record; there is no sibling chunk/page to fall back on within this one call.
 */
async function completeDirectExtractionWithRetry(
  buildPrompts: (count: number) => { systemPrompt: string; userPrompt: string },
  initialCount: number, ctx: AuthContext, imageDataUri: string, pageNumber: number,
): Promise<{ pageText: string; figures: PageFigure[]; extracted: ExtractedQuestionDraft[]; warnings: string[]; topics?: RawTopicNode[] }> {
  let attemptCount = initialCount;
  let headroom = 1;

  for (let attempt = 0; attempt <= MAX_RETRIES_ON_TRUNCATION; attempt++) {
    const { systemPrompt, userPrompt } = buildPrompts(attemptCount);
    const start = Date.now();
    const maxTokens = structuringTokenBudget(attemptCount, headroom) + PAGE_TEXT_TOKEN_ALLOWANCE;
    const result = await openaiProvider.complete({ systemPrompt, userPrompt, imageDataUri, temperature: 0.2, maxTokens, jsonResponse: true });

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

    const truncated = result.finishReason === 'length';
    const parsed = tryParseDirectExtraction(result.content, pageNumber);
    const isLastAttempt = attempt === MAX_RETRIES_ON_TRUNCATION;

    if (parsed && !truncated) {
      const { extracted, warnings } = clean(parsed.questions);
      return { pageText: parsed.pageText, figures: parsed.figures, extracted, warnings, topics: parsed.topics };
    }
    if (parsed && truncated && !isLastAttempt) {
      attemptCount = Math.max(1, Math.ceil(attemptCount / 2));
      headroom += 0.75;
      continue;
    }
    if (parsed) {
      const { extracted, warnings } = clean(parsed.questions);
      return { pageText: parsed.pageText, figures: parsed.figures, extracted, warnings, topics: parsed.topics };
    }

    if (isLastAttempt) {
      const salvagedQuestions = salvageTruncatedQuestions(result.content);
      const pageTextMatch = /"pageText"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(result.content);
      let salvagedPageText = '';
      if (pageTextMatch) {
        try { salvagedPageText = JSON.parse(`"${pageTextMatch[1]}"`); } catch { /* leave blank, handled below */ }
      }
      if (salvagedQuestions.length > 0 || salvagedPageText.trim()) {
        const { extracted, warnings } = clean(salvagedQuestions);
        if (salvagedQuestions.length > 0) warnings.push('The AI\'s response was cut off partway through this page — the rest were recovered from the partial reply.');
        return { pageText: salvagedPageText, figures: [], extracted, warnings };
      }
      logger.error('[QuestionExtraction] Direct-extraction response unparseable after retries', { raw: result.content.slice(0, 500) });
      throw new ValidationError('Could not read that photo — try again, or use a clearer picture.');
    }

    attemptCount = Math.max(1, Math.ceil(attemptCount / 2));
    headroom += 0.75;
  }

  throw new ValidationError('Could not read that photo — try again.');
}

function clean(entries: RawExtractedQuestion[]): { extracted: ExtractedQuestionDraft[]; warnings: string[] } {
  const extracted: ExtractedQuestionDraft[] = [];
  const warnings: string[] = [];

  for (const entry of entries) {
    if (!entry.questionText?.trim()) continue;

    const questionType = QUESTION_TYPES.includes(entry.questionType as QuestionType)
      ? (entry.questionType as QuestionType) : 'short';
    const difficulty = DIFFICULTIES.includes(entry.difficulty as QuestionDifficulty)
      ? (entry.difficulty as QuestionDifficulty) : 'medium';
    const bloomsLevel = BLOOMS_LEVELS.includes(entry.bloomsLevel as BloomsLevel)
      ? (entry.bloomsLevel as BloomsLevel) : 'understand';

    const marksNum = typeof entry.marks === 'string' ? Number(entry.marks) : entry.marks;
    const timeNum = typeof entry.estimatedTimeMinutes === 'string' ? Number(entry.estimatedTimeMinutes) : entry.estimatedTimeMinutes;

    if (!entry.chapterName?.trim()) {
      warnings.push(`"${entry.questionText.slice(0, 40)}…" had no identifiable chapter — please assign one before saving.`);
    }

    extracted.push({
      questionText: entry.questionText.trim(),
      questionType,
      // Strip any letter label ("a. ", "(b)", …) the model baked into the option text itself —
      // PaperDocument always prepends its own (a)/(b)/… label when printing, so leaving the
      // model's label in would double up ("(a) a. England") on the printed paper.
      options: normalizeOptions(entry.options),
      correctAnswer: entry.correctAnswer ?? undefined,
      difficulty,
      marks: typeof marksNum === 'number' && !Number.isNaN(marksNum) ? marksNum : 1,
      estimatedTimeMinutes: typeof timeNum === 'number' && !Number.isNaN(timeNum) ? timeNum : 2,
      bloomsLevel,
      keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
      chapterName: entry.chapterName?.trim() || 'Unassigned',
      topic: entry.topic ?? undefined,
      source: entry.source ?? undefined,
      // sourceId is filled in by the caller that actually knows it (extractFromSourceText) —
      // clean() only sees the model's raw figureId, same layering as sourceRef below it.
      imageRef: entry.imageFigureId?.trim() ? { sourceId: '', figureId: entry.imageFigureId.trim() } : undefined,
      imageRequirement: !entry.imageFigureId?.trim() && entry.imageRequired
        ? { imageRequired: true, imageSource: 'generated', imagePrompt: entry.imagePrompt?.trim() || undefined }
        : undefined,
    });
  }

  return { extracted, warnings };
}

// ── Service ────────────────────────────────────────────────────────────────────

export const questionExtractionService = {
  /** Upload → transcribe + store text only. Question structuring is a separate, repeatable step — see structureFromText/enqueueReExtractFromSource. `detectImages` is the teacher's "Include images" toggle — opt-in, so the default upload stays exactly as cheap/fast as before figure detection existed. */
  /**
   * Upload → read the photo once and get straight to question drafts, no separate "transcribe
   * now, structure later" step (see buildDirectExtractionPrompt). The page's transcribed text is
   * still saved on the QuestionSource record (needed for re-extraction and search), but it's an
   * internal artifact now — the teacher's very next screen is the question drafts themselves, not
   * an editable OCR-text page. `detectImages` is the teacher's "Include images" toggle.
   */
  async extractFromImage(
    cls: string, subject: string, imageDataUri: string, ctx: AuthContext, fileName?: string, detectImages = false,
  ): Promise<QuestionExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }

    const { pageText, figures, extracted, warnings } = await completeDirectExtractionWithRetry(
      (count) => ({
        systemPrompt: buildDirectExtractionPrompt(cls, subject, { count, difficulty: 'mixed', detectImages, requestTopics: false, comprehensiveTypeCoverage: true }),
        userPrompt: 'Read this photographed page and extract questions from it.',
      }),
      COMPREHENSIVE_COVERAGE_TARGET, ctx, imageDataUri, 1,
    );

    if (!pageText.trim()) {
      // QuestionSource.extractedText is a required field — an empty string still fails Mongoose's
      // required check, so this has to be rejected here rather than saved as a blank source.
      throw new ValidationError('No readable text was found on that page — try a clearer photo.');
    }

    // Only persist the page image (GridFS — see lib/image-store.ts) when there's actually
    // something on it worth referencing later; a detectImages run that found zero usable figures
    // shouldn't store an image nothing will ever point at.
    let pageImageFileId: string | undefined;
    if (detectImages && figures.length > 0) {
      const [, base64] = imageDataUri.split(',', 2);
      const contentTypeMatch = /^data:([^;]+);/.exec(imageDataUri);
      pageImageFileId = await saveImage(Buffer.from(base64 ?? '', 'base64'), {
        schoolId: ctx.schoolId,
        contentType: contentTypeMatch?.[1] ?? 'image/jpeg',
      });
    }

    const source = await questionSourceRepository.create({
      schoolId: ctx.schoolId, userId: ctx.userId, class: cls, subject, kind: 'image', fileName,
      extractedText: pageText,
      ...(pageImageFileId ? { pageImageFileId, figures } : {}),
    });
    const sourceId = String(source._id);

    const withSource = extracted.map((q) => ({
      ...q,
      sourceRef: { sourceId },
      imageRef: q.imageRef ? { ...q.imageRef, sourceId } : undefined,
    }));

    return { sourceType: 'image', extracted: withSource, warnings, sourceId };
  },

  /** Upload → extract + store text only (local PDF text layer, no AI call). Question structuring is a separate, repeatable step. */
  async extractFromPdf(
    cls: string, subject: string, pdfBuffer: Buffer, ctx: AuthContext, fileName?: string,
  ): Promise<TextExtractionResult> {
    // Loaded lazily (not as a top-level import) so a broken native dependency in pdf-parse's
    // pdfjs-dist chain (e.g. @napi-rs/canvas failing to load its platform binary) only breaks
    // this one PDF-upload path at request time — it can no longer crash the whole server at
    // boot, which is what took production down for ~15h on 2026-08-31 (every deploy since
    // d80173c failed to start because this was a static import evaluated during route setup).
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    const { text } = await parser.getText();
    await parser.destroy();

    if (!text.trim() || text.trim().length < 20) {
      throw new ValidationError(
        'This PDF has no readable text layer (likely a scanned document) — upload photos of its pages instead.',
      );
    }

    const source = await questionSourceRepository.create({
      schoolId: ctx.schoolId, userId: ctx.userId, class: cls, subject, kind: 'pdf_text', fileName,
      extractedText: text,
    });

    return { sourceId: String(source._id), sourceType: 'pdf_text', fileName, extractedText: text, warnings: [] };
  },

  /** Re-runs AI structuring over previously-saved converted text — no re-upload/re-OCR needed. */
  async extractFromSourceText(source: IQuestionSource, options: QuestionGenerationOptions, ctx: AuthContext): Promise<QuestionExtractionResult> {
    // Structured captures pass their blocks back through as lightweight Markdown (tables/lists stay
    // structured) rather than the fully flattened text, so the question-structuring prompt still sees
    // tables as tables — see blocksToMarkdown.
    const sourceText = source.pages?.length
      ? blocksToMarkdown(source.pages.flatMap((p) => p.blocks))
      : source.extractedText;
    // Every figure this source has, regardless of whether it sits at the top level (single-image
    // upload) or under a specific page (chapter capture) — offered as one flat list since
    // structureFromText's prompt covers the whole source's text in one go, not page-by-page.
    const figures: PageFigure[] = [
      ...(source.figures ?? []),
      ...(source.pages ?? []).flatMap((p) => p.figures ?? []),
    ];
    const sourceId = String(source._id);

    // ── Process-once guard + topic-tree derivation, chapter_capture sources only ────────────
    // A source only ever gets a structured `pages` array via saveChapterSource (the "chapter
    // capture" flow) — plain single-image/PDF uploads never have one, so this whole block is a
    // no-op (isChapterCapture false) for those, matching every extraction/behaviour they had
    // before this existed.
    const isChapterCapture = Boolean(source.pages?.length) && Boolean(source.chapterName?.trim());
    let chapter: Awaited<ReturnType<typeof chapterRepository.findOrCreate>> | undefined;
    let contentHash: string | undefined;
    if (isChapterCapture) {
      contentHash = computeContentHash(sourceText);
      chapter = await chapterRepository.findOrCreate(ctx.schoolId, source.class, source.subject, source.chapterName!.trim());
      if (chapter.extractionStatus === 'processed' && chapter.sourceContentHash === contentHash) {
        logger.info('[QuestionExtraction] Skipping duplicate chapter-capture extraction — sourceContentHash unchanged', {
          chapterId: String(chapter._id), chapterName: chapter.chapterName, schoolId: ctx.schoolId,
        });
        const existing = await questionRepository.findAll(ctx.schoolId, { chapterId: String(chapter._id), limit: 200 });
        return {
          sourceType: source.kind,
          sourceId,
          warnings: ["This chapter's content hasn't changed since it was last processed — showing the previously generated questions instead of re-running AI extraction."],
          extracted: existing.questions.map((q) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options,
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty,
            marks: q.marks,
            estimatedTimeMinutes: q.estimatedTimeMinutes,
            bloomsLevel: q.bloomsLevel,
            keywords: q.keywords,
            chapterName: q.chapterName,
            topic: q.topic,
            topicId: q.topicId,
            subtopicId: q.subtopicId,
            source: q.source,
            sourceRef: q.sourceRef,
            imageRef: q.imageRef,
            imageRequirement: q.imageRequirement,
          })),
        };
      }
      // Best-effort guard against two concurrent requests for the same chapter both firing the
      // AI — not a real distributed lock, just narrows the window.
      await chapterRepository.markExtractionStatus(String(chapter._id), ctx.schoolId, 'processing');
    }

    // Reaching this point with isChapterCapture true means the cache-hit branch above did NOT
    // return early — i.e. this chapter has never been processed, or its content changed since it
    // last was. That makes this the one-and-only fresh pass this content will ever get (the hash
    // guard blocks any future re-run), so it ignores the teacher's manually-entered count/difficulty
    // picker and aims for comprehensive type coverage instead — see COMPREHENSIVE_COVERAGE_TARGET
    // and buildSystemPrompt's comprehensiveTypeCoverage framing. A plain single-image/PDF upload
    // (isChapterCapture false) and a manual top-up on an already-processed chapter both keep using
    // options.count exactly as before.
    const structuringOptions: QuestionGenerationOptions = isChapterCapture
      ? { ...options, count: COMPREHENSIVE_COVERAGE_TARGET }
      : options;

    const { extracted, warnings, topics } = await questionExtractionService.structureFromText(
      source.class, source.subject, sourceText, structuringOptions, ctx, source.chapterName, figures, isChapterCapture, isChapterCapture,
    );

    let topicTree: ITopicNode[] | undefined;
    if (isChapterCapture && chapter) {
      topicTree = topics?.length ? buildTopicTree(topics) : undefined;
      await chapterRepository.markProcessed(String(chapter._id), ctx.schoolId, { sourceContentHash: contentHash!, topicTree });
    }

    // A teacher-assigned chapter on the source overrides the AI's per-question guess —
    // it's a more reliable signal than inferring the chapter from page content alone.
    // Every draft is stamped with sourceRef so a saved question can trace back to the
    // upload it came from ("Show source") — the structuring prompt doesn't track which
    // block a question came from, so this is source-level, not block-level, traceability.
    // imageRef, when the model picked one of this source's figures, gets the same sourceId
    // stamped on it (clean() only knows the bare figureId — this source is the only place it
    // could have come from, since `figures` above was built entirely from it).
    const withChapter = extracted.map((q) => {
      const { topicId, subtopicId } = topicTree ? matchTopicIds(q.topic, topicTree) : {};
      return {
        ...(source.chapterName ? { ...q, chapterName: source.chapterName } : q),
        topicId,
        subtopicId,
        sourceRef: { sourceId },
        imageRef: q.imageRef ? { ...q.imageRef, sourceId } : undefined,
      };
    });
    return { sourceType: source.kind, extracted: withChapter, warnings, sourceId };
  },

  /**
   * Shared AI call: turns raw page/document text into structured question drafts. Scales to any
   * source size and any requested count without a single call ever risking truncation:
   *   1. `text` is split into CHUNK_CHAR_LIMIT-sized chunks (paragraph-boundary aware) instead of
   *      being sliced to the first 15k characters — a 20-page chapter upload gets every page's
   *      content considered, not just the start of it.
   *   2. The requested `count` is distributed across chunks proportional to each chunk's length,
   *      then further split into MAX_BATCH_COUNT-sized batches per chunk — so however large the
   *      ask (5 questions or a full yearly paper's worth), every individual AI call is asking for
   *      a small, safely-budgeted number of questions.
   *   3. Chunks run with bounded concurrency; each batch call is retry-safe (see
   *      completeQuestionsWithRetry) so a truncated response never loses the whole request.
   *   4. If the source genuinely doesn't contain `count` extractable questions, the shortfall is
   *      topped up with freshly-authored questions (via synthesizeQuestions, same "must hit the
   *      count" path the paper generator uses to fill gaps) so the teacher gets exactly what they
   *      asked for instead of a passive "found 8 of 10" — the warning below only fires if that
   *      top-up itself can't fully close the gap (AI unavailable/call failed).
   */
  async structureFromText(
    cls: string, subject: string, text: string, options: QuestionGenerationOptions, ctx: AuthContext,
    chapterName?: string, figures: PageFigure[] = [], deriveTopics = false,
    // Internal-only decision the server makes for a chapter-capture source's first-ever fresh
    // processing pass — never teacher-configured, so this is a plain positional parameter here
    // rather than a field on the public-facing QuestionGenerationOptions type. See buildSystemPrompt.
    comprehensiveTypeCoverage = false,
  ): Promise<{ extracted: ExtractedQuestionDraft[]; warnings: string[]; topics?: RawTopicNode[] }> {
    const chunks = chunkText(text);
    if (chunks.length === 0) return { extracted: [], warnings: [] };

    const perChunkCounts = allocateByWeight(options.count, chunks.map((c) => c.length));
    const tasks = chunks
      .map((chunk, i) => ({ chunk, count: perChunkCounts[i] }))
      .filter((t) => t.count > 0)
      // Only the first task requests the topic breakdown — one lightweight addition to one
      // existing call rather than a whole extra AI round-trip per chunk/page.
      .map((t, i) => ({ ...t, isTopicSource: deriveTopics && i === 0 }));

    let derivedTopics: RawTopicNode[] | undefined;
    const perTaskResults = await runWithConcurrency(tasks, CHUNK_CONCURRENCY, async (task) => {
      const extracted: ExtractedQuestionDraft[] = [];
      const warnings: string[] = [];
      // Sequential within a chunk (not parallel) so each later batch can be told what the
      // earlier batches over the same text already extracted, and avoid repeating them.
      for (const batchSize of splitIntoBatches(task.count)) {
        const excludeTexts = extracted.map((q) => q.questionText);
        // Only asked on this task's very first batch call (excludeTexts empty) — a retry/top-up
        // batch over the same chunk doesn't need to re-derive topics.
        const requestTopics = task.isTopicSource && excludeTexts.length === 0;
        const result = await completeQuestionsWithRetry(
          (count) => ({
            systemPrompt: buildSystemPrompt(cls, subject, { count, difficulty: options.difficulty, languageComplexity: options.languageComplexity, includeImages: options.includeImages, figures, requestTopics, comprehensiveTypeCoverage }, excludeTexts),
            userPrompt: `Extract up to ${count} question(s) from this document text:\n\n${task.chunk}`,
          }),
          batchSize,
          ctx,
        );
        extracted.push(...result.extracted);
        warnings.push(...result.warnings);
        if (requestTopics && result.topics) derivedTopics = result.topics;
      }
      return { extracted, warnings };
    });

    const merged = dedupeQuestions(perTaskResults.flatMap((r) => r.extracted));
    const warnings = perTaskResults.flatMap((r) => r.warnings);
    let final = merged.length > options.count ? merged.slice(0, options.count) : merged;

    // The comprehensive-coverage pass's `count` is a generous ceiling, not a target to hit (see
    // COMPREHENSIVE_COVERAGE_TARGET/buildSystemPrompt) — topping up a shortfall with synthesized
    // filler, or warning that the "requested" count wasn't met, would directly undermine the
    // "never invent/never force a type" instruction that pass is built around. Both stay exactly
    // as before for every other call (manual counts, single-image/PDF uploads, synthesis top-ups).
    if (!comprehensiveTypeCoverage && final.length < options.count && openaiProvider.isAvailable()) {
      const shortfall = options.count - final.length;
      try {
        const synthesized = await questionExtractionService.synthesizeQuestions(
          {
            class: cls,
            subject,
            chapterName: chapterName?.trim() || subject,
            marks: 1,
            count: shortfall,
            difficulty: options.difficulty === 'mixed' ? undefined : options.difficulty,
            contextText: text,
          },
          ctx,
        );
        final = dedupeQuestions([...final, ...synthesized]).slice(0, options.count);
      } catch (err) {
        logger.error('[QuestionExtraction] Top-up synthesis failed', { err });
      }
    }

    if (!comprehensiveTypeCoverage && final.length < options.count) {
      warnings.push(`Found ${final.length} of the ${options.count} requested question(s) in the uploaded content.`);
    }
    return { extracted: final, warnings, topics: derivedTopics };
  },

  /**
   * Writes brand-new questions for a chapter/marks-value gap the bank can't fill from existing
   * content — see buildSynthesisPrompt. Called by the paper generator, never blocks on "not enough
   * content"; returns [] only if AI isn't configured or the call itself fails, letting the caller
   * decide how to degrade further rather than hard-failing paper generation.
   */
  async synthesizeQuestions(
    req: {
      class: string; subject: string; chapterName: string; marks: number; count: number;
      questionType?: QuestionType; difficulty?: QuestionDifficulty; contextText: string; languageComplexity?: LanguageComplexity;
      /** Teacher's "Include images" toggle for this generation run — gates whether the prompt offers `figures` at all. */
      includeImages?: boolean;
      /** This chapter's available figures, each tagged with the upload it came from — see figure-lookup.ts. Only meaningful when includeImages is true. */
      figures?: ChapterFigure[];
    },
    ctx: AuthContext,
  ): Promise<ExtractedQuestionDraft[]> {
    if (!openaiProvider.isAvailable() || req.count <= 0) return [];

    const contextText = req.contextText.slice(0, 6000) || '(no prior questions or uploads yet for this chapter — use general syllabus knowledge for this class/subject/chapter)';
    const figures = req.figures ?? [];

    // Same batching principle as structureFromText: a large marks-gap (e.g. filling out a full
    // yearly paper) is split into MAX_BATCH_COUNT-sized calls instead of one big ask that risks
    // truncation, and each call is retry-safe.
    const batchResults = await runWithConcurrency(splitIntoBatches(req.count), CHUNK_CONCURRENCY, (batchSize) =>
      completeQuestionsWithRetry(
        (count) => ({
          systemPrompt: buildSynthesisPrompt(
            req.class, req.subject, req.chapterName, req.marks, count, req.questionType, req.difficulty, req.languageComplexity,
            req.includeImages, figures.map((f) => f.figure),
          ),
          userPrompt: `Reference material for this chapter:\n\n${contextText}`,
        }),
        batchSize,
        ctx,
      ),
    );

    const extracted = dedupeQuestions(batchResults.flatMap((r) => r.extracted)).slice(0, req.count);
    // The model only ever returns a bare figureId (see imageAvailabilityInstruction) — resolve it
    // back to the source it actually lives on here. A figureId the model didn't actually pick from
    // the offered list (shouldn't happen, but defensive) is dropped rather than saved with a blank
    // sourceId, which would otherwise silently corrupt the reference.
    const figureSourceMap = new Map(figures.map((f) => [f.figure.figureId, f.sourceId]));
    // The model is asked for exact marks/chapter/type/difficulty, but normalize here too in case it drifts —
    // a requested difficulty is a hard constraint, not a suggestion the model can quietly downgrade.
    return extracted.map((q) => ({
      ...q,
      marks: req.marks,
      chapterName: req.chapterName,
      questionType: req.questionType ?? q.questionType,
      difficulty: req.difficulty ?? q.difficulty,
      imageRef: q.imageRef && figureSourceMap.has(q.imageRef.figureId)
        ? { ...q.imageRef, sourceId: figureSourceMap.get(q.imageRef.figureId)! }
        : undefined,
    }));
  },

  async enqueueExtractFromImage(
    cls: string, subject: string, imageDataUri: string, ctx: AuthContext, fileName?: string, detectImages = false,
  ): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'image' });
    const jobId = job._id.toString();

    questionExtractionService.extractFromImage(cls, subject, imageDataUri, ctx, fileName, detectImages)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background image extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, toUserSafeErrorMessage(err)).catch(() => {});
      });

    return { jobId };
  },

  async enqueueExtractFromPdf(
    cls: string, subject: string, pdfBuffer: Buffer, ctx: AuthContext, fileName?: string,
  ): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'pdf_text' });
    const jobId = job._id.toString();

    questionExtractionService.extractFromPdf(cls, subject, pdfBuffer, ctx, fileName)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background PDF extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, toUserSafeErrorMessage(err)).catch(() => {});
      });

    return { jobId };
  },

  /** Re-extraction job over an already-saved QuestionSource — caller (question-bank.service) has already checked ownership/scope. */
  async enqueueReExtractFromSource(source: IQuestionSource, options: QuestionGenerationOptions, ctx: AuthContext): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: source.kind });
    const jobId = job._id.toString();

    questionExtractionService.extractFromSourceText(source, options, ctx)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background re-extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, toUserSafeErrorMessage(err)).catch(() => {});
      });

    return { jobId };
  },

  async getExtractionJob(
    jobId: string, ctx: AuthContext,
  ): Promise<{ status: string; result?: TextExtractionResult | QuestionExtractionResult | ChapterCaptureJobResult; error?: string; totalPages?: number; completedPages?: number }> {
    const job = await extractionJobRepository.findById(jobId, ctx.schoolId);
    if (!job) throw new ValidationError('Extraction job not found or expired');
    if (job.userId !== ctx.userId) throw new ValidationError('Extraction job not found or expired');
    return { status: job.status, result: job.result, error: job.error, totalPages: job.totalPages, completedPages: job.completedPages };
  },

  // ── Multi-page chapter capture ─────────────────────────────────────────────────
  // Each page goes straight from photo to question drafts in one vision call (see
  // buildDirectExtractionPrompt) — there is no separate "transcribe now, structure later" pass
  // and no teacher-facing OCR-text review step anymore. `pages`/ContentBlock storage is kept only
  // as an internal record (figure bounding boxes, re-processing hash, search) — see finalizeChapterCapture.

  /** Single-page vision call — the building block enqueueChapterCapture and retryPage both use. `requestTopics` is only ever true for a capture's first page (see enqueueChapterCapture). */
  async extractStructuredPage(
    cls: string, subject: string, imageDataUri: string, ctx: AuthContext, detectImages = false, pageNumber = 1, requestTopics = false,
  ): Promise<{ blocks: ContentBlock[]; figures: PageFigure[]; imageDataUri: string; questions: ExtractedQuestionDraft[]; warnings: string[]; topics?: RawTopicNode[] }> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    const { pageText, figures, extracted, warnings, topics } = await completeDirectExtractionWithRetry(
      (count) => ({
        systemPrompt: buildDirectExtractionPrompt(cls, subject, { count, difficulty: 'mixed', detectImages, requestTopics, comprehensiveTypeCoverage: true }),
        userPrompt: 'Read this photographed page and extract questions from it.',
      }),
      COMPREHENSIVE_COVERAGE_TARGET, ctx, imageDataUri, pageNumber,
    );
    return { blocks: textToParagraphBlocks(pageText), figures, imageDataUri, questions: extracted, warnings, topics };
  },

  /**
   * Enqueues a multi-page batch job (kind: 'chapter_capture'). Pages are processed with bounded
   * concurrency (3 at a time) so a 20-page chapter doesn't fire 20 simultaneous vision calls. One
   * page's failure never fails the whole job — it's recorded as a pageError on that page's slot,
   * and "Retry Page" can re-run just that one afterward. Once every page is done, the batch is
   * auto-saved as a permanent QuestionSource and its merged question drafts land in the job result
   * — the teacher's next screen is reviewing/editing those drafts (same UI the single-image upload
   * uses), never a "Save Chapter" click over raw transcribed text.
   */
  async enqueueChapterCapture(
    cls: string, subject: string, chapterName: string | undefined,
    images: { dataUri: string; fileName?: string }[], ctx: AuthContext, detectImages = false,
  ): Promise<{ jobId: string }> {
    const totalPages = images.length;
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'chapter_capture', totalPages, class: cls, subject, chapterName });
    const jobId = job._id.toString();
    // Deliberately omits pagesProcessed here — this event only marks that a job started,
    // it hasn't processed any pages yet. Each page records its own pagesProcessed:1 below
    // (see processOne) — recording totalPages here too used to double-count every job's
    // pages in the ops usage dashboard (a 6-page job would show as 12+).
    usageEventRepository.record({ userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'capture_started', status: 'success' });

    (async () => {
      const pages: ChapterPage[] = new Array(totalPages);
      const pageQuestions: ExtractedQuestionDraft[][] = new Array(totalPages).fill([]);
      let completed = 0;
      let derivedTopics: RawTopicNode[] | undefined;
      // Lowered from the old plain-transcription value (5) — each call now also drafts a
      // comprehensive question batch, a heavier per-call ask than transcription alone was.
      const CONCURRENCY = 3;

      const processOne = async (index: number) => {
        const pageNumber = index + 1;
        try {
          const page = await questionExtractionService.extractStructuredPage(cls, subject, images[index].dataUri, ctx, detectImages, pageNumber, pageNumber === 1);
          const lowConfidenceBlocks = page.blocks.filter((b) => b.confidence === 'low').length;

          // Same "only store what could actually be referenced" rule as the single-image path —
          // a page with zero usable figures doesn't get its image persisted to GridFS.
          let pageImageFileId: string | undefined;
          if (detectImages && page.figures.length > 0) {
            const [, base64] = page.imageDataUri.split(',', 2);
            const contentTypeMatch = /^data:([^;]+);/.exec(page.imageDataUri);
            pageImageFileId = await saveImage(Buffer.from(base64 ?? '', 'base64'), {
              schoolId: ctx.schoolId,
              contentType: contentTypeMatch?.[1] ?? 'image/jpeg',
            });
          }

          pages[index] = {
            pageNumber,
            blocks: page.blocks,
            confidence: page.blocks.length === 0 ? 'low' : lowConfidenceBlocks > page.blocks.length / 2 ? 'review' : undefined,
            ...(pageImageFileId ? { pageImageFileId, figures: page.figures } : {}),
          };
          pageQuestions[index] = page.questions;
          if (pageNumber === 1 && page.topics) derivedTopics = page.topics;
          usageEventRepository.record({
            userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'page_processed',
            pagesProcessed: 1, wordsGenerated: pageWordCount(page.blocks), status: 'success',
          });
        } catch (err) {
          logger.error('[QuestionExtraction] Chapter capture page failed', { jobId, pageNumber, err });
          pages[index] = { pageNumber, blocks: [], pageError: toUserSafeErrorMessage(err) };
          usageEventRepository.record({ userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'page_processed', pagesProcessed: 1, status: 'failed' });
        } finally {
          completed += 1;
          await extractionJobRepository.updateProgress(jobId, completed, { documentTitle: undefined, language: undefined, pages: pages.filter(Boolean), totalPages, completedPages: completed });
        }
      };

      // Simple bounded-concurrency batching — no new dependency needed for a fixed pool of 3.
      for (let i = 0; i < images.length; i += CONCURRENCY) {
        await Promise.all(images.slice(i, i + CONCURRENCY).map((_, offset) => processOne(i + offset)));
      }

      const { questions, warnings, sourceId } = await finalizeChapterCapture(cls, subject, chapterName, pages, pageQuestions.flat(), derivedTopics, ctx);
      await extractionJobRepository.markCompleted(jobId, { pages, totalPages, completedPages: completed, questions, warnings, sourceId });
    })().catch((err) => {
      logger.error('[QuestionExtraction] Chapter capture batch failed', { jobId, err });
      extractionJobRepository.markFailed(jobId, toUserSafeErrorMessage(err)).catch(() => {});
    });

    return { jobId };
  },

  /**
   * Reprocesses a single page in-place on an already-completed chapter-capture job (a real page
   * failure — network/AI error — not a "the questions came out badly" case, which the review
   * screen's normal edit/remove controls already cover). Re-runs that page's vision call and folds
   * its freshly drafted questions into the job's merged list. Known limitation: since a question
   * draft carries no page-level tag, a retry can't surgically remove that page's *previous*
   * contribution — only relevant if the earlier attempt had partially succeeded (a genuine failure
   * contributes zero questions, so the common case is clean); dedupeQuestions still catches
   * exact-text repeats. If the batch was already auto-saved as a QuestionSource (see
   * finalizeChapterCapture), that saved copy is not updated by a retry — a rare edge case, not
   * worth re-running the hash-guard/topic-tree machinery for.
   */
  async retryPage(jobId: string, pageNumber: number, imageDataUri: string, ctx: AuthContext): Promise<ChapterCaptureJobResult> {
    const job = await extractionJobRepository.findById(jobId, ctx.schoolId);
    if (!job || job.userId !== ctx.userId || job.kind !== 'chapter_capture') {
      throw new ValidationError('Chapter capture job not found or expired');
    }
    const current = (job.result as ChapterCaptureJobResult) ?? { pages: [], totalPages: job.totalPages ?? 0, completedPages: job.completedPages ?? 0 };
    const page = await questionExtractionService.extractStructuredPage(job.class ?? '', job.subject ?? '', imageDataUri, ctx, false, pageNumber);
    const updatedPages = current.pages.map((p) => (p.pageNumber === pageNumber ? { pageNumber, blocks: page.blocks } : p));
    if (!updatedPages.some((p) => p.pageNumber === pageNumber)) updatedPages.push({ pageNumber, blocks: page.blocks });
    updatedPages.sort((a, b) => a.pageNumber - b.pageNumber);

    const questions = dedupeQuestions([...(current.questions ?? []), ...page.questions]);
    const updated: ChapterCaptureJobResult = { ...current, pages: updatedPages, questions };
    await extractionJobRepository.markCompleted(jobId, updated);
    usageEventRepository.record({ userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'page_processed', pagesProcessed: 1, wordsGenerated: pageWordCount(page.blocks), status: 'success' });
    return updated;
  },

  /** Legacy manual "Save Chapter" path — finalizeChapterCapture now does this automatically as
   *  part of enqueueChapterCapture, but this stays available for any caller that still hands over
   *  already-reviewed pages directly (e.g. a future bulk-import path). */
  async saveChapterSource(
    cls: string, subject: string, data: { documentTitle?: string; language?: string; pages: ChapterPage[]; fileName?: string; chapterName?: string }, ctx: AuthContext,
  ): Promise<IQuestionSource> {
    const allBlocks = data.pages.flatMap((p) => p.blocks);
    const extractedText = flattenBlocksToText(allBlocks);
    if (!extractedText.trim()) {
      throw new ValidationError('This chapter has no readable content to save — check the captured pages.');
    }

    const source = await questionSourceRepository.create({
      schoolId: ctx.schoolId, userId: ctx.userId, class: cls, subject, kind: 'image', fileName: data.fileName,
      extractedText,
      documentTitle: data.documentTitle,
      language: data.language,
      pages: data.pages,
      chapterName: data.chapterName,
      reviewStatus: 'saved',
    });

    if (data.chapterName?.trim()) {
      await chapterRepository.findOrCreate(ctx.schoolId, cls, subject, data.chapterName.trim());
    }

    usageEventRepository.record({
      userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'chapter_saved',
      documentId: String(source._id), pagesProcessed: data.pages.length, wordsGenerated: extractedText.split(/\s+/).filter(Boolean).length, status: 'success',
    });

    return source;
  },
};

/**
 * Finishes a chapter-capture batch once every page has been read: saves the permanent
 * QuestionSource (what "Save Chapter" used to do on an explicit teacher click — now automatic,
 * since there's no more text-review step to save from), and, when the teacher assigned a chapter
 * name up front, applies the same process-once dedup + topic-tree derivation that a single-source
 * re-extraction used to run after the fact (see the old extractFromSourceText). Kept as a plain
 * function (not part of the exported service) since it's an internal step of enqueueChapterCapture,
 * never called on its own.
 */
async function finalizeChapterCapture(
  cls: string, subject: string, chapterName: string | undefined,
  pages: ChapterPage[], allQuestions: ExtractedQuestionDraft[], derivedTopics: RawTopicNode[] | undefined, ctx: AuthContext,
): Promise<{ questions: ExtractedQuestionDraft[]; warnings: string[]; sourceId?: string }> {
  const validPages = pages.filter(Boolean);
  const extractedText = flattenBlocksToText(validPages.flatMap((p) => p.blocks));
  const merged = dedupeQuestions(allQuestions);

  if (!extractedText.trim()) {
    return { questions: merged, warnings: ['No readable content was found across the captured pages — check that at least one page processed successfully.'] };
  }

  const source = await questionSourceRepository.create({
    schoolId: ctx.schoolId, userId: ctx.userId, class: cls, subject, kind: 'image',
    extractedText, pages: validPages, chapterName: chapterName?.trim() || undefined, reviewStatus: 'saved',
  });
  const sourceId = String(source._id);

  let finalQuestions: ExtractedQuestionDraft[] = merged.map((q) => ({
    ...q,
    ...(chapterName?.trim() ? { chapterName: chapterName.trim() } : {}),
    sourceRef: { sourceId },
    imageRef: q.imageRef ? { ...q.imageRef, sourceId } : undefined,
  }));
  let warnings: string[] = [];

  if (chapterName?.trim()) {
    const contentHash = computeContentHash(extractedText);
    const chapter = await chapterRepository.findOrCreate(ctx.schoolId, cls, subject, chapterName.trim());

    if (chapter.extractionStatus === 'processed' && chapter.sourceContentHash === contentHash) {
      logger.info('[QuestionExtraction] Skipping duplicate chapter-capture save — sourceContentHash unchanged', {
        chapterId: String(chapter._id), chapterName: chapter.chapterName, schoolId: ctx.schoolId,
      });
      const existing = await questionRepository.findAll(ctx.schoolId, { chapterId: String(chapter._id), limit: 200 });
      finalQuestions = existing.questions.map((q) => ({
        questionText: q.questionText, questionType: q.questionType, options: q.options, correctAnswer: q.correctAnswer,
        difficulty: q.difficulty, marks: q.marks, estimatedTimeMinutes: q.estimatedTimeMinutes, bloomsLevel: q.bloomsLevel,
        keywords: q.keywords, chapterName: q.chapterName, topic: q.topic, topicId: q.topicId, subtopicId: q.subtopicId,
        source: q.source, sourceRef: q.sourceRef, imageRef: q.imageRef, imageRequirement: q.imageRequirement,
      }));
      warnings = ["This chapter's content hasn't changed since it was last processed — showing the previously generated questions instead of re-running AI extraction."];
    } else {
      const topicTree = derivedTopics?.length ? buildTopicTree(derivedTopics) : undefined;
      await chapterRepository.markProcessed(String(chapter._id), ctx.schoolId, { sourceContentHash: contentHash, topicTree });
      finalQuestions = finalQuestions.map((q) => {
        const { topicId, subtopicId } = topicTree ? matchTopicIds(q.topic, topicTree) : {};
        return { ...q, topicId, subtopicId };
      });
    }
  }

  usageEventRepository.record({
    userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'chapter_saved',
    documentId: sourceId, pagesProcessed: validPages.length, wordsGenerated: extractedText.split(/\s+/).filter(Boolean).length, status: 'success',
  });

  return { questions: finalQuestions, warnings, sourceId };
}
