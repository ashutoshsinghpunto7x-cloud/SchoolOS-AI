import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { usePayrollRecord } from '../hooks/usePayroll';
import { SalarySlipPreview } from '../components/SalarySlipPreview';
import { MarkPayrollPaidModal } from '../components/MarkPayrollPaidModal';

export function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: record, isLoading } = usePayrollRecord(id ?? '');
  const [payingOpen, setPayingOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
        <p className="text-sm font-semibold text-gray-700">Payroll record not found</p>
        <button onClick={() => navigate('/admin/payroll')} className="mt-3 text-xs text-[#5B21B6] font-semibold">Back to Payroll</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] print:bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 print:hidden">
        <button onClick={() => navigate('/admin/payroll')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Salary Slip</h1>
        {record.status !== 'paid' && (
          <button
            onClick={() => setPayingOpen(true)}
            className="h-9 px-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
          </button>
        )}
      </div>

      <div className="px-4 py-6 print:py-0 print:px-0">
        <SalarySlipPreview record={record} />
      </div>

      {payingOpen && <MarkPayrollPaidModal record={record} onClose={() => setPayingOpen(false)} />}
    </div>
  );
}
