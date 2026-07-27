import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { principalTranslations, type Language, type PrincipalTranslationKey } from '@/i18n/principalTranslations';

const STORAGE_KEY = 'workspace-language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: PrincipalTranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(STORAGE_KEY) === 'hi' ? 'hi' : 'en';
}

/** App-wide language preference (currently only the Principal Workspace has
 *  translated strings — see i18n/principalTranslations.ts). Mounted at the
 *  AppLayout root, mirroring TeacherThemeProvider, so the Settings toggle
 *  affects the whole session immediately without a page reload. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => setLanguageState(lang), []);
  const toggleLanguage = useCallback(() => setLanguageState((l) => (l === 'en' ? 'hi' : 'en')), []);

  const t = useCallback(
    (key: PrincipalTranslationKey) => principalTranslations[language][key] ?? principalTranslations.en[key],
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: 'en',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key) => principalTranslations.en[key],
    };
  }
  return ctx;
}
