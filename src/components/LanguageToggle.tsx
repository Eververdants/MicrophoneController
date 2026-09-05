import { motion } from 'motion/react'
import { useLanguage } from '../i18n/LanguageContext'
import type { Lang } from '../i18n/translations'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'zh-CN', label: '中' },
  { value: 'en', label: 'EN' },
]

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()
  const idx = LANGS.findIndex((l) => l.value === lang)
  return (
    <div
      className="relative flex h-7 w-14 rounded-full p-0.5"
      style={{ background: 'var(--accent-soft)' }}
    >
      <motion.span
        className="absolute h-6 w-6 rounded-full"
        style={{ background: 'var(--fg)' }}
        animate={{ x: idx * 20 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        layout
      />
      {LANGS.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => setLang(l.value)}
          className="relative z-10 flex-1 text-xs font-medium"
          style={{ color: lang === l.value ? 'var(--bg)' : 'var(--fg-muted)' }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
