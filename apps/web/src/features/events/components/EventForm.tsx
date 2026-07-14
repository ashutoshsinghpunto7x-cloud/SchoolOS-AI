import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type {
  SchoolEvent,
  CreateEventPayload,
  EventType,
  EventAudience,
} from '@schoolos/types';
import { FormSection } from '@/features/students/components/FormSection';
import { EVENT_TYPE_LABEL } from './EventTypeBadge';

const EVENT_TYPES: EventType[] = [
  'holiday', 'ptm', 'examination', 'school_event',
  'staff_meeting', 'fee_due_date', 'admission_event', 'general',
];

const AUDIENCE_OPTIONS: { value: EventAudience; label: string }[] = [
  { value: 'all',      label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'parents',  label: 'Parents' },
  { value: 'staff',    label: 'Staff' },
];

interface FormState {
  title: string;
  description: string;
  eventType: EventType | '';
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  audience: EventAudience[];
  organizer: string;
  notes: string;
  tags: string;
}

interface EventFormProps {
  defaultValues?: Partial<SchoolEvent>;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export const EventForm = ({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save Event',
}: EventFormProps) => {
  const [form, setForm] = useState<FormState>({
    title:       defaultValues?.title       ?? '',
    description: defaultValues?.description ?? '',
    eventType:   defaultValues?.eventType   ?? '',
    startDate:   defaultValues?.startDate   ? defaultValues.startDate.split('T')[0] : '',
    endDate:     defaultValues?.endDate     ? defaultValues.endDate.split('T')[0]   : '',
    isAllDay:    defaultValues?.isAllDay    ?? true,
    startTime:   defaultValues?.startTime   ?? '',
    endTime:     defaultValues?.endTime     ?? '',
    location:    defaultValues?.location    ?? '',
    audience:    defaultValues?.audience    ?? ['all'],
    organizer:   defaultValues?.organizer   ?? '',
    notes:       defaultValues?.notes       ?? '',
    tags:        defaultValues?.tags?.join(', ') ?? '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function toggleAudience(value: EventAudience) {
    const next = form.audience.includes(value)
      ? form.audience.filter((a) => a !== value)
      : [...form.audience, value];
    set('audience', next.length ? next : ['all']);
  }

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.title.trim())   errs.title     = 'Title is required';
    if (!form.eventType)      errs.eventType = 'Event type is required';
    if (!form.startDate)      errs.startDate = 'Start date is required';
    if (!form.endDate)        errs.endDate   = 'End date is required';
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      errs.endDate = 'End date must be on or after start date';
    }
    setErrors(errs);
    return !Object.keys(errs).length;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: CreateEventPayload = {
      title:       form.title.trim(),
      description: form.description.trim() || undefined,
      eventType:   form.eventType as EventType,
      startDate:   form.startDate,
      endDate:     form.endDate,
      isAllDay:    form.isAllDay,
      startTime:   !form.isAllDay && form.startTime ? form.startTime : undefined,
      endTime:     !form.isAllDay && form.endTime   ? form.endTime   : undefined,
      location:    form.location.trim() || undefined,
      audience:    form.audience,
      organizer:   form.organizer.trim() || undefined,
      notes:       form.notes.trim() || undefined,
      tags:        form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    await onSubmit(payload);
  }

  const inputCls = (field: keyof FormState) =>
    `w-full h-11 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors
     ${errors[field] ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#A855F7]'}`;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
      {/* Section 1 — Basic Info */}
      <FormSection number={1} title="Event Details" description="Title, type, and dates">
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={200}
              placeholder="e.g. Annual Sports Day"
              className={inputCls('title')}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Event Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.eventType}
              onChange={(e) => set('eventType', e.target.value as EventType)}
              className={`${inputCls('eventType')} cursor-pointer`}
            >
              <option value="">Select type…</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>
              ))}
            </select>
            {errors.eventType && <p className="text-red-500 text-xs mt-1">{errors.eventType}</p>}
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => {
                  set('startDate', e.target.value);
                  if (!form.endDate || e.target.value > form.endDate) {
                    set('endDate', e.target.value);
                  }
                }}
                className={inputCls('startDate')}
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => set('endDate', e.target.value)}
                className={inputCls('endDate')}
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* All-day toggle + times */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAllDay}
                onChange={(e) => set('isAllDay', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-[#A855F7] cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700">All-day event</span>
            </label>

            {!form.isAllDay && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => set('startTime', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => set('endTime', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {/* Section 2 — Audience & Location */}
      <FormSection number={2} title="Audience & Location" description="Who this event is for and where">
        <div className="flex flex-col gap-4">
          {/* Audience */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Audience</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleAudience(value)}
                  className={`h-9 px-4 rounded-xl text-sm font-semibold border transition-colors
                    ${form.audience.includes(value)
                      ? 'bg-[#5B21B6] text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              maxLength={500}
              placeholder="e.g. School Auditorium, Ground, Online…"
              className={inputCls('location')}
            />
          </div>

          {/* Organizer */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organizer</label>
            <input
              type="text"
              value={form.organizer}
              onChange={(e) => set('organizer', e.target.value)}
              maxLength={200}
              placeholder="e.g. Vice Principal, Sports Committee…"
              className={inputCls('organizer')}
            />
          </div>
        </div>
      </FormSection>

      {/* Section 3 — Description & Notes */}
      <FormSection number={3} title="Description & Notes" description="Additional details visible to staff">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Brief description of the event…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                         focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Internal Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Internal notes for staff only…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                         focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="e.g. sports, annual, mandatory (comma-separated)"
              className={inputCls('tags')}
            />
            <p className="text-xs text-gray-400 mt-1">Separate multiple tags with commas</p>
          </div>
        </div>
      </FormSection>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="h-11 px-8 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50
                     text-sm font-bold text-white transition-colors flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
