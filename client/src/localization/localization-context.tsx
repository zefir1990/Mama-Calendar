import { createContext, useContext, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';

import { locales, type Translation, type Locale } from './locales';

function detectLocale(): Locale {
  try {
    const deviceLocales = getLocales();
    if (deviceLocales.length > 0) {
      const languageCode = deviceLocales[0].languageCode;
      if (languageCode && languageCode in locales) {
        return languageCode as Locale;
      }
    }
  } catch {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const languageCode = navigator.language.split('-')[0];
      if (languageCode in locales) {
        return languageCode as Locale;
      }
    }
  }

  return 'en';
}

const detectedLocale = detectLocale();

interface LocalizationContextValue {
  locale: Locale;
  t: Translation;
}

const LocalizationContext = createContext<LocalizationContextValue>({
  locale: detectedLocale,
  t: locales[detectedLocale],
});

interface LocalizationProviderProps {
  children: ReactNode;
}

export function LocalizationProvider({ children }: LocalizationProviderProps) {
  return (
    <LocalizationContext.Provider value={{ locale: detectedLocale, t: locales[detectedLocale] }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  return useContext(LocalizationContext);
}
