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
    // The chip is w-14 with p-0.5 → 52px of content split into two 26px halves.
    // The knob travels one half-width so it lands centred on the active label.
    <div
      className="relative flex h-7 w-14 rounded-full p-0.5"
      style={{ background: 'var(--accent-soft)' }}
      onClick={(e) => {
        // Padding and rounded corners sit outside both buttons; route those
        // clicks by half instead of dropping them.
        if (e.target !== e.currentTarget) return
        const rect = e.currentTarget.getBoundingClientRect()
        setLang(e.clientX - rect.left < rect.width / 2 ? LANGS[0].value : LANGS[1].value)
      }}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full"
        style={{ background: 'var(--fg)' }}
        animate={{ x: idx * 26 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
      {LANGS.map((l) => (
        <motion.button
          key={l.value}
          type="button"
          onClick={() => setLang(l.value)}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.12 }}
          aria-pressed={lang === l.value}
          className="relative z-10 flex-1 cursor-pointer text-xs font-medium"
          style={{ color: lang === l.value ? 'var(--bg)' : 'var(--fg-muted)' }}
        >
          {l.label}
        </motion.button>
      ))}
    </div>
  )
}
