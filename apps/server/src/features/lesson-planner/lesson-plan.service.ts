import { AuthContext } from '../../lib/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { chapterRepository } from '../question-bank/chapter.repository';
import { lessonPlanRepository, LessonPlanListOptions } from './lesson-plan.repository';
import { ILessonPlan } from './lesson-plan.model';
import { lessonPlanGeneratorService, GenerateLessonPlanInput, LessonPlanContent } from './lesson-plan-generator.service';
import { SaveLessonPlanInput, UpdateLessonPlanInput } from './lesson-plan.validation';

// Same shape/precedent as question-bank's assertTeacherCanManageQuestionBank
// and teacher-planner's assertTeacherCanManagePlanner — own copy per this
// codebase's established pattern of not sharing guards across features.
async function assertTeacherCanManageLessonPlans(ctx: AuthContext, cls: string, subject: string): Promise<void> {
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

export const lessonPlanService = {
  /** Never persists — the teacher reviews/edits before calling save(). */
  async generate(input: GenerateLessonPlanInput, ctx: AuthContext): Promise<LessonPlanContent> {
    await assertTeacherCanManageLessonPlans(ctx, input.class, input.subject);
    return lessonPlanGeneratorService.generate(input, ctx);
  },

  async save(data: SaveLessonPlanInput, ctx: AuthContext): Promise<ILessonPlan> {
    await assertTeacherCanManageLessonPlans(ctx, data.class, data.subject);
    const chapter = await chapterRepository.findOrCreate(ctx.schoolId, data.class, data.subject, data.chapterName, data.topic);

    return lessonPlanRepository.create({
      schoolId: ctx.schoolId,
      teacherId: ctx.userId,
      class: data.class,
      subject: data.subject,
      chapterId: String(chapter._id),
      chapterName: chapter.chapterName,
      topic: data.topic,
      durationMinutes: data.durationMinutes,
      objective: data.objective,
      introduction: data.introduction,
      explanation: data.explanation,
      activities: data.activities,
      examples: data.examples,
      questions: data.questions,
      homework: data.homework,
      assessment: data.assessment,
      createdBy: ctx.userId,
    });
  },

  async list(query: LessonPlanListOptions, ctx: AuthContext) {
    return lessonPlanRepository.findAll(ctx.schoolId, ctx.userId, query);
  },

  async getById(id: string, ctx: AuthContext): Promise<ILessonPlan> {
    const plan = await lessonPlanRepository.findById(id, ctx.schoolId);
    if (!plan) throw new NotFoundError('Lesson plan');
    await assertTeacherCanManageLessonPlans(ctx, plan.class, plan.subject);
    return plan;
  },

  async update(id: string, data: UpdateLessonPlanInput, ctx: AuthContext): Promise<ILessonPlan> {
    const existing = await lessonPlanRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Lesson plan');
    await assertTeacherCanManageLessonPlans(ctx, existing.class, existing.subject);

    const updated = await lessonPlanRepository.update(id, ctx.schoolId, data);
    if (!updated) throw new NotFoundError('Lesson plan');
    return updated;
  },

  async delete(id: string, ctx: AuthContext): Promise<void> {
    const existing = await lessonPlanRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Lesson plan');
    await assertTeacherCanManageLessonPlans(ctx, existing.class, existing.subject);

    const deleted = await lessonPlanRepository.softDelete(id, ctx.schoolId);
    if (!deleted) throw new ValidationError('Could not delete this lesson plan');
  },
};
