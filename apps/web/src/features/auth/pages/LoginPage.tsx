import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Lock, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { getHomePathForRole } from '../utils/roleHome';
import type { UserRole } from '@schoolos/types';
import { pingServerAwake, ApiError } from '../../../services/api';
import fnicLogo from '../../../assets/illustrations/fnic-logo.webp';
import { PixelWaveBackground } from '../components/PixelWaveBackground';

const isMaintenanceModeError = (err: unknown): boolean =>
  err instanceof ApiError && err.code === 'MAINTENANCE_MODE';

const chromaKeyCache = new Map<string, string>();

function useChromaKeyedLogo(src: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(() => chromaKeyCache.get(src) ?? null);

  useEffect(() => {
    if (chromaKeyCache.has(src)) return;
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
      if (!cancelled) {
        const result = canvas.toDataURL('image/png');
        chromaKeyCache.set(src, result);
        setDataUrl(result);
      }
    };
    return () => {
      cancelled = true;
    };
  }, [src]);

  return dataUrl;
}

export const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const transparentLogo = useChromaKeyedLogo(fnicLogo);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);

  // Ping backend server to wake it up on load
  useEffect(() => {
    pingServerAwake();
  }, []);

  // Cold start feedback
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

  useEffect(() => {
    if (isAuthenticated && user) {
      goHome(user.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loggedInUser = await login(
        email.trim() || 'principal@mycampus.edu.in',
        password || 'demo'
      );
      goHome(loggedInUser.role);
    } catch (err) {
      if (isMaintenanceModeError(err)) {
        navigate('/under-maintenance', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSignIn = async (role: UserRole) => {
    setError('');
    setIsLoading(true);
    try {
      const loggedInUser = await login(`${role}@mycampus.edu.in`, 'demo');
      goHome(loggedInUser.role);
    } catch {
      sessionStorage.setItem('accessToken', 'demo_token');
      sessionStorage.setItem('sessionId', 'demo_session');
      goHome(role);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full text-[#1B2A4E] selection:bg-[#D9822B]/20 selection:text-[#1B2A4E] font-sans relative overflow-hidden">
      <h1 className="sr-only">MY CAMPUS — Sign In</h1>

      {/* Seamless unified backdrop blending deep midnight navy smoothly into warm paper */}
      {/* Mobile: warm paper canvas */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#FBF8F3] lg:hidden" aria-hidden="true" />
      {/* Desktop (lg+): smooth continuous horizontal blend across the center with zero harsh seams */}
      <div
        className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
        style={{
          background:
            'linear-gradient(90deg, #101931 0%, #15223E 24%, #1B2A4E 34%, #253966 44%, #4B628D 52%, #7B8CA9 60%, #B8C2D1 68%, #E4E5DF 76%, #FBF8F3 85%, #FBF8F3 100%)',
        }}
        aria-hidden="true"
      />

      {/* Full-bleed ambient lighting that bridges the halves without clipping */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-20 h-[36rem] w-[36rem] rounded-full bg-[#1B2A4E]/40 blur-[130px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[34rem] w-[44rem] rounded-full bg-[#D9822B]/12 blur-[150px]" />
        <div className="absolute -bottom-24 right-10 h-[30rem] w-[30rem] rounded-full bg-[#1B2A4E]/5 blur-[120px]" />
      </div>

      {/* Dynamic lifting pixel wave moving continuously across the full viewport with seamless dark-to-light blend */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block" aria-hidden="true">
        <PixelWaveBackground variant="blended" direction="forward" className="opacity-75" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 lg:hidden" aria-hidden="true">
        <PixelWaveBackground variant="light" direction="forward" className="opacity-70" />
      </div>

      {/* Main 3-stage layout: Left (MY CAMPUS) -> Center (Logo) -> Right (Text boxes) with doubled breathing room */}
      <div className="min-h-screen w-full relative z-10 flex flex-col lg:flex-row items-center justify-between p-6 sm:p-10 lg:p-14 xl:p-20 gap-12 lg:gap-16 xl:gap-24 2xl:gap-32 max-w-[1600px] mx-auto">

        {/* ── Left Brand Stage: MY CAMPUS text ──────────────────────────────── */}
        <div className="flex-1 w-full lg:w-auto max-w-md flex flex-col items-center lg:items-start text-center lg:text-left space-y-5 text-white">
          <div>
            <p className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight" aria-hidden="true">
              <span>MY </span>
              <span className="text-[#F5B332]">CAMPUS</span>
            </p>
            <p className="mt-2 text-xs sm:text-sm font-extrabold tracking-[0.28em] text-white/80 uppercase">
              School Management System
            </p>
          </div>

          <div className="h-1 w-16 bg-[#D9822B] rounded-full" />

          <p className="text-base sm:text-lg text-white/90 font-medium leading-relaxed max-w-sm">
            Empowering Education. Building Futures.
          </p>
        </div>

        {/* ── Center Emblem: in between MY CAMPUS text and the text boxes ───── */}
        <div className="shrink-0 flex items-center justify-center my-4 lg:my-0 px-2 lg:px-6">
          <div className="flex h-36 w-36 sm:h-44 sm:w-44 lg:h-52 lg:w-52 items-center justify-center rounded-full bg-white overflow-hidden ring-4 ring-[#D9822B]/70 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 duration-300 p-3 sm:p-4">
            <img
              src={transparentLogo ?? fnicLogo}
              alt="My Campus Logo"
              width={160}
              height={160}
              className="h-28 w-28 sm:h-34 sm:w-34 lg:h-40 lg:w-40 object-contain"
            />
          </div>
        </div>

        {/* ── Right Login Stage: Text Boxes & Actions ────────────────────────── */}
        <main className="flex-1 w-full lg:w-auto max-w-[420px] flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[420px]">
            {/* Clean, borderless and background-free Welcome Back container */}
            <div className="w-full">
              
              {/* Card Title */}
              <div className="mb-6 flex flex-col items-center text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1B2A4E]">
                  Welcome Back
                </h2>
                <p className="mt-1.5 text-sm sm:text-base text-[#55607A]">
                  Sign in to access your <strong className="font-semibold text-[#1B2A4E]">MY CAMPUS</strong> account
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4 sm:space-y-5">
                {/* Email or Username with Frosted Glass Effect */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-[#3D4B68] mb-1.5"
                  >
                    Email or Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#55607A] group-focus-within:text-[#1B2A4E] transition-colors pointer-events-none z-10" />
                    <input
                      id="email"
                      type="text"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email or username"
                      className="w-full h-12 sm:h-13 pl-10 pr-4 rounded-xl
                                 bg-white/70 backdrop-blur-md
                                 border border-white/90 shadow-[0_4px_16px_rgba(27,42,78,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)]
                                 text-sm sm:text-base font-medium text-[#1B2A4E] placeholder-[#6E7B91]
                                 hover:bg-white/85 hover:border-white hover:shadow-[0_6px_20px_rgba(27,42,78,0.08)]
                                 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1B2A4E]/10 focus:border-[#1B2A4E]
                                 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Password with Frosted Glass Effect */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-[#3D4B68] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#55607A] group-focus-within:text-[#1B2A4E] transition-colors pointer-events-none z-10" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-12 sm:h-13 pl-10 pr-11 rounded-xl
                                 bg-white/70 backdrop-blur-md
                                 border border-white/90 shadow-[0_4px_16px_rgba(27,42,78,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)]
                                 text-sm sm:text-base font-medium text-[#1B2A4E] placeholder-[#6E7B91]
                                 hover:bg-white/85 hover:border-white hover:shadow-[0_6px_20px_rgba(27,42,78,0.08)]
                                 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1B2A4E]/10 focus:border-[#1B2A4E]
                                 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 flex h-12 sm:h-13 w-11 items-center justify-center text-[#55607A] hover:text-[#1B2A4E] transition-colors z-10"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password in Single Clean Line */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#3D4B68] select-none cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D0C8B8] text-[#1B2A4E] focus:ring-[#1B2A4E] accent-[#1B2A4E]"
                    />
                    <span>Remember me</span>
                  </label>
                  <Link
                    to="/recover-account"
                    className="text-xs sm:text-sm font-bold text-[#D9822B] hover:text-[#B4540A] transition-colors whitespace-nowrap"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Error Notice */}
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                    <p className="text-xs sm:text-sm font-semibold text-red-600">{error}</p>
                  </div>
                )}

                {/* Cold start waking notice */}
                {slowLoading && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                    <p className="text-xs sm:text-sm font-medium text-amber-800">
                      Waking up server — this can take up to a minute on first connection today.
                    </p>
                  </div>
                )}

                {/* Submit Button - works with any or no credentials */}
                <button
                  type="submit"
                  aria-label="Sign In"
                  disabled={isLoading}
                  className="w-full h-12 sm:h-13 rounded-xl bg-[#1B2A4E] hover:bg-[#253966] active:scale-[0.99]
                             text-sm sm:text-base font-bold text-white
                             flex items-center justify-center gap-2
                             transition-all duration-200 shadow-md hover:shadow-lg shadow-[#1B2A4E]/15
                             disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#F5B332]" />
                      <span>{slowLoading ? 'Waking up server…' : 'Signing in…'}</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 text-[#F5B332]" />
                    </>
                  )}
                </button>
              </form>

              {/* Instant One-Click Local Test Roles (Zero Server / Credentials Required) */}
              <div className="pt-4 text-center">
                <p className="text-[11px] font-bold text-[#55607A] uppercase tracking-wider mb-2">
                  Instant Test Sign-In
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickSignIn('principal')}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#D9822B] text-xs font-bold border border-[#D9822B]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  >
                    Principal Cockpit &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSignIn('teacher')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-[#254A9A] text-xs font-bold border border-[#254A9A]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  >
                    Teacher Register &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSignIn('admin')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-[#1B2A4E] text-xs font-bold border border-[#1B2A4E]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  >
                    Admin &rarr;
                  </button>
                </div>
              </div>

              {/* Need help footer */}
              <div className="border-t border-[#E8E2D6] my-5" />

              <Link to="/recover-account" className="block text-center transition-opacity hover:opacity-85">
                <p className="text-xs sm:text-sm font-bold text-[#1B2A4E]">Need Help?</p>
                <p className="mt-0.5 text-xs sm:text-sm text-[#55607A]">Contact your administrator or IT coordinator.</p>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
