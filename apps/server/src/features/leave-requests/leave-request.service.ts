import { leaveRequestRepository } from './leave-request.repository';
import { User } from '../users/user.model';
import { Teacher, ITeacher } from '../teachers/teacher.model';
import { notificationService } from '../notifications/notification.service';
import { auditService } from '../audit/audit.service';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { createLeaveRequestSchema, rejectLeaveRequestSchema } from './leave-request.validation';
import type { ILeaveRequest } from './leave-request.model';

// Resolve User → Teacher via email (JWT has userId = User._id) — same pattern as teacher-workspace.service.ts
async function resolveTeacher(ctx: AuthContext): Promise<ITeacher & { _id: { toString(): string } }> {
  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) {
    throw new ForbiddenError('Your user account has no email — cannot link to a teacher profile');
  }

  const teacher = await Teacher.findOne({
    schoolId: ctx.schoolId,
    email: user.email,
    isDeleted: false,
  }).lean() as unknown as (ITeacher & { _id: { toString(): string } }) | null;

  if (!teacher) {
    throw new NotFoundError(
      'Teacher profile not found. Ask your administrator to set your email on the teacher record.',
    );
  }
  return teacher;
}

const toApiShape = (req: ILeaveRequest) => ({
  _id: String((req as unknown as { _id: { toString(): string } })._id),
  schoolId: req.schoolId,
  teacherId: req.teacherId,
  teacherName: req.teacherName,
  requestedByUserId: req.requestedByUserId,
  leaveType: req.leaveType,
  dateFrom: req.dateFrom,
  dateTo: req.dateTo,
  reason: req.reason,
  status: req.status,
  reviewedByName: req.reviewedByName,
  reviewNote: req.reviewNote,
  reviewedAt: req.reviewedAt ? new Date(req.reviewedAt).toISOString() : undefined,
  createdAt: new Date(req.createdAt).toISOString(),
  updatedAt: new Date(req.updatedAt).toISOString(),
});

export const leaveRequestService = {
  async create(rawInput: unknown, ctx: AuthContext) {
    const input = createLeaveRequestSchema.parse(rawInput);
    const teacher = await resolveTeacher(ctx);

    const request = await leaveRequestRepository.create({
      schoolId: ctx.schoolId,
      teacherId: String(teacher._id),
      teacherName: teacher.fullName,
      requestedByUserId: ctx.userId,
      leaveType: input.leaveType,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      reason: input.reason,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'leave_request.created',
      resource: 'leave_requests',
      resourceId: String((request as unknown as { _id: { toString(): string } })._id),
      details: { leaveType: input.leaveType, dateFrom: input.dateFrom, dateTo: input.dateTo },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    await notificationService.sendToApprovers(
      {
        type: 'leave_request',
        title: `Leave request — ${ctx.displayName}`,
        body: `${ctx.displayName} requested ${input.leaveType === 'full_day' ? 'full-day' : 'half-day'} leave (${input.dateFrom}${input.dateTo !== input.dateFrom ? ` to ${input.dateTo}` : ''}).`,
        payload: { leaveRequestId: String((request as unknown as { _id: { toString(): string } })._id) },
      },
      ctx,
    );

    return toApiShape(request);
  },

  async getById(id: string, ctx: AuthContext) {
    const request = await leaveRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Leave request');

    const canReview = ctx.role === 'admin' || ctx.role === 'principal';
    if (!canReview && request.requestedByUserId !== ctx.userId) {
      throw new ForbiddenError('You can only view your own leave requests');
    }

    return toApiShape(request);
  },

  async listMine(ctx: AuthContext) {
    const teacher = await resolveTeacher(ctx);
    const requests = await leaveRequestRepository.findMine(ctx.schoolId, String(teacher._id));
    return requests.map(toApiShape);
  },

  async listPending(ctx: AuthContext) {
    const requests = await leaveRequestRepository.findPending(ctx.schoolId);
    return requests.map(toApiShape);
  },

  async approve(id: string, ctx: AuthContext) {
    const request = await leaveRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Leave request');
    if (request.status !== 'pending') throw new ValidationError('This request has already been reviewed.');

    const updated = await leaveRequestRepository.markApproved(id, ctx.displayName);
    if (!updated) throw new NotFoundError('Leave request');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'leave_request.approved',
      resource: 'leave_requests',
      resourceId: id,
      details: { teacherId: request.teacherId, dateFrom: request.dateFrom, dateTo: request.dateTo },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    await notificationService.sendToUser(
      {
        recipientUserId: request.requestedByUserId,
        type: 'leave_request',
        title: 'Leave approved',
        body: `${ctx.displayName} approved your leave request for ${request.dateFrom}${request.dateTo !== request.dateFrom ? ` to ${request.dateTo}` : ''}.`,
        payload: { leaveRequestId: id },
      },
      ctx,
    );

    return toApiShape(updated);
  },

  async reject(id: string, rawInput: unknown, ctx: AuthContext) {
    const { reviewNote } = rejectLeaveRequestSchema.parse(rawInput);

    const request = await leaveRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Leave request');
    if (request.status !== 'pending') throw new ValidationError('This request has already been reviewed.');

    const updated = await leaveRequestRepository.markRejected(id, ctx.displayName, reviewNote);
    if (!updated) throw new NotFoundError('Leave request');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'leave_request.rejected',
      resource: 'leave_requests',
      resourceId: id,
      details: { teacherId: request.teacherId, reviewNote },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    await notificationService.sendToUser(
      {
        recipientUserId: request.requestedByUserId,
        type: 'leave_request',
        title: 'Leave rejected',
        body: reviewNote
          ? `${ctx.displayName} rejected your leave request: ${reviewNote}`
          : `${ctx.displayName} rejected your leave request.`,
        payload: { leaveRequestId: id },
      },
      ctx,
    );

    return toApiShape(updated);
  },
};
