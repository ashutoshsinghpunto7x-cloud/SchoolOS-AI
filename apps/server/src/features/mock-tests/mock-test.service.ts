import type {
  MockTest as MockTestDto,
  GenerateMockTestResult,
  ParentMockTestSummary,
  MockTestQuestionForTaking,
  SubmitMockTestResult,
  MockTestLeaderboardEntry,
  MockTestStatus,
} from '@schoolos/types';
import { AuthContext } from '../../lib/auth-context';
import { NotFoundError, ValidationError, ForbiddenError } from '../../middlewares/errorHandler';
import { mockTestRepository } from './mock-test.repository';
import { testAttemptRepository } from './test-attempt.repository';
import { mockTestGenerationService } from './mock-test-generation.service';
import { IMockTest } from './mock-test.model';
import { parentWorkspaceService } from '../parent-workspace/parent-workspace.service';
import { Student } from '../students/student.model';
import type { IStudent } from '../students/student.model';
import { chapterRepository } from '../question-bank/chapter.repository';
import type { ISyllabusChapter } from '../question-bank/chapter.model';
import {
  GenerateMockTestInput,
  CreateMockTestInput,
  UpdateMockTestInput,
  ListMockTestsInput,
  SubmitMockTestInput,
} from './mock-test.validation';

// Statuses in which ops may still edit the draft — once a principal has acted
// on it (approved/rejected/live/closed) it's locked; ops would resubmit a new
// test rather than mutate a decided one.
const EDITABLE_STATUSES: MockTestStatus[] = ['draft', 'pending_approval'];

function toDto(t: IMockTest): MockTestDto {
  return {
    _id: String(t._id),
    schoolId: t.schoolId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    class: t.class,
    subject: t.subject,
    chapterIds: t.chapterIds,
    chapterNames: t.chapterNames,
    title: t.title,
    questions: t.questions.map((q) => ({
      _id: String(q._id),
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      marks: q.marks,
    })),
    durationMinutes: t.durationMinutes,
    scheduledStart: t.scheduledStart.toISOString(),
    scheduledEnd: t.scheduledEnd.toISOString(),
    mode: t.mode,
    status: t.status,
    createdBy: t.createdBy,
    submittedForApprovalAt: t.submittedForApprovalAt?.toISOString(),
    approvedBy: t.approvedBy,
    approvedAt: t.approvedAt?.toISOString(),
    rejectedBy: t.rejectedBy,
    rejectedAt: t.rejectedAt?.toISOString(),
    rejectionReason: t.rejectionReason,
    anonymousSubmissionCount: t.anonymousSubmissionCount ?? 0,
    anonymousAverageScorePercent: t.anonymousAverageScorePercent,
  };
}

/** The taking window: a fresh attempt may start any time the test is live and no later than
 *  scheduledStart + durationMinutes, capped at the explicit scheduledEnd (see spec: "auto-close =
 *  start + duration window for taking, but link stays valid until explicit close"). */
function takingWindowEnd(t: IMockTest): Date {
  const durationEnd = new Date(t.scheduledStart.getTime() + t.durationMinutes * 60_000);
  return durationEnd < t.scheduledEnd ? durationEnd : t.scheduledEnd;
}

export const mockTestService = {
  // ── Ops authoring ────────────────────────────────────────────────────────
  // Internal staff accounts (owner/super_admin/devops/developer/support) have no real schoolId of
  // their own — see INTERNAL_SCHOOL_ID — so every one of these takes the *target* school explicitly
  // (from the request body/query) rather than trusting ctx.schoolId, and looks tests up without a
  // tenant filter (findByIdOps etc.) the same way the rest of Ops Center already reads any school's
  // data, gated by permit(OPS_VIEW) instead of tenant isolation.

  async generate(input: GenerateMockTestInput): Promise<GenerateMockTestResult> {
    return mockTestGenerationService.generate(input);
  },

  async create(data: CreateMockTestInput, ctx: AuthContext): Promise<MockTestDto> {
    const test = await mockTestRepository.create({
      schoolId: data.schoolId,
      class: data.class,
      subject: data.subject,
      chapterIds: data.chapterIds,
      chapterNames: data.chapterNames,
      title: data.title,
      questions: data.questions,
      durationMinutes: data.durationMinutes,
      scheduledStart: new Date(data.scheduledStart),
      scheduledEnd: new Date(data.scheduledEnd),
      mode: data.mode,
      createdBy: ctx.userId,
    });
    return toDto(test);
  },

  async update(id: string, data: UpdateMockTestInput): Promise<MockTestDto> {
    const existing = await mockTestRepository.findByIdOps(id);
    if (!existing) throw new NotFoundError('Mock test');
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new ValidationError(`Cannot edit a mock test that is already ${existing.status}`);
    }

    const updated = await mockTestRepository.updateOps(id, {
      title: data.title,
      questions: data.questions,
      durationMinutes: data.durationMinutes,
      scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : undefined,
      scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
      mode: data.mode,
    });
    if (!updated) throw new NotFoundError('Mock test');
    return toDto(updated);
  },

  async submitForApproval(id: string): Promise<MockTestDto> {
    const updated = await mockTestRepository.submitForApprovalOps(id);
    if (!updated) throw new ValidationError('Mock test is not in draft status, or was not found');
    return toDto(updated);
  },

  async listForOps(query: ListMockTestsInput): Promise<MockTestDto[]> {
    const tests = await mockTestRepository.findAllOps(query);
    return tests.map(toDto);
  },

  async getById(id: string): Promise<MockTestDto> {
    const test = await mockTestRepository.findByIdOps(id);
    if (!test) throw new NotFoundError('Mock test');
    return toDto(test);
  },

  /** Chapters already captured in Question Bank for a school/class/subject — the pick-list ops
   *  chooses AI generation input from. Same cross-tenant "explicit schoolId" rule as the rest of
   *  this authoring block. */
  async listChaptersForSchool(schoolId: string, cls: string, subject: string): Promise<ISyllabusChapter[]> {
    return chapterRepository.findAll(schoolId, cls, subject);
  },

  async leaderboardOps(id: string): Promise<MockTestLeaderboardEntry[]> {
    const test = await mockTestRepository.findByIdOps(id);
    if (!test) throw new NotFoundError('Mock test');
    if (test.mode !== 'ranked') throw new ValidationError('This test does not track a leaderboard (anonymous mode)');
    const attempts = await testAttemptRepository.findLeaderboard(id, test.schoolId);
    return attempts.map((a, i) => ({
      studentId: a.studentId, studentName: a.studentName, score: a.score, totalMarks: a.totalMarks,
      rank: i + 1, submittedAt: a.submittedAt.toISOString(),
    }));
  },

  // ── Principal approval ───────────────────────────────────────────────────

  async listPendingApprovals(ctx: AuthContext): Promise<MockTestDto[]> {
    const tests = await mockTestRepository.listPendingApproval(ctx.schoolId);
    return tests.map(toDto);
  },

  async approve(id: string, ctx: AuthContext): Promise<MockTestDto> {
    const updated = await mockTestRepository.approve(id, ctx.schoolId, ctx.userId);
    if (!updated) throw new ValidationError('Mock test is not pending approval, or was not found');
    // Scheduling itself is cron-driven (see mock-test-scheduler.job.ts), which polls for
    // status:'approved' tests whose scheduledStart has arrived — nothing further to do here,
    // including for a test whose start time is already in the past by the time it's approved.
    return toDto(updated);
  },

  async reject(id: string, reason: string | undefined, ctx: AuthContext): Promise<MockTestDto> {
    const updated = await mockTestRepository.reject(id, ctx.schoolId, ctx.userId, reason);
    if (!updated) throw new ValidationError('Mock test is not pending approval, or was not found');
    return toDto(updated);
  },

  // ── Parent / student ─────────────────────────────────────────────────────

  async listForParent(ctx: AuthContext, childId: string): Promise<ParentMockTestSummary[]> {
    const child = await parentWorkspaceService.getOwnedStudent(ctx, childId);
    const tests = await mockTestRepository.findForClass(ctx.schoolId, child.class, ['approved', 'live', 'closed']);

    const attempts = await Promise.all(
      tests
        .filter((t) => t.mode === 'ranked')
        .map((t) => testAttemptRepository.findByStudent(String(t._id), ctx.schoolId, childId)),
    );
    const attemptedTestIds = new Set(attempts.filter(Boolean).map((a) => a!.testId));

    return tests.map((t) => ({
      _id: String(t._id),
      title: t.title,
      subject: t.subject,
      class: t.class,
      durationMinutes: t.durationMinutes,
      scheduledStart: t.scheduledStart.toISOString(),
      scheduledEnd: t.scheduledEnd.toISOString(),
      mode: t.mode,
      status: t.status,
      questionCount: t.questions.length,
      totalMarks: t.questions.reduce((sum, q) => sum + q.marks, 0),
      alreadyAttempted: t.mode === 'ranked' ? attemptedTestIds.has(String(t._id)) : undefined,
    }));
  },

  /** Questions for taking — correctOptionIndex stripped, only callable while the test is actually open. */
  async getForTaking(id: string, ctx: AuthContext, childId: string): Promise<{ test: ParentMockTestSummary; questions: MockTestQuestionForTaking[] }> {
    const child = await parentWorkspaceService.getOwnedStudent(ctx, childId);
    const test = await mockTestRepository.findById(id, ctx.schoolId);
    if (!test) throw new NotFoundError('Mock test');
    if (test.class !== child.class) throw new ForbiddenError('This test is not for your child\'s class');
    if (test.status !== 'live') throw new ValidationError('This test is not currently open');

    const now = new Date();
    if (now > takingWindowEnd(test)) {
      throw new ValidationError('The window to start this test has closed');
    }

    if (test.mode === 'ranked') {
      const existing = await testAttemptRepository.findByStudent(id, ctx.schoolId, childId);
      if (existing) throw new ValidationError('This test has already been submitted');
    }

    return {
      test: {
        _id: String(test._id),
        title: test.title,
        subject: test.subject,
        class: test.class,
        durationMinutes: test.durationMinutes,
        scheduledStart: test.scheduledStart.toISOString(),
        scheduledEnd: test.scheduledEnd.toISOString(),
        mode: test.mode,
        status: test.status,
        questionCount: test.questions.length,
        totalMarks: test.questions.reduce((sum, q) => sum + q.marks, 0),
      },
      questions: test.questions.map((q) => ({ _id: String(q._id), questionText: q.questionText, options: q.options, marks: q.marks })),
    };
  },

  /** Grades server-side — the client-submitted score, if any, is never trusted. */
  async submit(id: string, data: SubmitMockTestInput, ctx: AuthContext): Promise<SubmitMockTestResult> {
    const child = await parentWorkspaceService.getOwnedStudent(ctx, data.childId);
    const test = await mockTestRepository.findById(id, ctx.schoolId);
    if (!test) throw new NotFoundError('Mock test');
    if (test.class !== child.class) throw new ForbiddenError('This test is not for your child\'s class');
    if (test.status !== 'live') throw new ValidationError('This test is not currently open for submissions');
    if (new Date() > test.scheduledEnd) throw new ValidationError('This test has closed');

    const answerByQuestionId = new Map(data.answers.map((a) => [a.questionId, a.selectedOptionIndex]));
    let score = 0;
    let correctCount = 0;
    const totalMarks = test.questions.reduce((sum, q) => sum + q.marks, 0);

    for (const q of test.questions) {
      const selected = answerByQuestionId.get(String(q._id));
      if (selected !== undefined && selected === q.correctOptionIndex) {
        score += q.marks;
        correctCount += 1;
      }
    }
    const scorePercent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    if (test.mode === 'anonymous') {
      await mockTestRepository.recordAnonymousSubmission(id, ctx.schoolId, scorePercent);
      return { mode: 'anonymous', score, totalMarks, correctCount, totalQuestions: test.questions.length, scorePercent };
    }

    const existing = await testAttemptRepository.findByStudent(id, ctx.schoolId, data.childId);
    if (existing) throw new ValidationError('This test has already been submitted');

    await testAttemptRepository.create({
      schoolId: ctx.schoolId,
      testId: id,
      studentId: data.childId,
      studentName: child.fullName,
      class: child.class,
      section: child.section,
      answers: data.answers,
      score,
      totalMarks,
      correctCount,
      totalQuestions: test.questions.length,
    });

    const leaderboard = await testAttemptRepository.findLeaderboard(id, ctx.schoolId);
    const rank = leaderboard.findIndex((a) => a.studentId === data.childId) + 1;

    return { mode: 'ranked', score, totalMarks, correctCount, totalQuestions: test.questions.length, scorePercent, rank: rank || undefined };
  },

  async leaderboard(id: string, ctx: AuthContext): Promise<MockTestLeaderboardEntry[]> {
    const test = await mockTestRepository.findById(id, ctx.schoolId);
    if (!test) throw new NotFoundError('Mock test');
    if (test.mode !== 'ranked') throw new ValidationError('This test does not track a leaderboard (anonymous mode)');

    const attempts = await testAttemptRepository.findLeaderboard(id, ctx.schoolId);
    return attempts.map((a, i) => ({
      studentId: a.studentId,
      studentName: a.studentName,
      score: a.score,
      totalMarks: a.totalMarks,
      rank: i + 1,
      submittedAt: a.submittedAt.toISOString(),
    }));
  },

  // Exposed for the class-roster lookup used by the scheduler job's WhatsApp fan-out.
  async findStudentsForClass(schoolId: string, cls: string): Promise<Pick<IStudent, '_id' | 'fullName' | 'parentPhone'>[]> {
    return Student.find({ schoolId, class: cls, isDeleted: false })
      .select('_id fullName parentPhone')
      .lean<Pick<IStudent, '_id' | 'fullName' | 'parentPhone'>[]>();
  },
};
