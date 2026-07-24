import { useState } from 'react';
import { useChangePassword } from '@/features/auth/hooks/useChangePassword';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { mutate, isPending } = useChangePassword();

  const submit = () => {
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => setSuccess(true),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to change password.'),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#232D38] bg-[#121922] p-6">
        <h2 className="text-base font-semibold text-[#F4F6F8]">Change Password</h2>

        {success ? (
          <>
            <p className="mt-3 text-sm text-[#22C55E]">Password changed successfully.</p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-md border border-[#232D38] px-3 py-2 text-sm text-[#F4F6F8] hover:bg-white/[0.03]"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-[#98A2B3]">
              Forgot your current password instead? Ask an owner/super admin to reset it via
              <code className="mx-1 rounded bg-white/[0.05] px-1 py-0.5 font-mono">npm run seed:ops-user</code>
              on the server.
            </p>

            <div className="mt-4 space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>

            {error && <p className="mt-3 text-xs text-[#EF4444]">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-[#232D38] px-3 py-1.5 text-sm text-[#98A2B3] hover:text-[#F4F6F8]"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
                className="rounded-md bg-[#3B82F6] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {isPending ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
