import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, X, Copy, Check } from 'lucide-react';
import { apiClient } from '@/services/api';

interface CreateSchoolInput {
  schoolName: string;
  schoolCode?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone?: string;
}

interface CreateSchoolResult {
  schoolId: string;
  schoolName: string;
  admin: { _id: string; email: string; firstName: string; lastName: string };
  temporaryPassword: string;
  temporaryPasswordExpiresAt?: string;
}

const createSchool = async (input: CreateSchoolInput): Promise<CreateSchoolResult> => {
  const res = await apiClient.post<{ data: CreateSchoolResult }>('/ops/schools', input);
  return res.data.data;
};

const EMPTY = { schoolName: '', schoolCode: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '' };

const errorMessage = (err: unknown): string => {
  const e = err as { response?: { status?: number; data?: { error?: { message?: string }; message?: string } } };
  if (e.response?.status === 403) return 'Only the owner / super admin can create a school.';
  return e.response?.data?.error?.message ?? e.response?.data?.message ?? 'Could not create the school. Please try again.';
};

const inputCls =
  'mt-1 w-full rounded-md border border-[#2A3340] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#667085] focus:border-[#3B82F6] focus:outline-none';

/** Ops-only onboarding of a new school (tenant). Self-contained: touches no existing Ops screen state
 *  other than refreshing the schools list after a successful create. */
export function CreateSchoolPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState<CreateSchoolResult | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: createSchool,
    onSuccess: (data) => {
      setResult(data);
      void qc.invalidateQueries({ queryKey: ['ops'] });
    },
  });

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setResult(null);
    setCopied(false);
    mutation.reset();
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      schoolName: form.schoolName,
      schoolCode: form.schoolCode || undefined,
      adminFirstName: form.adminFirstName,
      adminLastName: form.adminLastName,
      adminEmail: form.adminEmail,
      adminPhone: form.adminPhone || undefined,
    });
  };

  const copyCreds = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`Login: ${result.admin.email}\nTemporary password: ${result.temporaryPassword}`);
      setCopied(true);
    } catch {
      /* clipboard unavailable — password remains visible on screen */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
      >
        <Plus className="h-4 w-4" /> Create School
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2A3340] bg-[#161C24] p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-[#F4F6F8]">
                {result ? 'School created' : 'Create a new school'}
              </h2>
              <button type="button" onClick={close} aria-label="Close" className="text-[#98A2B3] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {result ? (
              <div className="mt-4 space-y-4 text-sm text-[#D0D5DD]">
                <p>
                  <span className="font-semibold text-[#F4F6F8]">{result.schoolName}</span> is ready (ID{' '}
                  <code className="rounded bg-[#0F141B] px-1">{result.schoolId}</code>). Share these school admin
                  credentials securely — the password is shown only once and must be changed at first login.
                </p>
                <div className="rounded-md bg-[#0F141B] p-3 font-mono text-[13px]">
                  <div>Login: {result.admin.email}</div>
                  <div>Temporary password: {result.temporaryPassword}</div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={copyCreds}
                    className="inline-flex items-center gap-2 rounded-md border border-[#2A3340] px-3 py-2 text-sm text-[#F4F6F8] hover:bg-[#1F2733]"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" onClick={close} className="rounded-md bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <label className="block text-sm text-[#98A2B3]">
                  School name
                  <input required className={inputCls} value={form.schoolName} onChange={set('schoolName')} placeholder="e.g. Sunrise Public School" />
                </label>
                <label className="block text-sm text-[#98A2B3]">
                  School code <span className="text-[#667085]">(optional, 2–20 letters/digits — auto-generated if blank)</span>
                  <input className={inputCls} value={form.schoolCode} onChange={set('schoolCode')} placeholder="sunrise" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm text-[#98A2B3]">
                    School admin first name
                    <input required className={inputCls} value={form.adminFirstName} onChange={set('adminFirstName')} />
                  </label>
                  <label className="block text-sm text-[#98A2B3]">
                    School admin last name
                    <input required className={inputCls} value={form.adminLastName} onChange={set('adminLastName')} />
                  </label>
                </div>
                <label className="block text-sm text-[#98A2B3]">
                  School admin login email
                  <input required type="email" className={inputCls} value={form.adminEmail} onChange={set('adminEmail')} />
                </label>
                <label className="block text-sm text-[#98A2B3]">
                  School admin phone <span className="text-[#667085]">(optional)</span>
                  <input className={inputCls} value={form.adminPhone} onChange={set('adminPhone')} />
                </label>

                {mutation.isError && <p className="text-sm text-[#EF4444]">{errorMessage(mutation.error)}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={close} className="rounded-md border border-[#2A3340] px-4 py-2 text-sm text-[#F4F6F8] hover:bg-[#1F2733]">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create school
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
