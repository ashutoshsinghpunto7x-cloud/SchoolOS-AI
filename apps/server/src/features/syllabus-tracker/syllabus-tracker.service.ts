import { AuthContext } from '../../lib/auth-context';
import { plannerRepository } from '../teacher-planner/planner.repository';
import { ITeacherPlanner } from '../teacher-planner/planner.model';

export interface SyllabusCoverage {
  plannerId: string;
  class: string;
  subject: string;
  totalChapters: number;
  chaptersCompleted: number;
  percentComplete: number;
}

export interface SyllabusActivityDay {
  date: string;
  count: number;
}

const ACTIVITY_WINDOW_DAYS = 365;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function coverageForPlanner(planner: ITeacherPlanner): SyllabusCoverage {
  const byChapter = new Map<string, boolean>(); // chapterId -> all tasks completed so far
  for (const week of planner.weeks) {
    const allCompleted = week.tasks.length === 0 || week.tasks.every((t) => t.status === 'completed');
    const existing = byChapter.get(week.chapterId);
    // A chapter can span multiple weeks — it only counts as covered once
    // every task across every one of its weeks is completed.
    byChapter.set(week.chapterId, existing === undefined ? allCompleted : existing && allCompleted);
  }

  const totalChapters = byChapter.size;
  const chaptersCompleted = [...byChapter.values()].filter(Boolean).length;

  return {
    plannerId: String(planner._id),
    class: planner.class,
    subject: planner.subject,
    totalChapters,
    chaptersCompleted,
    percentComplete: totalChapters === 0 ? 0 : Math.round((chaptersCompleted / totalChapters) * 100),
  };
}

export const syllabusTrackerService = {
  async getOverview(ctx: AuthContext): Promise<SyllabusCoverage[]> {
    const planners = await plannerRepository.findAllByTeacher(ctx.schoolId, ctx.userId);
    return planners.map(coverageForPlanner);
  },

  async getActivityHeatmap(ctx: AuthContext): Promise<SyllabusActivityDay[]> {
    const planners = await plannerRepository.findAllByTeacher(ctx.schoolId, ctx.userId);

    const counts = new Map<string, number>();
    for (const planner of planners) {
      for (const week of planner.weeks) {
        for (const task of week.tasks) {
          if (task.status !== 'completed' || !task.completedAt) continue;
          const key = isoDate(new Date(task.completedAt));
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: SyllabusActivityDay[] = [];
    for (let i = ACTIVITY_WINDOW_DAYS - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = isoDate(d);
      days.push({ date: key, count: counts.get(key) ?? 0 });
    }

    return days;
  },
};
