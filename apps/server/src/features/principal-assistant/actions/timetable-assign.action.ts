import { z } from 'zod';
import { ActionDefinition, ActionPreview, ActionResultSummary, PreviewField } from '../action-registry';
import { AuthContext } from '../../../lib/auth-context';
import { PERMISSIONS } from '../../../lib/permissions';
import { classNameKey } from '../../../lib/class-name';
import { ValidationError } from '../../../middlewares/errorHandler';
import { escapeRegex } from '../query-params';
import { timetableService } from '../../timetable/timetable.service';
import { timetableRepository } from '../../timetable/timetable.repository';
import { periodSlotRepository } from '../../timetable/timetable.period.repository';
import { schoolClassRepository } from '../../school-classes/school-class.repository';
import { Teacher } from '../../teachers/teacher.model';
import { IPeriodSlot } from '../../timetable/timetable.period.model';

// ── "Set a period on the School Timetable" ───────────────────────────────────
// Same write path as the master-grid cell editor (timetableService.setMasterGridCell):
// one fixed weekly pattern per class-section x period. Fields the Principal does
// not mention keep whatever the cell already holds, so "put Mrs Gupta on 6A
// period 3" changes only the teacher.

const schema = z.object({
  className: z.string().trim().max(20).default(''),
  section: z.string().trim().max(10).default(''),
  period: z.coerce.number().int().min(0).max(20).default(0),
  subject: z.string().trim().max(100).default(''),
  teacherName: z.string().trim().max(120).default(''),
  roomNumber: z.string().trim().max(50).default(''),
  clear: z.coerce.boolean().default(false),
});
type Params = z.infer<typeof schema>;

interface Resolved {
  klass?: { name: string; section: string };
  slot?: IPeriodSlot;
  academicYear: string;
  term?: string;
  current?: { subjectName: string; teacherId?: string; teacherName?: string; roomNumber?: string };
  teachers: { _id: unknown; fullName: string }[];
}

function defaultAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
}

function resolveSlot(slots: IPeriodSlot[], n: number): IPeriodSlot | undefined {
  const real = slots.filter((s) => !s.isBreak).sort((a, b) => a.orderIndex - b.orderIndex);
  return real.find((s) => new RegExp(`^period\\s*${n}$`, 'i').test(s.name.trim())) ?? real[n - 1];
}

async function resolve(ctx: AuthContext, p: Params): Promise<Resolved> {
  const [classes, slots, teachers] = await Promise.all([
    schoolClassRepository.findAll(ctx.schoolId),
    periodSlotRepository.findAll(ctx.schoolId),
    p.teacherName
      ? Teacher.find({ schoolId: ctx.schoolId, isDeleted: false, employmentStatus: 'active', fullName: new RegExp(escapeRegex(p.teacherName), 'i') })
          .select('fullName').limit(5).lean<{ _id: unknown; fullName: string }[]>()
      : Promise.resolve([] as { _id: unknown; fullName: string }[]),
  ]);

  const cls = p.className ? classes.find((c) => classNameKey(c.name) === classNameKey(p.className)) : undefined;
  const section = cls?.sections.find((s) => s.toUpperCase() === p.section.toUpperCase());
  const klass = cls && section ? { name: cls.name, section } : undefined;
  const slot = p.period ? resolveSlot(slots, p.period) : undefined;

  let academicYear = defaultAcademicYear();
  let term: string | undefined;
  let current: Resolved['current'];
  if (klass) {
    const tt = await timetableRepository.findByClassSectionAnyYear(ctx.schoolId, klass.name, klass.section);
    if (tt) {
      academicYear = tt.academicYear;
      term = tt.term || undefined;
      if (slot) {
        current = tt.entries.filter((e) => e.slotId === String(slot._id)).sort((a, b) => a.dayOfWeek - b.dayOfWeek)[0];
      }
    }
  }
  return { klass, slot, academicYear, term, current, teachers };
}

function problems(p: Params, r: Resolved): string[] {
  const out: string[] = [];
  if (!p.className || !p.section) out.push('Tell me the class and section, e.g. "6 A".');
  else if (!r.klass) out.push(`I could not find Class ${p.className}-${p.section} in the school.`);
  if (!p.period) out.push('Tell me which period.');
  else if (!r.slot) out.push(`Period ${p.period} does not exist in the period setup.`);
  if (!p.clear) {
    if (p.teacherName && r.teachers.length === 0) out.push(`No active teacher matching "${p.teacherName}" was found.`);
    if (r.teachers.length > 1) out.push(`Several teachers match: ${r.teachers.map((t) => t.fullName).join(', ')}. Use the full name.`);
    if (!p.subject && !r.current?.subjectName) out.push('This period is empty - tell me the subject too.');
  } else if (!r.current) out.push('That period is already empty.');
  return out;
}

export const assignTimetablePeriodAction: ActionDefinition<Params, Resolved, { summary: string }> = {
  id: 'SET_TIMETABLE_PERIOD',
  description:
    'Fill in, change or clear the subject / teacher / room of ONE period for a class on the School Timetable grid - ' +
    '"put Maths with Mrs Gupta in 6A period 1", "change period 3 of 7B to Science", "Hindi teacher for 5A period 2 should be Rahul sir", "clear period 4 of 8A".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: schema,
  paramsShapeDescription: `
Fields:
- className (string): grade only, numeral style as written (e.g. "6", "VII", "Nursery"); no word "Class".
- section (string): the section letter, e.g. "A".
- period (integer): the period number, 0 if not stated.
- subject (string): the subject to set, empty string if not stated.
- teacherName (string): the teacher to set, name only, empty string if not stated.
- roomNumber (string): room or lab if stated, else empty string.
- clear (boolean): true only if the Principal wants the period emptied / removed.`.trim(),

  async buildPreview(ctx, params) { return resolve(ctx, params); },

  describePreview(r, p): ActionPreview {
    const warnings = problems(p, r);
    const subject = p.subject || r.current?.subjectName || '';
    const teacher = r.teachers.length === 1 ? r.teachers[0].fullName : (p.teacherName || r.current?.teacherName || '');
    const fields: PreviewField[] = [
      { key: 'className', label: 'Class', value: r.klass?.name ?? p.className, type: 'text', editable: true },
      { key: 'section', label: 'Section', value: r.klass?.section ?? p.section, type: 'text', editable: true },
      { key: 'period', label: 'Period', value: p.period || '', type: 'text', editable: true },
    ];
    if (p.clear) {
      if (r.current) warnings.push(`This will empty the period (currently ${r.current.subjectName}${r.current.teacherName ? ` - ${r.current.teacherName}` : ''}).`);
    } else {
      fields.push(
        { key: 'subject', label: 'Subject', value: subject, type: 'text', editable: true },
        { key: 'teacherName', label: 'Teacher', value: teacher, type: 'text', editable: true },
        { key: 'roomNumber', label: 'Room / Lab', value: p.roomNumber || r.current?.roomNumber || '', type: 'text', editable: true },
      );
      if (r.current) warnings.push(`Currently: ${r.current.subjectName}${r.current.teacherName ? ` - ${r.current.teacherName}` : ''}. It will be replaced.`);
    }
    return { title: p.clear ? 'Clear timetable period' : 'Set timetable period', fields, warnings: warnings.length ? warnings : undefined };
  },

  async execute(ctx, params) {
    const r = await resolve(ctx, params);
    const issues = problems(params, r).filter((x) => !x.startsWith('Currently'));
    if (issues.length || !r.klass || !r.slot) throw new ValidationError(issues[0] ?? 'Could not resolve that period.');

    const label = `Class ${r.klass.name}-${r.klass.section}, ${r.slot.name}`;
    if (params.clear) {
      await timetableService.setMasterGridCell({
        class: r.klass.name, section: r.klass.section, academicYear: r.academicYear, term: r.term, slotId: String(r.slot._id), subjectName: '',
      }, ctx);
      return { summary: `${label} is now empty.` };
    }

    const teacher = r.teachers.length === 1 ? { id: String(r.teachers[0]._id), name: r.teachers[0].fullName } : undefined;
    const subjectName = params.subject || r.current?.subjectName || '';
    await timetableService.setMasterGridCell({
      class: r.klass.name, section: r.klass.section, academicYear: r.academicYear, term: r.term, slotId: String(r.slot._id),
      subjectName,
      teacherId: teacher?.id ?? (params.teacherName ? undefined : r.current?.teacherId),
      teacherName: teacher?.name ?? (params.teacherName ? undefined : r.current?.teacherName),
      roomNumber: params.roomNumber || r.current?.roomNumber || undefined,
    }, ctx);
    return { summary: `${label} is now ${subjectName}${teacher ? ` with ${teacher.name}` : r.current?.teacherName && !params.teacherName ? ` with ${r.current.teacherName}` : ''}.` };
  },

  describeResult: (r): ActionResultSummary => ({ summary: r.summary }),
};
