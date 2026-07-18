import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import { useMyEmployee, useMyEmployeeQr } from '@/features/employees/hooks/useEmployees';
import { IdCardPreview } from '@/features/employees/components/IdCardPreview';

export function TeacherIdCardPage() {
  const navigate = useNavigate();

  const { data: employee, isLoading: loadingEmployee, error } = useMyEmployee();
  const { data: qr } = useMyEmployeeQr(Boolean(employee?.qr));

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-transparent print:bg-white">
      <div className="bg-white teacher-glass-card border-b border-gray-100 dark:border-white/5 px-4 py-4 flex items-center gap-3 print:hidden">
        <button onClick={() => navigate('/teacher/profile')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/60" />
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" /> My ID Card
        </h1>
      </div>

      <div className="px-4 py-6">
        {loadingEmployee ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : error || !employee ? (
          <div className="text-center py-16 px-6">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-white">Your ID card isn't available yet</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-2 max-w-sm mx-auto">
              No staff HR record is linked to your account yet. Ask the school admin to
              set up your employee profile to generate your ID card.
            </p>
          </div>
        ) : (
          <IdCardPreview employee={employee} qrDataUri={qr?.dataUri} />
        )}
      </div>
    </div>
  );
}
