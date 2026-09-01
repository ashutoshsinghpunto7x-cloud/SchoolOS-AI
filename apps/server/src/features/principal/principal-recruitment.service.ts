import { enquiryRepository } from '../enquiries/enquiry.repository';
import { admissionFormRepository } from '../admission-forms/admission-form.repository';
import { candidateRepository } from '../candidates/candidate.repository';
import { interviewRepository } from '../interviews/interview.repository';
import { visitorAppointmentRepository } from '../visitors/visitor-appointment.repository';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 7 — "One screen where the Principal can run hiring without
// switching between reception's CV inbox and their own calendar." Kept as
// its own file/service rather than folded into the existing (already large,
// AI-briefing-heavy) principal.service.ts — this is a separate concern with
// its own read-only aggregation, not part of that dashboard's alert engine.

export interface PrincipalRecruitmentDashboard {
  counts: {
    newInquiriesToday: number;
    formsPendingVerification: number;
    cvsAwaitingReview: number;
    interviewsToday: number;
  };
  todaysSchedule: Array<
    | { type: 'interview'; time: string; label: string; id: string }
    | { type: 'visitor_appointment'; time: string; label: string; id: string }
  >;
  needsAttention: string[];
}

function dayBoundsIST(): { start: Date; end: Date } {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  return {
    start: new Date(`${dateStr}T00:00:00.000+05:30`),
    end: new Date(`${dateStr}T23:59:59.999+05:30`),
  };
}

export async function getRecruitmentDashboard(schoolId: string): Promise<PrincipalRecruitmentDashboard> {
  const { start, end } = dayBoundsIST();

  const [
    todaysEnquiries,
    pendingForms,
    forwardedToPrincipalCVs,
    forwardedToHrCVs,
    underReviewCVs,
    interviewsToday,
    appointmentsToday,
  ] = await Promise.all([
    enquiryRepository.findAll(schoolId, {
      createdAfter: start.toISOString(), createdBefore: end.toISOString(), limit: 1,
    }).then((r) => r.total),
    admissionFormRepository.findAll(schoolId, { verificationStatus: 'pending_verification', limit: 1 }).then((r) => r.total),
    candidateRepository.findAll(schoolId, { status: 'forwarded_to_principal', limit: 1 }).then((r) => r.total),
    candidateRepository.findAll(schoolId, { status: 'forwarded_to_hr', limit: 1 }).then((r) => r.total),
    candidateRepository.findAll(schoolId, { status: 'under_review', limit: 1 }).then((r) => r.total),
    interviewRepository.findScheduledBetween(schoolId, start, end),
    visitorAppointmentRepository.findAll(schoolId, { status: 'scheduled', dateFrom: undefined, dateTo: undefined, limit: 100 }),
  ]);

  const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  const todaysAppointments = appointmentsToday.appointments.filter(
    (a) => a.scheduledFor >= start && a.scheduledFor <= end,
  );

  const schedule: PrincipalRecruitmentDashboard['todaysSchedule'] = [
    ...interviewsToday.map((i) => ({
      type: 'interview' as const,
      time: fmtTime(i.scheduledAt),
      label: `Interview — round ${i.round}`,
      id: String(i._id),
    })),
    ...todaysAppointments.map((a) => ({
      type: 'visitor_appointment' as const,
      time: fmtTime(a.scheduledFor),
      label: `Visitor appt — ${a.visitorName}`,
      id: String(a._id),
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const needsAttention: string[] = [];
  if (forwardedToPrincipalCVs > 0) needsAttention.push(`${forwardedToPrincipalCVs} CV${forwardedToPrincipalCVs > 1 ? 's' : ''} forwarded to you, unreviewed`);
  if (pendingForms > 0) needsAttention.push(`${pendingForms} admission form${pendingForms > 1 ? 's' : ''} awaiting verification`);

  return {
    counts: {
      newInquiriesToday: todaysEnquiries,
      formsPendingVerification: pendingForms,
      cvsAwaitingReview: forwardedToPrincipalCVs + forwardedToHrCVs + underReviewCVs,
      interviewsToday: interviewsToday.length,
    },
    todaysSchedule: schedule,
    needsAttention,
  };
}
