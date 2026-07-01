import { SchoolEvent, ISchoolEvent, EventType, EventStatus, EventAudience } from './event.model';

export interface CreateEventData {
  schoolId: string;
  title: string;
  description?: string;
  eventType: EventType;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  location?: string;
  audience: EventAudience[];
  organizer?: string;
  notes?: string;
  tags: string[];
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export interface FindEventsOptions {
  page?: number;
  limit?: number;
  search?: string;
  eventType?: EventType;
  status?: EventStatus;
  audience?: EventAudience;
  startFrom?: string;
  startTo?: string;
  month?: number;
  year?: number;
  sortBy?: 'startDate' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedEvents {
  events: ISchoolEvent[];
  total: number;
  page: number;
  limit: number;
}

export const eventRepository = {
  async create(data: CreateEventData): Promise<ISchoolEvent> {
    const event = new SchoolEvent(data);
    return event.save();
  },

  async findById(id: string, schoolId: string): Promise<ISchoolEvent | null> {
    return SchoolEvent.findOne({ _id: id, schoolId, isDeleted: false }).lean<ISchoolEvent>();
  },

  async findAll(schoolId: string, opts: FindEventsOptions = {}): Promise<PaginatedEvents> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const escaped = opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = new RegExp(escaped, 'i');
    }
    if (opts.eventType) query.eventType = opts.eventType;
    if (opts.status)    query.status    = opts.status;
    if (opts.audience)  query.audience  = opts.audience;

    if (opts.year || opts.month) {
      const year  = opts.year ?? new Date().getFullYear();
      const month = opts.month;
      if (month) {
        const from = new Date(year, month - 1, 1);
        const to   = new Date(year, month, 0, 23, 59, 59, 999);
        query.startDate = { $lte: to };
        query.endDate   = { $gte: from };
      } else {
        const from = new Date(year, 0, 1);
        const to   = new Date(year, 11, 31, 23, 59, 59, 999);
        query.startDate = { $lte: to };
        query.endDate   = { $gte: from };
      }
    } else if (opts.startFrom || opts.startTo) {
      const range: Record<string, Date> = {};
      if (opts.startFrom) range.$gte = new Date(opts.startFrom);
      if (opts.startTo)   range.$lte = new Date(opts.startTo);
      query.startDate = range;
    }

    const sortField = opts.sortBy ?? 'startDate';
    const sortDir   = opts.sortOrder === 'desc' ? -1 : 1;

    const [events, total] = await Promise.all([
      SchoolEvent.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean<ISchoolEvent[]>(),
      SchoolEvent.countDocuments(query),
    ]);

    return { events, total, page, limit };
  },

  async findUpcoming(schoolId: string, limit: number, days: number): Promise<ISchoolEvent[]> {
    const now = new Date();
    const to  = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return SchoolEvent.find({
      schoolId,
      isDeleted: false,
      status: { $in: ['scheduled', 'published'] },
      startDate: { $lte: to },
      endDate:   { $gte: now },
    })
      .sort({ startDate: 1 })
      .limit(limit)
      .lean<ISchoolEvent[]>();
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<ISchoolEvent> & { updatedBy?: string },
  ): Promise<ISchoolEvent | null> {
    return SchoolEvent.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<ISchoolEvent>();
  },

  async updateStatus(
    id: string,
    schoolId: string,
    status: EventStatus,
    updatedBy: string,
  ): Promise<ISchoolEvent | null> {
    return SchoolEvent.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { status, updatedBy } },
      { new: true },
    ).lean<ISchoolEvent>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await SchoolEvent.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },
};
