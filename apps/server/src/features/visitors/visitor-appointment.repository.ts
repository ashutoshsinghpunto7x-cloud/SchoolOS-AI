import { VisitorAppointment, IVisitorAppointment, VisitorAppointmentStatus } from './visitor-appointment.model';

export interface CreateAppointmentData {
  schoolId: string;
  visitorName: string;
  visitorPhone: string;
  purpose: IVisitorAppointment['purpose'];
  purposeNote?: string;
  scheduledFor: Date;
  personToVisit: string;
  personToVisitId?: string;
  bookedById: string;
  bookedByName: string;
}

export interface FindAppointmentsOptions {
  page?: number;
  limit?: number;
  status?: VisitorAppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedAppointments {
  appointments: IVisitorAppointment[];
  total: number;
  page: number;
  limit: number;
}

const dayBounds = (dateStr: string): { start: Date; end: Date } => {
  const start = new Date(`${dateStr}T00:00:00.000+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
};

export const visitorAppointmentRepository = {
  async create(data: CreateAppointmentData): Promise<IVisitorAppointment> {
    const appointment = new VisitorAppointment({ ...data, status: 'scheduled' });
    return appointment.save();
  },

  async findById(id: string, schoolId: string): Promise<IVisitorAppointment | null> {
    return VisitorAppointment.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async findAll(schoolId: string, opts: FindAppointmentsOptions = {}): Promise<PaginatedAppointments> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.status) query.status = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      const range: Record<string, Date> = {};
      if (opts.dateFrom) range.$gte = dayBounds(opts.dateFrom).start;
      if (opts.dateTo)   range.$lte = dayBounds(opts.dateTo).end;
      query.scheduledFor = range;
    }

    const [appointments, total] = await Promise.all([
      VisitorAppointment.find(query).sort({ scheduledFor: 1 }).skip(skip).limit(limit).lean<IVisitorAppointment[]>(),
      VisitorAppointment.countDocuments(query),
    ]);

    return { appointments, total, page, limit };
  },

  async updateStatus(
    id: string, schoolId: string, status: VisitorAppointmentStatus, linkedVisitorId?: string,
  ): Promise<IVisitorAppointment | null> {
    const update: Record<string, unknown> = { status };
    if (linkedVisitorId) update.linkedVisitorId = linkedVisitorId;
    return VisitorAppointment.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: update },
      { new: true },
    );
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await VisitorAppointment.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },
};
