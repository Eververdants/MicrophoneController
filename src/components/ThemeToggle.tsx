import { motion } from 'motion/react'
import type { Theme } from '../hooks/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="toggle theme"
      className="relative h-7 w-12 rounded-full p-0.5"
      style={{ background: 'var(--accent-soft)' }}
    >
      <motion.span
        className="block h-6 w-6 rounded-full"
        style={{ background: 'var(--fg)' }}
        animate={{ x: isDark ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}
