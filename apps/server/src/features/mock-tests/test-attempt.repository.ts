import { TestAttempt, ITestAttempt } from './test-attempt.model';

export interface CreateTestAttemptData {
  schoolId: string;
  testId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  answers: { questionId: string; selectedOptionIndex: number }[];
  score: number;
  totalMarks: number;
  correctCount: number;
  totalQuestions: number;
}

export const testAttemptRepository = {
  async create(data: CreateTestAttemptData): Promise<ITestAttempt> {
    return TestAttempt.create({ ...data, submittedAt: new Date() });
  },

  async findByStudent(testId: string, schoolId: string, studentId: string): Promise<ITestAttempt | null> {
    return TestAttempt.findOne({ testId, schoolId, studentId }).lean<ITestAttempt>();
  },

  /** Ranked by score desc, ties broken by earlier submission — matches the leaderboard's stated tie-break rule. */
  async findLeaderboard(testId: string, schoolId: string): Promise<ITestAttempt[]> {
    return TestAttempt.find({ testId, schoolId }).sort({ score: -1, submittedAt: 1 }).lean<ITestAttempt[]>();
  },
};
