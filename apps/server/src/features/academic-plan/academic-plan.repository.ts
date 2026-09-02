import { AcademicPlan, IAcademicPlan, IAcademicPlanDay, IAcademicPlanHistoryEntry } from './academic-plan.model';

export interface UpsertPlanData {
  schoolId: string;
  academicYearId: string;
  teacherId: string;
  class: string;
  section?: string;
  subject: string;
  days: IAcademicPlanDay[];
  historyEntry: IAcademicPlanHistoryEntry;
}

export const academicPlanRepository = {
  /** Regenerating bumps `version` and appends to `history` instead of a bare
   *  overwrite — see IAcademicPlan's versioning note. */
  async upsert(data: UpsertPlanData): Promise<IAcademicPlan> {
    const existing = await AcademicPlan.findOne({
      schoolId: data.schoolId,
      teacherId: data.teacherId,
      class: data.class,
      section: data.section,
      subject: data.subject,
      academicYearId: data.academicYearId,
    });

    const nextVersion = (existing?.version ?? 0) + 1;
    const historyEntry = { ...data.historyEntry, version: nextVersion };

    return AcademicPlan.findOneAndUpdate(
      {
        schoolId: data.schoolId,
        teacherId: data.teacherId,
        class: data.class,
        section: data.section,
        subject: data.subject,
        academicYearId: data.academicYearId,
      },
      {
        $set: { days: data.days, version: nextVersion, generatedFrom: 'engine' },
        $push: { history: historyEntry },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  },

  async findById(id: string, schoolId: string): Promise<IAcademicPlan | null> {
    return AcademicPlan.findOne({ _id: id, schoolId }).lean<IAcademicPlan>();
  },

  async findOne(schoolId: string, teacherId: string, cls: string, section: string | undefined, subject: string): Promise<IAcademicPlan | null> {
    return AcademicPlan.findOne({ schoolId, teacherId, class: cls, section, subject })
      .sort({ createdAt: -1 })
      .lean<IAcademicPlan>();
  },

  async findAllByTeacher(schoolId: string, teacherId: string): Promise<IAcademicPlan[]> {
    return AcademicPlan.find({ schoolId, teacherId }).sort({ class: 1, subject: 1 }).lean<IAcademicPlan[]>();
  },

  /** Every plan across every school — feeds the nightly PlanAlert detection
   *  job (plan-alert.job.ts), which groups results by schoolId itself. Same
   *  "no pagination, whole collection" trade-off Teacher Planner v2's
   *  reminder job makes at plannerRepository.findAllActive. */
  async findAll(): Promise<IAcademicPlan[]> {
    return AcademicPlan.find({}).lean<IAcademicPlan[]>();
  },

  /** Distinct teachers who have at least one plan in this school — used by
   *  the 'no_plan' detector to skip teachers who already have something. */
  async findTeacherIdsWithPlans(schoolId: string): Promise<Set<string>> {
    const ids = await AcademicPlan.distinct('teacherId', { schoolId });
    return new Set(ids as string[]);
  },

  async setDayStatus(
    id: string,
    schoolId: string,
    dateKey: string,
    update: Partial<IAcademicPlanDay>,
    historyEntry: IAcademicPlanHistoryEntry,
  ): Promise<IAcademicPlan | null> {
    const plan = await AcademicPlan.findOne({ _id: id, schoolId });
    if (!plan) return null;

    const day = plan.days.find((d) => d.date.toISOString().slice(0, 10) === dateKey);
    if (!day) return null;
    Object.assign(day, update);

    plan.version += 1;
    plan.history.push({ ...historyEntry, version: plan.version });
    await plan.save();
    return plan.toObject();
  },

  /** Appends a carried-forward day (from unfinished work) without touching
   *  any existing day — used by the carry-forward flow in
   *  academic-plan.service.ts. */
  async appendDay(id: string, schoolId: string, day: IAcademicPlanDay): Promise<IAcademicPlan | null> {
    return AcademicPlan.findOneAndUpdate(
      { _id: id, schoolId },
      { $push: { days: day } },
      { new: true },
    ).lean<IAcademicPlan>();
  },

  /** Teacher hand-edits one day's content (chapter/topic/blockType). Marks
   *  it manuallyEdited so a later Regenerate leaves it alone — same shape
   *  as setDayStatus. */
  async editDay(
    id: string,
    schoolId: string,
    dateKey: string,
    patch: Partial<IAcademicPlanDay>,
    historyEntry: IAcademicPlanHistoryEntry,
  ): Promise<IAcademicPlan | null> {
    const plan = await AcademicPlan.findOne({ _id: id, schoolId });
    if (!plan) return null;

    const day = plan.days.find((d) => d.date.toISOString().slice(0, 10) === dateKey);
    if (!day) return null;
    Object.assign(day, patch, { manuallyEdited: true });

    plan.version += 1;
    plan.history.push({ ...historyEntry, version: plan.version });
    await plan.save();
    return plan.toObject();
  },

  /** Swaps the teaching content (not date/status) between two days — the
   *  drag-and-drop reorder. Both ends are marked manuallyEdited so
   *  Regenerate preserves them. */
  async swapDays(
    id: string,
    schoolId: string,
    dateAKey: string,
    dateBKey: string,
    historyEntry: IAcademicPlanHistoryEntry,
  ): Promise<IAcademicPlan | null> {
    const plan = await AcademicPlan.findOne({ _id: id, schoolId });
    if (!plan) return null;

    const dayA = plan.days.find((d) => d.date.toISOString().slice(0, 10) === dateAKey);
    const dayB = plan.days.find((d) => d.date.toISOString().slice(0, 10) === dateBKey);
    if (!dayA || !dayB) return null;

    const snapshotA = {
      blockType: dayA.blockType, chapterId: dayA.chapterId, chapterName: dayA.chapterName,
      topicTitle: dayA.topicTitle, examId: dayA.examId, examName: dayA.examName,
    };
    const snapshotB = {
      blockType: dayB.blockType, chapterId: dayB.chapterId, chapterName: dayB.chapterName,
      topicTitle: dayB.topicTitle, examId: dayB.examId, examName: dayB.examName,
    };
    Object.assign(dayA, snapshotB, { manuallyEdited: true });
    Object.assign(dayB, snapshotA, { manuallyEdited: true });

    plan.version += 1;
    plan.history.push({ ...historyEntry, version: plan.version });
    await plan.save();
    return plan.toObject();
  },
};
