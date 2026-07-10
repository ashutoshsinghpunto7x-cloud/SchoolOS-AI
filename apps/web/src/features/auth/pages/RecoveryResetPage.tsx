import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { getHomePathForRole } from '../utils/roleHome';
import { useCompletePasswordReset, useCompletePinReset } from '../hooks/useRecovery';

export const RecoveryResetPage = () => {
  const { user, refreshUser } = useAuthContext();
  const navigate = useNavigate();
  const completePassword = useCompletePasswordReset();
  const completePin = useCompletePinReset();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !user.mustResetPassword && !user.mustResetPin) {
      navigate(getHomePathForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const step: 1 | 2 = user.mustResetPassword ? 1 : 2;

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await completePassword.mutateAsync({ newPassword });
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set new password.');
    }
  }

  async function handlePinSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    const role = user!.role;
    try {
      await completePin.mutateAsync({ pin });
      await refreshUser();
      navigate(getHomePathForRole(role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set new PIN.');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/60 p-8">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Secure Your Account</h1>
            <p className="text-sm text-gray-500 mt-2">
              {step === 1
                ? 'Step 1 of 2 — Set a new password to continue.'
                : 'Step 2 of 2 — Set a new 4-digit PIN to continue.'}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className={`h-1.5 w-10 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-emerald-500'}`} />
              <span className={`h-1.5 w-10 rounded-full ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            </div>
          </div>

          {step === 1 ? (
            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-bold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="newPassword" type="password" required value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="confirmPassword" type="password" required value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit" disabled={completePassword.isPending}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-base font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {completePassword.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePinSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="pin" className="block text-sm font-bold text-gray-700 mb-1.5">New 4-Digit PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="pin" type="password" inputMode="numeric" maxLength={4} required value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-base text-gray-900 tracking-[0.5em] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirmPin" className="block text-sm font-bold text-gray-700 mb-1.5">Confirm PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="confirmPin" type="password" inputMode="numeric" maxLength={4} required value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-base text-gray-900 tracking-[0.5em] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit" disabled={completePin.isPending}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-base font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {completePin.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Finish'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
