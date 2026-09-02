import { AuthContext } from '../../lib/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { chapterRepository } from '../question-bank/chapter.repository';
import { questionRepository } from '../question-bank/question.repository';
import { timetableRepository } from '../timetable/timetable.repository';
import { worksheetRepository, WorksheetListOptions } from './worksheet.repository';
import { IWorksheet } from './worksheet.model';
import { worksheetGeneratorService, GenerateWorksheetInput } from './worksheet-generator.service';
import { SaveWorksheetInput, UpdateWorksheetInput } from './worksheet.validation';

// Same shape/precedent as teacher-planner's guard — Teacher.subjects/
// assignedClasses are only kept up to date by the Teachers workspace UI, so
// a teacher whose subjects are assigned purely via the Timetable (the normal
// path; WorksheetHubPage itself lists class/subject options straight from
// the timetable-derived weekly schedule, not from these fields) had them
// empty, which 403'd every worksheet-generator request even though the hub
// screen had just shown that exact class/subject as theirs to pick. Now
// checks the same timetable source WorksheetHubPage reads from. See
// [[project_planner_chapter_403_bug]].
async function assertTeacherCanManageWorksheets(ctx: AuthContext, cls: string, subject: string): Promise<void> {
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
  if (!teachesThis) {
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
          options: q.options ?? undefined,
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
      const base = { ...q, options: q.options ?? undefined, isNew: undefined };
      if (q.isNew && data.addNewToBank) {
        const id = savedNewIds[newIdx];
        newIdx += 1;
        return { ...base, questionId: id };
      }
      return base;
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

  /**
   * When `class`+`subject` are given, this lists everything saved for that class/subject
   * (not just this teacher's own) — gated by the same live "do you currently teach this" check
   * used everywhere else in this file, so a reassigned teacher can still find a predecessor's
   * worksheets. With no class/subject, falls back to "my worksheets" (teacher-scoped) since
   * there's nothing else to scope by.
   */
  async list(query: WorksheetListOptions, ctx: AuthContext) {
    if (query.class && query.subject) {
      await assertTeacherCanManageWorksheets(ctx, query.class, query.subject);
      return worksheetRepository.findAll(ctx.schoolId, undefined, query);
    }
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

  /** Post-save editing — title and/or per-question text/difficulty/time, matched to the existing
   * question array by index (a structural change like adding/removing/reordering questions isn't
   * supported here; use Regenerate for that). */
  async update(id: string, data: UpdateWorksheetInput, ctx: AuthContext): Promise<IWorksheet> {
    const existing = await worksheetRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Worksheet');
    await assertTeacherCanManageWorksheets(ctx, existing.class, existing.subject);

    const patch: { title?: string; questions?: IWorksheet['questions'] } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.questions) {
      if (data.questions.length !== existing.questions.length) {
        throw new ValidationError('Question count changed — regenerate the worksheet instead of editing it directly');
      }
      patch.questions = existing.questions.map((q, i) => ({
        ...q,
        questionText: data.questions![i].questionText,
        difficulty: data.questions![i].difficulty,
        estimatedTimeMinutes: data.questions![i].estimatedTimeMinutes,
      }));
    }

    const updated = await worksheetRepository.update(id, ctx.schoolId, patch);
    if (!updated) throw new NotFoundError('Worksheet');
    return updated;
  },
};
