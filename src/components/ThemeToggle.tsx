import { AnimatePresence, motion } from 'motion/react'
import { MonitorIcon, MoonIcon, SunIcon } from './icons'
import { useLanguage } from '../i18n/LanguageContext'
import type { ThemePreference } from '../hooks/useTheme'

interface ThemeToggleProps {
  preference: ThemePreference
  onCycle: () => void
}

// A three-state choice does not fit a two-position switch, so this is a cycle
// button: each press advances system → light → dark → system, and the glyph
// shows which mode is active. The pill keeps the boot shell's 48x28 footprint
// so the title bar never reflows (see the .boot-toggle--theme rule).
export function ThemeToggle({ preference, onCycle }: ThemeToggleProps) {
  const { t } = useLanguage()

  const label =
    preference === 'system' ? t('followSystem') : preference === 'light' ? t('light') : t('dark')

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`${t('theme')}: ${label}`}
      title={`${t('theme')}: ${label}`}
      className="relative grid h-7 w-12 cursor-pointer place-items-center rounded-full outline-none"
      style={{ background: 'var(--accent-soft)', color: 'var(--fg)' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={preference}
          className="grid place-items-center"
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {preference === 'system' ? (
            <MonitorIcon size={13} />
          ) : preference === 'light' ? (
            <SunIcon size={13} />
          ) : (
            <MoonIcon size={13} />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
