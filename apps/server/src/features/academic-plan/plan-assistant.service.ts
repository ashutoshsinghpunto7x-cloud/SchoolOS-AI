import { z } from 'zod';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { AppError, ForbiddenError, NotFoundError } from '../../middlewares/errorHandler';
import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { recordUsage } from '../principal-assistant/intent-router';
import { chapterRepository } from '../question-bank/chapter.repository';
import { Teacher } from '../teachers/teacher.model';
import { User } from '../users/user.model';
import { academicYearService } from '../academic-year/academic-year.service';
import { AcademicPlan, IAcademicPlan } from './academic-plan.model';
import { academicPlanRepository } from './academic-plan.repository';
import { assertTeacherCanManagePlan } from './academic-plan.service';
import { buildEligibleDaysContext, nextEligibleDay } from './academic-plan.util';
import {
  applyPlanOperations, planOperationSchema, ApplyResult, ChapterRef, PlanChange, PlanOperation, MAX_OPERATIONS,
} from './plan-assistant.ops';
import { buildPlanEditPrompt, buildPlanSelectionPrompt } from './plan-assistant.prompts';

// ── Voice / chat editing of the Academic Plan ────────────────────────────────
// interpret() never writes. apply() re-validates the approved operations against
// the current plan and saves them in one atomic update.

const tzOffset = z.number().int().min(-840).max(840);

export const interpretSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  target: z.object({
    teacherId: z.string().optional(),
    class: z.string().optional(),
    section: z.string().optional(),
    subject: z.string().optional(),
  }).default({}),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).max(12).default([]),
  pendingOperations: z.array(planOperationSchema).max(MAX_OPERATIONS).optional(),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tzOffsetMinutes: tzOffset,
});

export const applySchema = z.object({
  planId: z.string().regex(/^[a-f\d]{24}$/i),
  planVersion: z.number().int().min(1),
  operations: z.array(planOperationSchema).min(1).max(MAX_OPERATIONS),
  tzOffsetMinutes: tzOffset,
});

type InterpretInput = z.infer<typeof interpretSchema>;

export type InterpretResult =
  | { type: 'not_plan' }
  | { type: 'clarify'; message: string; options: string[] }
  | { type: 'answer'; message: string }
  | {
      type: 'proposal'; message: string; planId: string; planVersion: number; planLabel: string;
      operations: PlanOperation[]; changes: PlanChange[];
    };

interface Candidate {
  plan: IAcademicPlan;
  teacherName: string;
}

const dateKeyFor = (tzOffsetMinutes: number) => (date: Date) =>
  new Date(date.getTime() - tzOffsetMinutes * 60_000).toISOString().slice(0, 10);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekdayOf = (key: string) => WEEKDAYS[new Date(`${key}T00:00:00Z`).getUTCDay()];

function classLabel(plan: IAcademicPlan): string {
  return `Class ${plan.class}${plan.section ? `-${plan.section}` : ''} ${plan.subject}`;
}

/** The plans this user may change: a teacher's own, or any in the school for the principal. */
async function listCandidates(target: InterpretInput['target'], ctx: AuthContext): Promise<Candidate[]> {
  const filter: Record<string, unknown> = { schoolId: ctx.schoolId };
  if (ctx.role === 'teacher') filter.teacherId = ctx.userId;
  else if (target.teacherId) filter.teacherId = target.teacherId;
  if (target.class) filter.class = target.class;
  if (target.section) filter.section = target.section;
  if (target.subject) filter.subject = target.subject;

  const plans = await AcademicPlan.find(filter).sort({ class: 1, section: 1, subject: 1, createdAt: -1 }).lean<IAcademicPlan[]>();

  // Newest plan per teacher + class + section + subject (older academic years are left alone).
  const latest = new Map<string, IAcademicPlan>();
  for (const p of plans) {
    const key = [p.teacherId, p.class, p.section ?? '', p.subject].join('|');
    if (!latest.has(key)) latest.set(key, p);
  }
  const list = [...latest.values()];

  const users = await User.find({ schoolId: ctx.schoolId, _id: { $in: [...new Set(list.map((p) => p.teacherId))] } })
    .select('email displayName')
    .lean() as unknown as { _id: unknown; email?: string; displayName?: string }[];
  const emails = users.map((u) => u.email).filter(Boolean);
  const teachers = await Teacher.find({ schoolId: ctx.schoolId, email: { $in: emails }, isDeleted: false })
    .select('email fullName')
    .lean() as unknown as { email?: string; fullName: string }[];

  const nameByEmail = new Map(teachers.map((t) => [t.email, t.fullName]));
  const nameById = new Map(users.map((u) => [String(u._id), nameByEmail.get(u.email) ?? u.displayName ?? 'Teacher']));
  return list.map((plan) => ({ plan, teacherName: nameById.get(plan.teacherId) ?? 'Teacher' }));
}

async function loadChapters(plan: IAcademicPlan, schoolId: string): Promise<ChapterRef[]> {
  const chapters = await chapterRepository.findAll(schoolId, plan.class, plan.subject);
  const refs: ChapterRef[] = chapters.map((c) => ({ id: String(c._id), name: c.chapterName }));
  // Chapters already in the plan stay selectable even if later removed from the syllabus.
  for (const d of plan.days) {
    if (d.chapterName && !refs.some((r) => r.name.toLowerCase() === d.chapterName!.toLowerCase())) {
      refs.push({ id: d.chapterId ?? '', name: d.chapterName });
    }
  }
  return refs;
}

function describePlan(
  candidate: Candidate, chapters: ChapterRef[], today: string, dateKeyOf: (d: Date) => string,
): string {
  const { plan, teacherName } = candidate;

  // Models are unreliable at date arithmetic, so every relative date is worked out here.
  const periodDates = new Set(plan.days.map((d) => dateKeyOf(new Date(d.date))));
  const dateAt = (offset: number) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const describeDate = (key: string) => `${key} ${weekdayOf(key)}${periodDates.has(key) ? '' : ' (no period)'}`;
  const calendar = Array.from({ length: 22 }, (_, i) => describeDate(dateAt(i - 7))).join('\n');
  const upcoming = Array.from({ length: 7 }, (_, i) => {
    const key = dateAt(i + 1);
    const name = new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    return `- ${name} / next ${name} => ${describeDate(key)}`;
  });
  const mondayOffset = -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7);
  const relative = [
    `- yesterday => ${describeDate(dateAt(-1))}`,
    `- today => ${describeDate(today)}`,
    `- tomorrow => ${describeDate(dateAt(1))}`,
    ...upcoming,
    `- this week => ${dateAt(mondayOffset)} to ${dateAt(mondayOffset + 6)}`,
    `- next week => ${dateAt(mondayOffset + 7)} to ${dateAt(mondayOffset + 13)}`,
  ].join('\n');

  const days = [...plan.days]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => {
      const key = dateKeyOf(new Date(d.date));
      const parts = [`${key} ${weekdayOf(key)}`, d.blockType, d.status];
      if (d.chapterName) parts.push(`chapter: ${d.chapterName}`);
      if (d.examName) parts.push(`exam: ${d.examName}`);
      if (d.topicTitle) parts.push(`topic: ${d.topicTitle}`);
      if (d.periodLabel) parts.push(`period: ${d.periodLabel}`);
      if (d.classWork) parts.push(`classWork: ${d.classWork}`);
      if (d.homeWork) parts.push(`homeWork: ${d.homeWork}`);
      if (d.teachingAid) parts.push(`teachingAid: ${d.teachingAid}`);
      if (d.remarks) parts.push(`remarks: ${d.remarks}`);
      return parts.join(' | ');
    })
    .join('\n');

  const monthly = (plan.monthlyRows ?? [])
    .map((r) => [r.monthKey, r.chapterName, r.teachingMethod && `teachingMethod: ${r.teachingMethod}`,
      r.teachingAid && `teachingAid: ${r.teachingAid}`, r.classWork && `classWork: ${r.classWork}`,
      r.homeWork && `homeWork: ${r.homeWork}`].filter(Boolean).join(' | '))
    .join('\n');

  return [
    `Plan: ${classLabel(plan)}, taught by ${teacherName}.`,
    `Today is ${today} (${weekdayOf(today)}).`,
    `Relative dates (use exactly these):\n${relative}`,
    `Calendar:\n${calendar}`,
    `Chapters:\n${chapters.map((c) => `- ${c.name}`).join('\n') || '(none)'}`,
    `Plan days (date | type | status | details):\n${days}`,
    `Monthly Planner rows:\n${monthly || '(empty)'}`,
  ].join('\n\n');
}

const modelReplySchema = z.object({
  action: z.string(),
  message: z.string().catch(''),
  options: z.array(z.string()).catch([]),
  plan: z.string().nullable().catch(null),
  operations: z.array(z.record(z.unknown())).catch([]),
});

async function askModel(systemPrompt: string, input: InterpretInput, schoolId: string, maxTokens: number) {
  const conversation = [
    ...input.history.map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`),
    `User: ${input.message}`,
  ].join('\n');

  let result;
  try {
    result = await openaiProvider.complete({
      systemPrompt, userPrompt: conversation, temperature: 0, maxTokens, jsonResponse: true,
    });
  } catch (err) {
    logger.error('[PlanAssistant] AI call failed', { schoolId, err: (err as Error).message });
    throw new AppError('The AI service is busy or unreachable right now. Please try again in a moment.', 503, 'AI_UNAVAILABLE');
  }
  recordUsage(result, schoolId);

  try {
    return modelReplySchema.parse(JSON.parse(result.content));
  } catch {
    return null; // cut off or malformed — the caller asks the user to narrow the request
  }
}

const isHindi = (s: string) => /[ऀ-ॿ]/.test(s);

function rephrase(message: string): InterpretResult {
  return {
    type: 'clarify',
    options: [],
    message: isHindi(message)
      ? 'मैं ठीक से समझ नहीं पाया। किस तारीख़ के पाठ में क्या बदलना है?'
      : "I didn't quite get that. Which date should I change, and what should it say?",
  };
}

async function carryForwardLookup(plan: IAcademicPlan, operations: PlanOperation[], ctx: AuthContext) {
  const needed = operations.some((o) => o.type === 'set_status' && (o.status === 'partial' || o.status === 'needs_extra_class'));
  if (!needed) return undefined;
  const year = await academicYearService.getOrSeedCurrent(ctx);
  const eligible = await buildEligibleDaysContext(ctx.schoolId, year, plan.class, plan.section, plan.subject, []);
  return (after: Date, taken: Date[]) =>
    nextEligibleDay(eligible, after, year.endDate, new Set(taken.map((d) => d.toISOString().slice(0, 10))));
}

async function run(
  plan: IAcademicPlan, operations: PlanOperation[], chapters: ChapterRef[], tzOffsetMinutes: number, ctx: AuthContext,
): Promise<ApplyResult> {
  return applyPlanOperations({
    days: plan.days,
    monthlyRows: plan.monthlyRows ?? [],
    operations,
    chapters,
    dateKeyOf: dateKeyFor(tzOffsetMinutes),
    nextOpenDate: await carryForwardLookup(plan, operations, ctx),
  });
}

export const planAssistantService = {
  async interpret(rawInput: unknown, ctx: AuthContext): Promise<InterpretResult> {
    const input = interpretSchema.parse(rawInput);
    if (!openaiProvider.isAvailable()) {
      throw new AppError('AI Assistant is not configured. Please contact your administrator.', 503, 'AI_UNAVAILABLE');
    }
    const role = ctx.role === 'teacher' ? 'teacher' : 'principal';

    const candidates = await listCandidates(input.target, ctx);
    let candidate = candidates.length === 1 ? candidates[0] : undefined;

    if (candidates.length === 0) {
      // Still let unrelated requests ("open attendance") through to the normal assistant:
      // classify against a stand-in for the plan that has not been generated.
      const { class: cls, section, subject } = input.target;
      const standIn = `P1 | this ${role === 'teacher' ? 'teacher' : 'school'} | `
        + `${cls ? `Class ${cls}${section ? `-${section}` : ''}` : 'any class'} | ${subject ?? 'any subject'}`;
      const reply = await askModel(buildPlanSelectionPrompt(role, standIn, input.message), input, ctx.schoolId, 200);
      if (!reply || reply.action === 'not_plan') return { type: 'not_plan' };
      return {
        type: 'answer',
        message: isHindi(input.message)
          ? 'इसके लिए अभी कोई प्लान नहीं बना है। पहले प्लान जनरेट कीजिए।'
          : 'There is no plan here yet. It needs to be generated before I can change it.',
      };
    }

    if (!candidate) {
      const list = candidates
        .map((c, i) => `P${i + 1} | ${c.teacherName} | Class ${c.plan.class}${c.plan.section ? `-${c.plan.section}` : ''} | ${c.plan.subject}`)
        .join('\n');
      const reply = await askModel(buildPlanSelectionPrompt(role, list, input.message), input, ctx.schoolId, 300);
      if (!reply) return rephrase(input.message);
      if (reply.action === 'not_plan') return { type: 'not_plan' };
      const picked = reply.action === 'select' ? /^P(\d+)$/.exec(reply.plan ?? '') : null;
      candidate = picked ? candidates[Number(picked[1]) - 1] : undefined;
      if (!candidate) {
        return {
          type: 'clarify',
          message: reply.message || 'Which class and subject should I change?',
          options: reply.options.slice(0, 4),
        };
      }
    }

    const { plan } = candidate;
    if (ctx.role === 'teacher') await assertTeacherCanManagePlan(ctx, plan.class, plan.subject);

    const chapters = await loadChapters(plan, ctx.schoolId);
    const context = describePlan(candidate, chapters, input.today, dateKeyFor(input.tzOffsetMinutes));
    const pending = input.pendingOperations?.length ? JSON.stringify(input.pendingOperations) : null;
    const reply = await askModel(buildPlanEditPrompt(role, context, pending, input.message), input, ctx.schoolId, 3000);

    if (!reply) return rephrase(input.message);
    if (reply.action === 'not_plan') return { type: 'not_plan' };
    if (reply.action === 'answer' && reply.message) return { type: 'answer', message: reply.message };
    if (reply.action !== 'propose') {
      return reply.message
        ? { type: 'clarify', message: reply.message, options: reply.options.slice(0, 4) }
        : rephrase(input.message);
    }

    // Models often send null for "leave as is" — drop those before validating.
    const parsed = z.array(planOperationSchema).min(1).max(MAX_OPERATIONS).safeParse(
      reply.operations.map((op) => Object.fromEntries(Object.entries(op).filter(([, v]) => v !== null))),
    );
    if (!parsed.success) return rephrase(input.message);

    const outcome = await run(plan, parsed.data, chapters, input.tzOffsetMinutes, ctx);
    if (outcome.errors.length) {
      return { type: 'clarify', message: [...new Set(outcome.errors)].slice(0, 3).join(' '), options: [] };
    }
    if (!outcome.changes.length) {
      return {
        type: 'answer',
        message: isHindi(input.message) ? 'प्लान में पहले से यही लिखा है।' : 'The plan already reads that way, so there is nothing to change.',
      };
    }

    return {
      type: 'proposal',
      message: reply.message || 'Here is what will change.',
      planId: String(plan._id),
      planVersion: plan.version,
      planLabel: role === 'principal' ? `${candidate.teacherName} · ${classLabel(plan)}` : classLabel(plan),
      operations: parsed.data,
      changes: outcome.changes,
    };
  },

  async apply(rawInput: unknown, ctx: AuthContext): Promise<{ changedCount: number }> {
    const input = applySchema.parse(rawInput);
    const plan = await academicPlanRepository.findById(input.planId, ctx.schoolId);
    if (!plan) throw new NotFoundError('Plan');
    if (ctx.role === 'teacher') {
      if (plan.teacherId !== ctx.userId) throw new ForbiddenError('You can only change your own plan');
      await assertTeacherCanManagePlan(ctx, plan.class, plan.subject);
    }

    const stale = () => new AppError(
      'The plan changed after I prepared this. Please ask me again.', 409, 'PLAN_CHANGED',
    );
    if (plan.version !== input.planVersion) throw stale();

    const outcome = await run(plan, input.operations, await loadChapters(plan, ctx.schoolId), input.tzOffsetMinutes, ctx);
    if (outcome.errors.length) throw new AppError(outcome.errors[0], 400, 'PLAN_OPERATION_INVALID');
    if (!outcome.changes.length) return { changedCount: 0 };

    const summary = [...new Set(outcome.changes.map((c) => `${c.label} (${c.date})`))].slice(0, 4).join(', ');
    const version = plan.version + 1;
    const saved = await AcademicPlan.findOneAndUpdate(
      { _id: input.planId, schoolId: ctx.schoolId, version: input.planVersion },
      {
        $set: { days: outcome.days, monthlyRows: outcome.monthlyRows, version },
        $push: {
          history: {
            version, changedBy: ctx.displayName, changedAt: new Date(),
            reason: `Assistant: ${summary}${outcome.changes.length > 4 ? ' and more' : ''}`,
          },
        },
      },
      { new: true },
    );
    if (!saved) throw stale();

    logger.info('[PlanAssistant] Changes applied', {
      schoolId: ctx.schoolId, userId: ctx.userId, planId: input.planId, changes: outcome.changes.length,
    });
    return { changedCount: outcome.changes.length };
  },
};
