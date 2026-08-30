import { TeacherPlanner, ITeacherPlanner, IPlannerWeek, IPlannerTask } from './planner.model';

export interface UpsertPlannerData {
  schoolId: string;
  teacherId: string;
  class: string;
  subject: string;
  academicYearStart: Date;
  academicYearEnd: Date;
  weeks: IPlannerWeek[];
}

export const plannerRepository = {
  async upsert(data: UpsertPlannerData): Promise<ITeacherPlanner> {
    return TeacherPlanner.findOneAndUpdate(
      {
        schoolId: data.schoolId,
        teacherId: data.teacherId,
        class: data.class,
        subject: data.subject,
        academicYearStart: data.academicYearStart,
      },
      { $set: { weeks: data.weeks, academicYearEnd: data.academicYearEnd } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  },

  async findById(id: string, schoolId: string): Promise<ITeacherPlanner | null> {
    return TeacherPlanner.findOne({ _id: id, schoolId }).lean<ITeacherPlanner>();
  },

  async findOne(schoolId: string, teacherId: string, cls: string, subject: string): Promise<ITeacherPlanner | null> {
    return TeacherPlanner.findOne({ schoolId, teacherId, class: cls, subject }).sort({ academicYearStart: -1 }).lean<ITeacherPlanner>();
  },

  async findAllActive(now: Date): Promise<ITeacherPlanner[]> {
    return TeacherPlanner.find({ academicYearStart: { $lte: now }, academicYearEnd: { $gte: now } }).lean<ITeacherPlanner[]>();
  },

  async findAllByTeacher(schoolId: string, teacherId: string): Promise<ITeacherPlanner[]> {
    return TeacherPlanner.find({ schoolId, teacherId }).sort({ class: 1, subject: 1 }).lean<ITeacherPlanner[]>();
  },

  async setTaskStatus(plannerId: string, schoolId: string, taskId: string, status: 'pending' | 'completed'): Promise<ITeacherPlanner | null> {
    const completedAt = status === 'completed' ? new Date() : undefined;
    return TeacherPlanner.findOneAndUpdate(
      { _id: plannerId, schoolId, 'weeks.tasks.taskId': taskId },
      { $set: { 'weeks.$[].tasks.$[t].status': status, 'weeks.$[].tasks.$[t].completedAt': completedAt } },
      { new: true, arrayFilters: [{ 't.taskId': taskId }] },
    ).lean<ITeacherPlanner>();
  },

  /** Principal/incharge inserting a task into an existing week — returns null
   *  if the planner or that week number doesn't exist. */
  async addTask(plannerId: string, schoolId: string, weekNumber: number, task: IPlannerTask): Promise<ITeacherPlanner | null> {
    return TeacherPlanner.findOneAndUpdate(
      { _id: plannerId, schoolId, 'weeks.weekNumber': weekNumber },
      { $push: { 'weeks.$.tasks': task } },
      { new: true },
    ).lean<ITeacherPlanner>();
  },
};
