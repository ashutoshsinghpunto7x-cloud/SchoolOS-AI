import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { X, Loader2, AlertCircle, UserPlus, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateEmployee, employeeKeys } from '../hooks/useEmployees';
import { employeeApi } from '../api/employee.api';
import type { CreateEmployeePayload } from '@schoolos/types';

const phoneRule = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const employeeFormSchema = z.object({
  fullName:       z.string({ required_error: 'Full name is required' }).min(2, 'At least 2 characters').max(100),
  gender:         z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  dateOfBirth:    z.string().optional().or(z.literal('')),
  phone:          phoneRule,
  alternatePhone: phoneRule.optional().or(z.literal('')),
  email:          z.string().email('Enter a valid email').optional().or(z.literal('')),
  address:        z.string().optional(),
  designation:    z.string({ required_error: 'Designation is required' }).min(1, 'Designation is required'),
  department:     z.string().optional(),
  joiningDate:    z.string().optional().or(z.literal('')),
  monthlySalary:  z.coerce.number().min(0).optional().or(z.literal('')),
  employmentType: z.enum(['full_time', 'part_time', 'contract']).optional(),
  role:           z.enum(['teacher', 'principal', 'vice_principal', 'receptionist', 'accountant', 'librarian', 'driver', 'peon', 'other'], { required_error: 'Role is required' }),
  status:         z.enum(['active', 'inactive']),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'principal', label: 'Principal' },
  { value: 'vice_principal', label: 'Vice Principal' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'driver', label: 'Driver' },
  { value: 'peon', label: 'Peon' },
  { value: 'other', label: 'Other' },
];

const inputCls = (err?: boolean) => cn(
  'w-full h-10 px-3 rounded-xl border bg-white text-sm text-gray-900 placeholder:text-gray-400',
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]',
  err ? 'border-red-300' : 'border-gray-200',
);

const Field = ({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-gray-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
  </div>
);

interface AddEmployeeModalProps {
  onClose: () => void;
}

export function AddEmployeeModal({ onClose }: AddEmployeeModalProps) {
  const qc = useQueryClient();
  const { mutateAsync: createEmployee } = useCreateEmployee();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: { role: 'teacher' as const, status: 'active' as const, employmentType: 'full_time' as const },
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: EmployeeFormValues) {
    setSubmitErr('');
    setSubmitting(true);
    try {
      const payload: CreateEmployeePayload = {
        fullName: values.fullName,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth || undefined,
        phone: values.phone,
        alternatePhone: values.alternatePhone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        designation: values.designation,
        department: values.department || undefined,
        joiningDate: values.joiningDate || undefined,
        monthlySalary: values.monthlySalary === '' ? undefined : values.monthlySalary,
        employmentType: values.employmentType,
        role: values.role,
        status: values.status,
      };

      const created = await createEmployee(payload);

      // Photo upload is a separate endpoint per the backend contract — fire it
      // immediately after creation (using the new employee's id), under the
      // same combined loading state so the user sees one continuous "Creating…".
      if (photoFile) {
        await employeeApi.uploadPhoto(created._id, photoFile);
        qc.invalidateQueries({ queryKey: employeeKeys.all });
      }

      onClose();
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gray-400" /> Add Employee
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Create an HR record — a QR code and employee ID are generated automatically.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-full bg-[#A855F7]/10 border border-dashed border-[#A855F7]/40 flex items-center justify-center overflow-hidden shrink-0"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-5 h-5 text-[#5B21B6]" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoChange} className="hidden" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Photo (optional)</p>
              <p className="text-[11px] text-gray-400">JPEG, PNG, WEBP or GIF — up to 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Full Name" required error={errors.fullName?.message}>
                <input {...register('fullName')} type="text" placeholder="e.g. Anita Verma" className={inputCls(!!errors.fullName)} />
              </Field>
            </div>
            <Field label="Gender" required error={errors.gender?.message}>
              <select {...register('gender')} className={inputCls(!!errors.gender)}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
              <input {...register('dateOfBirth')} type="date" max={new Date().toISOString().split('T')[0]} className={inputCls(!!errors.dateOfBirth)} />
            </Field>
            <Field label="Phone" required error={errors.phone?.message}>
              <input {...register('phone')} type="tel" maxLength={10} placeholder="10-digit mobile number" className={inputCls(!!errors.phone)} />
            </Field>
            <Field label="Alternate Phone" error={errors.alternatePhone?.message}>
              <input {...register('alternatePhone')} type="tel" maxLength={10} placeholder="Optional" className={inputCls(!!errors.alternatePhone)} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="Optional — required for login access" className={inputCls(!!errors.email)} />
            </Field>
            <Field label="Role" required error={errors.role?.message}>
              <select {...register('role')} className={inputCls(!!errors.role)}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Designation" required error={errors.designation?.message}>
              <input {...register('designation')} type="text" placeholder="e.g. Math Teacher" className={inputCls(!!errors.designation)} />
            </Field>
            <Field label="Department" error={errors.department?.message}>
              <input {...register('department')} type="text" placeholder="e.g. Science" className={inputCls(!!errors.department)} />
            </Field>
            <Field label="Employment Type" error={errors.employmentType?.message}>
              <select {...register('employmentType')} className={inputCls(!!errors.employmentType)}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </select>
            </Field>
            <Field label="Joining Date" error={errors.joiningDate?.message}>
              <input {...register('joiningDate')} type="date" className={inputCls(!!errors.joiningDate)} />
            </Field>
            <Field label="Monthly Salary (₹)" error={errors.monthlySalary?.message as string | undefined}>
              <input {...register('monthlySalary')} type="number" min={0} step={0.01} placeholder="Optional" className={inputCls(!!errors.monthlySalary)} />
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <select {...register('status')} className={inputCls(!!errors.status)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address" error={errors.address?.message}>
                <textarea {...register('address')} rows={2} placeholder="Optional" className={cn(inputCls(!!errors.address), 'h-auto py-2 resize-none')} />
              </Field>
            </div>
          </div>

          {submitErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {submitErr}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create Employee
          </button>
        </form>
      </div>
    </div>
  );
}
