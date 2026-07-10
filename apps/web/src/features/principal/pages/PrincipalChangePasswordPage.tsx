import { useState } from 'react';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/workspace/PageContainer';
import { BackLink } from '@/components/workspace/BackLink';
import { useChangePassword } from '@/features/auth/hooks/useChangePassword';

const inputCls =
  'w-full h-11 px-3.5 pr-10 rounded-xl border border-gray-200 bg-white text-base ' +
  'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]';

function PasswordField({
  label, value, onChange, show, onToggleShow, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggleShow: () => void; autoComplete: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={inputCls}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export function PrincipalChangePasswordPage() {
  const { mutateAsync, isPending } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    try {
      await mutateAsync({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    }
  }

  return (
    <PageContainer>
      <BackLink to="/principal" label="Principal Dashboard" />

      <div className="max-w-md">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-[#5B21B6]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          This only changes the password for your own principal account. No other staff accounts are affected.
        </p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {success ? (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
              <p className="text-base font-semibold text-gray-900">Password updated</p>
              <p className="text-sm text-gray-500 mt-1">
                Use your new password the next time you sign in. You'll stay signed in here, but other devices will need to log in again.
              </p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="mt-5 h-10 px-5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Change it again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggleShow={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
              />
              <PasswordField
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew((v) => !v)}
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showNew}
                onToggleShow={() => setShowNew((v) => !v)}
                autoComplete="new-password"
              />

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
                className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {isPending ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
