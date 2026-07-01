import { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import type { Enquiry, ConvertToStudentPayload } from '@schoolos/types';
import { useConvertToStudent } from '../hooks/useEnquiries';

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const GENDERS = ['male', 'female', 'other'] as const;

interface ConvertToStudentModalProps {
  enquiry: Enquiry;
  onClose: () => void;
  onSuccess: (studentId: string) => void;
}

const inputCls = `h-11 w-full rounded-xl border border-gray-200 px-3 text-sm
  focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white`;

const Field = ({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export const ConvertToStudentModal = ({ enquiry, onClose, onSuccess }: ConvertToStudentModalProps) => {
  const { mutate: convert, isPending } = useConvertToStudent(enquiry._id);
  const [form, setForm] = useState({
    class:       enquiry.interestedClass ?? '',
    section:     '',
    gender:      '' as typeof GENDERS[number] | '',
    dateOfBirth: '',
    fatherName:  '',
    motherName:  '',
    address:     '',
    admissionStatus: 'active' as const,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function validate() {
    const errs: typeof errors = {};
    if (!form.class)             errs.class = 'Required';
    if (!form.section.trim())    errs.section = 'Required';
    if (!form.gender)            errs.gender = 'Required';
    if (!form.dateOfBirth)       errs.dateOfBirth = 'Required';
    if (!form.fatherName.trim()) errs.fatherName = 'Required';
    if (!form.motherName.trim()) errs.motherName = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !form.gender) return;
    const payload: ConvertToStudentPayload = {
      class:           form.class,
      section:         form.section.trim(),
      gender:          form.gender,
      dateOfBirth:     form.dateOfBirth,
      fatherName:      form.fatherName.trim(),
      motherName:      form.motherName.trim(),
      address:         form.address.trim() || undefined,
      admissionStatus: form.admissionStatus,
    };
    convert(payload, {
      onSuccess: (result) => onSuccess(result.student._id),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Convert to Student</h2>
            <p className="text-sm text-gray-500 mt-0.5">{enquiry.studentName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">
            This action cannot be undone. A new student profile will be created and this enquiry
            will be permanently marked as <strong>Converted</strong>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Class" required>
              <select value={form.class} onChange={set('class')} className={inputCls}>
                <option value="">Select</option>
                {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
              {errors.class && <p className="text-xs text-red-500">{errors.class}</p>}
            </Field>

            <Field label="Section" required>
              <input
                value={form.section}
                onChange={set('section')}
                className={inputCls}
                placeholder="A / B / C"
              />
              {errors.section && <p className="text-xs text-red-500">{errors.section}</p>}
            </Field>

            <Field label="Gender" required>
              <select value={form.gender} onChange={set('gender')} className={inputCls}>
                <option value="">Select</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
              {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
            </Field>

            <Field label="Date of Birth" required>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={set('dateOfBirth')}
                className={inputCls}
              />
              {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth}</p>}
            </Field>

            <Field label="Father's Name" required>
              <input
                value={form.fatherName}
                onChange={set('fatherName')}
                className={inputCls}
                placeholder="Full name"
              />
              {errors.fatherName && <p className="text-xs text-red-500">{errors.fatherName}</p>}
            </Field>

            <Field label="Mother's Name" required>
              <input
                value={form.motherName}
                onChange={set('motherName')}
                className={inputCls}
                placeholder="Full name"
              />
              {errors.motherName && <p className="text-xs text-red-500">{errors.motherName}</p>}
            </Field>
          </div>

          <Field label="Address">
            <input
              value={form.address}
              onChange={set('address')}
              className={inputCls}
              placeholder="Home address"
            />
          </Field>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-11 px-5 rounded-xl border border-gray-200 text-sm font-semibold
                         text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 px-7 rounded-xl bg-green-600 hover:bg-green-700
                         flex items-center gap-2 text-sm font-bold text-white
                         transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Conversion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
