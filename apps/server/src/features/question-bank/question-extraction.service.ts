import { PDFParse } from 'pdf-parse';
import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { usageEventRepository } from '../../lib/usage-event.repository';
import { ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { extractionJobRepository } from './extraction-job.repository';
import { questionSourceRepository } from './question-source.repository';
import { IQuestionSource } from './question-source.model';
import { QuestionType, QuestionDifficulty, BloomsLevel } from './question.model';
import type { ContentBlock, ChapterPage, ChapterCaptureJobResult, BlockConfidence, ListBlockItem, QuestionGenerationOptions } from '@schoolos/types';

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
  source?: string;
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
}

const QUESTION_TYPES: QuestionType[] = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
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

function buildSystemPrompt(cls: string, subject: string, options: { count: number; difficulty: QuestionDifficulty | 'mixed' }, excludeTexts: string[] = []): string {
  const difficultyInstruction = options.difficulty === 'mixed'
    ? 'a mix of easy, medium, and hard difficulty'
    : `"${options.difficulty}" difficulty only`;

  const excludeBlock = excludeTexts.length
    ? `\n\nThese questions were already extracted from this same document in an earlier pass — do NOT repeat them or near-duplicates of them:\n${excludeTexts.slice(0, 30).map((t) => `- ${t.slice(0, 150)}`).join('\n')}\n`
    : '';

  return `You read school textbook pages, worksheets, or previous exam papers for Class ${cls} ${subject} and convert what you find into structured JSON.

Pick out up to ${options.count} of the clearest, most answerable question(s) on the page, at ${difficultyInstruction}. If the page has fewer than ${options.count} actual questions, return only as many as genuinely exist — never invent extra ones or split one question into several to hit the count. Keep every field concise; do not pad or over-elaborate simple content (e.g. a short Class 1-2 story or worksheet) just to fill space.
${excludeBlock}
For each question, return:
- "questionText": the full question text
- "questionType": one of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}
- "options": array of option strings, only if questionType is "mcq"
- "correctAnswer": the correct answer/option if it is visible on the page, else omit
- "difficulty": one of ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')} — estimate based on the question's complexity
- "marks": the marks this question is worth (a number). If not stated, estimate a reasonable value based on question type and length
- "estimatedTimeMinutes": estimated minutes a student would need
- "bloomsLevel": one of ${BLOOMS_LEVELS.map((b) => `"${b}"`).join(', ')} — Bloom's Taxonomy level
- "keywords": 2-5 key terms from the question
- "chapterName": the chapter this question belongs to, if visible/inferable from the page (e.g. a heading), else your best guess from the content
- "topic": the specific topic within the chapter, if identifiable
- "source": where this came from if visible (e.g. "NCERT Page 54", "2024 Half Yearly Paper"), else omit

Also return "pageText": the full raw text of everything readable on the page, transcribed verbatim, so it can be cached and re-used later.

Return ONLY a valid JSON object: {"pageText": "...", "questions": [...]}. No markdown, no explanation. Skip anything that is not actually a question (headings, instructions, page numbers).`;
}

/**
 * Asks the model to write brand-new questions for a chapter, rather than extract them from a page.
 * Used by the paper generator when the bank doesn't have enough questions at a requested marks
 * value — the model must never refuse for "not enough content"; it should combine/extend the
 * chapter's concepts (multi-part, detailed-answer, etc.) to legitimately reach the requested marks.
 */
function buildSynthesisPrompt(cls: string, subject: string, chapterName: string, marks: number, count: number, questionType?: QuestionType): string {
  return `You are writing ${count} new, original exam question(s) for Class ${cls} ${subject}, chapter "${chapterName}", each worth exactly ${marks} mark(s)${questionType ? ` and of question type "${questionType}"` : ''}.

Use the reference material below (existing questions and/or textbook excerpts from this chapter) as your syllabus content — do not invent facts outside it. You must always produce exactly ${count} question(s) worth ${marks} marks each, no matter how little reference material is given. Never refuse or claim there isn't enough content for the requested mark value: if the chapter's material is thin for a high-mark question, write a multi-part or detailed-answer question (e.g. "Explain X. Give two examples. What is its significance?") that legitimately deserves ${marks} marks by combining and extending the chapter's concepts.

For each question, return the same JSON shape used for extraction:
- "questionText", "questionType", "options" (only for mcq), "correctAnswer" (if applicable)
- "difficulty": one of ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')}
- "marks": must be exactly ${marks}
- "estimatedTimeMinutes", "bloomsLevel": one of ${BLOOMS_LEVELS.map((b) => `"${b}"`).join(', ')}
- "keywords": 2-5 key terms
- "chapterName": "${chapterName}"
- "topic": the specific topic within the chapter, if identifiable

Return ONLY a valid JSON object: {"questions": [...]}. No markdown, no explanation.`;
}

/** Transcription-only prompt used on upload — cheaper/faster than buildSystemPrompt since it skips question structuring entirely; that happens later, on demand, via structureFromText. */
function buildTranscribePrompt(): string {
  return `You transcribe everything readable on a school textbook page, worksheet, or exam paper photo into plain text, verbatim, preserving question numbering and structure as line breaks.

Return ONLY a valid JSON object: {"pageText": "..."}. No markdown, no explanation, no commentary — just the transcribed text.`;
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

/** Parses the model's `{"questions": [...]}` response, non-throwing — returns null instead of raising, so callers (completeQuestionsWithRetry) can decide whether to retry rather than fail immediately. */
function tryParseQuestions(raw: string): { questions: RawExtractedQuestion[] } | null {
  try {
    const body = JSON.parse(raw);
    const questions = Array.isArray(body) ? body : body.questions;
    if (!Array.isArray(questions)) return null;
    return { questions };
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
): Promise<{ extracted: ExtractedQuestionDraft[]; warnings: string[] }> {
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

    if (parsed && !truncated) return clean(parsed.questions);

    if (parsed && truncated && !isLastAttempt) {
      // Parsed fine (model happened to close its brackets right at the limit) but flagged as
      // truncated — still worth a clean retry with more headroom rather than risking a partially
      // cut-off question sneaking through on a technicality.
      attemptCount = Math.max(1, Math.ceil(attemptCount / 2));
      headroom += 0.75;
      continue;
    }
    if (parsed) return clean(parsed.questions);

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

function parseTranscription(raw: string): string {
  try {
    const body = JSON.parse(raw);
    return typeof body?.pageText === 'string' ? body.pageText : '';
  } catch (err) {
    logger.error('[QuestionExtraction] Failed to parse transcription response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not read that photo — try a clearer picture.');
  }
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
      options: Array.isArray(entry.options) ? entry.options : undefined,
      correctAnswer: entry.correctAnswer ?? undefined,
      difficulty,
      marks: typeof marksNum === 'number' && !Number.isNaN(marksNum) ? marksNum : 1,
      estimatedTimeMinutes: typeof timeNum === 'number' && !Number.isNaN(timeNum) ? timeNum : 2,
      bloomsLevel,
      keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
      chapterName: entry.chapterName?.trim() || 'Unassigned',
      topic: entry.topic ?? undefined,
      source: entry.source ?? undefined,
    });
  }

  return { extracted, warnings };
}

// ── Service ────────────────────────────────────────────────────────────────────

export const questionExtractionService = {
  /** Upload → transcribe + store text only. Question structuring is a separate, repeatable step — see structureFromText/enqueueReExtractFromSource. */
  async extractFromImage(
    cls: string, subject: string, imageDataUri: string, ctx: AuthContext, fileName?: string,
  ): Promise<TextExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildTranscribePrompt(),
      userPrompt: 'Transcribe everything readable on this page.',
      imageDataUri,
      temperature: 0.1,
      maxTokens: 4000,
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

    const pageText = parseTranscription(result.content);
    if (!pageText.trim()) {
      // QuestionSource.extractedText is a required field — an empty string still fails Mongoose's
      // required check, so this has to be rejected here rather than saved as a blank source.
      throw new ValidationError('No readable text was found on that page — try a clearer photo.');
    }

    const source = await questionSourceRepository.create({
      schoolId: ctx.schoolId, userId: ctx.userId, class: cls, subject, kind: 'image', fileName,
      extractedText: pageText,
    });

    return { sourceId: String(source._id), sourceType: 'image', fileName, extractedText: pageText, warnings: [] };
  },

  /** Upload → extract + store text only (local PDF text layer, no AI call). Question structuring is a separate, repeatable step. */
  async extractFromPdf(
    cls: string, subject: string, pdfBuffer: Buffer, ctx: AuthContext, fileName?: string,
  ): Promise<TextExtractionResult> {
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
    const { extracted, warnings } = await questionExtractionService.structureFromText(
      source.class, source.subject, sourceText, options, ctx,
    );
    // A teacher-assigned chapter on the source overrides the AI's per-question guess —
    // it's a more reliable signal than inferring the chapter from page content alone.
    // Every draft is stamped with sourceRef so a saved question can trace back to the
    // upload it came from ("Show source") — the structuring prompt doesn't track which
    // block a question came from, so this is source-level, not block-level, traceability.
    const sourceId = String(source._id);
    const withChapter = extracted.map((q) => ({
      ...(source.chapterName ? { ...q, chapterName: source.chapterName } : q),
      sourceRef: { sourceId },
    }));
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
   */
  async structureFromText(
    cls: string, subject: string, text: string, options: QuestionGenerationOptions, ctx: AuthContext,
  ): Promise<{ extracted: ExtractedQuestionDraft[]; warnings: string[] }> {
    const chunks = chunkText(text);
    if (chunks.length === 0) return { extracted: [], warnings: [] };

    const perChunkCounts = allocateByWeight(options.count, chunks.map((c) => c.length));
    const tasks = chunks
      .map((chunk, i) => ({ chunk, count: perChunkCounts[i] }))
      .filter((t) => t.count > 0);

    const perTaskResults = await runWithConcurrency(tasks, CHUNK_CONCURRENCY, async (task) => {
      const extracted: ExtractedQuestionDraft[] = [];
      const warnings: string[] = [];
      // Sequential within a chunk (not parallel) so each later batch can be told what the
      // earlier batches over the same text already extracted, and avoid repeating them.
      for (const batchSize of splitIntoBatches(task.count)) {
        const excludeTexts = extracted.map((q) => q.questionText);
        const result = await completeQuestionsWithRetry(
          (count) => ({
            systemPrompt: buildSystemPrompt(cls, subject, { count, difficulty: options.difficulty }, excludeTexts),
            userPrompt: `Extract up to ${count} question(s) from this document text:\n\n${task.chunk}`,
          }),
          batchSize,
          ctx,
        );
        extracted.push(...result.extracted);
        warnings.push(...result.warnings);
      }
      return { extracted, warnings };
    });

    const merged = dedupeQuestions(perTaskResults.flatMap((r) => r.extracted));
    const warnings = perTaskResults.flatMap((r) => r.warnings);
    const final = merged.length > options.count ? merged.slice(0, options.count) : merged;
    if (final.length < options.count) {
      warnings.push(`Found ${final.length} of the ${options.count} requested question(s) in the uploaded content.`);
    }
    return { extracted: final, warnings };
  },

  /**
   * Writes brand-new questions for a chapter/marks-value gap the bank can't fill from existing
   * content — see buildSynthesisPrompt. Called by the paper generator, never blocks on "not enough
   * content"; returns [] only if AI isn't configured or the call itself fails, letting the caller
   * decide how to degrade further rather than hard-failing paper generation.
   */
  async synthesizeQuestions(
    req: { class: string; subject: string; chapterName: string; marks: number; count: number; questionType?: QuestionType; contextText: string },
    ctx: AuthContext,
  ): Promise<ExtractedQuestionDraft[]> {
    if (!openaiProvider.isAvailable() || req.count <= 0) return [];

    const contextText = req.contextText.slice(0, 6000) || '(no prior questions or uploads yet for this chapter — use general syllabus knowledge for this class/subject/chapter)';

    // Same batching principle as structureFromText: a large marks-gap (e.g. filling out a full
    // yearly paper) is split into MAX_BATCH_COUNT-sized calls instead of one big ask that risks
    // truncation, and each call is retry-safe.
    const batchResults = await runWithConcurrency(splitIntoBatches(req.count), CHUNK_CONCURRENCY, (batchSize) =>
      completeQuestionsWithRetry(
        (count) => ({
          systemPrompt: buildSynthesisPrompt(req.class, req.subject, req.chapterName, req.marks, count, req.questionType),
          userPrompt: `Reference material for this chapter:\n\n${contextText}`,
        }),
        batchSize,
        ctx,
      ),
    );

    const extracted = dedupeQuestions(batchResults.flatMap((r) => r.extracted)).slice(0, req.count);
    // The model is asked for exact marks/chapter/type, but normalize here too in case it drifts.
    return extracted.map((q) => ({
      ...q,
      marks: req.marks,
      chapterName: req.chapterName,
      questionType: req.questionType ?? q.questionType,
    }));
  },

  async enqueueExtractFromImage(
    cls: string, subject: string, imageDataUri: string, ctx: AuthContext, fileName?: string,
  ): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'image' });
    const jobId = job._id.toString();

    questionExtractionService.extractFromImage(cls, subject, imageDataUri, ctx, fileName)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background image extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
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
        extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
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
        extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
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

  // ── Layout-aware chapter capture (multi-page) ─────────────────────────────────
  // Reverted to plain transcription (see buildTranscribePrompt) instead of the structured
  // block-classification prompt: asking the model to classify every line into
  // heading/paragraph/list/table/equation/figure with confidence scores is a much bigger,
  // slower, pricier task per page than "transcribe this verbatim". The tradeoff: tables,
  // equations, and multi-column reading order are no longer reconstructed — every page comes
  // back as plain paragraphs, same as the original single-page upload flow. Kept the
  // ChapterPage/ContentBlock storage shape unchanged (wrapping the text as paragraph blocks)
  // so the multi-page batching, retry-per-page, and review UI didn't need to change.

  /** Single-page OCR call — the building block enqueueChapterCapture and retryPage both use. */
  async extractStructuredPage(
    imageDataUri: string, ctx: AuthContext,
  ): Promise<{ documentTitle?: string; language?: string; blocks: ContentBlock[] }> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildTranscribePrompt(),
      userPrompt: 'Transcribe everything readable on this page.',
      imageDataUri,
      temperature: 0.1,
      maxTokens: 2500,
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

    const pageText = parseTranscription(result.content);
    return { blocks: textToParagraphBlocks(pageText) };
  },

  /**
   * Enqueues a multi-page batch job (kind: 'chapter_capture'). Pages are processed with bounded
   * concurrency (3 at a time) so a 20-page chapter doesn't fire 20 simultaneous vision calls. One
   * page's failure never fails the whole job — it's recorded as a pageError on that page's slot so
   * the review screen can offer "Retry Page" / "Continue Without This Page" per Deliverable 22, and
   * the rest of the batch keeps going. Nothing is persisted to QuestionSource here — the teacher
   * reviews this job's result and calls the save endpoint explicitly.
   */
  async enqueueChapterCapture(
    images: { dataUri: string; fileName?: string }[], ctx: AuthContext,
  ): Promise<{ jobId: string }> {
    const totalPages = images.length;
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'chapter_capture', totalPages });
    const jobId = job._id.toString();
    // Deliberately omits pagesProcessed here — this event only marks that a job started,
    // it hasn't processed any pages yet. Each page records its own pagesProcessed:1 below
    // (see processOne) — recording totalPages here too used to double-count every job's
    // pages in the ops usage dashboard (a 6-page job would show as 12+).
    usageEventRepository.record({ userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'capture_started', status: 'success' });

    (async () => {
      const pages: ChapterPage[] = new Array(totalPages);
      let documentTitle: string | undefined;
      let language: string | undefined;
      let completed = 0;
      // Raised from 3 now that each page is a plain transcription call rather than structured
      // block classification — lighter output per call means more can safely run at once.
      const CONCURRENCY = 5;

      const processOne = async (index: number) => {
        const pageNumber = index + 1;
        try {
          const page = await questionExtractionService.extractStructuredPage(images[index].dataUri, ctx);
          if (!documentTitle && page.documentTitle) documentTitle = page.documentTitle;
          if (!language && page.language) language = page.language;
          const lowConfidenceBlocks = page.blocks.filter((b) => b.confidence === 'low').length;
          pages[index] = {
            pageNumber,
            blocks: page.blocks,
            confidence: page.blocks.length === 0 ? 'low' : lowConfidenceBlocks > page.blocks.length / 2 ? 'review' : undefined,
          };
          usageEventRepository.record({
            userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'page_processed',
            pagesProcessed: 1, wordsGenerated: pageWordCount(page.blocks), status: 'success',
          });
        } catch (err) {
          logger.error('[QuestionExtraction] Chapter capture page failed', { jobId, pageNumber, err });
          pages[index] = { pageNumber, blocks: [], pageError: err instanceof Error ? err.message : 'Could not read this page' };
          usageEventRepository.record({ userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'page_processed', pagesProcessed: 1, status: 'failed' });
        } finally {
          completed += 1;
          await extractionJobRepository.updateProgress(jobId, completed, { documentTitle, language, pages: pages.filter(Boolean), totalPages, completedPages: completed });
        }
      };

      // Simple bounded-concurrency batching — no new dependency needed for a fixed pool of 3.
      for (let i = 0; i < images.length; i += CONCURRENCY) {
        await Promise.all(images.slice(i, i + CONCURRENCY).map((_, offset) => processOne(i + offset)));
      }

      await extractionJobRepository.markCompleted(jobId, { documentTitle, language, pages, totalPages, completedPages: completed });
    })().catch((err) => {
      logger.error('[QuestionExtraction] Chapter capture batch failed', { jobId, err });
      extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Chapter capture failed').catch(() => {});
    });

    return { jobId };
  },

  /** Reprocesses a single page in-place on an already-completed/partial chapter-capture job result. */
  async retryPage(jobId: string, pageNumber: number, imageDataUri: string, ctx: AuthContext): Promise<ChapterCaptureJobResult> {
    const job = await extractionJobRepository.findById(jobId, ctx.schoolId);
    if (!job || job.userId !== ctx.userId || job.kind !== 'chapter_capture') {
      throw new ValidationError('Chapter capture job not found or expired');
    }
    const current = (job.result as ChapterCaptureJobResult) ?? { pages: [], totalPages: job.totalPages ?? 0, completedPages: job.completedPages ?? 0 };
    const page = await questionExtractionService.extractStructuredPage(imageDataUri, ctx);
    const updatedPages = current.pages.map((p) => (p.pageNumber === pageNumber ? { pageNumber, blocks: page.blocks } : p));
    if (!updatedPages.some((p) => p.pageNumber === pageNumber)) updatedPages.push({ pageNumber, blocks: page.blocks });
    updatedPages.sort((a, b) => a.pageNumber - b.pageNumber);

    const updated: ChapterCaptureJobResult = { ...current, pages: updatedPages };
    await extractionJobRepository.markCompleted(jobId, updated);
    usageEventRepository.record({ userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'page_processed', pagesProcessed: 1, wordsGenerated: pageWordCount(page.blocks), status: 'success' });
    return updated;
  },

  /** Finalizes a reviewed chapter-capture job (with the teacher's edits already applied to `pages`) into a permanent QuestionSource — the literal "Save Chapter" action. */
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

    usageEventRepository.record({
      userId: ctx.userId, schoolId: ctx.schoolId, feature: 'chapter-capture', action: 'chapter_saved',
      documentId: String(source._id), pagesProcessed: data.pages.length, wordsGenerated: extractedText.split(/\s+/).filter(Boolean).length, status: 'success',
    });

    return source;
  },
};
