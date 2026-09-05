import { motion, useMotionValue, useTransform, type MotionValue } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'

interface VolumeSliderProps {
  value: number
  onChange: (value: number) => void
  db: number
  disabled?: boolean
}

export function VolumeSlider({ value, onChange, db, disabled }: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  const fillHeight = useTransform(y, [0, 180], [100, 0])
  const thumbY = useTransform(y, (v) => v)

  useEffect(() => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, value / 100))
    y.set((1 - ratio) * rect.height)
  }, [value, y])

  const handlePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const ratio = 1 - (event.clientY - rect.top) / rect.height
      const next = Math.round(Math.max(0, Math.min(1, ratio)) * 100)
      onChange(next)
    },
    [disabled, onChange],
  )

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <div
        ref={trackRef}
        onPointerDown={handlePointer}
        className="relative h-44 w-2 cursor-pointer rounded-full"
        style={{ background: 'var(--accent-soft)', touchAction: 'none' }}
      >
        <motion.div
          className="absolute bottom-0 w-full rounded-full"
          style={{
            height: fillHeight,
            background: 'linear-gradient(to top, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent))',
          }}
        />
        <motion.div
          className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full"
          style={{
            y: thumbY,
            x: '-50%',
            background: 'var(--fg)',
            boxShadow: '0 0 0 3px var(--bg), 0 0 0 4px var(--border)',
          }}
        />
      </div>
      <div className="text-center">
        <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>
          {value}
          <span className="ml-1 text-xs font-normal" style={{ color: 'var(--fg-muted)' }}>%</span>
        </div>
        <div className="text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          {db.toFixed(1)} dB
        </div>
      </div>
    </div>
  )
}
