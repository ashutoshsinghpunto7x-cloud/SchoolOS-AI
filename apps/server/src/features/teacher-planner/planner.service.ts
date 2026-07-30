import { randomUUID } from 'crypto';
import { AuthContext } from '../../lib/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { SchoolSettings } from '../school-settings/school-settings.model';
import { chapterRepository } from '../question-bank/chapter.repository';
import { plannerRepository } from './planner.repository';
import { computeTeachingWeeks, distributeDueDates } from './planner-week.util';
import { ITeacherPlanner, IPlannerWeek, IPlannerTask } from './planner.model';
import { ConfirmPlannerInput } from './planner.validation';

// ── Teacher scope guard ────────────────────────────────────────────────────────
// Same shape as question-bank's assertTeacherCanManageQuestionBank — kept as
// its own copy rather than a shared import across unrelated features, same
// precedent as that guard's own relationship to marks' assertTeacherCanEnterMarks.
async function assertTeacherCanManagePlanner(ctx: AuthContext, cls: string, subject: string): Promise<void> {
  if (ctx.role !== 'teacher') return;

  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot verify class/subject assignment');

  const teacher = await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('subjects assignedClasses')
    .lean() as { subjects: string[]; assignedClasses: string[] } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');

  const teachesSubject = teacher.subjects.includes(subject);
  const teachesClass = teacher.assignedClasses.some((c) => c === cls || c.startsWith(cls));
  if (!teachesSubject || !teachesClass) {
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

export const plannerService = {
  async getAcademicYear(ctx: AuthContext) {
    return getSchoolAcademicYear(ctx.schoolId);
  },

  async getMine(rawQuery: unknown, ctx: AuthContext): Promise<ITeacherPlanner | null> {
    const query = rawQuery as { class: string; subject: string };
    await assertTeacherCanManagePlanner(ctx, query.class, query.subject);
    return plannerRepository.findOne(ctx.schoolId, ctx.userId, query.class, query.subject);
  },

  /** Persists reviewed/edited AI-extracted draft weeks — never called automatically, only on explicit teacher confirmation. */
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

    const today = new Date();
    const allTasks = planner.weeks.flatMap((w) => w.tasks);
    const completed = allTasks.filter((t) => t.status === 'completed');

    const monthTasks = allTasks.filter((t) => t.dueDate.getMonth() === today.getMonth() && t.dueDate.getFullYear() === today.getFullYear());
    const currentWeek = planner.weeks.find((w) => todayIn(w, today));
    const weekTasks = currentWeek?.tasks ?? [];

    const pct = (list: IPlannerTask[]): number => (list.length === 0 ? 0 : Math.round((list.filter((t) => t.status === 'completed').length / list.length) * 100));

    const todayTasks = planner.weeks.flatMap((w) => w.tasks.filter((t) => isSameDay(t.dueDate, today)).map((task) => ({ weekNumber: w.weekNumber, task })));

    return {
      yearPercent: pct(allTasks),
      monthPercent: pct(monthTasks),
      weekPercent: pct(weekTasks),
      todayTasks,
      _completedCount: completed.length,
      _totalCount: allTasks.length,
    };
  },

  async getPace(plannerId: string, ctx: AuthContext) {
    const planner = await plannerRepository.findById(plannerId, ctx.schoolId);
    if (!planner) throw new NotFoundError('Planner');
    await assertTeacherCanManagePlanner(ctx, planner.class, planner.subject);

    const today = new Date();
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
  },
};
