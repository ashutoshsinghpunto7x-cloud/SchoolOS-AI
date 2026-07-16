import { useId, useState } from 'react';
import { Printer, Download, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import { SCHOOL_NAME, SCHOOL_ADDRESS } from '@/features/accountant-workspace/components/FeeReceipt';
import fnicLogo from '@/assets/illustrations/fnic-logo.jpg';
import type { PayrollRecord } from '@schoolos/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PAYMENT_MODE_LABEL: Record<string, string> = {
  cash: 'Cash', cheque: 'Cheque', bank_transfer: 'Bank Transfer', online: 'Online', demand_draft: 'Demand Draft',
};

function deductionLineItems(record: PayrollRecord): { label: string; amount: number }[] {
  const items: { label: string; amount: number }[] = [];
  if (record.absentDays > 0) {
    items.push({ label: `Absent days (${record.absentDays} × ${fmt(record.dailyRate)})`, amount: record.absentDays * record.dailyRate });
  }
  if (record.halfDays > 0) {
    items.push({ label: `Half days (${record.halfDays} × ${fmt(record.dailyRate / 2)})`, amount: record.halfDays * (record.dailyRate / 2) });
  }
  if (items.length === 0) {
    items.push({ label: 'No deductions', amount: 0 });
  }
  return items;
}

// ── Shared body (used at both on-screen and print scale via a `mm` toggle) ─────

function SlipBody({
  record, logoUrl, schoolName, mm,
}: { record: PayrollRecord; logoUrl: string; schoolName: string; mm?: boolean }) {
  const deductionItems = deductionLineItems(record);
  const periodLabel = `${MONTHS[record.month - 1]} ${record.year}`;

  return (
    <div
      className={`relative bg-white text-left w-full flex flex-col ${mm ? 'rounded-none border-0 p-[10mm]' : 'rounded-[24px] border border-gray-200 shadow-sm p-8'}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-gray-200 ${mm ? 'pb-[4mm] mb-[4mm]' : 'pb-4 mb-4'}`}>
        <div className={`flex items-center ${mm ? 'gap-[3mm]' : 'gap-3'}`}>
          <img src={logoUrl} alt={schoolName} className={mm ? 'w-[14mm] h-[14mm] rounded-full object-cover' : 'w-12 h-12 rounded-full object-cover'} />
          <div>
            <p className={`font-serif font-bold text-gray-900 leading-tight ${mm ? 'text-[11px]' : 'text-lg'}`}>{schoolName}</p>
            <p className={`text-gray-400 flex items-center gap-1 ${mm ? 'text-[6px] mt-[0.5mm]' : 'text-xs mt-0.5'}`}>
              <MapPin className={mm ? 'w-[2.5mm] h-[2.5mm] shrink-0' : 'w-3 h-3 shrink-0'} />{SCHOOL_ADDRESS}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold text-[#5B21B6] ${mm ? 'text-[10px]' : 'text-base'}`}>Salary Slip</p>
          <p className={`text-gray-400 ${mm ? 'text-[6.5px]' : 'text-xs'}`}>{periodLabel}</p>
        </div>
      </div>

      {/* Employee details */}
      <div className={`grid grid-cols-2 ${mm ? 'gap-[3mm] mb-[4mm]' : 'gap-4 mb-5'}`}>
        {[
          ['Employee Name', record.employeeName],
          ['Employee ID', record.employeeId],
          ['Designation', record.designation],
          ['Department', record.department || '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className={`text-gray-400 font-semibold ${mm ? 'text-[6px]' : 'text-[11px]'}`}>{label.toUpperCase()}</p>
            <p className={`font-semibold text-gray-900 ${mm ? 'text-[8.5px] mt-[0.5mm]' : 'text-sm mt-0.5'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Attendance summary */}
      <p className={`font-bold text-gray-400 tracking-wide ${mm ? 'text-[6.5px] mb-[1.5mm]' : 'text-[11px] mb-2'}`}>ATTENDANCE SUMMARY</p>
      <div className={`grid grid-cols-4 rounded-2xl border border-gray-200 overflow-hidden ${mm ? 'mb-[4mm]' : 'mb-5'}`}>
        {[
          ['Present', record.presentDays],
          ['Late', record.lateDays],
          ['Half Day', record.halfDays],
          ['Absent', record.absentDays],
        ].map(([label, value], i) => (
          <div key={label as string} className={`text-center ${mm ? 'py-[2mm]' : 'py-3'} ${i > 0 ? 'border-l border-gray-200' : ''}`}>
            <p className={`font-bold text-gray-900 ${mm ? 'text-[10px]' : 'text-lg'}`}>{value}</p>
            <p className={`text-gray-400 ${mm ? 'text-[5.5px]' : 'text-[10px]'}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Salary breakdown */}
      <p className={`font-bold text-gray-400 tracking-wide ${mm ? 'text-[6.5px] mb-[1.5mm]' : 'text-[11px] mb-2'}`}>SALARY BREAKDOWN</p>
      <div className={`rounded-2xl border border-gray-200 overflow-hidden ${mm ? 'mb-[4mm]' : 'mb-5'}`}>
        <div className={`flex items-center justify-between bg-gray-50 border-b border-dashed border-gray-200 ${mm ? 'px-[4mm] py-[1.5mm]' : 'px-5 py-2.5'}`}>
          <span className={`text-gray-700 ${mm ? 'text-[8px]' : 'text-sm'}`}>Gross Salary</span>
          <span className={`font-semibold text-gray-900 ${mm ? 'text-[8.5px]' : 'text-sm'}`}>{fmt(record.grossSalary)}</span>
        </div>
        {deductionItems.map((li, i) => (
          <div key={i} className={`flex items-center justify-between border-b border-dashed border-gray-100 last:border-b-0 ${mm ? 'px-[4mm] py-[1.5mm]' : 'px-5 py-2.5'}`}>
            <span className={`text-gray-500 ${mm ? 'text-[7.5px]' : 'text-xs'}`}>{li.label}</span>
            <span className={`font-medium text-red-600 ${mm ? 'text-[7.5px]' : 'text-xs'}`}>{li.amount > 0 ? `− ${fmt(li.amount)}` : '—'}</span>
          </div>
        ))}
        <div className={`flex items-center justify-between bg-emerald-50 border-t-2 border-emerald-500 ${mm ? 'px-[4mm] py-[2.5mm]' : 'px-5 py-4'}`}>
          <span className={`font-bold text-emerald-700 tracking-wide ${mm ? 'text-[8px]' : 'text-sm'}`}>NET SALARY</span>
          <span className={`font-bold text-emerald-700 ${mm ? 'text-[13px]' : 'text-2xl'}`}>{fmt(record.netSalary)}</span>
        </div>
      </div>

      {/* Payment status */}
      <div className={`flex items-center justify-between ${mm ? 'mb-[6mm]' : 'mb-8'}`}>
        <div className={`inline-flex items-center gap-1.5 rounded-full font-bold ${mm ? 'text-[6.5px] px-[3mm] py-[1mm]' : 'text-xs px-3 py-1.5'} ${
          record.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {record.status === 'paid' ? <CheckCircle2 className={mm ? 'w-[2.5mm] h-[2.5mm]' : 'w-3.5 h-3.5'} /> : <Clock className={mm ? 'w-[2.5mm] h-[2.5mm]' : 'w-3.5 h-3.5'} />}
          {record.status === 'paid' ? 'PAID' : record.status === 'generated' ? 'PENDING' : 'DRAFT'}
        </div>
        {record.status === 'paid' && record.paidAt && (
          <p className={`text-gray-400 ${mm ? 'text-[6.5px]' : 'text-xs'}`}>
            Paid on {new Date(record.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {record.paymentMode ? ` · ${PAYMENT_MODE_LABEL[record.paymentMode] ?? record.paymentMode}` : ''}
          </p>
        )}
      </div>

      {/* Signature line */}
      <div className={`flex items-end justify-end ${mm ? 'mt-auto' : 'mt-auto'}`}>
        <div className={mm ? 'w-[40mm] text-right' : 'w-48 text-right'}>
          <div className="border-t-2 border-gray-800 mb-1.5" />
          <p className={`text-gray-400 ${mm ? 'text-[6px]' : 'text-[11px]'}`}>Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
}

// ── Public component ────────────────────────────────────────────────────────

interface SalarySlipPreviewProps {
  record: PayrollRecord;
  /** Hides the Print/Download action bar — used for read-only teacher contexts. */
  hideActions?: boolean;
}

export function SalarySlipPreview({ record, hideActions }: SalarySlipPreviewProps) {
  const { data: schoolSettings } = useSchoolSettings();
  const logoUrl = schoolSettings?.logoUrl || fnicLogo;
  const schoolName = schoolSettings?.schoolName || SCHOOL_NAME;
  const printAreaId = `payslip-print-${useId().replace(/[:]/g, '')}`;
  const [printing, setPrinting] = useState(false);

  function handlePrint() {
    setPrinting(true);
    const reset = () => { setPrinting(false); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);
    setTimeout(() => window.print(), 50);
  }

  return (
    <div>
      {printing && (
        <style>{`
          @page { size: A4 portrait; margin: 0; }
          @media print {
            body * { visibility: hidden; }
            #${printAreaId}, #${printAreaId} * { visibility: visible; }
            #${printAreaId} {
              position: fixed; top: 0; left: 0; width: 210mm; min-height: 297mm;
            }
          }
        `}</style>
      )}

      {/* On-screen preview */}
      <div className="max-w-2xl mx-auto">
        <SlipBody record={record} logoUrl={logoUrl} schoolName={schoolName} />
      </div>

      {/* Print-only A4 copy */}
      {printing && (
        <div id={printAreaId} className="hidden print:block">
          <SlipBody record={record} logoUrl={logoUrl} schoolName={schoolName} mm />
        </div>
      )}

      {!hideActions && (
        <div className="flex items-center justify-center gap-3 mt-5 print:hidden">
          <button
            onClick={handlePrint}
            className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handlePrint}
            className="h-10 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      )}
    </div>
  );
}
