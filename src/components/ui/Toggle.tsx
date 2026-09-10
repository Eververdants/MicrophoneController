import { motion } from 'motion/react'

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}

// Custom switch control. The knob animates transform (not `left`) so the
// movement stays on the compositor.
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between text-sm"
      style={{ color: 'var(--fg)' }}
    >
      <span>{label}</span>
      <span
        className="relative h-5 w-9 rounded-full"
        style={{ background: checked ? 'var(--fg)' : 'var(--accent-soft)' }}
      >
        <motion.span
          className="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full"
          style={{ background: 'var(--bg)' }}
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  )
}
