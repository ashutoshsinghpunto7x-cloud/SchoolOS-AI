import { AuthContext } from '../../lib/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { chapterRepository } from '../question-bank/chapter.repository';
import { questionRepository } from '../question-bank/question.repository';
import { worksheetRepository, WorksheetListOptions } from './worksheet.repository';
import { IWorksheet } from './worksheet.model';
import { worksheetGeneratorService, GenerateWorksheetInput } from './worksheet-generator.service';
import { SaveWorksheetInput } from './worksheet.validation';

// Same shape/precedent as the other three features' teacher scope guards.
async function assertTeacherCanManageWorksheets(ctx: AuthContext, cls: string, subject: string): Promise<void> {
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

export const worksheetService = {
  /** Never persists — the teacher reviews/edits before calling save(). */
  async generate(input: GenerateWorksheetInput, ctx: AuthContext) {
    await assertTeacherCanManageWorksheets(ctx, input.class, input.subject);
    return worksheetGeneratorService.generate(input, ctx);
  },

  async save(data: SaveWorksheetInput, ctx: AuthContext): Promise<IWorksheet> {
    await assertTeacherCanManageWorksheets(ctx, data.class, data.subject);
    const chapters = await chapterRepository.findByIds(ctx.schoolId, data.chapterIds);
    if (chapters.length === 0) throw new ValidationError('No matching chapters found');

    // Newly-authored items the teacher kept get saved to the bank if opted
    // in, and swap their draft entry for a real questionId so the worksheet
    // snapshot stays consistent with what's now in the bank.
    const newItems = data.questions.filter((q) => q.isNew);
    let savedNewIds: string[] = [];
    if (data.addNewToBank && newItems.length > 0) {
      const primaryChapter = chapters[0];
      const created = await questionRepository.createMany(
        newItems.map((q) => ({
          schoolId: ctx.schoolId,
          class: data.class,
          subject: data.subject,
          chapterId: String(primaryChapter._id),
          chapterName: primaryChapter.chapterName,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          difficulty: q.difficulty,
          marks: 1,
          estimatedTimeMinutes: q.estimatedTimeMinutes,
          bloomsLevel: 'understand',
          keywords: q.keywords,
          createdBy: ctx.userId,
        })),
      );
      savedNewIds = created.map((c) => String(c._id));
    }

    let newIdx = 0;
    const questions = data.questions.map((q) => {
      if (q.isNew && data.addNewToBank) {
        const id = savedNewIds[newIdx];
        newIdx += 1;
        return { ...q, questionId: id, isNew: undefined };
      }
      return q;
    });

    return worksheetRepository.create({
      schoolId: ctx.schoolId,
      teacherId: ctx.userId,
      class: data.class,
      subject: data.subject,
      chapterIds: data.chapterIds,
      chapterNames: chapters.map((c) => c.chapterName),
      worksheetType: data.worksheetType,
      title: data.title,
      questions,
      createdBy: ctx.userId,
    });
  },

  async list(query: WorksheetListOptions, ctx: AuthContext) {
    return worksheetRepository.findAll(ctx.schoolId, ctx.userId, query);
  },

  async getById(id: string, ctx: AuthContext): Promise<IWorksheet> {
    const worksheet = await worksheetRepository.findById(id, ctx.schoolId);
    if (!worksheet) throw new NotFoundError('Worksheet');
    await assertTeacherCanManageWorksheets(ctx, worksheet.class, worksheet.subject);
    return worksheet;
  },

  async delete(id: string, ctx: AuthContext): Promise<void> {
    const existing = await worksheetRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Worksheet');
    await assertTeacherCanManageWorksheets(ctx, existing.class, existing.subject);

    const deleted = await worksheetRepository.softDelete(id, ctx.schoolId);
    if (!deleted) throw new ValidationError('Could not delete this worksheet');
  },
};
