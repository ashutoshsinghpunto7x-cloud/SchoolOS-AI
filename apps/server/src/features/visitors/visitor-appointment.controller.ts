import { Request, Response, NextFunction } from 'express';
import { visitorAppointmentService } from './visitor-appointment.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const visitorAppointmentController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx         = buildAuthContext(req.user!);
      const appointment = await visitorAppointmentService.createAppointment(req.body, ctx);
      sendCreated(res, appointment, 'Appointment booked');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await visitorAppointmentService.listAppointments(req.query, ctx);
      sendPaginated(res, result.appointments, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx         = buildAuthContext(req.user!);
      const appointment = await visitorAppointmentService.getAppointment(req.params.id, ctx);
      sendSuccess(res, appointment);
    } catch (err) { next(err); }
  },

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx         = buildAuthContext(req.user!);
      const appointment = await visitorAppointmentService.cancelAppointment(req.params.id, req.body, ctx);
      sendSuccess(res, appointment, 'Appointment cancelled');
    } catch (err) { next(err); }
  },

  async markNoShow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx         = buildAuthContext(req.user!);
      const appointment = await visitorAppointmentService.markNoShow(req.params.id, ctx);
      sendSuccess(res, appointment, 'Appointment marked as no-show');
    } catch (err) { next(err); }
  },
};
