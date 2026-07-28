import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'teacher-theme';

interface TeacherThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  /** True for ~300ms after a theme switch — lets CSS transitions play out. */
  isTransitioning: boolean;
}

const TeacherThemeContext = createContext<TeacherThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

/** Scopes dark mode to the teacher workspace only — the `dark` class is applied
 *  to this provider's own wrapper div, not `<html>`, so Tailwind's `dark:`
 *  variant only activates for teacher pages nested inside it. */
export function TeacherThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Principal dashboard isn't designed/tested for dark mode yet — lock it to
  // light regardless of what's in localStorage (e.g. left over from a teacher
  // session on the same browser), and ignore toggle attempts. The toggle UI
  // itself is also hidden in Settings for principal; this is the enforcement
  // behind that, in case it's ever reachable another way.
  const isPrincipal = user?.role === 'principal';

  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    if (isPrincipal) return;

    // Clear any in-flight transition timer
    if (transitionTimer.current) clearTimeout(transitionTimer.current);

    setIsTransitioning(true);
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    // Transition state lasts 400ms — just long enough for CSS crossfades
    transitionTimer.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  }, [isPrincipal]);

  const effectiveTheme: Theme = isPrincipal ? 'light' : theme;

  return (
    <TeacherThemeContext.Provider value={{ theme: effectiveTheme, toggleTheme, isTransitioning }}>
      <div className={`teacher-theme-root${effectiveTheme === 'dark' ? ' dark' : ''}`}>{children}</div>
    </TeacherThemeContext.Provider>
  );
}

export function useTeacherTheme(): TeacherThemeContextValue {
  const ctx = useContext(TeacherThemeContext);
  if (!ctx) return { theme: 'light', toggleTheme: () => {}, isTransitioning: false };
  return ctx;
}
