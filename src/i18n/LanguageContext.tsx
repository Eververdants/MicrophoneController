import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { invoke } from '../hooks/useTauri'
import { translations, type Lang, type TranslationKey } from './translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export const LANG_STORAGE_KEY = 'mc.lang'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    return stored === 'en' || stored === 'zh-CN' ? stored : 'zh-CN'
  })
  // Skip the mount effect so startup doesn't rewrite the same value to config.
  const firstRun = useRef(true)

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    invoke('set_language', { language: lang }).catch((err) =>
      console.error('set_language failed:', err),
    )
  }, [lang])

  const setLang = useCallback((next: Lang) => setLangState(next), [])
  const t = useCallback((key: TranslationKey) => translations[lang][key] ?? key, [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
