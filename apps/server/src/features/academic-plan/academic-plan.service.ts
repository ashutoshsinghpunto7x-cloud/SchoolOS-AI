import { AuthContext } from '../../lib/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { chapterRepository } from '../question-bank/chapter.repository';
import { examRepository } from '../exams/exam.repository';
import { timetableRepository } from '../timetable/timetable.repository';
import { academicYearService } from '../academic-year/academic-year.service';
import { academicPlanRepository } from './academic-plan.repository';
import { planAlertRepository } from './plan-alert.repository';
import { runPlanAlertDetection } from './plan-alert.service';
import { IAcademicPlan, IAcademicPlanDay, AcademicPlanDayStatus } from './academic-plan.model';
import {
  buildEligibleDaysContext, listEligibleDays, nextEligibleDay, reserveExamBlocks,
  fillChaptersIntoDays, isoDate,
} from './academic-plan.util';
import { PlanTargetInput, GeneratePlanInput, SetDayStatusInput } from './academic-plan.validation';

// ── Teacher scope guard — same shape/reasoning as Teacher Planner v2's
// assertTeacherCanManagePlanner (Teacher and User link only by email; a
// teacher's real subject assignment lives in the Timetable, not
// Teacher.subjects, which only the Teachers workspace UI keeps current). ──

async function assertTeacherCanManagePlan(ctx: AuthContext, cls: string, subject: string): Promise<void> {
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
  if (!teachesThis) throw new ForbiddenError('You are not assigned to teach this subject/class');
}

function planDayStatusesFullyDone(status: AcademicPlanDayStatus): boolean {
  return status === 'completed';
}

export const academicPlanService = {
  /** POST /academic-plan/generate — the core engine. Deterministic, exam-aware,
   *  timetable-aware. Persists directly (versioned) rather than a separate
   *  draft/confirm step — see "The Planning Engine" §9, Phase 1 scope. */
  async generate(input: GeneratePlanInput, ctx: AuthContext): Promise<{ plan: IAcademicPlan; warnings: string[] }> {
    await assertTeacherCanManagePlan(ctx, input.class, input.subject);
    const academicYear = await academicYearService.getOrSeedCurrent(ctx);

    const warnings: string[] = [];
    const chapters = input.chapterIds?.length
      ? await chapterRepository.findByIds(ctx.schoolId, input.chapterIds)
      : await chapterRepository.findAll(ctx.schoolId, input.class, input.subject);

    if (chapters.length === 0) {
      throw new ValidationError('No chapters found for this class/subject — add chapters via Question Bank chapter capture first.');
    }

    const eligibleCtx = await buildEligibleDaysContext(ctx.schoolId, academicYear, input.class, input.section, input.subject, warnings);
    const allEligibleDays = listEligibleDays(eligibleCtx, academicYear.startDate, academicYear.endDate);
    if (allEligibleDays.length === 0) {
      throw new ValidationError('No teaching days found in the academic year for this class/subject — check the calendar and timetable setup.');
    }

    const exams = await examRepository.findAllScheduled(ctx.schoolId);
    const { revisionDates, assessmentDates } = reserveExamBlocks(allEligibleDays, exams, input.class, input.subject);

    const teachDays = allEligibleDays.filter((d) => {
      const key = isoDate(d);
      return !revisionDates.has(key) && !assessmentDates.has(key);
    });

    const { filled, warnings: fillWarnings } = fillChaptersIntoDays(teachDays, chapters);
    warnings.push(...fillWarnings);

    const filledByDate = new Map(filled.map((f) => [isoDate(f.date), f]));
    const days: IAcademicPlanDay[] = allEligibleDays.map((date) => {
      const key = isoDate(date);
      const assessment = assessmentDates.get(key);
      if (assessment) {
        return { date, blockType: 'assessment', examId: assessment.examId, examName: assessment.examName, status: 'pending' };
      }
      const revision = revisionDates.get(key);
      if (revision) {
        return { date, blockType: 'revision', examId: revision.examId, examName: revision.examName, status: 'pending' };
      }
      const teach = filledByDate.get(key);
      if (teach) {
        return {
          date, blockType: 'teach', chapterId: teach.chapterId, chapterName: teach.chapterName,
          topicTitle: teach.topicTitle, status: 'pending',
        };
      }
      return { date, blockType: 'buffer', status: 'pending' };
    });

    const plan = await academicPlanRepository.upsert({
      schoolId: ctx.schoolId,
      academicYearId: String(academicYear._id),
      teacherId: ctx.userId,
      class: input.class,
      section: input.section,
      subject: input.subject,
      days,
      historyEntry: { version: 0, changedBy: ctx.displayName, changedAt: new Date(), reason: 'Generated by Academic Planning Engine' },
    });

    return { plan, warnings };
  },

  async getMine(query: PlanTargetInput, ctx: AuthContext): Promise<IAcademicPlan | null> {
    await assertTeacherCanManagePlan(ctx, query.class, query.subject);
    return academicPlanRepository.findOne(ctx.schoolId, ctx.userId, query.class, query.section, query.subject);
  },

  /** Marks one day's status. Unfinished work (`partial` / `needs_extra_class`)
   *  is automatically re-queued into the next open teaching day for the same
   *  chapter — FR-08's carry-forward rule — by appending a new plan day
   *  rather than shuffling everything downstream, so already-confirmed days
   *  are never silently moved (Phase 1 default from the design doc's Open
   *  Decisions: only future, unconfirmed days ever change). */
  async setDayStatus(planId: string, data: SetDayStatusInput, ctx: AuthContext): Promise<IAcademicPlan> {
    const existing = await academicPlanRepository.findById(planId, ctx.schoolId);
    if (!existing) throw new NotFoundError('Plan');
    await assertTeacherCanManagePlan(ctx, existing.class, existing.subject);

    const dateKey = isoDate(data.date);
    const day = existing.days.find((d) => isoDate(new Date(d.date)) === dateKey);
    if (!day) throw new NotFoundError('Plan day');

    const updated = await academicPlanRepository.setDayStatus(
      planId, ctx.schoolId, dateKey, { status: data.status, note: data.note },
      { version: 0, changedBy: ctx.displayName, changedAt: new Date(), reason: `Marked ${dateKey} as ${data.status}` },
    );
    if (!updated) throw new NotFoundError('Plan');

    const needsCarryForward = day.blockType === 'teach' && !planDayStatusesFullyDone(data.status) &&
      (data.status === 'partial' || data.status === 'needs_extra_class');
    if (!needsCarryForward) return updated;

    const academicYear = await academicYearService.getOrSeedCurrent(ctx);
    const warnings: string[] = [];
    const eligibleCtx = await buildEligibleDaysContext(ctx.schoolId, academicYear, existing.class, existing.section, existing.subject, warnings);
    const existingDates = new Set(updated.days.map((d) => isoDate(new Date(d.date))));
    const nextDay = nextEligibleDay(eligibleCtx, data.date, academicYear.endDate, existingDates);
    if (!nextDay) return updated; // no room left in the year — coordinator/principal alert territory (Phase 3)

    const carried = await academicPlanRepository.appendDay(planId, ctx.schoolId, {
      date: nextDay,
      blockType: 'teach',
      chapterId: day.chapterId,
      chapterName: day.chapterName,
      topicTitle: day.topicTitle,
      status: 'pending',
      carriedFromDate: data.date,
    });
    return carried ?? updated;
  },

  // ── Principal (read-only, any teacher) — same shape as Teacher Planner v2's
  // principal overview, including the email-join caveat. ────────────────────

  async getPrincipalOverview(ctx: AuthContext) {
    const teachers = await Teacher.find({ schoolId: ctx.schoolId, isDeleted: false })
      .select('fullName email')
      .lean() as { _id: unknown; fullName: string; email?: string }[];

    const entries: {
      teacherId: string; teacherName: string; class: string; section?: string; subject: string;
      planId: string | null; hasPlan: boolean; completedDays: number; totalDays: number;
    }[] = [];

    for (const teacher of teachers) {
      if (!teacher.email) continue;
      const user = await User.findOne({ schoolId: ctx.schoolId, email: teacher.email }).select('_id').lean() as { _id: unknown } | null;
      if (!user) continue;
      const teacherId = String(user._id);

      const plans = await academicPlanRepository.findAllByTeacher(ctx.schoolId, teacherId);
      if (plans.length === 0) {
        entries.push({ teacherId, teacherName: teacher.fullName, class: '', subject: '', planId: null, hasPlan: false, completedDays: 0, totalDays: 0 });
        continue;
      }

      for (const plan of plans) {
        const teachDays = plan.days.filter((d) => d.blockType === 'teach');
        entries.push({
          teacherId, teacherName: teacher.fullName, class: plan.class, section: plan.section, subject: plan.subject,
          planId: String(plan._id), hasPlan: true,
          completedDays: teachDays.filter((d) => d.status === 'completed').length,
          totalDays: teachDays.length,
        });
      }
    }
    return entries;
  },

  async getForTeacher(teacherId: string, query: PlanTargetInput, ctx: AuthContext): Promise<IAcademicPlan> {
    const plan = await academicPlanRepository.findOne(ctx.schoolId, teacherId, query.class, query.section, query.subject);
    if (!plan) throw new NotFoundError('Plan');
    return plan;
  },

  // ── Chapter sizing (coordinator setup input the engine consumes) ─────────

  async updateChapterSizing(
    chapterId: string,
    data: { estimatedPeriods?: number; difficulty?: string; priority?: string; revisionWeight?: number },
    ctx: AuthContext,
  ) {
    const updated = await chapterRepository.updateSizing(chapterId, ctx.schoolId, data);
    if (!updated) throw new NotFoundError('Chapter');
    return updated;
  },

  // ── Plan Alerts (automation) ──────────────────────────────────────────────

  /** GET /academic-plan/alerts — every open risk alert for this school,
   *  most severe and most recent first. */
  async listAlerts(ctx: AuthContext) {
    const alerts = await planAlertRepository.findOpen(ctx.schoolId);
    const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return [...alerts].sort((a, b) => {
      const bySeverity = severityRank[a.severity] - severityRank[b.severity];
      if (bySeverity !== 0) return bySeverity;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });
  },

  async resolveAlert(alertId: string, ctx: AuthContext) {
    const resolved = await planAlertRepository.resolveById(alertId, ctx.schoolId);
    if (!resolved) throw new NotFoundError('Alert');
    return resolved;
  },

  /** POST /academic-plan/alerts/run — manual trigger for verification,
   *  admin-only (route-gated). The nightly job calls runPlanAlertDetection
   *  directly; this just exposes the same function over HTTP. */
  async runAlertDetection() {
    return runPlanAlertDetection();
  },
};
