import { PlanAlert, IPlanAlert, PlanAlertType, PlanAlertSeverity } from './plan-alert.model';

export interface UpsertPlanAlertData {
  schoolId: string;
  planId?: string;
  teacherId: string;
  teacherName: string;
  class?: string;
  section?: string;
  subject?: string;
  type: PlanAlertType;
  severity: PlanAlertSeverity;
  message: string;
  daysBehind?: number;
}

export const planAlertRepository = {
  /** Opens a new alert, or refreshes an already-open one for the same
   *  {planId ?? teacherId, type} key — never duplicates. */
  async upsertOpen(data: UpsertPlanAlertData): Promise<IPlanAlert> {
    const key = data.planId
      ? { schoolId: data.schoolId, planId: data.planId, type: data.type, resolvedAt: { $exists: false } }
      : { schoolId: data.schoolId, teacherId: data.teacherId, type: data.type, resolvedAt: { $exists: false } };

    return PlanAlert.findOneAndUpdate(
      key,
      { $set: { ...data, detectedAt: new Date() }, $unset: { resolvedAt: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  },

  /** Closes every currently-open alert for this school whose key isn't in
   *  `keepOpenIds` — called once per detection run so a condition that
   *  cleared (teacher caught up, plan generated) auto-resolves instead of
   *  lingering forever. */
  async resolveStale(schoolId: string, keepOpenIds: string[]): Promise<number> {
    const result = await PlanAlert.updateMany(
      { schoolId, resolvedAt: { $exists: false }, _id: { $nin: keepOpenIds } },
      { $set: { resolvedAt: new Date() } },
    );
    return result.modifiedCount;
  },

  async findOpen(schoolId: string): Promise<IPlanAlert[]> {
    return PlanAlert.find({ schoolId, resolvedAt: { $exists: false } })
      .sort({ severity: 1, detectedAt: -1 }) // Mongo sorts strings lexically ('critical' < 'info' < 'warning') — re-sorted in service by a real severity rank
      .lean<IPlanAlert[]>();
  },

  async resolveById(id: string, schoolId: string): Promise<IPlanAlert | null> {
    return PlanAlert.findOneAndUpdate(
      { _id: id, schoolId, resolvedAt: { $exists: false } },
      { $set: { resolvedAt: new Date() } },
      { new: true },
    ).lean<IPlanAlert>();
  },
};
