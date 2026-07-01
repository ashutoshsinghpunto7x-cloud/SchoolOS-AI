import { eventRepository, CreateEventData, PaginatedEvents } from './event.repository';
import { ISchoolEvent, EventStatus } from './event.model';
import {
  createEventSchema,
  updateEventSchema,
  updateStatusSchema,
  listEventsSchema,
  upcomingEventsSchema,
} from './event.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

const STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft:     ['scheduled', 'cancelled'],
  scheduled: ['published', 'cancelled'],
  published: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const eventService = {
  async createEvent(rawInput: unknown, ctx: AuthContext): Promise<ISchoolEvent> {
    const data = createEventSchema.parse(rawInput);

    const createData: CreateEventData = {
      schoolId:    ctx.schoolId,
      title:       data.title,
      description: data.description,
      eventType:   data.eventType,
      status:      data.status,
      startDate:   new Date(data.startDate),
      endDate:     new Date(data.endDate),
      startTime:   data.startTime,
      endTime:     data.endTime,
      isAllDay:    data.isAllDay,
      location:    data.location,
      audience:    data.audience,
      organizer:   data.organizer,
      notes:       data.notes,
      tags:        data.tags,
      createdBy:   ctx.displayName,
      metadata:    data.metadata,
    };

    const event = await eventRepository.create(createData);

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'event.created',
      resource:        'events',
      resourceId:      event._id.toString(),
      details:         { title: data.title, eventType: data.eventType, status: data.status },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return event;
  },

  async listEvents(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedEvents> {
    const opts = listEventsSchema.parse(rawQuery);
    return eventRepository.findAll(ctx.schoolId, opts);
  },

  async getEvent(id: string, ctx: AuthContext): Promise<ISchoolEvent> {
    const event = await eventRepository.findById(id, ctx.schoolId);
    if (!event) throw new NotFoundError('Event');
    return event;
  },

  async getUpcoming(rawQuery: unknown, ctx: AuthContext): Promise<ISchoolEvent[]> {
    const { limit, days } = upcomingEventsSchema.parse(rawQuery);
    return eventRepository.findUpcoming(ctx.schoolId, limit, days);
  },

  async updateEvent(id: string, rawInput: unknown, ctx: AuthContext): Promise<ISchoolEvent> {
    const data = updateEventSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const existing = await eventRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Event');

    const update: Partial<ISchoolEvent> & { updatedBy: string } = {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate:   data.endDate   ? new Date(data.endDate)   : undefined,
      updatedBy: ctx.displayName,
    };

    const event = await eventRepository.update(id, ctx.schoolId, update);
    if (!event) throw new NotFoundError('Event');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'event.updated',
      resource:        'events',
      resourceId:      id,
      details:         { fields: Object.keys(data) },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return event;
  },

  async updateStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<ISchoolEvent> {
    const { status } = updateStatusSchema.parse(rawInput);

    const existing = await eventRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Event');

    if (!STATUS_TRANSITIONS[existing.status].includes(status)) {
      throw new ValidationError(
        `Cannot transition from '${existing.status}' to '${status}'`
      );
    }

    const event = await eventRepository.updateStatus(id, ctx.schoolId, status, ctx.displayName);
    if (!event) throw new NotFoundError('Event');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'event.status_changed',
      resource:        'events',
      resourceId:      id,
      details:         { from: existing.status, to: status },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return event;
  },

  async deleteEvent(id: string, ctx: AuthContext): Promise<void> {
    const existing = await eventRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Event');

    const deleted = await eventRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Event');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'event.deleted',
      resource:        'events',
      resourceId:      id,
      details:         { title: existing.title, eventType: existing.eventType },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },
};
