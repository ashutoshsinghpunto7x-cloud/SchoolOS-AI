import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { FormSection } from '@/features/students/components/FormSection';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { useMasterGrid } from '@/features/timetable/hooks/useTimetable';
import { SubjectChipEditor } from './SubjectChipEditor';
import { SubjectSkillsEditor, type SubjectExtras } from './SubjectSkillsEditor';
import { ExamComponentsEditor } from './ExamComponentsEditor';
import { GradingBandsEditor } from './GradingBandsEditor';
import type { Exam, ExamType, SubjectConfig } from '@schoolos/types';

// ── Schema ────────────────────────────────────────────────────────────────────

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'monthly_test', label: 'Monthly Test' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annual', label: 'Annual' },
  { value: 'practical', label: 'Practical' },
  { value: 'internal_assessment', label: 'Internal Assessment' },
  { value: 'other', label: 'Other' },
];

const examComponentSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  maxMarks: z.coerce.number().min(1, 'Max marks must be at least 1'),
  passMarks: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).max(100).optional(),
});

const gradeBandSchema = z.object({
  label: z.string().min(1, 'Grade label is required'),
  minPercent: z.coerce.number().min(0).max(100),
  maxPercent: z.coerce.number().min(0).max(100),
});

const subjectConfigSchema = z.object({
  name: z.string().min(1),
  evaluationType: z.enum(['marks', 'grade', 'both']),
  // Optional skill breakdown for this subject — see SubjectSkillsEditor.
  skills: z.array(z.string().min(1)).min(2).max(10).optional(),
  // Optional timetable alias — see SubjectSkillsEditor.
  timetableSubjectName: z.string().min(1).optional(),
});

const examFormSchema = z.object({
  name: z.string({ required_error: 'Exam name is required' }).min(2, 'At least 2 characters').max(150),
  examType: z.enum(['unit_test', 'monthly_test', 'half_yearly', 'annual', 'practical', 'internal_assessment', 'other'], {
    required_error: 'Exam type is required',
  }),
  termLabel: z.string().max(50).optional(),
  classesApplicable: z.array(z.string()).min(1, 'Select at least one class'),
  subjects: z.array(z.string()).min(1, 'Add at least one subject'),
  subjectConfigs: z.array(subjectConfigSchema),
  components: z.array(examComponentSchema).min(1, 'Add at least one assessment component'),
  gradingBands: z.array(gradeBandSchema),
  passPercent: z.coerce.number().min(0).max(100),
  subjectWiseMinPercent: z.coerce.number().min(0).max(100).optional(),
  // ── Scheduling (Academic Planning Engine) — optional; an undated exam
  // simply gets skipped by the engine's exam-aware scheduling, everything
  // else about the exam (marks entry, report cards) works either way.
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  revisionLeadDays: z.coerce.number().min(0).max(60).optional(),
}).refine(
  (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
  { message: 'End date cannot be before start date', path: ['endDate'] },
);

export type ExamFormValues = z.infer<typeof examFormSchema>;

// ── Helper components ─────────────────────────────────────────────────────────

const Field = ({ label, error, required, hint, children }: {
  label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-bold text-gray-700 tracking-wide">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    {error && <p className="text-sm font-medium text-red-500 mt-0.5">{error}</p>}
  </div>
);

const inputCls = (err?: boolean) =>
  cn('w-full h-12 px-4 rounded-xl border text-base text-gray-900 placeholder:text-gray-400 bg-white',
     'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
     err ? 'border-red-300 focus:border-red-400' : 'border-gray-200 hover:border-gray-300');

const selectCls = (err?: boolean) => cn(inputCls(err), 'cursor-pointer');

/** ISO timestamp → yyyy-mm-dd for a native date input's value. */
const toDateInputValue = (iso?: string): string => (iso ? iso.slice(0, 10) : '');

function defaultAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
}

// ── ExamForm ──────────────────────────────────────────────────────────────────

interface ExamFormProps {
  initialData?: Exam;
  onSubmit: (values: ExamFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  /** Locked exams block further config changes without an explicit reopen first. */
  disabled?: boolean;
}

export const ExamForm = ({ initialData, onSubmit, isLoading = false, submitLabel = 'Create Exam', disabled = false }: ExamFormProps) => {
  const { data: schoolClasses } = useSchoolClasses();
  // Timetable is the source of truth for "what subjects does this class get taught" (same
  // source marks.service's teacher-scope guard and the master grid use) — used below to
  // default Subjects to everything the selected classes are taught, instead of retyping.
  const { data: masterGrid } = useMasterGrid({ academicYear: defaultAcademicYear() });
  const subjectsByClass = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of masterGrid?.rows ?? []) {
      const set = map.get(row.class) ?? new Set<string>();
      for (const cell of Object.values(row.cells)) {
        if (cell?.subjectName) set.add(cell.subjectName);
      }
      map.set(row.class, set);
    }
    return map;
  }, [masterGrid]);

  const { register, control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          examType: initialData.examType,
          termLabel: initialData.termLabel ?? '',
          classesApplicable: initialData.classesApplicable,
          subjects: initialData.subjects,
          subjectConfigs: initialData.subjectConfigs ?? [],
          components: initialData.components,
          gradingBands: initialData.gradingBands ?? [],
          passPercent: initialData.passPercent,
          subjectWiseMinPercent: initialData.subjectWiseMinPercent,
          startDate: toDateInputValue(initialData.startDate),
          endDate: toDateInputValue(initialData.endDate),
          revisionLeadDays: initialData.revisionLeadDays,
        }
      : {
          examType: 'unit_test' as const,
          classesApplicable: [],
          subjects: [],
          subjectConfigs: [],
          components: [{ name: 'Theory', maxMarks: 100 }],
          gradingBands: [],
          passPercent: 33,
        },
  });
  const watchedStartDate = watch('startDate');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">

      {/* ── 1: Basic Info ────────────────────────────────────────────────── */}
      <FormSection number={1} title="Basic Information" description="Name, type and term for this exam">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Field label="Exam Name" required error={errors.name?.message}>
              <input {...register('name')} type="text" placeholder="e.g. Unit Test 1" className={inputCls(!!errors.name)} disabled={disabled} />
            </Field>
          </div>
          <Field label="Exam Type" required error={errors.examType?.message}>
            <select {...register('examType')} className={selectCls(!!errors.examType)} disabled={disabled}>
              {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Term Label" error={errors.termLabel?.message} hint="Optional — e.g. Term 1, Semester 2">
            <input {...register('termLabel')} type="text" placeholder="e.g. Term 1" className={inputCls(!!errors.termLabel)} disabled={disabled} />
          </Field>
        </div>
      </FormSection>

      {/* ── 2: Classes & Subjects ────────────────────────────────────────── */}
      <FormSection number={2} title="Classes & Subjects" description="Which classes and subjects this exam applies to">
        <div className="flex flex-col gap-5">
          <Field label="Classes Applicable" required error={errors.classesApplicable?.message}>
            <Controller
              control={control}
              name="classesApplicable"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {(schoolClasses ?? []).length === 0 && (
                    <p className="text-sm text-gray-400">No classes set up yet — add classes under Classes &amp; Sections first.</p>
                  )}
                  {(schoolClasses ?? []).map((cls) => {
                    const checked = field.value.includes(cls.name);
                    return (
                      <button
                        key={cls._id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (checked) {
                            field.onChange(field.value.filter((c) => c !== cls.name));
                            return;
                          }
                          field.onChange([...field.value, cls.name]);
                          // Default Subjects to everything this class is taught, on top of
                          // whatever's already picked — teacher can still add/remove by hand.
                          const taught = subjectsByClass.get(cls.name);
                          if (taught?.size) {
                            const current = getValues('subjects');
                            const merged = [...current];
                            for (const subject of taught) {
                              if (!merged.some((s) => s.toLowerCase() === subject.toLowerCase())) merged.push(subject);
                            }
                            setValue('subjects', merged, { shouldValidate: true });
                          }
                        }}
                        className={cn(
                          'h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                          checked
                            ? 'bg-[#5B21B6] border-[#5B21B6] text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                        )}
                      >
                        Class {cls.name}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </Field>

          <Field
            label="Subjects"
            required
            error={errors.subjects?.message}
            hint="Filled in automatically from what each selected class is taught — add or remove as needed."
          >
            <Controller control={control} name="subjects" render={({ field }) => (
              <SubjectChipEditor values={field.value} onChange={field.onChange} maxItems={30} />
            )} />
          </Field>

          <Field
            label="Subject Skill Breakdown & Timetable Alias"
            hint="Optional, per subject. Skills: split a subject into multiple marks (e.g. English into Literature/Language/Reading/Writing/Dictation). Timetable alias: set this when the subject's grading name (e.g. from the report card template) differs from the name its period is scheduled under on the timetable (e.g. 'Mathematics' here vs 'Maths' on the timetable) — needed for teachers to be recognized as allowed to enter these marks."
          >
            <Controller
              control={control}
              name="subjectConfigs"
              render={({ field }) => {
                const subjects: string[] = watch('subjects');
                const extrasBySubject: Record<string, SubjectExtras> = Object.fromEntries(
                  field.value
                    .filter((c) => (c.skills?.length ?? 0) > 0 || c.timetableSubjectName)
                    .map((c) => [c.name, { skills: c.skills, timetableSubjectName: c.timetableSubjectName }]),
                );
                return (
                  <SubjectSkillsEditor
                    subjects={subjects}
                    value={extrasBySubject}
                    onChange={(next) => {
                      // Preserve each subject's existing evaluationType (and any config for a
                      // subject with no skills/alias set), just replace/add/remove skills+alias.
                      const byName = new Map<string, SubjectConfig>(field.value.map((c) => [c.name, c]));
                      for (const subject of subjects) {
                        const extras = next[subject];
                        const existing = byName.get(subject);
                        if (extras?.skills?.length || extras?.timetableSubjectName) {
                          byName.set(subject, {
                            name: subject,
                            evaluationType: existing?.evaluationType ?? 'marks',
                            skills: extras.skills,
                            timetableSubjectName: extras.timetableSubjectName,
                          });
                        } else if (existing) {
                          byName.set(subject, { name: subject, evaluationType: existing.evaluationType, skills: undefined, timetableSubjectName: undefined });
                        }
                      }
                      field.onChange(Array.from(byName.values()));
                    }}
                  />
                );
              }}
            />
          </Field>
        </div>
      </FormSection>

      {/* ── 3: Scheduling ────────────────────────────────────────────────── */}
      <FormSection
        number={3}
        title="Scheduling"
        description="Drives the Academic Planning Engine — every teacher whose class/subject this exam applies to gets these dates factored into their auto-generated teaching plan"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Field label="Exam Start Date" error={errors.startDate?.message} hint="Optional">
            <input {...register('startDate')} type="date" className={inputCls(!!errors.startDate)} disabled={disabled} />
          </Field>
          <Field label="Exam End Date" error={errors.endDate?.message} hint="Optional — same as start for a single-day exam">
            <input {...register('endDate')} type="date" className={inputCls(!!errors.endDate)} disabled={disabled} />
          </Field>
          <Field
            label="Revision Days Before"
            error={errors.revisionLeadDays?.message}
            hint="Teaching days to auto-block as revision before Start Date"
          >
            <input {...register('revisionLeadDays')} type="number" min={0} max={60} step={1} placeholder="e.g. 3" className={cn(inputCls(!!errors.revisionLeadDays), 'tabular-nums')} disabled={disabled} />
          </Field>
        </div>
        {!watchedStartDate && (
          <p className="text-xs text-gray-400 mt-3">Leave dates empty to skip exam-aware scheduling for this exam — it still works for marks entry and report cards either way.</p>
        )}
      </FormSection>

      {/* ── 4: Assessment Components ────────────────────────────────────── */}
      <FormSection number={4} title="Assessment Components" description="Theory, practical, oral, project — whatever this exam is scored on">
        <Controller control={control} name="components" render={({ field }) => (
          <ExamComponentsEditor components={field.value} onChange={field.onChange} />
        )} />
        {errors.components?.message && <p className="text-sm font-medium text-red-500 mt-3">{errors.components.message}</p>}
        {Array.isArray(errors.components) && (
          <p className="text-sm font-medium text-red-500 mt-3">Check each component has a name and a max marks value.</p>
        )}
      </FormSection>

      {/* ── 5: Grading & Pass Criteria ───────────────────────────────────── */}
      <FormSection number={5} title="Grading & Pass Criteria" description="Overall pass percentage and letter-grade bands">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <Field label="Overall Pass %" required error={errors.passPercent?.message}>
            <input {...register('passPercent')} type="number" min={0} max={100} step={0.01} className={cn(inputCls(!!errors.passPercent), 'tabular-nums')} disabled={disabled} />
          </Field>
          <Field
            label="Subject-wise Min %"
            error={errors.subjectWiseMinPercent?.message}
            hint="Optional — minimum % required per subject, independent of the overall pass %"
          >
            <input {...register('subjectWiseMinPercent')} type="number" min={0} max={100} step={0.01} placeholder="Optional" className={cn(inputCls(!!errors.subjectWiseMinPercent), 'tabular-nums')} disabled={disabled} />
          </Field>
        </div>

        <label className="text-sm font-bold text-gray-700 tracking-wide block mb-2">Grade Bands</label>
        <Controller control={control} name="gradingBands" render={({ field }) => (
          <GradingBandsEditor bands={field.value} onChange={field.onChange} />
        )} />
        <p className="text-xs text-gray-400 mt-2">Optional — leave empty for a marks-only exam with no letter grades.</p>
      </FormSection>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      {!disabled && (
        <button type="submit" disabled={isLoading}
          className={cn('w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-base font-bold text-white',
            'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed')}>
          {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />Saving…</>) : submitLabel}
        </button>
      )}
    </form>
  );
};
