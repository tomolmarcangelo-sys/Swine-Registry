import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Language, translations, TranslationDictionary } from './translations';

const STORAGE_KEY = 'hinunangan_da_language';

export interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  /**
   * Translate a key with parameter interpolation.
   * Example: t('common.save')
   * Example: t('topbar.recordsFocalTitle', { barangay: 'Poblacion' })
   */
  t: (path: string, params?: Record<string, string | number>, fallback?: string) => string;
  /**
   * Helper to retrieve core notification messages.
   * Example: notify('savedSuccess', { earTag: 'HGN-POB-101' })
   */
  notify: (key: keyof TranslationDictionary['notifications'], params?: Record<string, string | number>) => string;
  isCebuano: boolean;
  isEnglish: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ceb' || stored === 'en') {
        return stored;
      }
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang === 'ceb' ? 'ceb' : 'en';
    } catch (e) {
      console.warn('Failed to persist language preference', e);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ceb' : 'en');
  }, [language, setLanguage]);

  useEffect(() => {
    try {
      document.documentElement.lang = language === 'ceb' ? 'ceb' : 'en';
    } catch (e) {
      // Ignore in non-DOM environments
    }
  }, [language]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>, fallback?: string): string => {
      const langDict = translations[language] || translations.en;
      const keys = path.split('.');
      
      let current: any = langDict;
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          current = undefined;
          break;
        }
      }

      // Fallback to English if not found in target language
      if (current === undefined && language !== 'en') {
        let fallbackDict: any = translations.en;
        for (const k of keys) {
          if (fallbackDict && typeof fallbackDict === 'object' && k in fallbackDict) {
            fallbackDict = fallbackDict[k];
          } else {
            fallbackDict = undefined;
            break;
          }
        }
        current = fallbackDict;
      }

      let result = typeof current === 'string' ? current : (fallback || path);

      // Perform parameter substitution (e.g. {barangay}, {earTag}, {count}, {time})
      if (params && typeof result === 'string') {
        Object.entries(params).forEach(([key, value]) => {
          result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        });
      }

      return result;
    },
    [language]
  );

  const notify = useCallback(
    (key: keyof TranslationDictionary['notifications'], params?: Record<string, string | number>): string => {
      return t(`notifications.${String(key)}`, params);
    },
    [t]
  );

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    toggleLanguage,
    t,
    notify,
    isCebuano: language === 'ceb',
    isEnglish: language === 'en'
  }), [language, setLanguage, toggleLanguage, t, notify]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Convenient alias
export const useTranslation = useI18n;
