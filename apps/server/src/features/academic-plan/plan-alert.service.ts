import { Teacher } from '../teachers/teacher.model';
import { User } from '../users/user.model';
import { SchoolSettings } from '../school-settings/school-settings.model';
import { academicPlanRepository } from './academic-plan.repository';
import { academicYearRepository } from '../academic-year/academic-year.repository';
import { planAlertRepository, UpsertPlanAlertData } from './plan-alert.repository';
import { IAcademicPlan, IAcademicPlanDay } from './academic-plan.model';
import { isoDate } from './academic-plan.util';

// ── Thresholds ────────────────────────────────────────────────────────────────
// Kept as named constants (not buried in the logic below) so a school's real
// experience can tune them later without re-reading the detection algorithm.

const BEHIND_DAYS_WARNING = 3;
const BEHIND_DAYS_CRITICAL = 7;
const BEHIND_RATIO_CRITICAL = 0.35;
const REVISION_RISK_LOOKAHEAD_DAYS = 7;
const NO_PLAN_GRACE_DAYS = 5; // don't flag "no plan" in the first few days of a fresh academic year

function teachDaysUpTo(days: IAcademicPlanDay[], todayKey: string): IAcademicPlanDay[] {
  return days.filter((d) => d.blockType === 'teach' && isoDate(new Date(d.date)) <= todayKey);
}

/** Behind-schedule detector — compares teaching periods that should already
 *  be done (date <= today) against how many are actually marked completed.
 *  Exported (like academic-plan.util.ts's pure functions) so it's directly
 *  unit-testable without a database. */
export function detectBehindSchedule(plan: IAcademicPlan, todayKey: string): { daysBehind: number; severity: 'warning' | 'critical' } | null {
  const due = teachDaysUpTo(plan.days, todayKey);
  if (due.length === 0) return null;

  const completed = due.filter((d) => d.status === 'completed').length;
  const daysBehind = due.length - completed;
  if (daysBehind < BEHIND_DAYS_WARNING) return null;

  const ratio = daysBehind / due.length;
  const severity = daysBehind >= BEHIND_DAYS_CRITICAL || ratio >= BEHIND_RATIO_CRITICAL ? 'critical' : 'warning';
  return { daysBehind, severity };
}

/** Revision-at-risk detector — a revision/assessment block starting soon
 *  with unfinished teaching work still due before it is the "revision
 *  buffer eaten" scenario from the design doc's workflow §5C. */
export function detectRevisionAtRisk(plan: IAcademicPlan, today: Date, todayKey: string): { examName: string; daysUntil: number } | null {
  const lookaheadEnd = new Date(today);
  lookaheadEnd.setDate(lookaheadEnd.getDate() + REVISION_RISK_LOOKAHEAD_DAYS);

  const upcomingRevision = plan.days
    .filter((d) => d.blockType === 'revision' && new Date(d.date) >= today && new Date(d.date) <= lookaheadEnd)
    .sort((a, b) => a.date.toString().localeCompare(b.date.toString()))[0];
  if (!upcomingRevision) return null;

  const unfinishedBeforeIt = plan.days.some(
    (d) => d.blockType === 'teach' && isoDate(new Date(d.date)) <= todayKey && d.status !== 'completed',
  );
  if (!unfinishedBeforeIt) return null;

  const daysUntil = Math.round((new Date(upcomingRevision.date).getTime() - today.getTime()) / 86_400_000);
  return { examName: upcomingRevision.examName ?? 'an upcoming exam', daysUntil };
}

/** teacherId (User._id) → display name, for every teacher in the school —
 *  same email-join Teacher↔User pattern used throughout this feature.
 *  Resolved once per school per run rather than per-alert. */
async function buildTeacherNameMap(schoolId: string): Promise<Map<string, string>> {
  const teachers = await Teacher.find({ schoolId, isDeleted: false }).select('fullName email').lean() as
    { fullName: string; email?: string }[];
  const emails = teachers.filter((t) => t.email).map((t) => t.email as string);
  if (emails.length === 0) return new Map();

  const users = await User.find({ schoolId, email: { $in: emails } }).select('_id email').lean() as
    { _id: unknown; email: string }[];
  const nameByEmail = new Map(teachers.filter((t) => t.email).map((t) => [t.email as string, t.fullName]));

  const map = new Map<string, string>();
  for (const user of users) {
    const name = nameByEmail.get(user.email);
    if (name) map.set(String(user._id), name);
  }
  return map;
}

async function detectNoPlan(teacherNames: Map<string, string>, teacherIdsWithPlans: Set<string>): Promise<{ teacherId: string; teacherName: string }[]> {
  const missing: { teacherId: string; teacherName: string }[] = [];
  for (const [teacherId, teacherName] of teacherNames) {
    if (!teacherIdsWithPlans.has(teacherId)) missing.push({ teacherId, teacherName });
  }
  return missing;
}

async function notifyStaff(schoolId: string, criticalCount: number, newCount: number): Promise<void> {
  if (criticalCount === 0 && newCount === 0) return;

  const recipients = await User.find({
    schoolId,
    role: { $in: ['principal', 'incharge', 'academic_coordinator'] },
    status: 'active',
  }).select('_id').lean() as { _id: unknown }[];
  if (recipients.length === 0) return;

  const { notificationService } = await import('../notifications/notification.service');
  const title = criticalCount > 0
    ? `${criticalCount} critical academic plan alert${criticalCount > 1 ? 's' : ''}`
    : `${newCount} new academic plan alert${newCount > 1 ? 's' : ''}`;
  const body = 'Open Academic Plan on the Principal or Coordinator dashboard to review.';

  await Promise.all(recipients.map((r) => notificationService.sendToUser(
    { recipientUserId: String(r._id), type: 'plan_alert', title, body, priority: criticalCount > 0 ? 'high' : 'normal' },
    { userId: 'system', schoolId, displayName: 'SchoolOS AI Planner', role: 'system' },
  )));
}

async function runForSchool(schoolId: string, plans: IAcademicPlan[], now: Date, todayKey: string): Promise<{ open: number; created: number }> {
  const [alreadyOpen, teacherNames, teacherIdsWithPlans, academicYear] = await Promise.all([
    planAlertRepository.findOpen(schoolId),
    buildTeacherNameMap(schoolId),
    academicPlanRepository.findTeacherIdsWithPlans(schoolId),
    academicYearRepository.findActive(schoolId),
  ]);
  const openKeyOf = (a: { planId?: string; teacherId: string; type: string }) => `${a.planId ?? a.teacherId}|${a.type}`;
  const alreadyOpenKeys = new Set(alreadyOpen.map(openKeyOf));

  const keepOpenIds: string[] = [];
  let criticalCount = 0;
  let createdCount = 0;

  async function open(data: UpsertPlanAlertData, severity: 'info' | 'warning' | 'critical'): Promise<void> {
    const alert = await planAlertRepository.upsertOpen(data);
    keepOpenIds.push(String(alert._id));
    if (severity === 'critical') criticalCount += 1;
    if (!alreadyOpenKeys.has(openKeyOf(data))) createdCount += 1;
  }

  for (const plan of plans) {
    const planId = String(plan._id);
    const teacherName = teacherNames.get(plan.teacherId) ?? 'Unknown teacher';

    const behind = detectBehindSchedule(plan, todayKey);
    if (behind) {
      await open({
        schoolId, planId, teacherId: plan.teacherId, teacherName,
        class: plan.class, section: plan.section, subject: plan.subject,
        type: 'behind_schedule', severity: behind.severity, daysBehind: behind.daysBehind,
        message: `${plan.class}${plan.section ? `-${plan.section}` : ''} ${plan.subject} is ${behind.daysBehind} teaching period(s) behind schedule.`,
      }, behind.severity);
    }

    const risk = detectRevisionAtRisk(plan, now, todayKey);
    if (risk) {
      await open({
        schoolId, planId, teacherId: plan.teacherId, teacherName,
        class: plan.class, section: plan.section, subject: plan.subject,
        type: 'revision_at_risk', severity: 'critical',
        message: `Revision for ${risk.examName} starts in ${risk.daysUntil} day(s) with teaching work for ${plan.class}${plan.section ? `-${plan.section}` : ''} ${plan.subject} still unfinished.`,
      }, 'critical');
    }
  }

  // "No plan" only makes sense to flag once the academic year has had a few
  // days to actually run — otherwise every school flags every teacher on day one.
  const yearIsFresh = academicYear && (now.getTime() - new Date(academicYear.startDate).getTime()) / 86_400_000 < NO_PLAN_GRACE_DAYS;
  if (academicYear && !yearIsFresh) {
    const missing = await detectNoPlan(teacherNames, teacherIdsWithPlans);
    for (const m of missing) {
      await open({
        schoolId, teacherId: m.teacherId, teacherName: m.teacherName,
        type: 'no_plan', severity: 'warning',
        message: `${m.teacherName} has no Academic Plan generated yet.`,
      }, 'warning');
    }
  }

  await planAlertRepository.resolveStale(schoolId, keepOpenIds);
  await notifyStaff(schoolId, criticalCount, createdCount).catch(() => {}); // best-effort — a notification failure shouldn't fail detection

  return { open: keepOpenIds.length, created: createdCount };
}

/** Runs the full detection pass across every school in one go — same
 *  "no per-school loop at the DB-query level" trade-off as
 *  runPlannerReminders. Exported standalone so it can be triggered manually
 *  for verification without waiting for the nightly schedule. */
export async function runPlanAlertDetection(): Promise<{ schoolsProcessed: number; alertsOpen: number; alertsNew: number }> {
  const now = new Date();
  const todayKey = isoDate(now);

  const [allPlans, schools] = await Promise.all([
    academicPlanRepository.findAll(),
    SchoolSettings.find({ isTestTenant: false }).select('schoolId').lean() as unknown as { schoolId: string }[],
  ]);

  const plansBySchool = new Map<string, IAcademicPlan[]>();
  for (const plan of allPlans) {
    const list = plansBySchool.get(plan.schoolId) ?? [];
    list.push(plan);
    plansBySchool.set(plan.schoolId, list);
  }

  let alertsOpen = 0;
  let alertsNew = 0;
  for (const school of schools) {
    const result = await runForSchool(school.schoolId, plansBySchool.get(school.schoolId) ?? [], now, todayKey);
    alertsOpen += result.open;
    alertsNew += result.created;
  }

  return { schoolsProcessed: schools.length, alertsOpen, alertsNew };
}
