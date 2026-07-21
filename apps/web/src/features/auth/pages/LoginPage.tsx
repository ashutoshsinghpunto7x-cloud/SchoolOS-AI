import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Lock, KeyRound, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { getHomePathForRole } from '../utils/roleHome';
import { getRememberedDevices } from '../utils/rememberedDevices';
import type { UserRole } from '@schoolos/types';
import { PinSetupPrompt } from '../components/PinSetupPrompt';
import { pingServerAwake } from '../../../services/api';
import fnicLogo from '../../../assets/illustrations/fnic-logo.jpg';

function useChromaKeyedLogo(src: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
        if (brightness > 248) d[i + 3] = 0;
        else if (brightness > 222) d[i + 3] = Math.round(255 * (248 - brightness) / (248 - 222));
      }
      ctx.putImageData(frame, 0, 0);
      if (!cancelled) setDataUrl(canvas.toDataURL('image/png'));
    };
    return () => {
      cancelled = true;
    };
  }, [src]);

  return dataUrl;
}

/** Purely decorative dot-grid accent used in the page corners (matches reference design). */
const DotGrid = ({ className = '' }: { className?: string }) => (
  <div className={`pointer-events-none grid grid-cols-4 grid-rows-4 gap-2 ${className}`} aria-hidden="true">
    {Array.from({ length: 16 }).map((_, i) => (
      <span key={i} className="h-1 w-1 rounded-full bg-orange-500/50" />
    ))}
  </div>
);

export const LoginPage = () => {
  const { login, loginWithPin, isAuthenticated, user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const transparentLogo = useChromaKeyedLogo(fnicLogo);

  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [pin, setPin] = useState('');
  const [selectedDeviceEmail, setSelectedDeviceEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<{ email: string } | null>(null);

  const rememberedDevices = getRememberedDevices();

  useEffect(() => {
    if (rememberedDevices.length > 0 && !selectedDeviceEmail) {
      setSelectedDeviceEmail(rememberedDevices[rememberedDevices.length - 1].email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The backend runs on a free-tier host that spins down when idle, so the
  // first request after inactivity can take 30-50s to wake it. Ping it the
  // moment this page loads (before the user finishes typing credentials) so
  // the real login request has a better chance of hitting an already-warm
  // server instead of paying the cold-start cost itself.
  useEffect(() => {
    pingServerAwake();
  }, []);

  // Swap in a "waking up" explanation if sign-in is taking a while, so a
  // cold start reads as expected behavior rather than a hang/failure.
  useEffect(() => {
    if (!isLoading) {
      setSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => setSlowLoading(true), 4000);
    return () => clearTimeout(timer);
  }, [isLoading]);

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
      if (rememberMe && !alreadyRemembered) {
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
    <div className="min-h-screen w-full bg-[#050505] lg:flex text-white selection:bg-orange-500/30 selection:text-white font-sans relative overflow-hidden">
      {/* ── Ambient background glow + corner dot-grid accents ─────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute -top-40 right-0 h-[32rem] w-[32rem] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[26rem] w-[26rem] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>
      <DotGrid className="absolute left-6 top-6 z-10 lg:left-10 lg:top-10" />
      <DotGrid className="absolute bottom-6 right-6 z-10 opacity-70 lg:bottom-10 lg:right-10" />
      <DotGrid className="absolute bottom-40 right-10 z-10 opacity-40 hidden lg:grid" />

      {/* ── Left brand panel — desktop/tablet only ─────────────────────────── */}
      {/* Previously rendered a 2MB designer photo full-bleed here, which was
          a major contributor to slow first load. Rebuilt as a lightweight
          CSS gradient panel with the same logo/wordmark/tagline content. */}
      <div className="relative hidden overflow-hidden bg-[#050b15] lg:flex lg:h-screen lg:aspect-[3/2] z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1220] via-[#050b15] to-[#050505]" />
        <div className="pointer-events-none absolute -top-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 -left-16 h-[24rem] w-[24rem] rounded-full bg-blue-600/10 blur-[120px]" />
        <DotGrid className="absolute left-10 top-10 opacity-70" />
        <DotGrid className="absolute bottom-10 right-10 opacity-40" />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-10 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white ring-2 ring-orange-500/70 shadow-[0_0_60px_rgba(249,115,22,0.35)]">
            <img src={fnicLogo} alt="FNIC Logo" className="h-20 w-20 object-contain" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tight">
              <span className="text-white">FNI</span>
              <span className="text-orange-500">C</span>
            </h1>
            <p className="mt-2 text-sm font-medium tracking-[0.35em] text-white/60">
              SCHOOL MANAGEMENT SYSTEM
            </p>
          </div>
          <div className="h-px w-16 bg-orange-500" />
          <p className="max-w-sm text-base text-white/80">
            Empowering Education.
            <br />
            <span className="text-orange-500">Building Futures.</span>
          </p>
        </div>
      </div>

      {/* ── Right panel — login form ────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-1 items-center justify-center px-4 py-3 lg:min-h-0 z-10">
        <div className="relative w-full max-w-[410px] z-10">
          {/* Card */}
          <div className="rounded-[28px] border border-white/[0.08] bg-[#0E0E0E] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
            {/* Glowing circular logo badge, shown on every breakpoint */}
            <div className="mb-3 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white ring-2 ring-orange-500/70 shadow-[0_0_45px_rgba(249,115,22,0.35)]">
                <img
                  src={transparentLogo ?? fnicLogo}
                  alt="FNIC Logo"
                  className="h-11 w-11 object-contain"
                />
              </div>
            </div>

            <div className="mb-3 flex flex-col items-center text-center">
              <h2 className="text-xl font-bold tracking-tight text-white">Welcome Back</h2>
              <p className="mt-1 text-sm text-zinc-400">Sign in to access your school account</p>
            </div>

            {mode === 'password' ? (
              <form onSubmit={handlePasswordSubmit} noValidate className="space-y-3">

                {/* Email or Username */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-zinc-300 mb-1.5"
                  >
                    Email or Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      id="email"
                      type="text"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email or username"
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/[0.06] bg-[#131419]
                                 text-base text-white placeholder-zinc-600
                                 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
                                 transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-zinc-300 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-11 pl-10 pr-11 rounded-xl border border-white/[0.06] bg-[#131419]
                                 text-base text-white placeholder-zinc-600
                                 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
                                 transition-all duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-600 focus:ring-orange-500 focus:ring-offset-black accent-orange-500"
                    />
                    Remember me
                  </label>
                  <Link to="/recover-account" className="text-sm font-semibold text-orange-500 hover:text-orange-400 transition-colors">
                    Forgot Password?
                  </Link>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl bg-red-950/40 border border-red-900/30 px-4 py-3">
                    <p className="text-sm font-medium text-red-400">{error}</p>
                  </div>
                )}

                {/* Slow cold-start notice */}
                {slowLoading && (
                  <div className="rounded-xl bg-orange-950/30 border border-orange-900/30 px-4 py-3">
                    <p className="text-sm font-medium text-orange-400">
                      Waking up the server — this can take up to a minute the first time today.
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                             text-base font-bold text-white
                             flex items-center justify-center gap-2
                             transition-all duration-200
                             shadow-md shadow-orange-600/10 hover:shadow-orange-500/25
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {slowLoading ? 'Waking up server…' : 'Signing in…'}
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {rememberedDevices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setError(''); setMode('pin'); }}
                    className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Sign in with PIN instead
                  </button>
                )}
              </form>
            ) : (
              <form onSubmit={handlePinSubmit} noValidate className="space-y-5">
                {rememberedDevices.length > 1 && (
                  <div>
                    <label className="block text-sm font-semibold text-zinc-350 mb-2">Account</label>
                    <select
                      value={selectedDeviceEmail}
                      onChange={(e) => setSelectedDeviceEmail(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl border border-white/[0.06] bg-[#131419] text-base text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      {rememberedDevices.map((d) => (
                        <option key={d.deviceId} value={d.email} className="bg-[#0E0E12] text-white">{d.email}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="pin" className="block text-sm font-semibold text-zinc-355 mb-2">4-Digit PIN</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-505 pointer-events-none" />
                    <input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      autoFocus
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/[0.06] bg-[#131419]
                                 text-base text-white tracking-[0.5em] placeholder-zinc-600
                                 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
                                 transition-all duration-150"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-950/40 border border-red-900/30 px-4 py-3">
                    <p className="text-sm font-medium text-red-400">{error}</p>
                  </div>
                )}

                {slowLoading && (
                  <div className="rounded-xl bg-orange-950/30 border border-orange-900/30 px-4 py-3">
                    <p className="text-sm font-medium text-orange-400">
                      Waking up the server — this can take up to a minute the first time today.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || pin.length !== 4}
                  className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                             text-base font-bold text-white flex items-center justify-center gap-2
                             transition-all duration-200 shadow-md shadow-orange-600/10 hover:shadow-orange-500/25
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() => { setError(''); setPin(''); setMode('password'); }}
                  className="w-full text-center text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Use email and password instead
                </button>
              </form>
            )}

            {/* Need help footer */}
            <div className="border-t border-white/[0.08] my-3" />

            <Link to="/recover-account" className="block text-center transition-opacity hover:opacity-80">
              <p className="text-sm font-bold text-white">Need Help?</p>
              <p className="mt-0.5 text-sm text-zinc-400">Contact your administrator.</p>
            </Link>
          </div>
        </div>
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