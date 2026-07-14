import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'teacher-theme';

interface TeacherThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
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
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <TeacherThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === 'dark' ? 'dark' : undefined}>{children}</div>
    </TeacherThemeContext.Provider>
  );
}

export function useTeacherTheme(): TeacherThemeContextValue {
  const ctx = useContext(TeacherThemeContext);
  if (!ctx) return { theme: 'light', toggleTheme: () => {} };
  return ctx;
}
