import { randomUUID } from 'crypto';
import { AuthContext } from '../../lib/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { SchoolSettings } from '../school-settings/school-settings.model';
import { chapterRepository } from '../question-bank/chapter.repository';
import { timetableRepository } from '../timetable/timetable.repository';
import { plannerRepository } from './planner.repository';
import { computeTeachingWeeks, listWeekdays, distributeDueDates } from './planner-week.util';
import { ITeacherPlanner, IPlannerWeek, IPlannerTask } from './planner.model';
import { ConfirmPlannerInput, GeneratePlannerInput } from './planner.validation';
import type { PlannerDraftWeek, PlannerExtractionResult, SavedChapterOption, TeachingWeeksInfo } from '@schoolos/types';

// ── Teacher scope guard ────────────────────────────────────────────────────────
// Originally checked Teacher.subjects/assignedClasses, same shape as
// question-bank's (now-removed) assertTeacherCanManageQuestionBank. Those two
// fields are only kept up to date by the Teachers workspace UI — a teacher
// whose subjects are assigned purely via the Timetable (the normal path;
// PlannerHubPage itself lists class/subject options straight from the
// timetable-derived weekly schedule, not from these fields) has them empty,
// so this guard 403'd every planner request for them even though the Planner
// Hub screen had just shown that exact class/subject as theirs to pick. Now
// checks the same timetable source PlannerHubPage reads from.
async function assertTeacherCanManagePlanner(ctx: AuthContext, cls: string, subject: string): Promise<void> {
  if (ctx.role !== 'teacher') return;

  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot verify class/subject assignment');

  const teacher = await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('_id')
    .lean() as { _id: { toString(): string } } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');

  const timetables = await timetableRepository.getTeacherSchedule(ctx.schoolId, String(teacher._id));
  const teachesThis = timetables.some(
    (tt) => tt.class === cls && tt.entries.some((e) => e.teacherId === String(teacher._id) && e.subjectName === subject),
  );
  if (!teachesThis) {
    throw new ForbiddenError('You are not assigned to teach this subject/class');
  }
}

export async function getSchoolAcademicYear(schoolId: string): Promise<{ start: Date; end: Date }> {
  const settings = await SchoolSettings.findOne({ schoolId }).select('academicYearStart academicYearEnd').lean() as
    { academicYearStart?: Date; academicYearEnd?: Date } | null;
  if (!settings?.academicYearStart || !settings?.academicYearEnd) {
    throw new ValidationError('Academic year is not configured yet — ask your admin/principal to set it in School Settings.');
  }
  return { start: settings.academicYearStart, end: settings.academicYearEnd };
}

function todayIn(week: IPlannerWeek, today: Date): boolean {
  return today >= week.startDate && today <= week.endDate;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// ── Pure progress/pace math — shared by the teacher's own view and the
// principal's read-only view, so both compute percentages identically. ────────

function pct(list: IPlannerTask[]): number {
  return list.length === 0 ? 0 : Math.round((list.filter((t) => t.status === 'completed').length / list.length) * 100);
}

export function computeProgress(planner: ITeacherPlanner, today: Date = new Date()) {
  const allTasks = planner.weeks.flatMap((w) => w.tasks);

  const monthTasks = allTasks.filter((t) => t.dueDate.getMonth() === today.getMonth() && t.dueDate.getFullYear() === today.getFullYear());
  const currentWeek = planner.weeks.find((w) => todayIn(w, today));
  const weekTasks = currentWeek?.tasks ?? [];

  // Half-yearly split: the academic year cut in two at its midpoint date —
  // there's no separate term-date config to key off instead.
  const midpoint = new Date((planner.academicYearStart.getTime() + planner.academicYearEnd.getTime()) / 2);
  const inSecondHalf = today >= midpoint;
  const halfYearTasks = allTasks.filter((t) => (t.dueDate >= midpoint) === inSecondHalf);

  const todayTasks = planner.weeks.flatMap((w) => w.tasks.filter((t) => isSameDay(t.dueDate, today)).map((task) => ({ weekNumber: w.weekNumber, task })));

  return {
    yearPercent: pct(allTasks),
    monthPercent: pct(monthTasks),
    weekPercent: pct(weekTasks),
    halfYearPercent: pct(halfYearTasks),
    todayTasks,
    _completedCount: allTasks.filter((t) => t.status === 'completed').length,
    _totalCount: allTasks.length,
  };
}

export function computePace(planner: ITeacherPlanner, today: Date = new Date()) {
  const sortedWeeks = [...planner.weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  let expectedWeekNumber = 0;
  for (const w of sortedWeeks) {
    if (today >= w.startDate) expectedWeekNumber = w.weekNumber;
  }

  let actualWeekNumber = 0;
  for (const w of sortedWeeks) {
    const allDone = w.tasks.length === 0 || w.tasks.every((t) => t.status === 'completed');
    if (allDone) actualWeekNumber = w.weekNumber;
    else break;
  }

  const teachingDaysBehind = (expectedWeekNumber - actualWeekNumber) * 5;
  const suggestions: string[] = [];
  if (teachingDaysBehind <= 0) {
    suggestions.push(teachingDaysBehind < 0 ? "You're ahead of schedule — nice work." : "You're on track with your plan.");
  } else if (teachingDaysBehind <= 5) {
    suggestions.push('Complete one extra period this week to catch up.');
  } else if (teachingDaysBehind <= 15) {
    suggestions.push('Consider combining revision for two chapters.');
    suggestions.push('Add an extra period this week if possible.');
  } else {
    suggestions.push('You are significantly behind — consider skipping a revision activity or combining chapters to catch up.');
  }

  return { expectedWeekNumber, actualWeekNumber, teachingDaysBehind, suggestions };
}

export const plannerService = {
  async getAcademicYear(ctx: AuthContext) {
    return getSchoolAcademicYear(ctx.schoolId);
  },

  async getMine(rawQuery: unknown, ctx: AuthContext): Promise<ITeacherPlanner | null> {
    const query = rawQuery as { class: string; subject: string };
    await assertTeacherCanManagePlanner(ctx, query.class, query.subject);
    return plannerRepository.findOne(ctx.schoolId, ctx.userId, query.class, query.subject);
  },

  /** GET /teacher-planner/chapters — chapters the teacher has already saved
   *  in the Question Bank chapter bank, for this class/subject. */
  async listChapters(rawQuery: unknown, ctx: AuthContext): Promise<SavedChapterOption[]> {
    const query = rawQuery as { class: string; subject: string };
    await assertTeacherCanManagePlanner(ctx, query.class, query.subject);
    const chapters = await chapterRepository.findAll(ctx.schoolId, query.class, query.subject);
    return chapters.map((c) => ({ _id: String(c._id), chapterName: c.chapterName, topics: c.topics }));
  },

  /** GET /teacher-planner/teaching-weeks — powers the duration-allocation UI. */
  async getTeachingWeeksInfo(rawQuery: unknown, ctx: AuthContext): Promise<TeachingWeeksInfo> {
    const query = rawQuery as { class: string; subject: string };
    await assertTeacherCanManagePlanner(ctx, query.class, query.subject);
    const { start, end } = await getSchoolAcademicYear(ctx.schoolId);
    const teachingWeeks = await computeTeachingWeeks(ctx.schoolId, start, end);
    return {
      totalTeachingWeeks: teachingWeeks.length,
      academicYearStart: start.toISOString(),
      academicYearEnd: end.toISOString(),
    };
  },

  /** POST /teacher-planner/generate — deterministic (no AI) draft builder.
   *  Teacher picks saved chapters + a week-count each; this walks the
   *  school's teaching weeks in order, assigning each chapter its requested
   *  span, and drops one task per teaching day so daily tick-off works out
   *  of the box. Never persisted here — same review/confirm flow as before. */
  async generateDraft(input: GeneratePlannerInput, ctx: AuthContext): Promise<PlannerExtractionResult> {
    await assertTeacherCanManagePlanner(ctx, input.class, input.subject);
    const { start, end } = await getSchoolAcademicYear(ctx.schoolId);
    const teachingWeeks = await computeTeachingWeeks(ctx.schoolId, start, end);

    const chapters = await chapterRepository.findByIds(ctx.schoolId, input.chapterPlans.map((p) => p.chapterId));
    const chapterById = new Map(chapters.map((c) => [String(c._id), c]));

    const warnings: string[] = [];
    const weeks: PlannerDraftWeek[] = [];
    let cursor = input.startFromWeek ?? 0;

    for (const plan of input.chapterPlans) {
      const chapter = chapterById.get(plan.chapterId);
      if (!chapter) { warnings.push('One of the selected chapters could not be found — skipped.'); continue; }

      for (let i = 0; i < plan.weeks; i++) {
        if (cursor >= teachingWeeks.length) {
          warnings.push(`Not enough teaching weeks left for "${chapter.chapterName}" — ${plan.weeks - i} week(s) couldn't be scheduled.`);
          break;
        }
        const tw = teachingWeeks[cursor];
        cursor += 1;

        const tasks = listWeekdays(tw.startDate, tw.endDate).map(() => ({ title: chapter.chapterName, type: 'explain' as const }));
        weeks.push({ weekNumber: tw.weekNumber, chapterName: chapter.chapterName, topic: chapter.topics[0], tasks });
      }
    }

    if (cursor < teachingWeeks.length) {
      warnings.push(`${teachingWeeks.length - cursor} teaching week(s) remain unassigned — add more chapters or increase durations to fill the year.`);
    }

    return { sourceType: 'manual', totalTeachingWeeks: teachingWeeks.length, weeks, warnings };
  },

  /** Persists reviewed/edited draft weeks as the teacher's planner — used both
   *  for the first save and for later edits (upsert replaces weeks wholesale). */
  async confirmPlanner(data: ConfirmPlannerInput, ctx: AuthContext): Promise<ITeacherPlanner> {
    await assertTeacherCanManagePlanner(ctx, data.class, data.subject);
    const { start, end } = await getSchoolAcademicYear(ctx.schoolId);

    const teachingWeeks = await computeTeachingWeeks(ctx.schoolId, start, end);
    const weekByNumber = new Map(teachingWeeks.map((w) => [w.weekNumber, w]));

    const weeks: IPlannerWeek[] = [];
    for (const draftWeek of data.weeks) {
      const dateRange = weekByNumber.get(draftWeek.weekNumber);
      if (!dateRange) continue; // week number outside the current academic year's teaching weeks

      const chapter = await chapterRepository.findOrCreate(ctx.schoolId, data.class, data.subject, draftWeek.chapterName, draftWeek.topic);
      const dueDates = distributeDueDates(dateRange.startDate, dateRange.endDate, draftWeek.tasks.length);

      const tasks: IPlannerTask[] = draftWeek.tasks.map((t, i) => ({
        taskId: randomUUID(),
        title: t.title,
        type: t.type,
        dueDate: dueDates[i],
        status: 'pending',
      }));

      weeks.push({
        weekNumber: draftWeek.weekNumber,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        chapterId: String(chapter._id),
        chapterName: chapter.chapterName,
        topic: draftWeek.topic,
        tasks,
      });
    }

    if (weeks.length === 0) throw new ValidationError('None of the reviewed weeks matched a valid teaching week — try again.');

    return plannerRepository.upsert({
      schoolId: ctx.schoolId,
      teacherId: ctx.userId,
      class: data.class,
      subject: data.subject,
      academicYearStart: start,
      academicYearEnd: end,
      weeks,
    });
  },

  async toggleTask(plannerId: string, taskId: string, status: 'pending' | 'completed', ctx: AuthContext): Promise<ITeacherPlanner> {
    const existing = await plannerRepository.findById(plannerId, ctx.schoolId);
    if (!existing) throw new NotFoundError('Planner');
    await assertTeacherCanManagePlanner(ctx, existing.class, existing.subject);

    const updated = await plannerRepository.setTaskStatus(plannerId, ctx.schoolId, taskId, status);
    if (!updated) throw new NotFoundError('Task');
    return updated;
  },

  async getProgress(plannerId: string, ctx: AuthContext) {
    const planner = await plannerRepository.findById(plannerId, ctx.schoolId);
    if (!planner) throw new NotFoundError('Planner');
    await assertTeacherCanManagePlanner(ctx, planner.class, planner.subject);
    return computeProgress(planner);
  },

  async getPace(plannerId: string, ctx: AuthContext) {
    const planner = await plannerRepository.findById(plannerId, ctx.schoolId);
    if (!planner) throw new NotFoundError('Planner');
    await assertTeacherCanManagePlanner(ctx, planner.class, planner.subject);
    return computePace(planner);
  },

  // ── Principal (read-only, any teacher) ───────────────────────────────────

  /** GET /teacher-planner/principal/overview — every teacher's saved
   *  planners, with progress/pace. Teachers with none get a single
   *  `hasPlanner: false` marker row (class/subject blank) rather than a
   *  guessed list of class/subject combos — `Teacher.assignedClasses` stores
   *  section-qualified labels (e.g. "6A") while planners key on the
   *  timetable's bare-grade `class` field (e.g. "6"), so the two can't be
   *  matched up reliably; only real planners are trustworthy here. */
  async getPrincipalOverview(ctx: AuthContext) {
    const teachers = await Teacher.find({ schoolId: ctx.schoolId, isDeleted: false })
      .select('fullName email')
      .lean() as { _id: unknown; fullName: string; email?: string }[];

    const entries: {
      teacherId: string; teacherName: string; class: string; subject: string;
      plannerId: string | null; hasPlanner: boolean; yearPercent: number; teachingDaysBehind: number;
    }[] = [];

    for (const teacher of teachers) {
      // Planners are keyed by the User document's _id (the JWT's ctx.userId,
      // same field confirmPlanner writes), not the Teacher document's own
      // _id — the two collections link only by email (see
      // assertTeacherCanManagePlanner and the known Teacher/Employee mirror
      // gap), so that's what has to be resolved and used here.
      if (!teacher.email) continue;
      const user = await User.findOne({ schoolId: ctx.schoolId, email: teacher.email }).select('_id').lean() as { _id: unknown } | null;
      if (!user) continue;
      const teacherId = String(user._id);

      const planners = await plannerRepository.findAllByTeacher(ctx.schoolId, teacherId);

      if (planners.length === 0) {
        entries.push({
          teacherId, teacherName: teacher.fullName, class: '', subject: '',
          plannerId: null, hasPlanner: false, yearPercent: 0, teachingDaysBehind: 0,
        });
        continue;
      }

      for (const planner of planners) {
        entries.push({
          teacherId,
          teacherName: teacher.fullName,
          class: planner.class,
          subject: planner.subject,
          plannerId: String(planner._id),
          hasPlanner: true,
          yearPercent: computeProgress(planner).yearPercent,
          teachingDaysBehind: computePace(planner).teachingDaysBehind,
        });
      }
    }

    return entries;
  },

  /** GET /teacher-planner/principal/:teacherId?class=&subject= — read-only,
   *  no ownership assertion (route is already role-gated to principal/admin). */
  async getForTeacher(teacherId: string, rawQuery: unknown, ctx: AuthContext) {
    const query = rawQuery as { class: string; subject: string };
    const planner = await plannerRepository.findOne(ctx.schoolId, teacherId, query.class, query.subject);
    if (!planner) throw new NotFoundError('Planner');
    return { planner, progress: computeProgress(planner), pace: computePace(planner) };
  },
};
