import { useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSection } from './FormSection';
import { TagEditor } from './TagEditor';
import { useStudentsPaginated } from '../hooks/useStudents';
import type { Student } from '@schoolos/types';

// ── Zod schema ────────────────────────────────────────────────────────────────

const phoneRule = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const admissionStatusRule = z.enum([
  'enquiry', 'application', 'admission_pending', 'active',
  'transferred', 'graduated', 'inactive',
]);

// Full validation — used for admin/reception/accountant create & edit flows,
// where the record is expected to be complete.
const strictStudentFormSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'At least 2 characters'),
  rollNumber: z.string().optional().or(z.literal('')),
  class: z.string({ required_error: 'Class is required' }).min(1, 'Class is required'),
  section: z
    .string({ required_error: 'Section is required' })
    .min(1, 'Section is required'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Gender is required',
  }),
  dateOfBirth: z.string({ required_error: 'Date of birth is required' }).min(1),
  fatherName: z
    .string({ required_error: 'Father name is required' })
    .min(2, 'At least 2 characters'),
  motherName: z
    .string({ required_error: 'Mother name is required' })
    .min(2, 'At least 2 characters'),
  parentPhone: phoneRule,
  alternatePhone: phoneRule.optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().optional(),
  admissionStatus: admissionStatusRule,
  tags: z.array(z.string()),
  remarks: z.string().optional(),
  monthlyTuitionFee: z.string().optional(),
});

// Relaxed validation — used when a teacher edits a student. Teachers own the
// student's name (and can add a new student outright); everything else —
// gender, DOB, parent details, address, admission status — is filled in and
// kept current by the accountant/reception workspace, so it's optional here.
// Format checks (e.g. a valid phone number, a valid email) still apply if a
// value is actually entered, so partial/garbled edits are still caught.
const lenientStudentFormSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'At least 2 characters'),
  rollNumber: z.string().optional().or(z.literal('')),
  class: z.string().optional().or(z.literal('')),
  section: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  fatherName: z.string().optional().or(z.literal('')),
  motherName: z.string().optional().or(z.literal('')),
  parentPhone: phoneRule.optional().or(z.literal('')),
  alternatePhone: phoneRule.optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().optional(),
  admissionStatus: admissionStatusRule.optional(),
  tags: z.array(z.string()),
  remarks: z.string().optional(),
  monthlyTuitionFee: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof strictStudentFormSchema>;

// ── Helper components ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field = ({ label, error, required, children }: FieldProps) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-bold text-gray-700 tracking-wide">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && <p className="text-sm font-medium text-red-500 mt-0.5">{error}</p>}
  </div>
);

const inputClass = (hasError?: boolean) =>
  cn(
    'w-full h-12 px-4 rounded-xl border text-base text-gray-900',
    'placeholder:text-gray-400 bg-white',
    'transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]',
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
      : 'border-gray-200 hover:border-gray-300'
  );

const selectClass = (hasError?: boolean) =>
  cn(inputClass(hasError), 'cursor-pointer');

// ── Class and section options ─────────────────────────────────────────────────

const CLASS_OPTIONS = [
  'Nursery', 'LKG', 'UKG',
  '1', '2', '3', '4', '5', '6',
  '7', '8', '9', '10', '11', '12',
];

const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

// ── StudentForm ───────────────────────────────────────────────────────────────

interface StudentFormProps {
  /** Pre-fill form for edit mode */
  initialData?: Student;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  /** Monthly tuition fee is an accountant-only concern — hidden for other editors (e.g. teachers). */
  showMonthlyFee?: boolean;
  /**
   * Whether gender/DOB/parent-info/address/admission-status are required to save.
   * Default true for admin/reception/accountant flows. Set false for the teacher-edit
   * modal — teachers own the name (and can add a student outright); the rest is
   * accountant-owned and optional for them to fill in.
   */
  requireAllFields?: boolean;
}

export const StudentForm = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Create Student',
  showMonthlyFee = true,
  requireAllFields = true,
}: StudentFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<StudentFormValues>({
    // Both schemas share the same field set; the lenient one just relaxes which
    // fields are required. Cast so `useForm<StudentFormValues>` (typed against the
    // strict/required shape used elsewhere in the app) accepts either resolver.
    resolver: zodResolver(requireAllFields ? strictStudentFormSchema : lenientStudentFormSchema) as Resolver<StudentFormValues>,
    defaultValues: initialData
      ? {
          fullName: initialData.fullName,
          rollNumber: initialData.rollNumber ?? '',
          class: initialData.class,
          section: initialData.section,
          gender: initialData.gender,
          dateOfBirth: initialData.dateOfBirth
            ? new Date(initialData.dateOfBirth).toISOString().split('T')[0]
            : '',
          fatherName: initialData.fatherName,
          motherName: initialData.motherName,
          parentPhone: initialData.parentPhone,
          alternatePhone: initialData.alternatePhone ?? '',
          email: initialData.email ?? '',
          address: initialData.address ?? '',
          admissionStatus: (initialData.admissionStatus === 'inquiry' || initialData.admissionStatus === 'enrolled' || initialData.admissionStatus === 'withdrawn')
            ? 'active' as const
            : initialData.admissionStatus as 'enquiry' | 'application' | 'admission_pending' | 'active' | 'transferred' | 'graduated' | 'inactive',
          tags: initialData.tags ?? [],
          remarks: initialData.remarks ?? '',
          monthlyTuitionFee: initialData.monthlyTuitionFee != null ? String(initialData.monthlyTuitionFee) : '',
        }
      : {
          admissionStatus: 'active' as const,
          tags: [],
        },
  });

  // Auto-suggest the next roll number once Class + Section are chosen, so the
  // accountant/reception staff can rely on roll order instead of typing it —
  // still editable, and only applied while creating (never overwrites an
  // existing student's roll number in edit mode).
  const watchedClass = watch('class');
  const watchedSection = watch('section');
  const rollAutoFillEnabled = !initialData && !!watchedClass && !!watchedSection;

  const { data: classmatesPage } = useStudentsPaginated(
    rollAutoFillEnabled ? { class: watchedClass, section: watchedSection, limit: 200 } : {},
  );

  useEffect(() => {
    if (!rollAutoFillEnabled || !classmatesPage) return;
    if (getValues('rollNumber')) return; // don't override a value the user already typed

    const maxRoll = classmatesPage.data.reduce((max, s) => {
      const n = parseInt(s.rollNumber ?? '', 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);

    setValue('rollNumber', String(maxRoll + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classmatesPage, rollAutoFillEnabled]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">

      {/* ── Section 1: Student Information ─────────────────────────────── */}
      <FormSection
        number={1}
        title="Student Information"
        description="Basic details about the student"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <div className="sm:col-span-2">
            <Field label="Full Name" required error={errors.fullName?.message}>
              <input
                {...register('fullName')}
                type="text"
                placeholder="e.g. Arjun Sharma"
                className={inputClass(!!errors.fullName)}
              />
            </Field>
          </div>

          <Field label="Roll No." error={errors.rollNumber?.message}>
            <input
              {...register('rollNumber')}
              type="text"
              placeholder={initialData ? 'Optional — class roll number' : 'Auto-filled once Class & Section are set'}
              className={inputClass(!!errors.rollNumber)}
            />
          </Field>

          <Field label="Class" required={requireAllFields} error={errors.class?.message}>
            <select {...register('class')} className={selectClass(!!errors.class)}>
              <option value="">Select class</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {isNaN(Number(c)) ? c : `Class ${c}`}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Section" required={requireAllFields} error={errors.section?.message}>
            <select {...register('section')} className={selectClass(!!errors.section)}>
              <option value="">Select section</option>
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Gender" required={requireAllFields} error={errors.gender?.message}>
            <select {...register('gender')} className={selectClass(!!errors.gender)}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Date of Birth" required={requireAllFields} error={errors.dateOfBirth?.message}>
            <input
              {...register('dateOfBirth')}
              type="date"
              className={inputClass(!!errors.dateOfBirth)}
              max={new Date().toISOString().split('T')[0]}
            />
          </Field>

          <Field label="Admission Status" error={errors.admissionStatus?.message}>
            <select
              {...register('admissionStatus')}
              className={selectClass(!!errors.admissionStatus)}
            >
              <option value="enquiry">Enquiry</option>
              <option value="application">Application</option>
              <option value="admission_pending">Admission Pending</option>
              <option value="active">Active</option>
              <option value="transferred">Transferred</option>
              <option value="graduated">Graduated</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          {showMonthlyFee && (
            <Field label="Monthly Tuition Fee (₹)" error={errors.monthlyTuitionFee?.message}>
              <input
                {...register('monthlyTuitionFee')}
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 2000 — used to auto-generate monthly fee records"
                className={inputClass(!!errors.monthlyTuitionFee)}
              />
            </Field>
          )}

          <div className="sm:col-span-2">
            <Field label="Tags" error={undefined}>
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <TagEditor tags={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* ── Section 2: Parent Information ──────────────────────────────── */}
      <FormSection
        number={2}
        title="Parent Information"
        description="Parent and guardian contact details"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <Field label="Father's Name" required={requireAllFields} error={errors.fatherName?.message}>
            <input
              {...register('fatherName')}
              type="text"
              placeholder="e.g. Rajesh Sharma"
              className={inputClass(!!errors.fatherName)}
            />
          </Field>

          <Field label="Mother's Name" required={requireAllFields} error={errors.motherName?.message}>
            <input
              {...register('motherName')}
              type="text"
              placeholder="e.g. Priya Sharma"
              className={inputClass(!!errors.motherName)}
            />
          </Field>

          <Field label="Father's Phone" required={requireAllFields} error={errors.parentPhone?.message}>
            <input
              {...register('parentPhone')}
              type="tel"
              placeholder="10-digit mobile number"
              maxLength={10}
              className={inputClass(!!errors.parentPhone)}
            />
          </Field>

          <Field label="Alternate Phone" error={errors.alternatePhone?.message}>
            <input
              {...register('alternatePhone')}
              type="tel"
              placeholder="Optional"
              maxLength={10}
              className={inputClass(!!errors.alternatePhone)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Parent Email" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                placeholder="parent@example.com (optional)"
                className={inputClass(!!errors.email)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Used for fee-balance emails, and as the login if you bulk-create a Parent Workspace account.
              </p>
            </Field>
          </div>
        </div>
      </FormSection>

      {/* ── Section 3: Address ──────────────────────────────────────────── */}
      <FormSection
        number={3}
        title="Address"
        description="Home address of the student"
      >
        <Field label="Full Address" error={errors.address?.message}>
          <textarea
            {...register('address')}
            rows={3}
            placeholder="House no., street, area, city, PIN code"
            className={cn(
              'w-full px-4 py-3 rounded-xl border text-base text-gray-900',
              'placeholder:text-gray-400 bg-white resize-none',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]',
              errors.address
                ? 'border-red-300 focus:border-red-400'
                : 'border-gray-200 hover:border-gray-300'
            )}
          />
        </Field>
      </FormSection>

      {/* ── Section 4: Remarks ──────────────────────────────────────────── */}
      <FormSection
        number={4}
        title="Remarks"
        description="Any additional notes about this student (optional)"
      >
        <Field label="Remarks" error={errors.remarks?.message}>
          <textarea
            {...register('remarks')}
            rows={3}
            placeholder="Any notes about this admission…"
            className={cn(
              'w-full px-4 py-3 rounded-xl border text-base text-gray-900',
              'placeholder:text-gray-400 bg-white resize-none',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]',
              'border-gray-200 hover:border-gray-300'
            )}
          />
        </Field>
      </FormSection>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full h-14 rounded-2xl',
          'flex items-center justify-center gap-3',
          'text-base font-bold text-white',
          'bg-[#5B21B6] hover:bg-[#4C1D95] active:bg-[#3f1a94]',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/50 focus-visible:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
};
