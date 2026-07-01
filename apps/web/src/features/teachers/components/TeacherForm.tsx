import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSection } from '@/features/students/components/FormSection';
import { TagEditor } from '@/features/students/components/TagEditor';
import type { Teacher } from '@schoolos/types';

// ── Schema ────────────────────────────────────────────────────────────────────

const phoneRule = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const teacherFormSchema = z.object({
  fullName:        z.string({ required_error: 'Full name is required' }).min(2, 'At least 2 characters').max(100),
  gender:          z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  dateOfBirth:     z.string().optional().or(z.literal('')),
  phone:           phoneRule,
  alternatePhone:  phoneRule.optional().or(z.literal('')),
  email:           z.string().email('Enter a valid email').optional().or(z.literal('')),
  address:         z.string().optional(),
  department:      z.string().max(100).optional(),
  subjects:        z.array(z.string()),
  assignedClasses: z.array(z.string()),
  qualification:   z.object({
    degree:        z.string().min(1, 'Degree is required'),
    institution:   z.string().min(1, 'Institution is required'),
    yearOfPassing: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional(),
  }).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  joiningDate:     z.string().optional().or(z.literal('')),
  employmentStatus:z.enum([
    'applicant', 'active', 'on_leave', 'suspended', 'resigned', 'retired', 'inactive',
  ]),
  tags:            z.array(z.string()),
  remarks:         z.string().max(500).optional(),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

// ── Helper components ─────────────────────────────────────────────────────────

const Field = ({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-bold text-gray-700 tracking-wide">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && <p className="text-sm font-medium text-red-500 mt-0.5">{error}</p>}
  </div>
);

const inputCls = (err?: boolean) =>
  cn('w-full h-12 px-4 rounded-xl border text-base text-gray-900 placeholder:text-gray-400 bg-white',
     'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
     err ? 'border-red-300 focus:border-red-400' : 'border-gray-200 hover:border-gray-300');

const selectCls = (err?: boolean) => cn(inputCls(err), 'cursor-pointer');

// ── TeacherForm ───────────────────────────────────────────────────────────────

interface TeacherFormProps {
  initialData?: Teacher;
  onSubmit: (values: TeacherFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export const TeacherForm = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Create Teacher',
}: TeacherFormProps) => {
  const { register, control, handleSubmit, formState: { errors } } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: initialData
      ? {
          fullName:        initialData.fullName,
          gender:          initialData.gender,
          dateOfBirth:     initialData.dateOfBirth
            ? new Date(initialData.dateOfBirth).toISOString().split('T')[0]
            : '',
          phone:           initialData.phone,
          alternatePhone:  initialData.alternatePhone ?? '',
          email:           initialData.email ?? '',
          address:         initialData.address ?? '',
          department:      initialData.department ?? '',
          subjects:        initialData.subjects ?? [],
          assignedClasses: initialData.assignedClasses ?? [],
          qualification:   initialData.qualification,
          experienceYears: initialData.experienceYears,
          joiningDate:     initialData.joiningDate
            ? new Date(initialData.joiningDate).toISOString().split('T')[0]
            : '',
          employmentStatus: initialData.employmentStatus,
          tags:            initialData.tags ?? [],
          remarks:         initialData.remarks ?? '',
        }
      : { employmentStatus: 'applicant' as const, subjects: [], assignedClasses: [], tags: [] },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">

      {/* ── 1: Personal ─────────────────────────────────────────────────── */}
      <FormSection number={1} title="Personal Information" description="Basic details about the teacher">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Field label="Full Name" required error={errors.fullName?.message}>
              <input {...register('fullName')} type="text" placeholder="e.g. Priya Sharma" className={inputCls(!!errors.fullName)} />
            </Field>
          </div>
          <Field label="Gender" required error={errors.gender?.message}>
            <select {...register('gender')} className={selectCls(!!errors.gender)}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
            <input {...register('dateOfBirth')} type="date" className={inputCls(!!errors.dateOfBirth)}
              max={new Date().toISOString().split('T')[0]} />
          </Field>
          <Field label="Employment Status" error={errors.employmentStatus?.message}>
            <select {...register('employmentStatus')} className={selectCls(!!errors.employmentStatus)}>
              <option value="applicant">Applicant</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="resigned">Resigned</option>
              <option value="retired">Retired</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Joining Date" error={errors.joiningDate?.message}>
            <input {...register('joiningDate')} type="date" className={inputCls(!!errors.joiningDate)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tags" error={undefined}>
              <Controller control={control} name="tags" render={({ field }) => (
                <TagEditor tags={field.value} onChange={field.onChange} />
              )} />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* ── 2: Contact ──────────────────────────────────────────────────── */}
      <FormSection number={2} title="Contact Information" description="Phone, email and address">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Primary Phone" required error={errors.phone?.message}>
            <input {...register('phone')} type="tel" placeholder="10-digit mobile number" maxLength={10} className={inputCls(!!errors.phone)} />
          </Field>
          <Field label="Alternate Phone" error={errors.alternatePhone?.message}>
            <input {...register('alternatePhone')} type="tel" placeholder="Optional" maxLength={10} className={inputCls(!!errors.alternatePhone)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Email Address" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="teacher@school.edu (optional)" className={inputCls(!!errors.email)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address" error={errors.address?.message}>
              <textarea {...register('address')} rows={2} placeholder="Home address (optional)"
                className={cn('w-full px-4 py-3 rounded-xl border text-base text-gray-900 placeholder:text-gray-400 bg-white resize-none transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border-gray-200 hover:border-gray-300')} />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* ── 3: Professional ─────────────────────────────────────────────── */}
      <FormSection number={3} title="Professional Information" description="Department, subjects and classes">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Department" error={errors.department?.message}>
            <input {...register('department')} type="text" placeholder="e.g. Science" className={inputCls(!!errors.department)} />
          </Field>
          <Field label="Experience (Years)" error={errors.experienceYears?.message}>
            <input {...register('experienceYears')} type="number" min={0} max={60} placeholder="e.g. 8" className={inputCls(!!errors.experienceYears)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Subjects (comma-separated)" error={undefined}>
              <Controller control={control} name="subjects" render={({ field }) => (
                <TagEditor tags={field.value} onChange={field.onChange} maxTags={20} />
              )} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Assigned Classes (e.g. 10A, 11B)" error={undefined}>
              <Controller control={control} name="assignedClasses" render={({ field }) => (
                <TagEditor tags={field.value} onChange={field.onChange} maxTags={30} />
              )} />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* ── 4: Qualification ────────────────────────────────────────────── */}
      <FormSection number={4} title="Qualification" description="Highest academic qualification">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Degree" error={errors.qualification?.degree?.message}>
            <input {...register('qualification.degree')} type="text" placeholder="e.g. B.Ed, M.Sc" className={inputCls(!!errors.qualification?.degree)} />
          </Field>
          <Field label="Institution" error={errors.qualification?.institution?.message}>
            <input {...register('qualification.institution')} type="text" placeholder="e.g. Delhi University" className={inputCls(!!errors.qualification?.institution)} />
          </Field>
          <Field label="Year of Passing" error={errors.qualification?.yearOfPassing?.message}>
            <input {...register('qualification.yearOfPassing')} type="number" min={1950} max={new Date().getFullYear()} placeholder={String(new Date().getFullYear())} className={inputCls(!!errors.qualification?.yearOfPassing)} />
          </Field>
        </div>
      </FormSection>

      {/* ── 5: Remarks ──────────────────────────────────────────────────── */}
      <FormSection number={5} title="Remarks" description="Any additional notes (optional)">
        <Field label="Remarks" error={errors.remarks?.message}>
          <textarea {...register('remarks')} rows={3} placeholder="Any notes about this teacher…"
            className={cn('w-full px-4 py-3 rounded-xl border text-base text-gray-900 placeholder:text-gray-400 bg-white resize-none transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border-gray-200 hover:border-gray-300')} />
        </Field>
      </FormSection>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <button type="submit" disabled={isLoading}
        className={cn('w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-base font-bold text-white',
          'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed')}>
        {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />Saving…</>) : submitLabel}
      </button>
    </form>
  );
};
