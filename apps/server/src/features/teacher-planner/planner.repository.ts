import { TeacherPlanner, ITeacherPlanner, IPlannerWeek } from './planner.model';

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

  async updateTask(
    plannerId: string, schoolId: string, taskId: string,
    patch: { status?: 'pending' | 'completed'; title?: string; dueDate?: Date },
  ): Promise<ITeacherPlanner | null> {
    const set: Record<string, unknown> = {};
    if (patch.status !== undefined) {
      set['weeks.$[].tasks.$[t].status'] = patch.status;
      set['weeks.$[].tasks.$[t].completedAt'] = patch.status === 'completed' ? new Date() : undefined;
    }
    if (patch.title !== undefined) set['weeks.$[].tasks.$[t].title'] = patch.title;
    if (patch.dueDate !== undefined) set['weeks.$[].tasks.$[t].dueDate'] = patch.dueDate;

    return TeacherPlanner.findOneAndUpdate(
      { _id: plannerId, schoolId, 'weeks.tasks.taskId': taskId },
      { $set: set },
      { new: true, arrayFilters: [{ 't.taskId': taskId }] },
    ).lean<ITeacherPlanner>();
  },
};
