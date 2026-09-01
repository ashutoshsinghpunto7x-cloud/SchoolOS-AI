import {
  visitorAppointmentRepository,
  PaginatedAppointments,
} from './visitor-appointment.repository';
import { IVisitorAppointment } from './visitor-appointment.model';
import {
  createAppointmentSchema,
  listAppointmentsSchema,
  cancelAppointmentSchema,
} from './visitor.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export const visitorAppointmentService = {
  async createAppointment(rawInput: unknown, ctx: AuthContext): Promise<IVisitorAppointment> {
    const data = createAppointmentSchema.parse(rawInput);

    const appointment = await visitorAppointmentRepository.create({
      schoolId:        ctx.schoolId,
      visitorName:     data.visitorName,
      visitorPhone:    data.visitorPhone,
      purpose:         data.purpose,
      purposeNote:     data.purposeNote,
      scheduledFor:    new Date(data.scheduledFor),
      personToVisit:   data.personToVisit,
      personToVisitId: data.personToVisitId,
      bookedById:      ctx.userId,
      bookedByName:    ctx.displayName,
    });

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'visitor_appointment.booked',
      resource:        'visitor_appointments',
      resourceId:      appointment._id.toString(),
      details:         { visitorName: data.visitorName, scheduledFor: data.scheduledFor },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return appointment;
  },

  async listAppointments(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedAppointments> {
    const opts = listAppointmentsSchema.parse(rawQuery);
    return visitorAppointmentRepository.findAll(ctx.schoolId, opts);
  },

  async getAppointment(id: string, ctx: AuthContext): Promise<IVisitorAppointment> {
    const appointment = await visitorAppointmentRepository.findById(id, ctx.schoolId);
    if (!appointment) throw new NotFoundError('Appointment');
    return appointment;
  },

  async cancelAppointment(id: string, rawInput: unknown, ctx: AuthContext): Promise<IVisitorAppointment> {
    cancelAppointmentSchema.parse(rawInput);
    const existing = await visitorAppointmentRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Appointment');
    if (existing.status !== 'scheduled') {
      throw new ValidationError(`This appointment is already "${existing.status}".`);
    }

    const appointment = await visitorAppointmentRepository.updateStatus(id, ctx.schoolId, 'cancelled');
    if (!appointment) throw new NotFoundError('Appointment');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'visitor_appointment.cancelled',
      resource:        'visitor_appointments',
      resourceId:      id,
      details:         { visitorName: existing.visitorName },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return appointment;
  },

  async markNoShow(id: string, ctx: AuthContext): Promise<IVisitorAppointment> {
    const existing = await visitorAppointmentRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Appointment');
    if (existing.status !== 'scheduled') {
      throw new ValidationError(`This appointment is already "${existing.status}".`);
    }

    const appointment = await visitorAppointmentRepository.updateStatus(id, ctx.schoolId, 'no_show');
    if (!appointment) throw new NotFoundError('Appointment');
    return appointment;
  },
};
