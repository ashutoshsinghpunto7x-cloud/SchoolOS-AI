import { z } from 'zod';
import { ActionDefinition, ActionPreview, ActionResultSummary, PreviewField } from '../action-registry';
import { AuthContext } from '../../../lib/auth-context';
import { PERMISSIONS } from '../../../lib/permissions';
import { eventService } from '../../events/event.service';
import { eventRepository } from '../../events/event.repository';
import { ISchoolEvent } from '../../events/event.model';
import { teacherRepository } from '../../teachers/teacher.repository';
import { notifyStaffMeetingCreated } from '../action-notify';

// ── "Schedule a staff meeting" — Phase 1 reference action ────────────────────
// Reuses eventService.createEvent untouched (EventType already has
// 'staff_meeting'), proving the engine calls real feature services rather
// than reimplementing business logic.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % (24 * 60)) / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export const meetingActionParamsSchema = z.object({
  title: z.string().trim().min(1).max(200).default('Staff Meeting'),
  date: z.string().regex(DATE_REGEX, 'Expected YYYY-MM-DD').default(tomorrowISO),
  startTime: z.string().regex(TIME_REGEX, 'Expected HH:MM').default('10:00'),
  endTime: z.string().regex(TIME_REGEX, 'Expected HH:MM').optional(),
  location: z.string().trim().max(500).default('Conference Hall'),
  audience: z.array(z.enum(['all', 'teachers', 'staff'])).min(1).default(['teachers']),
  agenda: z.string().trim().max(2000).default(''),
  notifyChannels: z.array(z.enum(['app', 'whatsapp', 'email'])).min(1).default(['app']),
});

export type MeetingActionParams = z.infer<typeof meetingActionParamsSchema>;

interface MeetingPreviewData {
  endTime: string;
  attendeeCount: number;
  warnings: string[];
}

interface MeetingActionResult {
  event: ISchoolEvent;
  notifiedCount: number;
}

async function resolveAttendeeCount(schoolId: string, audience: MeetingActionParams['audience']): Promise<number> {
  if (!audience.some((a) => a === 'teachers' || a === 'staff' || a === 'all')) return 0;
  const { total } = await teacherRepository.findAll(schoolId, { limit: 1 });
  return total;
}

export const meetingAction: ActionDefinition<MeetingActionParams, MeetingPreviewData, MeetingActionResult> = {
  id: 'SCHEDULE_STAFF_MEETING',
  description:
    'Schedule a staff meeting — e.g. "schedule a staff meeting tomorrow at 10am", "set up a meeting with teachers about exam prep".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: meetingActionParamsSchema,
  paramsShapeDescription: `
Fields:
- title (string): a short meeting title, e.g. "Staff Meeting" or "Annual Function Planning".
- date (string, YYYY-MM-DD): the meeting date. Resolve relative dates like "tomorrow" against today's date.
- startTime (string, HH:MM 24-hour): the start time.
- endTime (string, HH:MM 24-hour, optional): only if an end time or explicit duration was stated.
- location (string): venue, e.g. "Conference Hall", "Staff Room".
- audience (array of "all" | "teachers" | "staff"): who is invited. Default to ["teachers"] for a generic "staff meeting".
- agenda (string): what the meeting is about, from the message.
- notifyChannels (array of "app" | "whatsapp" | "email"): which channels to notify on. Default to ["app"] unless the message names others.
`.trim(),

  async buildPreview(ctx: AuthContext, params: MeetingActionParams): Promise<MeetingPreviewData> {
    const endTime = params.endTime ?? addMinutes(params.startTime, 45);
    const warnings: string[] = [];

    const [attendeeCount, sameDay] = await Promise.all([
      resolveAttendeeCount(ctx.schoolId, params.audience),
      eventRepository.findAll(ctx.schoolId, {
        startFrom: params.date,
        startTo: params.date,
        status: 'published',
      }),
    ]);

    const overlapping = sameDay.events.find(
      (e) =>
        e.eventType === 'staff_meeting' &&
        e.startTime &&
        e.endTime &&
        timeRangesOverlap(params.startTime, endTime, e.startTime, e.endTime),
    );
    if (overlapping) {
      warnings.push(
        `Another staff meeting ("${overlapping.title}") is already scheduled ${overlapping.startTime}–${overlapping.endTime} on this date.`,
      );
    }

    return { endTime, attendeeCount, warnings };
  },

  describePreview(preview: MeetingPreviewData, params: MeetingActionParams): ActionPreview {
    const fields: PreviewField[] = [
      { key: 'title', label: 'Title', value: params.title, type: 'text', editable: true },
      { key: 'date', label: 'Date', value: params.date, type: 'date', editable: true },
      { key: 'startTime', label: 'Start Time', value: params.startTime, type: 'time', editable: true },
      { key: 'endTime', label: 'End Time', value: preview.endTime, type: 'time', editable: true },
      { key: 'location', label: 'Venue', value: params.location, type: 'text', editable: true },
      {
        key: 'audience',
        label: 'Attendees',
        value: params.audience,
        type: 'multiselect',
        editable: true,
        options: [
          { value: 'teachers', label: 'All Teachers' },
          { value: 'staff', label: 'All Staff' },
          { value: 'all', label: 'Everyone' },
        ],
      },
      {
        key: 'attendeeCount',
        label: 'Approx. Recipients',
        value: `${preview.attendeeCount} teacher${preview.attendeeCount === 1 ? '' : 's'}`,
        type: 'text',
        editable: false,
      },
      { key: 'agenda', label: 'Agenda', value: params.agenda, type: 'textarea', editable: true },
      {
        key: 'notifyChannels',
        label: 'Notifications',
        value: params.notifyChannels,
        type: 'multiselect',
        editable: true,
        options: [
          { value: 'app', label: 'App' },
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'email', label: 'Email' },
        ],
      },
    ];

    return {
      title: 'Staff Meeting',
      fields,
      warnings: preview.warnings.length ? preview.warnings : undefined,
    };
  },

  async execute(ctx: AuthContext, params: MeetingActionParams): Promise<MeetingActionResult> {
    const endTime = params.endTime ?? addMinutes(params.startTime, 45);

    const event = await eventService.createEvent(
      {
        title: params.title,
        eventType: 'staff_meeting',
        status: 'published',
        startDate: params.date,
        endDate: params.date,
        startTime: params.startTime,
        endTime,
        isAllDay: false,
        location: params.location,
        audience: params.audience,
        notes: params.agenda || undefined,
      },
      ctx,
    );

    const notifiedCount = await notifyStaffMeetingCreated(event, params.audience, params.notifyChannels, ctx);

    return { event, notifiedCount };
  },

  describeResult(result: MeetingActionResult): ActionResultSummary {
    const date = result.event.startDate.toISOString().slice(0, 10);
    return {
      summary: `"${result.event.title}" scheduled for ${date} at ${result.event.startTime}${
        result.event.location ? ` in ${result.event.location}` : ''
      }.`,
      notifiedCount: result.notifiedCount,
    };
  },
};
