import { studentChangeRequestRepository } from './student-change-request.repository';
import { studentRepository } from '../students/student.repository';
import { studentService } from '../students/student.service';
import { notificationService } from '../notifications/notification.service';
import { auditService } from '../audit/audit.service';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import {
  createChangeRequestSchema,
  rejectChangeRequestSchema,
} from './student-change-request.validation';
import type { IStudentChangeRequest } from './student-change-request.model';

const toApiShape = (req: IStudentChangeRequest) => ({
  _id: String((req as unknown as { _id: { toString(): string } })._id),
  schoolId: req.schoolId,
  studentId: req.studentId,
  studentName: req.studentName,
  requestedByUserId: req.requestedByUserId,
  requestedByName: req.requestedByName,
  changes: req.changes,
  previousValues: req.previousValues,
  status: req.status,
  reviewedByName: req.reviewedByName,
  reviewNote: req.reviewNote,
  reviewedAt: req.reviewedAt ? new Date(req.reviewedAt).toISOString() : undefined,
  createdAt: new Date(req.createdAt).toISOString(),
  updatedAt: new Date(req.updatedAt).toISOString(),
});

export const studentChangeRequestService = {
  async create(rawInput: unknown, ctx: AuthContext) {
    const input = createChangeRequestSchema.parse(rawInput);

    const student = await studentRepository.findById(input.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const changedKeys = Object.keys(input.changes);
    const previousValues: Record<string, unknown> = {};
    for (const key of changedKeys) {
      previousValues[key] = (student as unknown as Record<string, unknown>)[key];
    }

    const request = await studentChangeRequestRepository.create({
      studentId: input.studentId,
      studentName: student.fullName,
      schoolId: ctx.schoolId,
      requestedByUserId: ctx.userId,
      requestedByName: ctx.displayName,
      changes: input.changes,
      previousValues,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.change_requested',
      resource: 'student_change_requests',
      resourceId: String((request as unknown as { _id: { toString(): string } })._id),
      details: { studentId: input.studentId, fields: changedKeys },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    await notificationService.sendToApprovers(
      {
        type: 'change_request',
        title: `Edit request — ${student.fullName}`,
        body: `${ctx.displayName} wants to update ${changedKeys.join(', ')} for ${student.fullName}.`,
        payload: { studentChangeRequestId: String((request as unknown as { _id: { toString(): string } })._id) },
      },
      ctx,
    );

    return toApiShape(request);
  },

  async listPending(ctx: AuthContext) {
    const requests = await studentChangeRequestRepository.findPending(ctx.schoolId);
    return requests.map(toApiShape);
  },

  async listPendingForStudent(studentId: string, ctx: AuthContext) {
    const requests = await studentChangeRequestRepository.findPendingForStudent(ctx.schoolId, studentId);
    return requests.map(toApiShape);
  },

  async approve(id: string, ctx: AuthContext) {
    const request = await studentChangeRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Change request');
    if (request.status !== 'pending') throw new ValidationError('This request has already been reviewed.');

    await studentService.updateStudent(request.studentId, request.changes, ctx);

    const updated = await studentChangeRequestRepository.markApproved(id, ctx.displayName);
    if (!updated) throw new NotFoundError('Change request');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.change_approved',
      resource: 'student_change_requests',
      resourceId: id,
      details: { studentId: request.studentId, fields: Object.keys(request.changes) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    await notificationService.sendToUser(
      {
        recipientUserId: request.requestedByUserId,
        type: 'change_request',
        title: `Edit approved — ${request.studentName}`,
        body: `${ctx.displayName} approved your requested changes to ${request.studentName}.`,
        payload: { studentChangeRequestId: id },
      },
      ctx,
    );

    return toApiShape(updated);
  },

  async reject(id: string, rawInput: unknown, ctx: AuthContext) {
    const { reviewNote } = rejectChangeRequestSchema.parse(rawInput);

    const request = await studentChangeRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Change request');
    if (request.status !== 'pending') throw new ValidationError('This request has already been reviewed.');

    const updated = await studentChangeRequestRepository.markRejected(id, ctx.displayName, reviewNote);
    if (!updated) throw new NotFoundError('Change request');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'student.change_rejected',
      resource: 'student_change_requests',
      resourceId: id,
      details: { studentId: request.studentId, reviewNote },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    await notificationService.sendToUser(
      {
        recipientUserId: request.requestedByUserId,
        type: 'change_request',
        title: `Edit rejected — ${request.studentName}`,
        body: reviewNote
          ? `${ctx.displayName} rejected your requested changes to ${request.studentName}: ${reviewNote}`
          : `${ctx.displayName} rejected your requested changes to ${request.studentName}.`,
        payload: { studentChangeRequestId: id },
      },
      ctx,
    );

    return toApiShape(updated);
  },
};
