import { motion, useSpring, useTransform } from 'motion/react'

interface ConcentricCoreProps {
  muted: boolean
  volumePercent: number
  onToggleMute: () => void
  disabled?: boolean
}

export function ConcentricCore({
  muted,
  volumePercent,
  onToggleMute,
  disabled,
}: ConcentricCoreProps) {
  const accent = muted ? 'var(--danger)' : 'var(--success)'
  const accentSoft = muted ? 'color-mix(in srgb, var(--danger) 18%, transparent)' : 'color-mix(in srgb, var(--success) 18%, transparent)'

  const spring = useSpring(volumePercent, { stiffness: 120, damping: 18, mass: 0.6 })
  const ring1Scale = useTransform(spring, [0, 100], [0.85, 1.0])
  const ring2Scale = useTransform(spring, [0, 100], [0.9, 1.08])
  const ring3Scale = useTransform(spring, [0, 100], [0.95, 1.16])
  const glowOpacity = useTransform(spring, [0, 100], [0.25, 0.85])

  return (
    <button
      type="button"
      onClick={onToggleMute}
      disabled={disabled}
      aria-label={muted ? 'unmute' : 'mute'}
      className="relative grid h-56 w-56 place-items-center rounded-full bg-transparent p-0"
    >
      {/* outer pulsing rings */}
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          scale: ring3Scale,
          border: `1.5px solid ${accentSoft}`,
        }}
      />
      <motion.span
        aria-hidden
        className="absolute rounded-full"
        style={{
          scale: ring2Scale,
          inset: 14,
          border: `1.5px solid ${accentSoft}`,
        }}
      />
      <motion.span
        aria-hidden
        className="absolute rounded-full"
        style={{
          scale: ring1Scale,
          inset: 28,
          border: `2px solid ${accent}`,
          opacity: glowOpacity,
        }}
      />

      {/* core */}
      <motion.span
        className="absolute rounded-full"
        style={{ inset: 44 }}
        animate={{
          boxShadow: muted
            ? '0 0 0 0 color-mix(in srgb, var(--danger) 0%, transparent)'
            : `0 0 32px 4px color-mix(in srgb, var(--success) 55%, transparent)`,
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      <motion.span
        className="relative grid h-28 w-28 place-items-center rounded-full"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <MicIcon muted={muted} color={muted ? 'var(--danger)' : 'var(--fg)'} />
      </motion.span>
    </button>
  )
}

function MicIcon({ muted, color }: { muted: boolean; color: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      {muted && <path d="M3 3l18 18" stroke="var(--danger)" strokeWidth="2" />}
    </svg>
  )
}
