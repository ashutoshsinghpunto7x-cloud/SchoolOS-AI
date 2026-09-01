import { Visitor } from '../visitors/visitor.model';

// Reception Management Module SRD, Module 9 — Visitor Reports section.

export interface VisitorReport {
  dailyVisitors: Array<{ date: string; count: number }>;
  mostVisitedStaff: Array<{ staff: string; count: number }>;
  peakVisitingHours: Array<{ hour: number; count: number }>;
  avgVisitDurationMinutes: number | null;
  purposeBreakdown: Array<{ purpose: string; count: number }>;
}

export async function getVisitorReport(schoolId: string, start: Date, end: Date): Promise<VisitorReport> {
  const dateQuery = { schoolId, isDeleted: false, checkInTime: { $gte: start, $lte: end } };

  const [daily, mostVisited, byHour, completedVisits, byPurpose] = await Promise.all([
    Visitor.aggregate([
      { $match: dateQuery },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkInTime' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Visitor.aggregate([
      { $match: dateQuery },
      { $group: { _id: '$personToVisit', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    Visitor.aggregate([
      { $match: dateQuery },
      { $group: { _id: { $hour: { date: '$checkInTime', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Visitor.find({ ...dateQuery, checkOutTime: { $exists: true } }).select('checkInTime checkOutTime').lean(),

    Visitor.aggregate([
      { $match: dateQuery },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const avgVisitDurationMinutes = completedVisits.length > 0
    ? Math.round(
        completedVisits.reduce((sum, v) => sum + (new Date(v.checkOutTime!).getTime() - new Date(v.checkInTime).getTime()), 0)
        / completedVisits.length / (1000 * 60)
      )
    : null;

  return {
    dailyVisitors: daily.map((d) => ({ date: d._id, count: d.count })),
    mostVisitedStaff: mostVisited.map((m) => ({ staff: m._id, count: m.count })),
    peakVisitingHours: byHour.map((h) => ({ hour: h._id, count: h.count })),
    avgVisitDurationMinutes,
    purposeBreakdown: byPurpose.map((p) => ({ purpose: p._id, count: p.count })),
  };
}
