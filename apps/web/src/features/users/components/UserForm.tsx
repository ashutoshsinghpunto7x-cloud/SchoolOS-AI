import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { User, CreateUserPayload, UpdateUserPayload, UserRole } from '@schoolos/types';

interface UserFormProps {
  initial?: User;
  isLoading?: boolean;
  error?: string;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => void;
  onCancel: () => void;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'principal', label: 'Principal' },
  { value: 'reception', label: 'Receptionist' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'accountant', label: 'Accountant' },
];

const fieldCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors';

const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export const UserForm = ({
  initial,
  isLoading = false,
  error,
  onSubmit,
  onCancel,
}: UserFormProps) => {
  const isEdit = Boolean(initial);

  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [role, setRole] = useState<UserRole>(initial?.role ?? 'teacher');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setValidationError('First name, last name, and email are required.');
      return;
    }

    if (!isEdit && !password) {
      setValidationError('Password is required for new users.');
      return;
    }

    if (password && password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }

    if (password && password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    const payload: CreateUserPayload | UpdateUserPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      role,
      ...(password ? { password } : {}),
    };

    onSubmit(payload);
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {displayError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
          {displayError}
        </div>
      )}

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className={labelCls}>
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            className={fieldCls}
            required
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelCls}>
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
            className={fieldCls}
            required
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={labelCls}>
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@school.edu"
          autoComplete="email"
          className={fieldCls}
          required
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className={labelCls}>
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile number"
          autoComplete="tel"
          className={fieldCls}
        />
      </div>

      {/* Role */}
      <div>
        <label htmlFor="role" className={labelCls}>
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className={`${fieldCls} appearance-none cursor-pointer`}
          required
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Password section */}
      <div className="border-t border-gray-100 pt-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">
          {isEdit ? 'Change Password (leave blank to keep current)' : 'Set Password'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className={labelCls}>
              Password {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 characters'}
              autoComplete={isEdit ? 'new-password' : 'new-password'}
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelCls}>
              Confirm Password {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              className={fieldCls}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-sm font-bold text-white transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="h-12 px-6 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
