import { motion, useMotionValue, useTransform } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

const THUMB_SIZE = 16 // h-4 w-4 thumb

interface VolumeSliderProps {
  value: number
  onChange: (value: number) => void
  db: number
  disabled?: boolean
}

export function VolumeSlider({ value, onChange, db, disabled }: VolumeSliderProps) {
  const { t } = useLanguage()
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackHeight, setTrackHeight] = useState(176) // h-44 fallback before measure
  const y = useMotionValue(0)
  const thumbTravel = trackHeight - THUMB_SIZE
  // Fill meets the thumb centre: thumb top is y, centre is y + THUMB/2.
  const fillHeight = useTransform(y, (v) => trackHeight - v - THUMB_SIZE / 2)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () => setTrackHeight(track.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(track)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    y.set((1 - Math.max(0, Math.min(100, value)) / 100) * thumbTravel)
  }, [value, thumbTravel, y])

  const percentFromClientY = useCallback((clientY: number) => {
    const track = trackRef.current
    if (!track) return null
    const rect = track.getBoundingClientRect()
    const ratio = 1 - (clientY - rect.top) / rect.height
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100)
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const next = percentFromClientY(event.clientY)
    if (next !== null) onChange(next)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const next = percentFromClientY(event.clientY)
    if (next !== null) onChange(next)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    let next: number | null = null
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = Math.min(100, value + 5)
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = Math.max(0, value - 5)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = 100
    if (next !== null) {
      event.preventDefault()
      onChange(next)
    }
  }

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={t('volume')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-disabled={disabled}
        className="relative h-44 w-2 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ background: 'var(--accent-soft)', touchAction: 'none' }}
      >
        <motion.div
          className="absolute bottom-0 w-full rounded-full"
          style={{
            height: fillHeight,
            background:
              'linear-gradient(to top, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent))',
          }}
        />
        <motion.div
          className="absolute left-1/2 h-4 w-4 rounded-full"
          style={{
            y,
            x: '-50%',
            background: 'var(--fg)',
            boxShadow: '0 0 0 3px var(--bg), 0 0 0 4px var(--border)',
          }}
        />
      </div>
      <div className="text-center">
        <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>
          {value}
          <span className="ml-1 text-xs font-normal" style={{ color: 'var(--fg-muted)' }}>
            %
          </span>
        </div>
        <div className="text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          {db.toFixed(1)} dB
        </div>
      </div>
    </div>
  )
}
