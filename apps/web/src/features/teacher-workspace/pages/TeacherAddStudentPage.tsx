import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Upload, ChevronDown, X, FileSpreadsheet } from 'lucide-react';
import { useCreateStudent, useQuickImportStudents } from '@/features/students/hooks/useStudents';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 ' +
  'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 ' +
  'focus:border-[#0B3D2E] transition-colors';

const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

const todayStr = new Date().toISOString().slice(0, 10);
const minDobStr = `${new Date().getFullYear() - 100}-01-01`;
const isValidIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

// ── Page ─────────────────────────────────────────────────────────────────────

export function TeacherAddStudentPage() {
  // cls / section come from URL params when navigating via class card
  // If absent, teacher selects manually
  const { cls: paramCls, section: paramSection } = useParams<{ cls?: string; section?: string }>();
  const navigate = useNavigate();
  const { mutateAsync: createStudent, isPending } = useCreateStudent();
  const { mutateAsync: quickImport, isPending: isImporting } = useQuickImportStudents();
  const { data: workspace } = useTeacherWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<
    { totalRows: number; created: number; failed: number; errors: { row: number; message: string }[] } | null
  >(null);
  const [importErr, setImportErr] = useState('');

  // Build list of unique class-section pairs from timetable
  const classPairs = (() => {
    if (!workspace) return [];
    const seen = new Set<string>();
    const pairs: { cls: string; section: string; label: string }[] = [];
    for (const dayGroup of workspace.weekSchedule) {
      for (const e of dayGroup.entries) {
        const key = `${e.class}||${e.section}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ cls: e.class, section: e.section, label: `Class ${e.class} – ${e.section}` });
        }
      }
    }
    return pairs.sort((a, b) => a.label.localeCompare(b.label));
  })();

  // Selected class — default to URL param; auto-select first pair once workspace loads
  const [selectedKey, setSelectedKey] = useState(
    paramCls && paramSection ? `${paramCls}||${paramSection}` : '',
  );
  const [manualCls,  setManualCls]   = useState(paramCls ?? '');
  const [manualSec,  setManualSec]   = useState(paramSection ?? '');

  // Once workspace data arrives, auto-select the first class if none is selected
  useEffect(() => {
    if (!selectedKey && classPairs.length > 0) {
      setSelectedKey(`${classPairs[0].cls}||${classPairs[0].section}`);
    }
  }, [classPairs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve active class/section
  const selectedPair = classPairs.find((p) => `${p.cls}||${p.section}` === selectedKey);
  const activeCls     = selectedPair?.cls     ?? manualCls;
  const activeSec     = selectedPair?.section ?? manualSec;

  // Form fields
  const [rollNumber,  setRollNumber]  = useState('');
  const [fullName,    setFullName]    = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender,      setGender]      = useState<'male' | 'female' | 'other' | ''>('');
  const [phone,       setPhone]       = useState('');
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [success,     setSuccess]     = useState(false);
  const [lastAdded,   setLastAdded]   = useState('');
  const [serverErr,   setServerErr]   = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (!activeCls.trim())   e.cls      = 'Please select or enter a class';
    if (!fullName.trim())    e.fullName  = 'Full name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setServerErr('');
    try {
      await createStudent({
        fullName:        fullName.trim(),
        class:           activeCls.trim(),
        section:         activeSec.trim(),
        gender:          gender || undefined,
        dateOfBirth:     dateOfBirth || undefined,
        parentPhone:     phone.trim() || undefined,
        admissionStatus: 'active',
        remarks:         rollNumber ? `Roll: ${rollNumber}` : undefined,
      });
      setLastAdded(fullName.trim());
      setSuccess(true);
    } catch (err) {
      setServerErr(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  function resetForm() {
    setRollNumber(''); setFullName(''); setDateOfBirth('');
    setGender(''); setPhone(''); setErrors({}); setServerErr(''); setSuccess(false);
  }

  async function handleImportFile(file: File) {
    setImportErr('');
    setImportResult(null);
    if (!activeCls.trim()) {
      setImportErr('Select or enter a class before importing.');
      return;
    }
    try {
      const result = await quickImport({ file, cls: activeCls.trim(), section: activeSec.trim() });
      setImportResult(result);
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : 'Import failed');
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Student Added!</h2>
        <p className="text-gray-500 mt-2 text-sm">
          <span className="font-semibold text-gray-700">{lastAdded}</span> added to Class {activeCls}
          {activeSec ? ` – ${activeSec}` : ''}
        </p>

        <div className="flex flex-col gap-3 mt-8 w-full max-w-xs">
          <button
            onClick={resetForm}
            className="h-12 bg-[#0B3D2E] text-white font-semibold rounded-xl text-sm hover:bg-[#08251B] transition-colors"
          >
            Add Another Student
          </button>
          <button
            onClick={() => navigate(`/teacher/classes/${activeCls}/${activeSec}/students`)}
            className="h-12 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            View Student List
          </button>
          <button
            onClick={() => navigate(`/teacher/attendance/${activeCls}/${activeSec}`)}
            className="h-12 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Take Attendance
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Add Students</h1>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">

        {/* ── Class selector ── */}
        <div>
          <label className={labelCls}>Select Class</label>
          {classPairs.length > 0 ? (
            /* Dropdown if teacher has timetable entries */
            <div className="relative">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className={cn(inputCls, 'appearance-none pr-10')}
              >
                <option value="">Select a class…</option>
                {classPairs.map((p) => (
                  <option key={`${p.cls}||${p.section}`} value={`${p.cls}||${p.section}`}>
                    {p.label}
                  </option>
                ))}
                <option value="__manual">Other class (enter manually)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          ) : (
            /* Manual entry if no timetable */
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Class (e.g. 6)"
                value={manualCls}
                onChange={(e) => { setManualCls(e.target.value); if (errors.cls) setErrors({}); }}
                className={cn(inputCls, errors.cls && 'border-red-400')}
              />
              <input
                type="text"
                placeholder="Section (e.g. A)"
                value={manualSec}
                onChange={(e) => setManualSec(e.target.value.toUpperCase())}
                maxLength={2}
                className={inputCls}
              />
            </div>
          )}
          {/* Manual override when "Other" is chosen */}
          {selectedKey === '__manual' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <input
                type="text"
                placeholder="Class (e.g. 6)"
                value={manualCls}
                onChange={(e) => setManualCls(e.target.value)}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Section (e.g. A)"
                value={manualSec}
                onChange={(e) => setManualSec(e.target.value.toUpperCase())}
                maxLength={2}
                className={inputCls}
              />
            </div>
          )}
          {errors.cls && <p className="text-xs text-red-500 mt-1">{errors.cls}</p>}
        </div>

        {/* ── Student details card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-base font-bold text-gray-900">Add Students</p>
            <p className="text-sm text-gray-400">Enter student details</p>
          </div>

          {/* Roll Number */}
          <div>
            <label className={labelCls}>Roll Number</label>
            <input
              type="number"
              placeholder="Enter roll number"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Full Name */}
          <div>
            <label className={labelCls}>Full Name</label>
            <input
              type="text"
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors((p) => ({ ...p, fullName: '' })); }}
              className={cn(inputCls, errors.fullName && 'border-red-400 focus:ring-red-400/30')}
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          {/* Date of Birth */}
          <div>
            <label className={labelCls}>Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              min={minDobStr}
              max={todayStr}
              onChange={(e) => {
                const v = e.target.value;
                // Some browsers let the year segment run past 4 digits while typing —
                // ignore anything that isn't a clean YYYY-MM-DD so it can't be saved.
                if (v && !isValidIsoDate(v)) return;
                setDateOfBirth(v);
              }}
              className={inputCls}
            />
          </div>

          {/* Gender */}
          <div>
            <label className={labelCls}>Gender</label>
            <div className="flex items-center gap-6 mt-1">
              {(['male', 'female', 'other'] as const).map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setGender(g)}
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors',
                      gender === g ? 'border-[#0B3D2E] bg-[#0B3D2E]' : 'border-gray-300',
                    )}
                  >
                    {gender === g && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-gray-700 capitalize">{g}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>Phone Number (Optional)</label>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Server error */}
        {serverErr && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{serverErr}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={(e) => handleSubmit(e as unknown as FormEvent)}
          disabled={isPending}
          className="w-full h-14 bg-[#0B3D2E] hover:bg-[#08251B] disabled:opacity-60 text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#0B3D2E]/20"
        >
          {isPending ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Adding…</>
          ) : (
            'Add Student'
          )}
        </button>

        {/* Import from Excel */}
        <button
          type="button"
          onClick={() => { setImportResult(null); setImportErr(''); setImportOpen(true); }}
          className="w-full flex items-center justify-center gap-2 text-[#0B3D2E] text-sm font-semibold py-2 hover:underline"
        >
          <Upload className="w-4 h-4" />
          Import from Excel
        </button>
      </div>

      {/* ── Import modal ── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Import from Excel</h3>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-1">
              Importing into <span className="font-semibold text-gray-700">Class {activeCls || '—'}{activeSec ? ` – ${activeSec}` : ''}</span>
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Just a <span className="font-medium">Full Name</span> column is enough — that's all you need to start taking attendance. Roll Number, DOB, Gender, Phone can be added later.
            </p>

            {!activeCls.trim() && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-start gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Select a class above first.</p>
              </div>
            )}

            {/* Dropzone */}
            <button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full border-2 border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-[#10B981]/40 hover:bg-[#10B981]/5 transition-colors disabled:opacity-60',
              )}
            >
              {isImporting ? (
                <Loader2 className="w-8 h-8 text-[#0B3D2E] animate-spin" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-[#0B3D2E]" />
              )}
              <p className="text-sm font-semibold text-gray-700">
                {isImporting ? 'Importing…' : 'Tap to select .xlsx, .xls, or .csv'}
              </p>
              <p className="text-xs text-gray-400">Max 500 rows, 5 MB</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = '';
              }}
            />

            {/* Error */}
            {importErr && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2.5 mt-4">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{importErr}</p>
              </div>
            )}

            {/* Result summary */}
            {importResult && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 bg-emerald-50 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-emerald-600">{importResult.created}</p>
                    <p className="text-[11px] text-emerald-600/80 font-semibold">Added</p>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-red-500">{importResult.failed}</p>
                    <p className="text-[11px] text-red-500/80 font-semibold">Failed</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-gray-700">{importResult.totalRows}</p>
                    <p className="text-[11px] text-gray-500 font-semibold">Total Rows</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600">
                        Row {e.row}: {e.message}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setImportOpen(false); navigate(`/teacher/classes/${activeCls}/${activeSec}/students`); }}
                  className="w-full h-11 bg-[#0B3D2E] text-white font-semibold rounded-xl text-sm hover:bg-[#08251B] transition-colors"
                >
                  View Student List
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
