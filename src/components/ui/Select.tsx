import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { CheckIcon, ChevronDownIcon } from '../icons'

export interface SelectOption {
  value: string
  /** Plain text or a node — device rows carry badges alongside the name. */
  label: React.ReactNode
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel?: string
}

const LIST_MAX_HEIGHT = 224 // max-h-56 on the popover list

// Custom dropdown replacing the native <select>: themed popover, animated
// open/close, full keyboard support (arrows/Home/End/Enter/Escape) and
// flip-up when there is not enough room below the trigger.
export function Select({ value, options, onChange, disabled, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [flipUp, setFlipUp] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))
  const selected = options[selectedIndex]

  // Close when a pointer goes down outside the dropdown.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Open towards the top when the popover would clip at the window bottom.
  const toggleOpen = () => {
    if (disabled) return
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) setFlipUp(rect.bottom + LIST_MAX_HEIGHT + 8 > window.innerHeight && rect.top > LIST_MAX_HEIGHT)
    setActive(selectedIndex)
    setOpen((p) => !p)
  }

  // Keep the highlighted option visible while navigating with the keyboard.
  useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const commit = (index: number) => {
    onChange(options[index].value)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    const last = options.length - 1
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) commit(active)
        else toggleOpen()
        break
      case 'Escape':
        if (open) {
          e.stopPropagation()
          setOpen(false)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (open) setActive((a) => Math.min(last, a + 1))
        else toggleOpen()
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) setActive((a) => Math.max(0, a - 1))
        else toggleOpen()
        break
      case 'Home':
        // Arrows open the list; Home/End should too, then jump — otherwise they
        // silently do nothing while every other navigation key opens it.
        e.preventDefault()
        if (!open) toggleOpen()
        else setActive(0)
        break
      case 'End':
        e.preventDefault()
        if (!open) toggleOpen()
        else setActive(last)
        break
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? 'border-[var(--accent)]' : 'hover:border-[var(--fg-muted)]'
        }`}
        style={{ background: 'var(--bg-elevated)', borderColor: open ? 'var(--accent)' : 'var(--border)', color: 'var(--fg)' }}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ color: 'var(--fg-muted)' }}>
          <ChevronDownIcon size={14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: flipUp ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: flipUp ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute inset-x-0 z-30 rounded-lg border shadow-lg"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border)',
              top: flipUp ? undefined : 'calc(100% + 4px)',
              bottom: flipUp ? 'calc(100% + 4px)' : undefined,
              transformOrigin: flipUp ? 'bottom' : 'top',
            }}
          >
            <div
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-56 overflow-y-auto rounded-[inherit] py-1"
            >
              {options.map((o, i) => {
                const isSelected = o.value === value
                return (
                  <div
                    key={o.value}
                    ref={i === active ? activeRef : undefined}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(i)}
                    className="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm"
                    style={{
                      color: 'var(--fg)',
                      background: i === active ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSelected && <CheckIcon size={13} className="flex-none" />}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
