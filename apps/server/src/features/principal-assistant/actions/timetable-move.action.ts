import { z } from 'zod';
import { ActionDefinition, ActionPreview, ActionResultSummary, PreviewField } from '../action-registry';
import { AuthContext } from '../../../lib/auth-context';
import { PERMISSIONS } from '../../../lib/permissions';
import { ValidationError } from '../../../middlewares/errorHandler';
import { timetableService } from '../../timetable/timetable.service';
import { timetableRepository } from '../../timetable/timetable.repository';
import { periodSlotRepository } from '../../timetable/timetable.period.repository';
import { ITimetable, ITimetableEntry } from '../../timetable/timetable.model';
import { IPeriodSlot } from '../../timetable/timetable.period.model';
import { notifyTimetableMoved } from '../action-notify';

// ── "Move a timetable period" — Phase 2 reference action ─────────────────────
// Unlike the meeting action, timetableService has no "move" operation to call
// directly — this action composes removeEntry + upsertEntry (twice, if the
// target period already holds a different subject, to swap rather than
// silently overwrite). Subject identity is always resolved server-side from
// the real Timetable doc — never trusted from the LLM's extraction.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Timetable entries only exist for days 1-6; skip Sunday
  return d.toISOString().slice(0, 10);
}

// Converting "tomorrow"/weekday names to a day-of-week NUMBER is exactly the
// kind of date arithmetic LLMs get wrong (confirmed empirically — asking the
// model for dayOfWeek directly returned today's day, not tomorrow's). Instead
// the model only ever extracts a calendar date string (same as the meeting
// action's `date` field); the day-of-week is derived deterministically here.
function dateToDayOfWeek(dateStr: string): number {
  const dow = new Date(`${dateStr}T00:00:00`).getDay(); // 0=Sun..6=Sat
  return dow === 0 ? 1 : dow; // no Monday-Saturday-only school day for Sunday; treat as Monday
}

export const timetableMoveActionParamsSchema = z.object({
  class: z.string().trim().min(1).max(20).default(''),
  section: z.string().trim().min(1).max(10).default(''),
  date: z.string().regex(DATE_REGEX, 'Expected YYYY-MM-DD').default(tomorrowISO),
  fromPeriod: z.number().int().min(1).default(1),
  toPeriod: z.number().int().min(1).default(2),
  bumpedSlotAction: z.array(z.enum(['swap', 'overwrite'])).max(1).default(['swap']),
});

export type TimetableMoveActionParams = z.infer<typeof timetableMoveActionParamsSchema>;

interface MoveContext {
  tt: ITimetable;
  fromSlot: IPeriodSlot;
  toSlot: IPeriodSlot;
  sourceEntry: ITimetableEntry;
  targetEntry: ITimetableEntry | null;
  dayOfWeek: number;
  dayName: string;
}

interface TimetableMovePreviewData {
  fatal: boolean;
  fatalReason?: string;
  dayName: string;
  fromSlotName?: string;
  toSlotName?: string;
  subjectName?: string;
  targetSubjectName?: string;
  targetTeacherName?: string;
  warnings: string[];
}

interface TimetableMoveResult {
  timetable: ITimetable;
  subjectName: string;
  bumpedSubjectName?: string;
  notifiedCount: number;
}

/**
 * Resolves a human "Period N" to its slot. Prefers matching the slot's own
 * `name` field (e.g. "Period 5") since `orderIndex` isn't guaranteed unique
 * or gap-free in practice (seen duplicate orderIndex values in real data) —
 * falls back to position-among-non-break-slots-sorted-by-orderIndex only for
 * schools whose slots aren't named "Period N".
 */
function resolvePeriodSlot(nonBreakSlots: IPeriodSlot[], periodNumber: number): IPeriodSlot | undefined {
  const byName = nonBreakSlots.find((s) => new RegExp(`^period\\s*${periodNumber}$`, 'i').test(s.name.trim()));
  if (byName) return byName;
  return nonBreakSlots[periodNumber - 1];
}

/** Shared by buildPreview and execute — never cached between the two, since preview can be re-run after edits. */
async function resolveMoveContext(ctx: AuthContext, params: TimetableMoveActionParams): Promise<MoveContext | null> {
  const [tt, allSlots] = await Promise.all([
    timetableRepository.findByClassSectionAnyYear(ctx.schoolId, params.class, params.section),
    periodSlotRepository.findAll(ctx.schoolId),
  ]);
  if (!tt) return null;

  const nonBreakSlots = allSlots.filter((s) => !s.isBreak);
  const fromSlot = resolvePeriodSlot(nonBreakSlots, params.fromPeriod);
  const toSlot = resolvePeriodSlot(nonBreakSlots, params.toPeriod);
  if (!fromSlot || !toSlot) return null;

  const dayOfWeek = dateToDayOfWeek(params.date);
  const sourceEntry = tt.entries.find((e) => e.dayOfWeek === dayOfWeek && e.slotId === fromSlot._id.toString());
  if (!sourceEntry) return null;

  const targetEntry = tt.entries.find((e) => e.dayOfWeek === dayOfWeek && e.slotId === toSlot._id.toString()) ?? null;

  return { tt, fromSlot, toSlot, sourceEntry, targetEntry, dayOfWeek, dayName: DAY_NAMES[dayOfWeek] };
}

export const timetableMoveAction: ActionDefinition<TimetableMoveActionParams, TimetableMovePreviewData, TimetableMoveResult> = {
  id: 'MOVE_TIMETABLE_PERIOD',
  description:
    'Move a class\'s timetable period to a different period — e.g. "move Maths for Class 8-A from Period 2 to Period 5 tomorrow".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: timetableMoveActionParamsSchema,
  paramsShapeDescription: `
Fields:
- class (string): the class level exactly as written in the message, with the word "Class"/"Grade" and the section stripped off. Preserve the numeral style used (e.g. "Class VIII-A" -> "VIII", "Class 8 A" -> "8") — do NOT convert between Roman numerals and digits, different schools use different conventions.
- section (string): the section letter, e.g. "A" for "VIII-A" or "8th A".
- date (string, YYYY-MM-DD): the date this move applies to. Resolve relative dates ("tomorrow", "next Monday") against today's actual date given above.
- fromPeriod (number): the period number the class is currently moving FROM, e.g. "Period 2" -> 2.
- toPeriod (number): the period number the class is moving TO, e.g. "Period 5" -> 5.
- bumpedSlotAction: always omit/null — this is decided during preview review, not extracted from the message.
`.trim(),

  async buildPreview(ctx: AuthContext, params: TimetableMoveActionParams): Promise<TimetableMovePreviewData> {
    const dayName = DAY_NAMES[dateToDayOfWeek(params.date)];
    const moveCtx = await resolveMoveContext(ctx, params);

    if (!moveCtx) {
      return {
        fatal: true,
        fatalReason: `Couldn't find a Period ${params.fromPeriod} entry for Class ${params.class}-${params.section} on ${dayName} — check the class, section, and period are correct.`,
        dayName,
        warnings: [],
      };
    }

    const { tt, fromSlot, toSlot, sourceEntry, targetEntry, dayOfWeek } = moveCtx;
    const warnings: string[] = [];

    if (targetEntry && targetEntry.subjectName !== sourceEntry.subjectName) {
      warnings.push(
        `Period ${params.toPeriod} (${toSlot.name}) currently has "${targetEntry.subjectName}"${
          targetEntry.teacherName ? ` — ${targetEntry.teacherName}` : ''
        }. It will be swapped into Period ${params.fromPeriod} (${fromSlot.name}).`,
      );
    }

    if (sourceEntry.teacherId) {
      const clash = await timetableRepository.findConflictingTeacher(
        ctx.schoolId,
        tt._id.toString(),
        dayOfWeek,
        toSlot._id.toString(),
        sourceEntry.teacherId,
      );
      if (clash) {
        warnings.push(
          `${sourceEntry.teacherName ?? 'This teacher'} is already teaching Class ${clash.class}-${clash.section} at ${toSlot.name} on this day — the move will be blocked unless resolved.`,
        );
      }
    }
    if (sourceEntry.roomNumber) {
      const clash = await timetableRepository.findConflictingRoom(
        ctx.schoolId,
        tt._id.toString(),
        dayOfWeek,
        toSlot._id.toString(),
        sourceEntry.roomNumber,
      );
      if (clash) {
        warnings.push(`Room ${sourceEntry.roomNumber} is already booked by Class ${clash.class}-${clash.section} at ${toSlot.name} on this day.`);
      }
    }

    return {
      fatal: false,
      dayName,
      fromSlotName: fromSlot.name,
      toSlotName: toSlot.name,
      subjectName: sourceEntry.subjectName,
      targetSubjectName: targetEntry && targetEntry.subjectName !== sourceEntry.subjectName ? targetEntry.subjectName : undefined,
      targetTeacherName: targetEntry?.teacherName,
      warnings,
    };
  },

  describePreview(preview: TimetableMovePreviewData, params: TimetableMoveActionParams): ActionPreview {
    if (preview.fatal) {
      return {
        title: 'Move Timetable Period',
        fields: [
          { key: 'class', label: 'Class', value: params.class, type: 'text', editable: true },
          { key: 'section', label: 'Section', value: params.section, type: 'text', editable: true },
        ],
        warnings: [preview.fatalReason ?? 'This move could not be resolved.'],
      };
    }

    const fields: PreviewField[] = [
      { key: 'class', label: 'Class', value: params.class, type: 'text', editable: true },
      { key: 'section', label: 'Section', value: params.section, type: 'text', editable: true },
      { key: 'day', label: 'Day', value: preview.dayName, type: 'text', editable: false },
      { key: 'subject', label: 'Subject', value: preview.subjectName, type: 'text', editable: false },
      { key: 'fromPeriod', label: 'From Period', value: preview.fromSlotName, type: 'text', editable: true },
      { key: 'toPeriod', label: 'To Period', value: preview.toSlotName, type: 'text', editable: true },
    ];

    if (preview.targetSubjectName) {
      fields.push({
        key: 'bumpedSlotAction',
        label: 'If Period Already Occupied',
        value: params.bumpedSlotAction,
        type: 'multiselect',
        editable: true,
        options: [
          { value: 'swap', label: `Swap with ${preview.targetSubjectName}` },
          { value: 'overwrite', label: `Overwrite (${preview.targetSubjectName} dropped)` },
        ],
      });
    }

    return {
      title: 'Move Timetable Period',
      fields,
      warnings: preview.warnings.length ? preview.warnings : undefined,
    };
  },

  async execute(ctx: AuthContext, params: TimetableMoveActionParams): Promise<TimetableMoveResult> {
    const moveCtx = await resolveMoveContext(ctx, params);
    if (!moveCtx) {
      throw new ValidationError(
        `Couldn't find a Period ${params.fromPeriod} entry for Class ${params.class}-${params.section} on ${DAY_NAMES[dateToDayOfWeek(params.date)]}.`,
      );
    }
    const { tt, fromSlot, toSlot, sourceEntry, targetEntry, dayOfWeek } = moveCtx;

    const willSwap =
      !!targetEntry && targetEntry.subjectName !== sourceEntry.subjectName && (params.bumpedSlotAction[0] ?? 'swap') === 'swap';

    await timetableService.removeEntry(tt._id.toString(), dayOfWeek, fromSlot._id.toString(), ctx);

    const updated = await timetableService.upsertEntry(
      tt._id.toString(),
      {
        dayOfWeek,
        slotId: toSlot._id.toString(),
        subjectName: sourceEntry.subjectName,
        teacherId: sourceEntry.teacherId,
        teacherName: sourceEntry.teacherName,
        roomNumber: sourceEntry.roomNumber,
      },
      ctx,
    );

    let bumpedEntry: ITimetableEntry | undefined;
    if (willSwap && targetEntry) {
      await timetableService.upsertEntry(
        tt._id.toString(),
        {
          dayOfWeek,
          slotId: fromSlot._id.toString(),
          subjectName: targetEntry.subjectName,
          teacherId: targetEntry.teacherId,
          teacherName: targetEntry.teacherName,
          roomNumber: targetEntry.roomNumber,
        },
        ctx,
      );
      bumpedEntry = targetEntry;
    }

    const notifiedCount = await notifyTimetableMoved(
      {
        class: params.class,
        section: params.section,
        dayName: DAY_NAMES[dayOfWeek],
        fromSlotName: fromSlot.name,
        toSlotName: toSlot.name,
        sourceEntry,
        bumpedEntry,
      },
      ctx,
    );

    return { timetable: updated, subjectName: sourceEntry.subjectName, bumpedSubjectName: bumpedEntry?.subjectName, notifiedCount };
  },

  describeResult(result: TimetableMoveResult): ActionResultSummary {
    return {
      summary: result.bumpedSubjectName
        ? `"${result.subjectName}" and "${result.bumpedSubjectName}" swapped periods.`
        : `"${result.subjectName}" moved to the new period.`,
      notifiedCount: result.notifiedCount,
    };
  },
};
