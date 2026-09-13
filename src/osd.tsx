import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion } from 'motion/react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from './hooks/useTauri'
import { translations } from './i18n/translations'
import { MicIcon, MicOffIcon, VolumeIcon } from './components/icons'
import './styles/index.css'

/** Mirrors `osd::OsdPayload` in the backend. */
interface OsdPayload {
  kind: 'mute' | 'volume'
  muted: boolean
  volumePercent: number
}

interface Shown {
  /** Bumped per event so re-triggering replays the entrance animation. */
  seq: number
  payload: OsdPayload
}

// The overlay is its own window with no provider tree. Reading the persisted
// language directly avoids standing up the whole i18n context for two strings.
const lang = localStorage.getItem('mc.lang') === 'en' ? 'en' : 'zh-CN'
const t = translations[lang]

function Overlay() {
  const [shown, setShown] = useState<Shown | null>(null)

  useEffect(() => {
    // The window is transparent by design. index.css paints the body with the
    // theme background, which would read as an opaque rectangle over whatever
    // the user is looking at, so it is overridden here rather than in a
    // separate stylesheet.
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'

    let cancelled = false
    let unlisten: (() => void) | undefined
    listen<OsdPayload>('osd:show', (event) => {
      if (cancelled) return
      setShown((prev) => ({ seq: (prev?.seq ?? 0) + 1, payload: event.payload }))
    })
      .then((u) => {
        if (cancelled) u()
        else unlisten = u
      })
      .catch((err) => console.error('osd listen failed:', err))

    // The overlay window boots independently of the main one, so an overlay
    // triggered before this listener attached would otherwise be lost.
    invoke('osd_ready').catch(() => {})

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  if (!shown) return null

  const { payload } = shown
  const muted = payload.muted
  const accent = muted ? 'var(--danger)' : 'var(--success)'
  const accentSoft = `color-mix(in srgb, ${accent} 16%, transparent)`
  const label = payload.kind === 'volume' ? t.volume : muted ? t.mute : t.unmute

  return (
    <div className="h-full w-full p-1.5">
      <motion.div
        key={shown.seq}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="flex h-full w-full items-center gap-3 rounded-xl border px-3.5"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
          color: 'var(--fg)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
        }}
      >
        <span
          className="grid h-9 w-9 flex-none place-items-center rounded-lg"
          style={{ background: accentSoft, color: accent }}
        >
          {payload.kind === 'volume' ? (
            <VolumeIcon size={18} />
          ) : muted ? (
            <MicOffIcon size={18} />
          ) : (
            <MicIcon size={18} />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium">{label}</span>
            {payload.kind === 'volume' && (
              <span className="flex-none text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                {payload.volumePercent}%
              </span>
            )}
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--accent-soft)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: accent }}
              initial={{ width: 0 }}
              animate={{
                width: payload.kind === 'volume' ? `${payload.volumePercent}%` : '100%',
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Overlay />)
