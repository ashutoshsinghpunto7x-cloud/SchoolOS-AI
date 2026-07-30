import { LessonPlan, ILessonPlan } from './lesson-plan.model';

export interface LessonPlanListOptions {
  page?: number;
  limit?: number;
  class?: string;
  subject?: string;
  chapterId?: string;
}

export interface PaginatedLessonPlans {
  lessonPlans: ILessonPlan[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateLessonPlanData {
  schoolId: string;
  teacherId: string;
  class: string;
  subject: string;
  chapterId: string;
  chapterName: string;
  topic?: string;
  durationMinutes: number;
  objective: string;
  introduction: string;
  explanation: string;
  activities: string[];
  examples: string[];
  questions: string[];
  homework: string;
  assessment: string;
  createdBy: string;
}

export const lessonPlanRepository = {
  async create(data: CreateLessonPlanData): Promise<ILessonPlan> {
    return LessonPlan.create(data);
  },

  async findAll(schoolId: string, teacherId: string, opts: LessonPlanListOptions = {}): Promise<PaginatedLessonPlans> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, teacherId, isDeleted: false };
    if (opts.class) query.class = opts.class;
    if (opts.subject) query.subject = opts.subject;
    if (opts.chapterId) query.chapterId = opts.chapterId;

    const [lessonPlans, total] = await Promise.all([
      LessonPlan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<ILessonPlan[]>(),
      LessonPlan.countDocuments(query),
    ]);

    return { lessonPlans, total, page, limit };
  },

  async findById(id: string, schoolId: string): Promise<ILessonPlan | null> {
    return LessonPlan.findOne({ _id: id, schoolId, isDeleted: false }).lean<ILessonPlan>();
  },

  async update(id: string, schoolId: string, data: Partial<CreateLessonPlanData>): Promise<ILessonPlan | null> {
    return LessonPlan.findOneAndUpdate({ _id: id, schoolId, isDeleted: false }, { $set: data }, { new: true }).lean<ILessonPlan>();
  },

  async softDelete(id: string, schoolId: string): Promise<boolean> {
    const res = await LessonPlan.updateOne({ _id: id, schoolId, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } });
    return res.modifiedCount > 0;
  },
};
