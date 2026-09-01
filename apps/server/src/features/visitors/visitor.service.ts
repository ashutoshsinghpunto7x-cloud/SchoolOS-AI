import {
  visitorRepository,
  PaginatedVisitors,
} from './visitor.repository';
import { IVisitor, VisitorStatus } from './visitor.model';
import {
  createVisitorSchema,
  checkOutVisitorSchema,
  listVisitorsSchema,
  updateVisitorStatusSchema,
  setIdProofSchema,
} from './visitor.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { uploadToR2 } from '../../lib/r2-storage';
import { employeeRepository } from '../employees/employee.repository';
import { notificationService } from '../notifications/notification.service';
import { visitorAppointmentRepository } from './visitor-appointment.repository';

// Reception Management Module SRD, Module 1 — allowed status transitions.
// Anything not listed here is rejected with a clear error rather than
// silently applied, so the UI can't put a visitor in an impossible state
// (e.g. "completed" without ever having been "approved").
const STATUS_TRANSITIONS: Record<VisitorStatus, VisitorStatus[]> = {
  waiting:    ['approved', 'cancelled'],
  approved:   ['in_meeting', 'completed', 'cancelled'],
  in_meeting: ['completed'],
  completed:  [],
  cancelled:  [],
};

function generatePassNumber(): string {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `VP-${stamp}-${rand}`;
}

export const visitorService = {
  async createVisitor(rawInput: unknown, ctx: AuthContext): Promise<IVisitor> {
    const data = createVisitorSchema.parse(rawInput);

    const visitor = await visitorRepository.create({
      schoolId:        ctx.schoolId,
      name:            data.name,
      contactNumber:   data.contactNumber,
      purpose:         data.purpose,
      purposeNote:     data.purposeNote,
      personToVisit:   data.personToVisit,
      personToVisitId: data.personToVisitId,
      appointmentId:   data.appointmentId,
      checkInTime:     data.checkInTime ? new Date(data.checkInTime) : new Date(),
      recordedById:    ctx.userId,
      recordedByName:  ctx.displayName,
    });

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'visitor.checked_in',
      resource:        'visitors',
      resourceId:      visitor._id.toString(),
      details:         { name: data.name, purpose: data.purpose, personToVisit: data.personToVisit },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    // Best-effort: notify the staff member being visited, if picked from the
    // directory and linked to a login. Never blocks check-in on failure.
    if (data.personToVisitId) {
      void notifyStaffOfArrival(data.personToVisitId, data.name, ctx).catch(() => {});
    }

    return visitor;
  },

  async listVisitors(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedVisitors> {
    const opts = listVisitorsSchema.parse(rawQuery);
    return visitorRepository.findAll(ctx.schoolId, opts);
  },

  async getVisitor(id: string, ctx: AuthContext): Promise<IVisitor> {
    const visitor = await visitorRepository.findById(id, ctx.schoolId);
    if (!visitor) throw new NotFoundError('Visitor');
    return visitor;
  },

  /** Past visits by this visitor's phone number — repeat vendors/parents. */
  async getVisitorHistory(id: string, ctx: AuthContext): Promise<IVisitor[]> {
    const visitor = await visitorRepository.findById(id, ctx.schoolId);
    if (!visitor) throw new NotFoundError('Visitor');
    return visitorRepository.findHistoryByPhone(ctx.schoolId, visitor.contactNumber, id);
  },

  async updateStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<IVisitor> {
    const { status: nextStatus, cancelReason } = updateVisitorStatusSchema.parse(rawInput);
    const existing = await visitorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Visitor');

    const allowed = STATUS_TRANSITIONS[existing.status];
    if (!allowed.includes(nextStatus)) {
      throw new ValidationError(
        `Cannot move a visitor from "${existing.status}" to "${nextStatus}". ` +
        `Allowed next steps: ${allowed.length ? allowed.join(', ') : 'none — this is a final state'}.`
      );
    }

    const update: Parameters<typeof visitorRepository.updateStatus>[2] = { status: nextStatus };

    if (nextStatus === 'approved') {
      update.passNumber = generatePassNumber();
      update.passIssuedAt = new Date();
      // Pass is valid for the rest of the school day — visitors don't carry
      // it over to a next visit.
      const validUntil = new Date();
      validUntil.setHours(23, 59, 59, 999);
      update.passValidUntil = validUntil;
    }
    if (nextStatus === 'cancelled') {
      update.cancelledAt = new Date();
      update.cancelReason = cancelReason;
    }

    const visitor = await visitorRepository.updateStatus(id, ctx.schoolId, update);
    if (!visitor) throw new NotFoundError('Visitor');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          `visitor.status_${nextStatus}`,
      resource:        'visitors',
      resourceId:      id,
      details:         { name: existing.name, from: existing.status, to: nextStatus },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return visitor;
  },

  async uploadPhoto(id: string, file: Express.Multer.File, ctx: AuthContext): Promise<IVisitor> {
    const existing = await visitorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Visitor');

    const { key, url } = await uploadToR2(file.buffer, file.mimetype, 'visitors/photos', ctx.schoolId);
    const visitor = await visitorRepository.setPhoto(id, ctx.schoolId, url, key);
    if (!visitor) throw new NotFoundError('Visitor');
    return visitor;
  },

  async uploadIdProof(id: string, rawInput: unknown, file: Express.Multer.File, ctx: AuthContext): Promise<IVisitor> {
    const { idProofType } = setIdProofSchema.parse(rawInput);
    const existing = await visitorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Visitor');

    const { key, url } = await uploadToR2(file.buffer, file.mimetype, 'visitors/id-proofs', ctx.schoolId);
    const visitor = await visitorRepository.setIdProof(id, ctx.schoolId, idProofType, url, key);
    if (!visitor) throw new NotFoundError('Visitor');
    return visitor;
  },

  async checkOutVisitor(id: string, rawInput: unknown, ctx: AuthContext): Promise<IVisitor> {
    const existing = await visitorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Visitor');
    if (existing.checkOutTime) throw new ValidationError('Visitor has already been checked out');

    const { checkOutTime } = checkOutVisitorSchema.parse(rawInput);

    const visitor = await visitorRepository.checkOut(
      id,
      ctx.schoolId,
      checkOutTime ? new Date(checkOutTime) : new Date(),
    );
    if (!visitor) throw new NotFoundError('Visitor');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'visitor.checked_out',
      resource:        'visitors',
      resourceId:      id,
      details:         { name: existing.name },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return visitor;
  },

  async deleteVisitor(id: string, ctx: AuthContext): Promise<void> {
    const existing = await visitorRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Visitor');

    const deleted = await visitorRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Visitor');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'visitor.deleted',
      resource:        'visitors',
      resourceId:      id,
      details:         { name: existing.name },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },

  /** Converts a scheduled appointment into an actual visitor check-in when
   *  the person shows up, pre-filled from what was booked. */
  async arriveFromAppointment(appointmentId: string, ctx: AuthContext): Promise<IVisitor> {
    const appointment = await visitorAppointmentRepository.findById(appointmentId, ctx.schoolId);
    if (!appointment) throw new NotFoundError('Appointment');
    if (appointment.status !== 'scheduled') {
      throw new ValidationError(`This appointment is already "${appointment.status}".`);
    }

    const visitor = await visitorService.createVisitor({
      name: appointment.visitorName,
      contactNumber: appointment.visitorPhone,
      purpose: appointment.purpose,
      purposeNote: appointment.purposeNote,
      personToVisit: appointment.personToVisit,
      personToVisitId: appointment.personToVisitId,
      appointmentId,
    }, ctx);

    await visitorAppointmentRepository.updateStatus(appointmentId, ctx.schoolId, 'arrived', visitor._id.toString());

    return visitor;
  },
};

async function notifyStaffOfArrival(employeeId: string, visitorName: string, ctx: AuthContext): Promise<void> {
  const employee = await employeeRepository.findById(employeeId, ctx.schoolId);
  if (!employee?.userId) return; // no linked login — nothing to notify

  await notificationService.sendToUser({
    recipientUserId: employee.userId,
    type: 'message',
    title: 'Visitor at reception',
    body: `${visitorName} has arrived to see you.`,
  }, ctx);
}
