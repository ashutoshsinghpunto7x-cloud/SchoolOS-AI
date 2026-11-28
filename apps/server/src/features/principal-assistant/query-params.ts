import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { recordUsage } from './intent-router';
import { attendanceRepository } from '../attendance/attendance.repository';
import { AuthContext } from '../../lib/auth-context';

// ── One shared parameter extractor for every name/class/date-aware question ──
// Principals ask in English, Hindi and Hinglish ("5th B ke top 5 bachche",
// "Mrs Sharma kal free hai?"), so a regex can't reliably pull the filters out.
// One small JSON call fills this shape; every field is null when not stated.

export interface QueryParams {
  studentName: string | null;
  teacherName: string | null;
  className: string | null;
  section: string | null;
  subject: string | null;
  exam: string | null;
  secondExam: string | null;
  period: number | null;
  date: string | null; // YYYY-MM-DD, resolved from today/tomorrow/etc.
  limit: number | null;
  order: 'top' | 'bottom' | null;
  threshold: number | null;
}

const EMPTY: QueryParams = {
  studentName: null, teacherName: null, className: null, section: null, subject: null, exam: null,
  secondExam: null, period: null, date: null, limit: null, order: null, threshold: null,
};

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// The service extracts filters once to update conversation state and the data
// fetchers extract them again for the same text — memoise per school+message
// for a minute so that is one model call, not two.
const PARAM_CACHE_TTL_MS = 60_000;
const paramCache = new Map<string, { at: number; value: QueryParams }>();

export async function extractQueryParams(message: string, ctx: AuthContext): Promise<QueryParams> {
  const key = `${ctx.schoolId}|${message}`;
  const hit = paramCache.get(key);
  if (hit && Date.now() - hit.at < PARAM_CACHE_TTL_MS) return { ...hit.value };
  const value = await extractQueryParamsUncached(message, ctx);
  if (paramCache.size > 300) paramCache.clear();
  paramCache.set(key, { at: Date.now(), value });
  return { ...value };
}

async function extractQueryParamsUncached(message: string, ctx: AuthContext): Promise<QueryParams> {
  const today = attendanceRepository.todayString();
  const result = await openaiProvider.complete({
    systemPrompt: `
Extract search filters from a school Principal's question. The text may be English, Hindi or Hinglish.
Today is ${today}. Respond ONLY with JSON with exactly these fields, using null for anything not stated:
{"studentName": string|null, "teacherName": string|null, "className": string|null, "section": string|null,
 "subject": string|null, "exam": string|null, "secondExam": string|null, "period": number|null,
 "date": string|null, "limit": number|null, "order": "top"|"bottom"|null, "threshold": number|null}
Rules:
- studentName / teacherName: the person's name only, no titles like "Mrs", "sir", "madam", "student", "beta".
  Always write names in English/Latin letters, transliterating Hindi (Devanagari) names ("आशुतोष सिंह" → "Ashutosh Singh").
- className: the grade alone, e.g. "5", "10", "LKG" (never "class 5"). section: a single letter like "B".
- subject: English subject name (Hindi, Maths, Science, English, SST...). exam: exam name like "Half Yearly" or "Unit Test 1".
  secondExam: only when two exams are being compared.
- period: the period number (1-based) if one is named. date: YYYY-MM-DD ("today", "kal"=tomorrow, "parso"=day after, "yesterday").
- limit: how many results are asked for ("top 5" → 5). order: "top" for best/highest/toppers, "bottom" for weakest/lowest/worst.
- threshold: a percentage cut-off if stated (e.g. "below 75%" → 75).`.trim(),
    userPrompt: message,
    temperature: 0,
    maxTokens: 200,
    jsonResponse: true,
  });
  recordUsage(result, ctx.schoolId);

  try {
    const p = JSON.parse(result.content) as Record<string, unknown>;
    const order = p.order === 'top' || p.order === 'bottom' ? p.order : null;
    const date = str(p.date);
    return {
      ...EMPTY,
      studentName: str(p.studentName),
      teacherName: str(p.teacherName),
      className: str(p.className)?.replace(/^class\s*/i, '') ?? null,
      section: str(p.section)?.toUpperCase().slice(0, 1) ?? null,
      subject: str(p.subject),
      exam: str(p.exam),
      secondExam: str(p.secondExam),
      period: num(p.period),
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      limit: num(p.limit),
      order,
      threshold: num(p.threshold),
    };
  } catch {
    return { ...EMPTY };
  }
}

export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 1 = Monday … 6 = Saturday (the Timetable convention); 0 = Sunday, i.e. no school. */
export function dayOfWeekFor(dateISO: string): number {
  return new Date(`${dateISO}T12:00:00`).getDay();
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T12:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const clampLimit = (n: number | null, fallback: number, max = 50): number =>
  Math.max(1, Math.min(max, Math.round(n ?? fallback)));
