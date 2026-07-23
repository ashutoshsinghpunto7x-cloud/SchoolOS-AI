import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Phone, Mail, MapPin, Briefcase, Building2, IndianRupee, Calendar } from 'lucide-react';
import { useEmployee } from '../hooks/useEmployees';

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Teacher', principal: 'Principal', vice_principal: 'Vice Principal',
  receptionist: 'Receptionist', accountant: 'Accountant', librarian: 'Librarian',
  driver: 'Driver', peon: 'Peon', other: 'Other',
};

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

/** Read-only counterpart to EmployeeProfilePage — mounted in the Principal and
 *  Accountant workspaces, which only have GET access to employee records
 *  (edit/QR/payroll actions remain admin-only, both server-side and here). */
export function EmployeeDirectoryProfilePage({ basePath = '/admin/employees' }: { basePath?: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: employee, isLoading } = useEmployee(id ?? '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
        <p className="text-sm font-semibold text-gray-700">Employee not found</p>
        <button onClick={() => navigate(basePath)} className="mt-3 text-xs text-[#5B21B6] font-semibold">Back to Employees</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(basePath)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Employee Profile</h1>
      </div>

      <div className="px-4 py-5 max-w-3xl mx-auto space-y-4">
        <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 45%, #DB2777 100%)' }}>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{initialsOf(employee.fullName)}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">{employee.fullName}</h2>
          <p className="text-white/70 text-sm mt-1">{employee.employeeId} · {ROLE_LABEL[employee.role] ?? employee.role}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-white/20 text-white/80'}`}>
            {employee.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Contact & Role</p>
          <InfoRow icon={Phone} label="Phone" value={employee.phone} />
          <InfoRow icon={Phone} label="Alternate Phone" value={employee.alternatePhone} />
          <InfoRow icon={Mail} label="Email" value={employee.email} />
          <InfoRow icon={MapPin} label="Address" value={employee.address} />
          <InfoRow icon={Briefcase} label="Designation" value={employee.designation} />
          <InfoRow icon={Building2} label="Department" value={employee.department} />
          <InfoRow icon={IndianRupee} label="Monthly Salary" value={typeof employee.monthlySalary === 'number' ? `₹${employee.monthlySalary.toLocaleString('en-IN')}` : undefined} />
          <InfoRow icon={Calendar} label="Joining Date" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined} />
        </div>
      </div>
    </div>
  );
}
