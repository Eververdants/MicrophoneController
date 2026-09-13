import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'

interface ConcentricCoreProps {
  muted: boolean
  volumePercent: number
  /** Most recent peak level, 0..1, sampled by the backend meter. */
  peak: number
  /** Whether level sampling is running; the meter costs nothing when false. */
  meterEnabled: boolean
  onToggleMute: () => void
  disabled?: boolean
}

// The level ring hugs the mic button: inset 36 inside a 224px core leaves an
// 8px band between it and the ringed accents, so the reading stays separate
// from the decorative circles.
const LEVEL_RADIUS = 76
const LEVEL_CIRCUMFERENCE = 2 * Math.PI * LEVEL_RADIUS
/** Fraction of the level retained per frame — a classic slow VU release. */
const RELEASE = 0.86

export function ConcentricCore({
  muted,
  volumePercent,
  peak,
  meterEnabled,
  onToggleMute,
  disabled,
}: ConcentricCoreProps) {
  const accent = muted ? 'var(--danger)' : 'var(--success)'
  const accentSoft = muted
    ? 'color-mix(in srgb, var(--danger) 18%, transparent)'
    : 'color-mix(in srgb, var(--success) 18%, transparent)'

  const spring = useSpring(volumePercent, { stiffness: 120, damping: 18, mass: 0.6 })
  // useSpring only auto-follows a MotionValue source; a plain number stays at
  // its initial value unless pushed.
  useEffect(() => {
    spring.set(volumePercent)
  }, [spring, volumePercent])
  const ring1Scale = useTransform(spring, [0, 100], [0.85, 1.0])
  const ring2Scale = useTransform(spring, [0, 100], [0.9, 1.08])
  const ring3Scale = useTransform(spring, [0, 100], [0.95, 1.16])
  const glowOpacity = useTransform(spring, [0, 100], [0.25, 0.85])

  // --- level meter -------------------------------------------------------
  // The backend pushes peaks at ~20 Hz, which is far too coarse to draw
  // directly: the ring would step. A frame loop interpolates between samples
  // with instant attack and an exponential release.
  //
  // The sweep is written straight onto the element instead of going through a
  // MotionValue in `style`: this is one attribute on one node, the loop already
  // decides every value, and a direct write cannot silently fail to land. It
  // also means zero React re-renders while metering.
  const arcRef = useRef<SVGCircleElement>(null)
  const target = useRef(0)

  useEffect(() => {
    target.current = peak
  }, [peak])

  useEffect(() => {
    if (!meterEnabled) {
      target.current = 0
      return
    }
    let frame = 0
    let current = 0
    const tick = () => {
      current = target.current > current ? target.current : current * RELEASE
      if (current < 0.001) current = 0
      const arc = arcRef.current
      if (arc) {
        arc.style.strokeDashoffset = String(LEVEL_CIRCUMFERENCE * (1 - Math.min(1, current)))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [meterEnabled])

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

      {/* Live input level. Rendered only when sampling, so a disabled meter
          leaves the core exactly as it was before the feature existed. */}
      {meterEnabled && (
        <svg
          aria-hidden
          viewBox="0 0 224 224"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <g transform="rotate(-90 112 112)">
            <circle
              cx="112"
              cy="112"
              r={LEVEL_RADIUS}
              fill="none"
              stroke="var(--accent-soft)"
              strokeWidth="3"
            />
            <circle
              ref={arcRef}
              cx="112"
              cy="112"
              r={LEVEL_RADIUS}
              fill="none"
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={LEVEL_CIRCUMFERENCE}
              // Fully retracted until the frame loop drives it, so an idle meter
              // is an empty track rather than a full ring.
              strokeDashoffset={LEVEL_CIRCUMFERENCE}
            />
          </g>
        </svg>
      )}

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
      {/* Always rendered; opacity crossfades so the slash doesn't pop in/out. */}
      <motion.path
        d="M3 3l18 18"
        stroke="var(--danger)"
        strokeWidth="2"
        initial={false}
        animate={{ opacity: muted ? 1 : 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />
    </svg>
  )
}
