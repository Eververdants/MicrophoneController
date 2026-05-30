import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { translations, type Lang } from './translations'

type LanguageContextType = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const text = translations[lang]?.[key] ?? translations['en']?.[key] ?? key
      if (!params) return text
      return Object.entries(params).reduce(
        (result, [k, v]) => result.replace(`{${k}}`, String(v)),
        text,
      )
    },
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
