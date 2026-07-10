import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, IndianRupee } from 'lucide-react';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { useFeeStructure, useUpsertFeeStructure } from '@/features/fees/hooks/useFeeStructure';
import type { FeeHead } from '@schoolos/types';

const FEE_HEADS: { value: FeeHead; label: string }[] = [
  { value: 'tuition',       label: 'Tuition' },
  { value: 'admission',     label: 'Admission' },
  { value: 'examination',   label: 'Examination' },
  { value: 'transport',     label: 'Transport' },
  { value: 'hostel',        label: 'Hostel' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

function AmountCell({ cls, feeHead, academicYear, existingAmount }: { cls: string; feeHead: FeeHead; academicYear: string; existingAmount?: number }) {
  const [value, setValue] = useState(existingAmount != null ? String(existingAmount) : '');
  const [dirty, setDirty] = useState(false);
  const { mutateAsync, isPending } = useUpsertFeeStructure();

  async function save() {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    await mutateAsync({ class: cls, feeHead, academicYear, amount: Math.round(amount * 100) / 100 });
    setDirty(false);
  }

  return (
    <div className="relative">
      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => { setValue(e.target.value); setDirty(true); }}
        onBlur={() => dirty && void save()}
        placeholder="—"
        className="w-full h-9 pl-8 pr-2 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
      />
      {isPending && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400" />}
    </div>
  );
}

export function FeeStructurePage() {
  const navigate = useNavigate();
  const academicYear = currentAcademicYear();
  const { data: classes, isLoading: classesLoading } = useSchoolClasses();
  const { data: structure, isLoading: structureLoading } = useFeeStructure(academicYear);

  const isLoading = classesLoading || structureLoading;

  function amountFor(cls: string, feeHead: FeeHead): number | undefined {
    return structure?.find((s) => s.class === cls && s.feeHead === feeHead)?.amount;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">Fee Structure</h1>
          <p className="text-xs text-gray-500">Standard fee amounts per class · {academicYear}</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ) : !classes?.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No classes set up yet</p>
            <button onClick={() => navigate('/classes')} className="mt-3 text-xs font-semibold text-gray-900 hover:underline">
              Set up classes & sections
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 text-[11px] text-gray-400 uppercase tracking-wide">
                  <th className="text-left font-semibold px-4 py-2.5 sticky left-0 bg-gray-50">Class</th>
                  {FEE_HEADS.map((h) => (
                    <th key={h.value} className="text-right font-semibold px-3 py-2.5">{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classes.map((c) => (
                  <tr key={c._id}>
                    <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap sticky left-0 bg-white">
                      Class {c.name}
                    </td>
                    {FEE_HEADS.map((h) => (
                      <td key={h.value} className="px-2 py-2 min-w-[110px]">
                        <AmountCell cls={c.name} feeHead={h.value} academicYear={academicYear} existingAmount={amountFor(c.name, h.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Click a field and tap away to save. Leave blank if that fee doesn't apply to a class.</p>
      </div>
    </div>
  );
}
