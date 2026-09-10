import { useCallback, useRef } from 'react'

interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  ariaLabel: string
}

// Horizontal custom slider replacing the native <input type="range">.
// Pointer-capture based dragging so the thumb keeps tracking outside the
// track bounds; transform-animated thumb per project conventions.
export function Slider({ value, min = 0, max = 100, step = 1, onChange, disabled, ariaLabel }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const percent = ((value - min) / (max - min)) * 100

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return null
      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const snapped = Math.round((min + ratio * (max - min)) / step) * step
      return Math.max(min, Math.min(max, snapped))
    },
    [min, max, step],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const next = valueFromClientX(event.clientX)
    if (next !== null) onChange(next)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const next = valueFromClientX(event.clientX)
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
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(max, value + step)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(min, value - step)
    else if (event.key === 'PageUp') next = Math.min(max, value + step * 10)
    else if (event.key === 'PageDown') next = Math.max(min, value - step * 10)
    else if (event.key === 'Home') next = min
    else if (event.key === 'End') next = max
    if (next !== null) {
      event.preventDefault()
      onChange(next)
    }
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
      className={`relative h-4 w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      {/* h-4 hit area with the visual track centred inside it */}
      <div
        className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{ background: 'var(--accent-soft)' }}
      />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{ width: `${percent}%`, background: 'var(--accent)' }}
      />
      <div
        className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
        style={{
          left: `${percent}%`,
          marginLeft: '-8px',
          background: 'var(--fg)',
          boxShadow: '0 0 0 3px var(--bg), 0 0 0 4px var(--border)',
        }}
      />
    </div>
  )
}
