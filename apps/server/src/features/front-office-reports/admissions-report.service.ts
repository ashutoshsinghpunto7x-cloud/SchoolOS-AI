import { Enquiry } from '../enquiries/enquiry.model';
import { AdmissionForm } from '../admission-forms/admission-form.model';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 9 — Admission Reports section. Pure read-side aggregation, no new
// model: everything here is computed from Enquiry/AdmissionForm records
// Modules 2/3 already write.

export interface AdmissionsReport {
  totalInquiries: number;
  conversionRate: number; // 0–100
  admissionTrend: Array<{ date: string; count: number }>;
  counselorPerformance: Array<{
    counsellor: string; leadsAssigned: number; converted: number; conversionRate: number;
  }>;
  sourceEffectiveness: Array<{ source: string; total: number; converted: number; conversionRate: number }>;
  formFunnel: { issued: number; paid: number; submitted: number; verified: number };
}

export async function getAdmissionsReport(schoolId: string, start: Date, end: Date): Promise<AdmissionsReport> {
  const dateQuery = { schoolId, isDeleted: false, createdAt: { $gte: start, $lte: end } };

  const [total, converted, trend, byCounsellor, bySource, formCounts] = await Promise.all([
    Enquiry.countDocuments(dateQuery),
    Enquiry.countDocuments({ ...dateQuery, stage: 'converted' }),

    // Daily new-inquiry trend — one bucket per calendar day in range.
    Enquiry.aggregate([
      { $match: dateQuery },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Enquiry.aggregate([
      { $match: { ...dateQuery, assignedCounsellor: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$assignedCounsellor',
          leadsAssigned: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$stage', 'converted'] }, 1, 0] } },
        },
      },
      { $sort: { leadsAssigned: -1 } },
    ]),

    Enquiry.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$source',
          total: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$stage', 'converted'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),

    // Form funnel counts against the same window, by dateIssued.
    Promise.all([
      AdmissionForm.countDocuments({ schoolId, isDeleted: false, dateIssued: { $gte: start, $lte: end } }),
      AdmissionForm.countDocuments({ schoolId, isDeleted: false, dateIssued: { $gte: start, $lte: end }, paymentStatus: 'paid' }),
      AdmissionForm.countDocuments({ schoolId, isDeleted: false, dateIssued: { $gte: start, $lte: end }, submissionDate: { $exists: true } }),
      AdmissionForm.countDocuments({ schoolId, isDeleted: false, dateIssued: { $gte: start, $lte: end }, verificationStatus: 'verified' }),
    ]),
  ]);

  return {
    totalInquiries: total,
    conversionRate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
    admissionTrend: trend.map((t) => ({ date: t._id, count: t.count })),
    counselorPerformance: byCounsellor.map((c) => ({
      counsellor: c._id,
      leadsAssigned: c.leadsAssigned,
      converted: c.converted,
      conversionRate: c.leadsAssigned > 0 ? Math.round((c.converted / c.leadsAssigned) * 1000) / 10 : 0,
    })),
    sourceEffectiveness: bySource.map((s) => ({
      source: s._id,
      total: s.total,
      converted: s.converted,
      conversionRate: s.total > 0 ? Math.round((s.converted / s.total) * 1000) / 10 : 0,
    })),
    formFunnel: { issued: formCounts[0], paid: formCounts[1], submitted: formCounts[2], verified: formCounts[3] },
  };
}
