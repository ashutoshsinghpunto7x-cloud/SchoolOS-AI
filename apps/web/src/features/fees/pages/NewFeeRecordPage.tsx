import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useCreateFeeRecord } from '../hooks/useFees';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { PageContainer } from '@/components/workspace/PageContainer';
import { FormSection } from '@/features/students/components/FormSection';
import type { CreateFeeRecordPayload, FeeHead } from '@schoolos/types';

const FEE_HEADS: { value: FeeHead; label: string }[] = [
  { value: 'tuition',       label: 'Tuition Fee' },
  { value: 'admission',     label: 'Admission Fee' },
  { value: 'examination',   label: 'Examination Fee' },
  { value: 'transport',     label: 'Transport Fee' },
  { value: 'hostel',        label: 'Hostel Fee' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#A855F7] bg-white';
const labelCls = 'text-xs font-semibold text-gray-500 mb-1 block';

const currentAcademicYear = () => {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
};

const todayStr = () => new Date().toISOString().split('T')[0];

export function NewFeeRecordPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const { mutateAsync: createFee, isPending, error } = useCreateFeeRecord();

  const prefillStudentId   = params.get('studentId') ?? '';
  const prefillStudentName = params.get('studentName') ?? '';

  const [studentSearch, setStudentSearch] = useState(prefillStudentName);
  const [studentId,     setStudentId]     = useState(prefillStudentId);
  const [feeHead,       setFeeHead]       = useState<FeeHead>('tuition');
  const [customHead,    setCustomHead]    = useState('');
  const [description,   setDescription]  = useState('');
  const [academicYear,  setAcademicYear]  = useState(currentAcademicYear());
  const [month,         setMonth]         = useState('');
  const [dueDate,       setDueDate]       = useState(todayStr());
  const [totalAmount,   setTotalAmount]   = useState('');
  const [discount,      setDiscount]      = useState('0');
  const [discountReason,setDiscountReason]= useState('');
  const [notes,         setNotes]         = useState('');
  const [localError,    setLocalError]    = useState('');

  const { data: studentData } = useStudentsPaginated({
    search: studentSearch,
    limit: 10,
    status: 'active',
  });
  const students = studentData?.data ?? [];

  useEffect(() => {
    if (prefillStudentId) setStudentId(prefillStudentId);
  }, [prefillStudentId]);

  const selectedStudent = students.find((s) => s._id === studentId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');

    if (!studentId) { setLocalError('Please select a student.'); return; }
    const amt = parseFloat(totalAmount);
    if (isNaN(amt) || amt <= 0) { setLocalError('Please enter a valid amount.'); return; }

    const payload: CreateFeeRecordPayload = {
      studentId,
      feeHead,
      customHead:     feeHead === 'miscellaneous' ? customHead.trim() || undefined : undefined,
      description:    description.trim() || undefined,
      academicYear,
      month:          month || undefined,
      dueDate,
      totalAmount:    Math.round(amt * 100) / 100,
      discountAmount: Math.round((parseFloat(discount) || 0) * 100) / 100,
      discountReason: discountReason.trim() || undefined,
      notes:          notes.trim() || undefined,
    };

    const record = await createFee(payload);
    navigate(`/fees/${record._id}`);
  }

  const mutationError = error instanceof Error ? error.message : null;
  const displayError  = localError || mutationError;

  return (
    <PageContainer narrow>
      <button onClick={() => navigate('/fees')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button">
        <ArrowLeft className="w-4 h-4" />
        Fee Management
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Assign Fee Record</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student selection */}
        <FormSection number={1} title="Student">
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Search Student *</label>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => { setStudentSearch(e.target.value); setStudentId(''); }}
                className={inputCls}
                placeholder="Name or admission number…"
              />
            </div>

            {studentSearch && !studentId && students.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {students.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => { setStudentId(s._id); setStudentSearch(`${s.fullName} (${s.admissionNumber})`); }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <p className="text-sm font-semibold text-gray-900">{s.fullName}</p>
                    <p className="text-xs text-gray-400">{s.admissionNumber} · Class {s.class}-{s.section}</p>
                  </button>
                ))}
              </div>
            )}

            {studentId && selectedStudent && (
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-[#5B21B6] flex items-center justify-center text-white text-xs font-bold">
                  {selectedStudent.fullName[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedStudent.fullName}</p>
                  <p className="text-xs text-gray-500">{selectedStudent.admissionNumber} · Class {selectedStudent.class}-{selectedStudent.section}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStudentId(''); setStudentSearch(''); }}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-700"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        </FormSection>

        {/* Fee definition */}
        <FormSection number={2} title="Fee Details">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Fee Head *</label>
              <select
                value={feeHead}
                onChange={(e) => setFeeHead(e.target.value as FeeHead)}
                className={inputCls}
                required
              >
                {FEE_HEADS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>

            {feeHead === 'miscellaneous' && (
              <div className="col-span-2">
                <label className={labelCls}>Custom Fee Head Label</label>
                <input type="text" value={customHead} onChange={(e) => setCustomHead(e.target.value)}
                  className={inputCls} placeholder="e.g., Sports Fee, Library Fee…" maxLength={100} />
              </div>
            )}

            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                className={inputCls} placeholder="e.g., April 2024 Tuition Fee" maxLength={500} />
            </div>

            <div>
              <label className={labelCls}>Academic Year *</label>
              <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
                className={inputCls} placeholder="2024-25" required pattern="\d{4}-\d{2,4}" />
            </div>

            <div>
              <label className={labelCls}>Month (optional)</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
                <option value="">— Select Month —</option>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </FormSection>

        {/* Amounts */}
        <FormSection number={3} title="Amount & Discount">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Total Amount (₹) *</label>
              <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
                className={inputCls} placeholder="5000" min={0.01} step={0.01} required />
            </div>

            <div>
              <label className={labelCls}>Due Date *</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className={inputCls} required />
            </div>

            <div>
              <label className={labelCls}>Discount / Scholarship (₹)</label>
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)}
                className={inputCls} placeholder="0" min={0} step={0.01} />
            </div>

            <div>
              <label className={labelCls}>Discount Reason</label>
              <input type="text" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}
                className={inputCls} placeholder="e.g., Merit scholarship" maxLength={200} />
            </div>
          </div>

          {totalAmount && (
            <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
              Net payable:{' '}
              <span className="font-bold text-gray-900">
                ₹{(Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(discount) || 0))).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </FormSection>

        {/* Notes */}
        <FormSection number={4} title="Internal Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="Internal notes for staff (not visible to parents)"
            maxLength={2000}
          />
        </FormSection>

        {displayError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {displayError}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/fees')}
            className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="flex-1 h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white text-sm font-bold transition-colors">
            {isPending ? 'Creating…' : 'Create Fee Record'}
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
