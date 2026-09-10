import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react'
import { ConcentricCore } from './components/ConcentricCore'
import { VolumeSlider } from './components/VolumeSlider'
import { DeviceSelect } from './components/DeviceSelect'
import { Settings } from './components/Settings'
import { TitleBar } from './components/TitleBar'
import { LanguageProvider, useLanguage, LANG_STORAGE_KEY } from './i18n/LanguageContext'
import { useTheme } from './hooks/useTheme'
import { invoke, useTauriEvent } from './hooks/useTauri'
import type { InitialState } from './types'

// Entrance stagger for the main panel: runs once per launch. Decorative only —
// transform/opacity, so it never blocks interaction.
const panelVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

// The core is drawn at a fixed 224px; this wrapper scales it to whatever
// vertical room the row has left, so the window never needs to scroll.
const CORE_SIZE = 224
function CoreFit({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setScale(Math.max(0.55, Math.min(1, width / (CORE_SIZE + 8), height / (CORE_SIZE + 8))))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="grid min-h-0 min-w-0 flex-1 place-items-center self-stretch">
      <motion.div animate={{ scale }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
        {children}
      </motion.div>
    </div>
  )
}

// Shown from the first frame until `get_initial_state` lands. It mirrors the
// panel's layout one-for-one — same column, same section heights — so the real
// content can fade in over it without anything moving: the launch reads as
// "filling in", not as "loading, then jumping". The static copy in index.html
// covers the window before this even mounts, so the app is never blank.
function ShellSkeleton() {
  return (
    <motion.div
      aria-hidden
      // Absolutely positioned and click-through: it overlays the real panel
      // while fading out, and must not eat input during that window.
      className="pointer-events-none absolute inset-0 mx-auto flex w-full max-w-xl flex-col gap-3 px-6 pb-4 pt-1"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Mirrors the panel exactly: the core slot flexes and centres, the
          slider is pinned to the trailing edge — otherwise the slider would
          jump sideways the moment the real content arrives. */}
      <div className="flex min-h-0 flex-1 items-center justify-center gap-10">
        <div className="grid min-h-0 min-w-0 flex-1 place-items-center self-stretch">
          <div
            className="relative h-56 w-56 rounded-full"
            style={{ border: '1.5px solid var(--accent-soft)' }}
          >
            <span className="mc-skeleton absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          </div>
        </div>
        <div className="flex-none py-2">
          <div className="flex flex-col items-center gap-2.5">
            <span className="mc-skeleton h-40 w-2 rounded-full" />
            <span className="mc-skeleton h-8 w-14 rounded-md" />
            <span className="mc-skeleton h-4 w-11 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <span className="mc-skeleton h-6 w-21 rounded-full" />
      </div>

      {/* device: label + select + note, at the heights the real rows occupy */}
      <div className="flex flex-col gap-1.5">
        <span className="mc-skeleton h-4 w-10 rounded-full" />
        <span className="mc-skeleton h-[38px] w-full rounded-lg" />
        <span className="mc-skeleton h-4 w-44 rounded-full" />
      </div>

      <div>
        <span className="mc-skeleton block h-9 w-full rounded-lg" />
      </div>
    </motion.div>
  )
}

function Shell() {
  const { theme, toggle } = useTheme()
  return (
    // overflow-hidden at every level: the layout is sized to fit, so nothing
    // should ever scroll — resize just redistributes space (the core scales).
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <TitleBar theme={theme} onToggleTheme={toggle} />
      <AppShell />
    </div>
  )
}

function AppShell() {
  const { t, setLang } = useLanguage()
  const [state, setState] = useState<InitialState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [volume, setVolume] = useState(100)
  const [volumeDb, setVolumeDb] = useState(-96)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    invoke<InitialState>('get_initial_state')
      .then((s) => {
        setState(s)
        setVolume(s.volumePercent)
        setVolumeDb(s.volumeDb)
        setMuted(s.muted)
        // First launch: adopt the language persisted in the backend config.
        if (localStorage.getItem(LANG_STORAGE_KEY) === null) {
          if (s.language === 'en' || s.language === 'zh-CN') setLang(s.language)
        }
      })
      .catch((err) => {
        console.error('get_initial_state failed:', err)
        setLoadError(String(err))
      })
  }, [setLang])

  useTauriEvent<boolean>('audio:status', (m) => setMuted(m))

  // Settings callbacks must update local state too, or the toggles never
  // reflect (and a second click re-sends the same stale value).
  const patchState = (patch: Partial<InitialState>) =>
    setState((prev) => (prev ? { ...prev, ...patch } : prev))

  const handleToggleMute = async () => {
    try {
      const next = await invoke<boolean>('toggle_mute')
      setMuted(next)
    } catch (err) {
      console.error('toggle_mute failed:', err)
    }
  }

  const handleVolume = async (v: number) => {
    setVolume(v)
    try {
      const db = await invoke<number>('set_volume', { percent: v })
      setVolumeDb(db)
    } catch (err) {
      console.error('set_volume failed:', err)
    }
  }

  if (loadError) {
    return (
      <div className="grid flex-1 place-items-center px-6 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
        {t('loadFailed')}: {loadError}
      </div>
    )
  }

  // The skeleton sits absolutely under the panel and unmounts once the real
  // content exists; holding a spinner up instead would mean staring at an empty
  // window for the whole round-trip to the audio backend.
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence>{!state && <ShellSkeleton key="skeleton" />}</AnimatePresence>

      {state && (
        <motion.main
          variants={panelVariants}
          initial="hidden"
          animate="show"
          // max-w keeps the controls from stretching edge-to-edge on maximized windows.
          className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-3 overflow-hidden px-6 pb-4 pt-1"
        >
          {/* concentric core + volume slider */}
          <motion.section variants={sectionVariants} className="flex min-h-0 flex-1 items-center justify-center gap-10">
            <CoreFit>
              <ConcentricCore
                muted={muted}
                volumePercent={volume}
                onToggleMute={handleToggleMute}
                disabled={!state.platformSupported}
              />
            </CoreFit>
            <div className="flex-none py-2">
              <VolumeSlider value={volume} onChange={handleVolume} db={volumeDb} disabled={!state.platformSupported} />
            </div>
          </motion.section>

          {/* status pill */}
          <motion.div variants={sectionVariants} className="flex justify-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={muted ? 'muted' : 'live'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                style={{
                  background: muted
                    ? 'color-mix(in srgb, var(--danger) 14%, transparent)'
                    : 'color-mix(in srgb, var(--success) 14%, transparent)',
                  color: muted ? 'var(--danger)' : 'var(--success)',
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: muted ? 'var(--danger)' : 'var(--success)' }}
                />
                {muted ? t('mute') : t('unmute')}
              </motion.span>
            </AnimatePresence>
          </motion.div>

          {/* device */}
          <motion.section variants={sectionVariants} className="flex flex-col gap-1.5">
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              {t('device')}
            </span>
            <DeviceSelect
              devices={state.devices}
              selectedId={state.selectedDeviceId}
              onChange={(id) => {
                patchState({ selectedDeviceId: id })
                invoke('select_device', { deviceId: id }).catch(console.error)
              }}
            />
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              {state.platformSupported ? t('deviceNote') : t('platformUnsupported')}
            </p>
          </motion.section>

          {/* settings */}
          <motion.section variants={sectionVariants}>
            <Settings
              hotkey={state.hotkey}
              onHotkeyChange={(v) => {
                patchState({ hotkey: v })
                invoke('set_hotkey', { hotkey: v }).catch(console.error)
              }}
              startMinimized={state.startMinimizedToTray}
              onStartMinimizedChange={(v) => {
                patchState({ startMinimizedToTray: v })
                invoke('set_start_minimized', { value: v }).catch(console.error)
              }}
              closeToTray={state.minimizeToTrayOnClose}
              onCloseToTrayChange={(v) => {
                patchState({ minimizeToTrayOnClose: v })
                invoke('set_close_to_tray', { value: v }).catch(console.error)
              }}
              zeroVolumeMutes={state.volumeZeroMutes}
              onZeroVolumeMutesChange={(v) => {
                patchState({ volumeZeroMutes: v })
                invoke('set_volume_zero_mutes', { value: v }).catch(console.error)
              }}
              normalize={state.normalizeVolume}
              onNormalizeChange={(v) => {
                patchState({ normalizeVolume: v })
                invoke('set_normalize', { value: v }).catch(console.error)
              }}
              referenceVolume={state.referenceVolumePercent}
              onReferenceVolumeChange={(v) => {
                patchState({ referenceVolumePercent: v })
                invoke('set_reference_volume', { percent: v }).catch(console.error)
              }}
            />
          </motion.section>
        </motion.main>
      )}
    </div>
  )
}

export default function App() {
  return (
    // reducedMotion="user": honor the OS "reduce motion" setting globally.
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <Shell />
      </LanguageProvider>
    </MotionConfig>
  )
}
