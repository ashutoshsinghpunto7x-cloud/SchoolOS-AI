import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { CreateEnquiryPayload, EnquiryStage, EnquirySource, Enquiry } from '@schoolos/types';

const FormSection = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{number}</span>
      <h3 className="text-sm font-bold text-gray-700">{title}</h3>
    </div>
    {children}
  </div>
);

const SOURCES: { value: EnquirySource; label: string }[] = [
  { value: 'walk_in',      label: 'Walk-in'      },
  { value: 'website',      label: 'Website'       },
  { value: 'referral',     label: 'Referral'      },
  { value: 'social_media', label: 'Social Media'  },
  { value: 'phone',        label: 'Phone'         },
  { value: 'email',        label: 'Email'         },
  { value: 'other',        label: 'Other'         },
];

const STAGES: { value: EnquiryStage; label: string }[] = [
  { value: 'new_enquiry',           label: 'New Enquiry'           },
  { value: 'contacted',             label: 'Contacted'             },
  { value: 'follow_up_scheduled',   label: 'Follow-up Scheduled'  },
  { value: 'campus_visit',          label: 'Campus Visit'          },
  { value: 'application_submitted', label: 'Application Submitted' },
  { value: 'documents_pending',     label: 'Documents Pending'     },
  { value: 'admission_approved',    label: 'Admission Approved'    },
  { value: 'lost',                  label: 'Lost'                  },
];

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];

interface EnquiryFormProps {
  defaultValues?: Partial<Enquiry>;
  onSubmit: (data: CreateEnquiryPayload) => void;
  isPending: boolean;
  submitLabel?: string;
}

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

const inputCls = `h-11 w-full rounded-xl border border-gray-200 px-3 text-sm
  focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white`;

export const EnquiryForm = ({
  defaultValues, onSubmit, isPending, submitLabel = 'Save',
}: EnquiryFormProps) => {
  const [form, setForm] = useState({
    studentName:        defaultValues?.studentName        ?? '',
    interestedClass:    defaultValues?.interestedClass    ?? '',
    interestedSection:  '',
    parentName:         defaultValues?.parentName         ?? '',
    parentPhone:        defaultValues?.parentPhone        ?? '',
    parentEmail:        defaultValues?.parentEmail        ?? '',
    alternatePhone:     defaultValues?.alternatePhone     ?? '',
    address:            '',
    source:             defaultValues?.source             ?? 'walk_in' as EnquirySource,
    stage:              defaultValues?.stage              ?? 'new_enquiry' as EnquiryStage,
    followUpDate:       defaultValues?.followUpDate?.slice(0, 10) ?? '',
    assignedCounsellor: defaultValues?.assignedCounsellor ?? '',
    remarks:            defaultValues?.remarks            ?? '',
    tags:               defaultValues?.tags?.join(', ')  ?? '',
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  function validate() {
    const errs: typeof errors = {};
    if (!form.studentName.trim()) errs.studentName = 'Required';
    if (!form.interestedClass)    errs.interestedClass = 'Required';
    if (!form.parentName.trim())  errs.parentName = 'Required';
    if (!form.parentPhone.match(/^[6-9]\d{9}$/)) errs.parentPhone = 'Enter valid 10-digit mobile number';
    if (form.alternatePhone && !form.alternatePhone.match(/^[6-9]\d{9}$/))
      errs.alternatePhone = 'Enter valid 10-digit mobile number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: CreateEnquiryPayload = {
      studentName:        form.studentName.trim(),
      interestedClass:    form.interestedClass,
      parentName:         form.parentName.trim(),
      parentPhone:        form.parentPhone.trim(),
      parentEmail:        form.parentEmail.trim() || undefined,
      alternatePhone:     form.alternatePhone.trim() || undefined,
      source:             form.source,
      stage:              form.stage,
      followUpDate:       form.followUpDate || undefined,
      assignedCounsellor: form.assignedCounsellor.trim() || undefined,
      remarks:            form.remarks.trim() || undefined,
      tags:               form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {/* Section 1 — Student */}
      <FormSection number={1} title="Student Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Student Name" required>
            <input
              value={form.studentName}
              onChange={set('studentName')}
              className={inputCls}
              placeholder="Full name of student"
            />
            {errors.studentName && <p className="text-xs text-red-500">{errors.studentName}</p>}
          </Field>

          <Field label="Interested Class" required>
            <select value={form.interestedClass} onChange={set('interestedClass')} className={inputCls}>
              <option value="">Select class</option>
              {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            {errors.interestedClass && <p className="text-xs text-red-500">{errors.interestedClass}</p>}
          </Field>

          <Field label="Interested Section">
            <input
              value={form.interestedSection}
              onChange={set('interestedSection')}
              className={inputCls}
              placeholder="A / B / C (optional)"
            />
          </Field>
        </div>
      </FormSection>

      {/* Section 2 — Parent / Guardian */}
      <FormSection number={2} title="Parent / Guardian">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Parent / Guardian Name" required>
            <input
              value={form.parentName}
              onChange={set('parentName')}
              className={inputCls}
              placeholder="Father / Mother / Guardian"
            />
            {errors.parentName && <p className="text-xs text-red-500">{errors.parentName}</p>}
          </Field>

          <Field label="Mobile Number" required>
            <input
              value={form.parentPhone}
              onChange={set('parentPhone')}
              className={inputCls}
              placeholder="10-digit mobile"
              maxLength={10}
              inputMode="numeric"
            />
            {errors.parentPhone && <p className="text-xs text-red-500">{errors.parentPhone}</p>}
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.parentEmail}
              onChange={set('parentEmail')}
              className={inputCls}
              placeholder="parent@email.com"
            />
          </Field>

          <Field label="Alternate Mobile">
            <input
              value={form.alternatePhone}
              onChange={set('alternatePhone')}
              className={inputCls}
              placeholder="Optional"
              maxLength={10}
              inputMode="numeric"
            />
            {errors.alternatePhone && <p className="text-xs text-red-500">{errors.alternatePhone}</p>}
          </Field>

          <div className="sm:col-span-2">
            <Field label="Address">
              <textarea
                value={form.address}
                onChange={set('address')}
                rows={2}
                className={`${inputCls} h-auto py-2.5 resize-none`}
                placeholder="Home address (optional)"
              />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* Section 3 — Enquiry Details */}
      <FormSection number={3} title="Enquiry Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Source">
            <select value={form.source} onChange={set('source')} className={inputCls}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>

          <Field label="Stage">
            <select value={form.stage} onChange={set('stage')} className={inputCls}>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>

          <Field label="Follow-up Date">
            <input
              type="date"
              value={form.followUpDate}
              onChange={set('followUpDate')}
              className={inputCls}
            />
          </Field>

          <Field label="Assigned Counsellor">
            <input
              value={form.assignedCounsellor}
              onChange={set('assignedCounsellor')}
              className={inputCls}
              placeholder="Staff name (optional)"
            />
          </Field>

          <Field label="Tags">
            <input
              value={form.tags}
              onChange={set('tags')}
              className={inputCls}
              placeholder="Comma-separated: scholarship, sibling…"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Remarks">
              <textarea
                value={form.remarks}
                onChange={set('remarks')}
                rows={3}
                className={`${inputCls} h-auto py-2.5 resize-none`}
                placeholder="Initial notes or context…"
              />
            </Field>
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700
                     flex items-center gap-2 text-sm font-bold text-white
                     transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
