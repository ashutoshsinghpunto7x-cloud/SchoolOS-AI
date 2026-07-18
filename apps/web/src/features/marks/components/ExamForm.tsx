import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSection } from '@/features/students/components/FormSection';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { SubjectChipEditor } from './SubjectChipEditor';
import { ExamComponentsEditor } from './ExamComponentsEditor';
import { GradingBandsEditor } from './GradingBandsEditor';
import type { Exam, ExamType } from '@schoolos/types';

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

const examFormSchema = z.object({
  name: z.string({ required_error: 'Exam name is required' }).min(2, 'At least 2 characters').max(150),
  examType: z.enum(['unit_test', 'monthly_test', 'half_yearly', 'annual', 'practical', 'internal_assessment', 'other'], {
    required_error: 'Exam type is required',
  }),
  termLabel: z.string().max(50).optional(),
  classesApplicable: z.array(z.string()).min(1, 'Select at least one class'),
  subjects: z.array(z.string()).min(1, 'Add at least one subject'),
  components: z.array(examComponentSchema).min(1, 'Add at least one assessment component'),
  gradingBands: z.array(gradeBandSchema),
  passPercent: z.coerce.number().min(0).max(100),
  subjectWiseMinPercent: z.coerce.number().min(0).max(100).optional(),
});

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

  const { register, control, handleSubmit, formState: { errors } } = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          examType: initialData.examType,
          termLabel: initialData.termLabel ?? '',
          classesApplicable: initialData.classesApplicable,
          subjects: initialData.subjects,
          components: initialData.components,
          gradingBands: initialData.gradingBands ?? [],
          passPercent: initialData.passPercent,
          subjectWiseMinPercent: initialData.subjectWiseMinPercent,
        }
      : {
          examType: 'unit_test' as const,
          classesApplicable: [],
          subjects: [],
          components: [{ name: 'Theory', maxMarks: 100 }],
          gradingBands: [],
          passPercent: 33,
        },
  });

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
                        onClick={() => field.onChange(
                          checked ? field.value.filter((c) => c !== cls.name) : [...field.value, cls.name],
                        )}
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
            hint="Type exactly as used in the timetable (e.g. Maths, Science) — matching is case-sensitive."
          >
            <Controller control={control} name="subjects" render={({ field }) => (
              <SubjectChipEditor values={field.value} onChange={field.onChange} maxItems={30} />
            )} />
          </Field>
        </div>
      </FormSection>

      {/* ── 3: Assessment Components ────────────────────────────────────── */}
      <FormSection number={3} title="Assessment Components" description="Theory, practical, oral, project — whatever this exam is scored on">
        <Controller control={control} name="components" render={({ field }) => (
          <ExamComponentsEditor components={field.value} onChange={field.onChange} />
        )} />
        {errors.components?.message && <p className="text-sm font-medium text-red-500 mt-3">{errors.components.message}</p>}
        {Array.isArray(errors.components) && (
          <p className="text-sm font-medium text-red-500 mt-3">Check each component has a name and a max marks value.</p>
        )}
      </FormSection>

      {/* ── 4: Grading & Pass Criteria ───────────────────────────────────── */}
      <FormSection number={4} title="Grading & Pass Criteria" description="Overall pass percentage and letter-grade bands">
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
