import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, KeyRound, Loader2 } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { getHomePathForRole } from '../utils/roleHome';
import { getRememberedDevices } from '../utils/rememberedDevices';
import type { UserRole } from '@schoolos/types';
import { PinSetupPrompt } from '../components/PinSetupPrompt';
import { SchoolOSMark } from '../../../components/splash/SchoolOSMark';

export const LoginPage = () => {
  const { login, loginWithPin, isAuthenticated, user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [selectedDeviceEmail, setSelectedDeviceEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<{ email: string } | null>(null);

  const rememberedDevices = getRememberedDevices();

  useEffect(() => {
    if (rememberedDevices.length > 0 && !selectedDeviceEmail) {
      setSelectedDeviceEmail(rememberedDevices[rememberedDevices.length - 1].email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goHome = (role: UserRole) => {
    const from = (location.state as { from?: string })?.from ?? getHomePathForRole(role);
    navigate(from, { replace: true });
  };

  // Redirect if already logged in (e.g. navigating back to /login manually) —
  // suppressed while the post-login PIN setup prompt is showing, since `user`
  // becomes non-null the instant login() resolves, which would otherwise race
  // this redirect ahead of the prompt.
  useEffect(() => {
    if (pinPrompt) return;
    if (isAuthenticated && user) {
      goHome(user.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, pinPrompt]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError('');
    setIsLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      const alreadyRemembered = rememberedDevices.some((d) => d.email === loggedInUser.email.toLowerCase());
      if (!alreadyRemembered) {
        setPinPrompt({ email: loggedInUser.email });
      } else {
        goHome(loggedInUser.role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const device = rememberedDevices.find((d) => d.email === selectedDeviceEmail);
    if (!device || !/^\d{4}$/.test(pin)) {
      setError('Enter your 4-digit PIN.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const loggedInUser = await loginWithPin(device.deviceId, pin);
      goHome(loggedInUser.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC] flex items-center justify-center px-4">
      {/* Background texture, matching splash screen */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `
              linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(241,245,249,0.6) 55%, rgba(226,232,240,0.8) 100%),
              repeating-linear-gradient(90deg, rgba(100,116,139,0.05) 0px, rgba(100,116,139,0.05) 2px, transparent 2px, transparent 72px),
              repeating-linear-gradient(0deg, rgba(100,116,139,0.04) 0px, rgba(100,116,139,0.04) 2px, transparent 2px, transparent 54px)
            `,
          }}
        />
        <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_30%,rgba(226,232,240,0.5)_100%)]" />
      </div>

      {/* Glow behind logo */}
      <div className="pointer-events-none absolute left-1/2 top-[28%] h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/20 blur-[110px] animate-splash-glow" />

      {/* Bottom-left concentric circles, matching splash screen */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-blue-900/[0.06]"
            style={{ inset: `${i * 40}px` }}
          />
        ))}
      </div>

      {/* Top-right dot grid, matching splash screen */}
      <div className="pointer-events-none absolute right-6 top-8 grid grid-cols-5 gap-2.5 sm:right-12 sm:top-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="h-[3px] w-[3px] rounded-full bg-blue-500/40" />
        ))}
      </div>

      <div className="relative w-full max-w-[400px] animate-fade-up">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="scale-[0.65] -mb-3">
            <SchoolOSMark />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-gray-900">FN</span>
            <span className="bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">IC</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your school account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/60 p-8">
          {mode === 'password' ? (
            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-5">

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-gray-700 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.com"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200
                               text-base text-gray-900 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-colors duration-150"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200
                               text-base text-gray-900 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-colors duration-150"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                           text-base font-bold text-white
                           flex items-center justify-center gap-2
                           transition-colors duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {rememberedDevices.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setError(''); setMode('pin'); }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Sign in with PIN instead
                </button>
              )}

              <div className="text-center">
                <Link to="/recover-account" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                  Recover Account
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePinSubmit} noValidate className="space-y-5">
              {rememberedDevices.length > 1 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Account</label>
                  <select
                    value={selectedDeviceEmail}
                    onChange={(e) => setSelectedDeviceEmail(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl border border-gray-200 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {rememberedDevices.map((d) => (
                      <option key={d.deviceId} value={d.email}>{d.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="pin" className="block text-sm font-bold text-gray-700 mb-2">4-Digit PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoFocus
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200
                               text-base text-gray-900 tracking-[0.5em] placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-colors duration-150"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || pin.length !== 4}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                           text-base font-bold text-white flex items-center justify-center gap-2
                           transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => { setError(''); setPin(''); setMode('password'); }}
                className="w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Use email and password instead
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Contact your administrator if you need access.
        </p>
      </div>

      {pinPrompt && (
        <PinSetupPrompt
          email={pinPrompt.email}
          onDone={() => {
            const role = user?.role;
            setPinPrompt(null);
            if (role) goHome(role);
          }}
        />
      )}
    </div>
  );
};
