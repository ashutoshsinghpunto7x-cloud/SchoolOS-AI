import { AuthContext } from '../../lib/auth-context';
import { notificationService } from '../notifications/notification.service';
import { teacherRepository } from '../teachers/teacher.repository';
import { ISchoolEvent } from '../events/event.model';

// ── AI action notification fan-out ────────────────────────────────────────────
// Three notification/WhatsApp stacks exist in this repo. AI actions deliberately
// target only two: features/notifications/ (in-app + push — already wired into
// leave-requests, timetable, student-change-requests) and, if a WhatsApp/email
// channel is requested, features/communication/ (singular, has the bulk-send
// precedent in fee-notification.service.ts). features/communications/ (plural,
// Twilio-based) and integrations/providers/communication/ are legacy/parallel —
// do not wire new AI actions into them without an explicit decision to consolidate.

export async function notifyStaffMeetingCreated(
  event: ISchoolEvent,
  audience: ('all' | 'teachers' | 'staff')[],
  notifyChannels: ('app' | 'whatsapp' | 'email')[],
  ctx: AuthContext,
): Promise<number> {
  if (!audience.some((a) => a === 'teachers' || a === 'staff' || a === 'all')) return 0;
  if (!notifyChannels.includes('app')) return 0;

  const { teachers } = await teacherRepository.findAll(ctx.schoolId, { limit: 100 });
  if (!teachers.length) return 0;

  const result = await notificationService.sendToTeachers(
    {
      teacherIds: teachers.map((t) => String(t._id)),
      type: 'message',
      title: `New meeting: ${event.title}`,
      body: `${event.startDate.toISOString().slice(0, 10)} at ${event.startTime ?? ''}${
        event.location ? ` — ${event.location}` : ''
      }`,
      payload: { eventId: String(event._id) },
      priority: 'normal',
    },
    ctx,
  );

  // WhatsApp/email fan-out via features/communication/ is Phase 2 — the
  // notifyChannels field is captured on the event/preview today so the UI
  // already reflects intent, but the actual bulk-send wiring isn't built yet.

  return result.sent;
}
