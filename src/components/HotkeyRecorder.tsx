import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

interface HotkeyRecorderProps {
  value: string
  onChange: (value: string) => void
  recordingLabel: string
  emptyLabel: string
  ariaLabel: string
}

// Held alone, a modifier is not yet a shortcut — the recorder waits for the
// main key instead of committing "Control".
const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
])

/**
 * Turn a keydown into the accelerator string the backend parses.
 *
 * `KeyboardEvent.code` is used rather than `key` because it is layout- and
 * modifier-independent, and it happens to be exactly the vocabulary
 * `global-hotkey` accepts (`KeyM`, `Digit4`, `F8`, `Backslash`, …).
 */
function toAccelerator(event: KeyboardEvent): string | null {
  if (MODIFIER_CODES.has(event.code)) return null
  const parts: string[] = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Super')
  parts.push(event.code)
  return parts.join('+')
}

const KEY_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Backquote: '`',
  Minus: '−',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
}

/** Render a stored accelerator the way a user would write it. */
export function prettifyHotkey(value: string): string {
  if (!value) return ''
  return value
    .split('+')
    .map((raw) => {
      const token = raw.trim()
      if (!token) return token
      if (KEY_LABELS[token]) return KEY_LABELS[token]
      if (/^Key[A-Z]$/.test(token)) return token.slice(3)
      if (/^Digit\d$/.test(token)) return token.slice(5)
      if (/^Numpad/.test(token)) return `Num ${token.slice(6)}`
      return token
    })
    .join(' + ')
}

export function HotkeyRecorder({
  value,
  onChange,
  recordingLabel,
  emptyLabel,
  ariaLabel,
}: HotkeyRecorderProps) {
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (!recording) return
    const onKeyDown = (event: KeyboardEvent) => {
      // Capture phase, and swallowed: otherwise Space or the arrow keys would
      // also reach the app's own shortcuts while the user is rebinding.
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setRecording(false)
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        onChange('')
        setRecording(false)
        return
      }
      const accelerator = toAccelerator(event)
      if (!accelerator) return
      onChange(accelerator)
      setRecording(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recording, onChange])

  // Leaving the dialog open in recording mode would hold the capture listener
  // forever if the user clicks away instead of pressing a key.
  useEffect(() => {
    if (!recording) return
    const onPointerDown = () => setRecording(false)
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [recording])

  const shown = prettifyHotkey(value)

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => setRecording(true)}
      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm outline-none"
      style={{
        background: 'var(--bg)',
        borderColor: recording ? 'var(--accent)' : 'var(--border)',
        color: recording || !shown ? 'var(--fg-muted)' : 'var(--fg)',
      }}
    >
      <span className="truncate tabular-nums">{recording ? recordingLabel : shown || emptyLabel}</span>
      {recording && (
        <motion.span
          aria-hidden
          className="h-1.5 w-1.5 flex-none rounded-full"
          style={{ background: 'var(--accent)' }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </button>
  )
}
