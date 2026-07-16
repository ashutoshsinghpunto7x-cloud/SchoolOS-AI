import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Camera, Phone, Mail, MapPin, Briefcase, Building2,
  IndianRupee, Calendar, KeyRound, Pencil, X, AlertCircle, CreditCard, Wallet,
} from 'lucide-react';
import { useEmployee, useUpdateEmployee, useUploadEmployeePhoto, useCreateEmployeeLogin } from '../hooks/useEmployees';
import { useEmployeeQr } from '../hooks/useEmployees';
import { SignaturePanel } from '../components/SignaturePanel';
import { QrPanel } from '../components/QrPanel';
import { IdCardPreview } from '../components/IdCardPreview';
import { GenerateSinglePayrollModal } from '@/features/payroll/components/GenerateSinglePayrollModal';
import type { UpdateEmployeePayload } from '@schoolos/types';

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Teacher', principal: 'Principal', vice_principal: 'Vice Principal',
  receptionist: 'Receptionist', accountant: 'Accountant', librarian: 'Librarian',
  driver: 'Driver', peon: 'Peon', other: 'Other',
};

const LOGIN_CAPABLE_ROLES = new Set(['teacher', 'principal', 'accountant', 'receptionist']);

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

// ── Edit modal (plain controlled state, matching BulkAddSalaryModal's pattern) ──

function EditEmployeeModal({ employee, onClose }: { employee: NonNullable<ReturnType<typeof useEmployee>['data']>; onClose: () => void }) {
  const { mutateAsync, isPending, error } = useUpdateEmployee(employee._id);
  const [form, setForm] = useState({
    fullName: employee.fullName,
    phone: employee.phone,
    alternatePhone: employee.alternatePhone ?? '',
    email: employee.email ?? '',
    address: employee.address ?? '',
    designation: employee.designation,
    department: employee.department ?? '',
    monthlySalary: employee.monthlySalary?.toString() ?? '',
    employmentType: employee.employmentType ?? 'full_time',
    status: employee.status,
  });
  const [localErr, setLocalErr] = useState('');

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setLocalErr('');
    if (!form.fullName.trim()) return setLocalErr('Full name is required.');
    if (!/^[6-9]\d{9}$/.test(form.phone)) return setLocalErr('Enter a valid 10-digit phone number.');
    if (!form.designation.trim()) return setLocalErr('Designation is required.');

    const payload: UpdateEmployeePayload = {
      fullName: form.fullName.trim(),
      phone: form.phone,
      alternatePhone: form.alternatePhone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      designation: form.designation.trim(),
      department: form.department || undefined,
      monthlySalary: form.monthlySalary ? Number(form.monthlySalary) : undefined,
      employmentType: form.employmentType as UpdateEmployeePayload['employmentType'],
      status: form.status as UpdateEmployeePayload['status'],
    };

    await mutateAsync(payload);
    onClose();
  }

  const cellCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Edit Employee Details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-gray-600 sm:col-span-2">Full Name
            <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className={`${cellCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-gray-600">Phone
            <input value={form.phone} onChange={(e) => update('phone', e.target.value)} maxLength={10} className={`${cellCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-gray-600">Alternate Phone
            <input value={form.alternatePhone} onChange={(e) => update('alternatePhone', e.target.value)} maxLength={10} className={`${cellCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-gray-600 sm:col-span-2">Email
            <input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" className={`${cellCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-gray-600">Designation
            <input value={form.designation} onChange={(e) => update('designation', e.target.value)} className={`${cellCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-gray-600">Department
            <input value={form.department} onChange={(e) => update('department', e.target.value)} className={`${cellCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-gray-600">Monthly Salary (₹)
            <input value={form.monthlySalary} onChange={(e) => update('monthlySalary', e.target.value)} type="number" min={0} className={`${cellCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-gray-600">Employment Type
            <select value={form.employmentType} onChange={(e) => update('employmentType', e.target.value as typeof form.employmentType)} className={`${cellCls} mt-1`}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
            </select>
          </label>
          <label className="text-xs font-bold text-gray-600">Status
            <select value={form.status} onChange={(e) => update('status', e.target.value as typeof form.status)} className={`${cellCls} mt-1`}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="text-xs font-bold text-gray-600 sm:col-span-2">Address
            <textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} className={`${cellCls} h-auto py-2 resize-none mt-1`} />
          </label>
        </div>

        {displayErr && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-4">
            <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
          </div>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="w-full h-11 mt-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
        </button>
      </div>
    </div>
  );
}

function CreateLoginModal({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const { mutateAsync, isPending, error } = useCreateEmployeeLogin(employeeId);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localErr, setLocalErr] = useState('');

  async function handleCreate() {
    setLocalErr('');
    if (!username.trim()) return setLocalErr('Username is required.');
    if (password.length < 8) return setLocalErr('Password must be at least 8 characters.');
    await mutateAsync({ username: username.trim(), password });
    onClose();
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Create Login Access</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-600 block">Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full h-10 px-3 mt-1 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30" />
          </label>
          <label className="text-xs font-bold text-gray-600 block">Temporary Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full h-10 px-3 mt-1 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30" />
          </label>
        </div>
        {displayErr && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
          </div>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={handleCreate}
          className="w-full h-11 mt-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create Login
        </button>
      </div>
    </div>
  );
}

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: employee, isLoading } = useEmployee(id ?? '');
  const { mutateAsync: uploadPhoto, isPending: uploadingPhoto } = useUploadEmployeePhoto(id ?? '');
  const { data: qr } = useEmployeeQr(id ?? '', Boolean(employee?.qr));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showGeneratePayroll, setShowGeneratePayroll] = useState(false);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadPhoto(file);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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
        <button onClick={() => navigate('/admin/employees')} className="mt-3 text-xs text-[#5B21B6] font-semibold">Back to Employees</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] print:bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 print:hidden">
        <button onClick={() => navigate('/admin/employees')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Employee Profile</h1>
        <button
          onClick={() => setShowEdit(true)}
          className="h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      <div className="px-4 py-5 max-w-3xl mx-auto space-y-4 print:hidden">
        {/* Avatar card */}
        <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 45%, #DB2777 100%)' }}>
          <button onClick={() => fileInputRef.current?.click()} className="relative w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{initialsOf(employee.fullName)}</span>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              {uploadingPhoto ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoChange} className="hidden" />
          <h2 className="text-xl font-bold text-white">{employee.fullName}</h2>
          <p className="text-white/70 text-sm mt-1">{employee.employeeId} · {ROLE_LABEL[employee.role] ?? employee.role}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-white/20 text-white/80'}`}>
            {employee.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Contact & professional info */}
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

        {/* Login provisioning */}
        {LOGIN_CAPABLE_ROLES.has(employee.role) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><KeyRound className="w-4 h-4 text-gray-400" /> Login Access</p>
              <p className="text-xs text-gray-400 mt-0.5">{employee.userId ? 'This employee already has a login account.' : 'No login account yet.'}</p>
            </div>
            {!employee.userId && (
              <button onClick={() => setShowLogin(true)} className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold shrink-0">
                Create Login
              </button>
            )}
          </div>
        )}

        {/* Payroll */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-gray-400" /> Payroll</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {employee.monthlySalary ? 'Generate this employee\'s salary slip for a chosen month.' : 'Set a monthly salary before generating payroll.'}
            </p>
          </div>
          <button
            onClick={() => setShowGeneratePayroll(true)}
            disabled={!employee.monthlySalary}
            className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-40 text-white rounded-xl text-xs font-semibold shrink-0"
          >
            Generate Payroll
          </button>
        </div>

        <SignaturePanel employee={employee} />
        <QrPanel employee={employee} />

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-gray-400" /> ID Card Preview
          </h3>
          <IdCardPreview
            employee={employee}
            qrDataUri={qr?.dataUri}
            onUploadPhoto={(file) => { void uploadPhoto(file); }}
            uploadingPhoto={uploadingPhoto}
          />
        </div>
      </div>

      {showEdit && <EditEmployeeModal employee={employee} onClose={() => setShowEdit(false)} />}
      {showLogin && <CreateLoginModal employeeId={employee._id} onClose={() => setShowLogin(false)} />}
      {showGeneratePayroll && (
        <GenerateSinglePayrollModal
          employeeObjectId={employee._id}
          employeeName={employee.fullName}
          onClose={() => setShowGeneratePayroll(false)}
        />
      )}
    </div>
  );
}
