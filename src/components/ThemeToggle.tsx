import { AnimatePresence, motion } from 'motion/react'
import { MoonIcon, SunIcon } from './icons'
import { useLanguage } from '../i18n/LanguageContext'
import type { Theme } from '../hooks/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  const { t } = useLanguage()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? t('light') : t('dark')}
      title={isDark ? t('light') : t('dark')}
      aria-pressed={isDark}
      className="relative h-7 w-12 cursor-pointer rounded-full p-0.5"
      style={{ background: 'var(--accent-soft)' }}
    >
      {/* The knob carries a sun/moon glyph that crossfades with the theme. */}
      <motion.span
        aria-hidden
        className="flex h-6 w-6 items-center justify-center rounded-full"
        style={{ background: 'var(--fg)', color: 'var(--bg)' }}
        animate={{ x: isDark ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            className="flex items-center justify-center"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {isDark ? <MoonIcon size={13} /> : <SunIcon size={13} />}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  )
}
