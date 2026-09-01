import { Candidate } from '../candidates/candidate.model';
import { Interview } from '../interviews/interview.model';

// Reception Management Module SRD, Module 9 — Recruitment Reports section.

export interface RecruitmentReport {
  cvsReceived: number;
  cvsByPosition: Array<{ position: string; count: number }>;
  interviewsConducted: number;
  hiringRate: number; // 0–100
  avgTimeToHireDays: number | null;
  interviewerConsistency: Array<{ interviewer: string; avgScore: number; scoreVariance: number; feedbackCount: number }>;
}

export async function getRecruitmentReport(schoolId: string, start: Date, end: Date): Promise<RecruitmentReport> {
  const dateQuery = { schoolId, isDeleted: false, dateReceived: { $gte: start, $lte: end } };

  const [cvsReceived, byPosition, interviewsConducted, selected, allInRange, consistency] = await Promise.all([
    Candidate.countDocuments(dateQuery),

    Candidate.aggregate([
      { $match: dateQuery },
      { $group: { _id: '$positionApplied', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    Interview.countDocuments({
      schoolId, isDeleted: false, status: 'completed', scheduledAt: { $gte: start, $lte: end },
    }),

    Candidate.find({ ...dateQuery, status: 'selected' }).lean(),
    Candidate.countDocuments(dateQuery),

    // Per-interviewer scoring — variance flags an outlier interviewer whose
    // scores don't line up with everyone else's on the same candidates
    // (SRD: "Interviewer scoring consistency ... flags outliers").
    Interview.aggregate([
      { $match: { schoolId, isDeleted: false } },
      { $unwind: '$feedback' },
      { $match: { 'feedback.submittedAt': { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$feedback.interviewerId',
          interviewerName: { $first: '$feedback.interviewerName' },
          scores: { $push: '$feedback.score' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const hiringRate = allInRange > 0 ? Math.round((selected.length / allInRange) * 1000) / 10 : 0;

  const withJoining = selected.filter((c) => c.joiningDate);
  const avgTimeToHireDays = withJoining.length > 0
    ? Math.round(
        withJoining.reduce((sum, c) => sum + (new Date(c.joiningDate!).getTime() - new Date(c.dateReceived).getTime()), 0)
        / withJoining.length / (1000 * 60 * 60 * 24)
      )
    : null;

  const interviewerConsistency = consistency.map((c) => {
    const avg = c.scores.reduce((a: number, b: number) => a + b, 0) / c.scores.length;
    const variance = c.scores.reduce((sum: number, s: number) => sum + (s - avg) ** 2, 0) / c.scores.length;
    return {
      interviewer: c.interviewerName,
      avgScore: Math.round(avg * 10) / 10,
      scoreVariance: Math.round(variance * 10) / 10,
      feedbackCount: c.count,
    };
  });

  return {
    cvsReceived,
    cvsByPosition: byPosition.map((p) => ({ position: p._id, count: p.count })),
    interviewsConducted,
    hiringRate,
    avgTimeToHireDays,
    interviewerConsistency,
  };
}
