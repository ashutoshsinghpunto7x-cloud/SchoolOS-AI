import { interviewRepository, PaginatedInterviews } from './interview.repository';
import { IInterview } from './interview.model';
import {
  scheduleInterviewSchema,
  rescheduleInterviewSchema,
  setInterviewStatusSchema,
  submitFeedbackSchema,
  listInterviewsSchema,
} from './interview.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { candidateRepository } from '../candidates/candidate.repository';
import { employeeRepository } from '../employees/employee.repository';
import { notificationService } from '../notifications/notification.service';

/** Best-effort in-app notification to each interviewer, resolved from
 *  Employee → linked User the same way visitor.service.ts notifies staff of
 *  a visitor's arrival — interviewerIds are Employee ids (picked via the
 *  same staff-directory picker Module 1 built), not User ids directly. */
async function notifyInterviewers(interviewerIds: string[], title: string, body: string, ctx: AuthContext): Promise<void> {
  await Promise.all(interviewerIds.map(async (employeeId) => {
    try {
      const employee = await employeeRepository.findById(employeeId, ctx.schoolId);
      if (!employee?.userId) return;
      await notificationService.sendToUser({ recipientUserId: employee.userId, type: 'message', title, body }, ctx);
    } catch { /* best-effort */ }
  }));
}

export const interviewService = {
  async scheduleInterview(rawInput: unknown, ctx: AuthContext): Promise<IInterview> {
    const data = scheduleInterviewSchema.parse(rawInput);

    const candidate = await candidateRepository.findById(data.candidateId, ctx.schoolId);
    if (!candidate) throw new NotFoundError('Candidate');
    if (candidate.status === 'rejected') throw new ValidationError('This candidate has already been rejected.');

    const interviewerNames = await Promise.all(data.interviewerIds.map(async (id) => {
      const emp = await employeeRepository.findById(id, ctx.schoolId);
      return emp?.fullName ?? 'Staff';
    }));

    const round = (await interviewRepository.countRoundsForCandidate(data.candidateId, ctx.schoolId)) + 1;

    const interview = await interviewRepository.create({
      schoolId:         ctx.schoolId,
      candidateId:      data.candidateId,
      round,
      scheduledAt:      new Date(data.scheduledAt),
      mode:             data.mode,
      interviewerIds:   data.interviewerIds,
      interviewerNames,
      createdBy:        ctx.displayName,
    });

    await candidateRepository.setStatus(data.candidateId, ctx.schoolId, { status: 'interview_scheduled' });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'interview.scheduled',
      resource: 'interviews', resourceId: interview._id.toString(),
      details: { candidateId: data.candidateId, round, scheduledAt: data.scheduledAt }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    void notifyInterviewers(
      data.interviewerIds, 'Interview scheduled',
      `${candidate.name} — ${candidate.positionApplied}, round ${round}`,
      ctx,
    ).catch(() => {});

    return interview;
  },

  async listInterviews(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedInterviews> {
    const opts = listInterviewsSchema.parse(rawQuery);
    return interviewRepository.findAll(ctx.schoolId, {
      page: opts.page, limit: opts.limit, candidateId: opts.candidateId, status: opts.status,
      dateFrom: opts.dateFrom ? new Date(opts.dateFrom) : undefined,
      dateTo: opts.dateTo ? new Date(opts.dateTo) : undefined,
    });
  },

  async getByCandidate(candidateId: string, ctx: AuthContext): Promise<IInterview[]> {
    return interviewRepository.findByCandidateId(candidateId, ctx.schoolId);
  },

  async getInterview(id: string, ctx: AuthContext): Promise<IInterview> {
    const interview = await interviewRepository.findById(id, ctx.schoolId);
    if (!interview) throw new NotFoundError('Interview');
    return interview;
  },

  async setStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<IInterview> {
    const { status } = setInterviewStatusSchema.parse(rawInput);
    const existing = await interviewService.getInterview(id, ctx);

    const interview = await interviewRepository.setStatus(id, ctx.schoolId, status);
    if (!interview) throw new NotFoundError('Interview');

    if (status === 'completed') {
      await candidateRepository.setStatus(existing.candidateId, ctx.schoolId, { status: 'interview_completed' });
    }

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'interview.status_changed',
      resource: 'interviews', resourceId: id, details: { from: existing.status, to: status }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return interview;
  },

  async reschedule(id: string, rawInput: unknown, ctx: AuthContext): Promise<IInterview> {
    const { scheduledAt } = rescheduleInterviewSchema.parse(rawInput);
    const existing = await interviewService.getInterview(id, ctx);
    await interviewRepository.setStatus(id, ctx.schoolId, 'rescheduled');

    const interview = await interviewRepository.reschedule(id, ctx.schoolId, new Date(scheduledAt));
    if (!interview) throw new NotFoundError('Interview');

    void notifyInterviewers(
      existing.interviewerIds, 'Interview rescheduled',
      `Round ${existing.round} moved to ${new Date(scheduledAt).toLocaleString('en-IN')}`,
      ctx,
    ).catch(() => {});

    return interview;
  },

  async submitFeedback(id: string, rawInput: unknown, ctx: AuthContext): Promise<IInterview> {
    const data = submitFeedbackSchema.parse(rawInput);
    const existing = await interviewService.getInterview(id, ctx);

    // `interviewerIds` on the interview are Employee ids (assigned via the
    // same staff-directory picker Module 1 built), not User ids — resolve
    // the caller's own linked Employee record to check they're actually one
    // of the assigned interviewers before letting them score this round.
    const callerEmployee = await employeeRepository.findByUserId(ctx.userId, ctx.schoolId);
    if (!callerEmployee || !existing.interviewerIds.includes(callerEmployee._id.toString())) {
      throw new ValidationError('You are not one of the interviewers assigned to this interview.');
    }
    if (existing.feedback.some((f) => f.interviewerId === callerEmployee._id.toString())) {
      throw new ValidationError('You have already submitted feedback for this interview.');
    }

    const criteriaScores = data.criteriaScores
      ? new Map(Object.entries(data.criteriaScores))
      : undefined;

    const interview = await interviewRepository.addFeedback(id, ctx.schoolId, {
      interviewerId:   callerEmployee._id.toString(),
      interviewerName: ctx.displayName,
      score:           data.score,
      criteriaScores,
      comments:        data.comments,
      recommendation:  data.recommendation,
      submittedAt:     new Date(),
    });
    if (!interview) throw new NotFoundError('Interview');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'interview.feedback_submitted',
      resource: 'interviews', resourceId: id, details: { score: data.score, recommendation: data.recommendation }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return interview;
  },

  async deleteInterview(id: string, ctx: AuthContext): Promise<void> {
    const existing = await interviewService.getInterview(id, ctx);
    const deleted = await interviewRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Interview');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'interview.deleted',
      resource: 'interviews', resourceId: id, details: { candidateId: existing.candidateId }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
