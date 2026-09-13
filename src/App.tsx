import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react'
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog'
import { ConcentricCore } from './components/ConcentricCore'
import { CoreFit } from './components/CoreFit'
import { VolumeSlider } from './components/VolumeSlider'
import { DeviceSelect } from './components/DeviceSelect'
import { Settings } from './components/Settings'
import { TitleBar } from './components/TitleBar'
import { ChevronRightIcon, SlidersIcon } from './components/icons'
import { LanguageProvider, useLanguage, LANG_STORAGE_KEY } from './i18n/LanguageContext'
import { useTheme, type ThemePreference } from './hooks/useTheme'
import { usePersist } from './hooks/usePersist'
import { invoke, useTauriEvent } from './hooks/useTauri'
import type { AudioStatus, ConfigSnapshot, DeviceInfo, EndpointDetails, InitialState } from './types'

const THEME_STORAGE_KEY = 'mc.theme'

// Entrance stagger for the main panel: runs once per launch. Decorative only —
// transform/opacity, so it never blocks interaction. `exit` fades the whole
// panel when the settings view takes over; children hold their pose during it.
const panelVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } },
}
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
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

/** State of the transient message strip at the bottom of the panel. */
interface Notice {
  tone: 'ok' | 'error'
  text: string
}

interface AppShellProps {
  themePreference: ThemePreference
  onThemePreference: (value: ThemePreference) => void
}

function Shell() {
  // One owner for the theme: the title bar cycles it and the settings view
  // sets it outright, so it cannot live in two places.
  const { preference, setPreference, cycle } = useTheme()

  return (
    // overflow-hidden at every level: the layout is sized to fit, so nothing
    // should ever scroll — resize just redistributes space (the core scales).
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      <TitleBar preference={preference} onCycleTheme={cycle} />
      <AppShell themePreference={preference} onThemePreference={setPreference} />
    </div>
  )
}

function AppShell({ themePreference, onThemePreference }: AppShellProps) {
  const { t, setLang } = useLanguage()
  // The window shows one view at a time: the main panel, or the settings page
  // that replaces it (no modal overlay — see Settings).
  const [view, setView] = useState<'main' | 'settings'>('main')
  const [state, setState] = useState<InitialState | null>(null)
  // Fresh snapshot for `usePersist` rollbacks: a ref is read synchronously when
  // a command is dispatched, so it always reflects the state the user acted on
  // rather than a closure-captured stale copy. Synced in an effect (not during
  // render) so it is current by the time any event handler runs.
  const stateRef = useRef<InitialState | null>(null)
  useEffect(() => {
    stateRef.current = state
  }, [state])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [volume, setVolume] = useState(100)
  const [volumeDb, setVolumeDb] = useState(-96)
  const [muted, setMuted] = useState(false)
  const [peak, setPeak] = useState(0)
  const [inUse, setInUse] = useState<string[]>([])
  const [hotkeyError, setHotkeyError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const noticeTimer = useRef<number | null>(null)

  const showNotice = useCallback((tone: Notice['tone'], text: string) => {
    setNotice({ tone, text })
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3000)
  }, [])

  useEffect(
    () => () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    },
    [],
  )

  const reportError = useCallback((err: unknown) => showNotice('error', String(err)), [showNotice])

  const patch = useCallback(
    (values: Partial<InitialState>) => setState((prev) => (prev ? { ...prev, ...values } : prev)),
    [],
  )

  useEffect(() => {
    invoke<InitialState>('get_initial_state')
      .then((s) => {
        setState(s)
        setDevices(s.devices)
        setVolume(s.volumePercent)
        setVolumeDb(s.volumeDb)
        setMuted(s.muted)
        setInUse(s.inUse)
        setHotkeyError(s.hotkeyError)
        // First launch: adopt the preferences persisted in the backend config.
        if (localStorage.getItem(LANG_STORAGE_KEY) === null) {
          if (s.language === 'en' || s.language === 'zh-CN') setLang(s.language)
        }
        if (localStorage.getItem(THEME_STORAGE_KEY) === null) onThemePreference(s.theme)
      })
      .catch((err) => {
        console.error('get_initial_state failed:', err)
        setLoadError(String(err))
      })
  }, [setLang, onThemePreference])

  // --- events from the backend -------------------------------------------
  useTauriEvent<AudioStatus>('audio:status', (status) => {
    setMuted(status.muted)
    setVolume(status.volumePercent)
    setVolumeDb(status.volumeDb)
  })
  useTauriEvent<number>('audio:level', setPeak)
  useTauriEvent<string[]>('audio:in-use', setInUse)
  useTauriEvent<DeviceInfo[]>('audio:devices', setDevices)
  // Pushed by IMMNotificationClient when an endpoint appears, disappears or
  // takes over as default — the list has to be re-read, not just re-rendered.
  useTauriEvent<null>('audio:devices-changed', () => {
    invoke<DeviceInfo[]>('list_devices')
      .then(setDevices)
      .catch((err) => console.error('device refresh failed:', err))
  })

  // --- level meter --------------------------------------------------------
  // Only the *preference* is sent. Whether the window is actually on screen is
  // decided by the backend, which is the side that hides and shows it:
  // `document.visibilityState` in this webview does not follow a window that is
  // created hidden and revealed later, so gating on it here would silently
  // leave sampling off for the whole session.
  const meterAllowed = Boolean(state?.platformSupported) && Boolean(state?.showMeter)
  useEffect(() => {
    invoke('set_meter_enabled', { enabled: meterAllowed }).catch(() => {})
    // No peak reset needed here: the ring only renders while metering, and the
    // core zeroes its own target the moment sampling stops.
    return () => {
      invoke('set_meter_enabled', { enabled: false }).catch(() => {})
    }
  }, [meterAllowed])

  // --- actions ------------------------------------------------------------
  const handleToggleMute = useCallback(async () => {
    try {
      setMuted(await invoke<boolean>('toggle_mute'))
    } catch (err) {
      reportError(err)
    }
  }, [reportError])

  const handleVolume = useCallback(
    async (value: number) => {
      const prevDb = volumeDb
      setVolume(value)
      try {
        setVolumeDb(await invoke<number>('set_volume', { percent: value }))
      } catch (err) {
        // The backend kept the old gain, so the dB readout has to roll back to
        // match — otherwise the slider shows a volume the device is not at.
        setVolumeDb(prevDb)
        reportError(err)
      }
    },
    [reportError, volumeDb],
  )

  const step = state?.scrollStepPercent ?? 5
  const nudge = useCallback(
    async (delta: number) => {
      try {
        await invoke<number>('nudge_volume', { delta })
      } catch (err) {
        reportError(err)
      }
    },
    [reportError],
  )

  // Keyboard: Space for mute, arrows for volume. Skipped whenever the key would
  // mean something else — a control that handles it itself (the core is a
  // button, the sliders take their own arrows) or the settings view, where the
  // keys belong to that page's controls.
  useEffect(() => {
    if (!state?.platformSupported) return
    if (view !== 'main') return
    const inOwnControl = (target: EventTarget | null, selector: string) =>
      target instanceof Element && target.closest(selector) !== null

    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        // Space is how a focused button is activated; acting on it too would
        // toggle mute twice per press.
        if (inOwnControl(event.target, 'button, input, select, textarea, [role="slider"]')) return
        event.preventDefault()
        void handleToggleMute()
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // Sliders take their own arrows; the device select does too (open and
        // navigate the list), and nudging volume underneath it would be a bug.
        if (inOwnControl(event.target, '[role="slider"], [aria-haspopup="listbox"]')) return
        event.preventDefault()
        void nudge(event.key === 'ArrowUp' ? step : -step)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state?.platformSupported, view, step, handleToggleMute, nudge])

  // Wheel over the panel adjusts volume — the gesture people reach for, on the
  // surface where it can actually be delivered (see the note in tray.rs). In
  // the settings view the wheel belongs to the page's own scrolling.
  useEffect(() => {
    if (view !== 'main') return
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return
      event.preventDefault()
      void nudge(event.deltaY < 0 ? step : -step)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [view, step, nudge])

  const handleTargetDevice = useCallback(
    async (id: string | null) => {
      patch({ selectedDeviceId: id })
      try {
        const details = await invoke<EndpointDetails>('set_target_device', { deviceId: id })
        setMuted(details.muted)
        setVolume(details.volumePercent)
        setVolumeDb(details.volumeDb)
        patch({
          volumeRange: details.range,
          channelCount: details.channelCount,
          balance: details.balance,
        })
      } catch (err) {
        reportError(err)
      }
    },
    [patch, reportError],
  )

  const handleSetDefault = useCallback(
    async (id: string) => {
      try {
        setDevices(await invoke<DeviceInfo[]>('set_default_device', { deviceId: id }))
        showNotice('ok', t('defaultSet'))
      } catch (err) {
        reportError(err)
      }
    },
    [reportError, showNotice, t],
  )

  // --- settings -----------------------------------------------------------
  // Optimistic: the UI flips immediately and rolls back the affected fields if
  // the backend refuses the change. See usePersist for the rollback semantics.
  const persist = usePersist(patch, reportError, () => stateRef.current)

  const handleHotkey = useCallback(
    async (value: string) => {
      const previous = state?.hotkey ?? ''
      patch({ hotkey: value })
      try {
        await invoke('set_hotkey', { hotkey: value })
        setHotkeyError(null)
      } catch (err) {
        // The backend refused it and kept the old binding, so the UI has to roll
        // back rather than display a hotkey that is not in effect.
        patch({ hotkey: previous })
        setHotkeyError(String(err))
      }
    },
    [patch, state?.hotkey],
  )

  const applyConfig = useCallback(
    (config: ConfigSnapshot) => {
      patch({
        hotkey: config.hotkey,
        startMinimizedToTray: config.startMinimizedToTray,
        minimizeToTrayOnClose: config.minimizeToTrayOnClose,
        volumeZeroMutes: config.volumeZeroMutes,
        normalizeVolume: config.normalizeVolume,
        referenceVolumePercent: config.referenceVolumePercent,
        showOsd: config.showOsd,
        showMeter: config.showMeter,
        scrollStepPercent: config.scrollStepPercent,
        balance: config.balance,
        selectedDeviceId: config.selectedDeviceId,
        pollInterval: config.pollIntervalS,
      })
      onThemePreference(config.theme)
      setLang(config.language === 'en' ? 'en' : 'zh-CN')
      setHotkeyError(null)
      // An imported config may pin a different endpoint. Re-selecting it is
      // what pulls that endpoint's own state (mute, volume, gain range,
      // channel count) into the UI — patching `selectedDeviceId` alone would
      // leave the previous device's numbers on screen while the backend
      // already acts on the new one.
      void handleTargetDevice(config.selectedDeviceId)
    },
    [patch, onThemePreference, setLang, handleTargetDevice],
  )

  const handleExport = useCallback(async () => {
    try {
      const path = await saveDialog({
        title: t('exportConfig'),
        defaultPath: 'microphone-controller-config.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (!path) return
      await invoke('export_config', { path })
      showNotice('ok', t('exportDone'))
    } catch (err) {
      reportError(err)
    }
  }, [reportError, showNotice, t])

  const handleImport = useCallback(async () => {
    let path: string | null
    try {
      const picked = await openDialog({
        title: t('importConfig'),
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      path = typeof picked === 'string' ? picked : null
    } catch (err) {
      reportError(err)
      return
    }
    if (!path) return
    try {
      applyConfig(await invoke<ConfigSnapshot>('import_config', { path }))
      showNotice('ok', t('importDone'))
    } catch (err) {
      showNotice('error', `${t('importInvalid')} — ${String(err)}`)
    }
  }, [applyConfig, reportError, showNotice, t])

  const handleReset = useCallback(async () => {
    try {
      applyConfig(await invoke<ConfigSnapshot>('reset_config'))
      showNotice('ok', t('resetDone'))
    } catch (err) {
      reportError(err)
    }
  }, [applyConfig, reportError, showNotice, t])

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
        // `wait`: the outgoing view finishes its fade before the incoming one
        // mounts, so the two never share (or fight over) the flex column.
        <AnimatePresence mode="wait">
          {view === 'main' ? (
            <motion.main
              key="main"
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
                    peak={peak}
                    meterEnabled={meterAllowed}
                    onToggleMute={handleToggleMute}
                    disabled={!state.platformSupported}
                  />
                </CoreFit>
                <div className="flex-none py-2">
                  <VolumeSlider value={volume} onChange={handleVolume} db={volumeDb} disabled={!state.platformSupported} />
                </div>
              </motion.section>

              {/* status: mute state, plus whoever else is holding the microphone */}
              <motion.div variants={sectionVariants} className="flex flex-wrap items-center justify-center gap-2">
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

                {/* A device that looks muted and one another app is recording from
                    are very different situations, and neither the flag above nor
                    the level meter tells them apart. */}
                {inUse.length > 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    title={t('inUseHint')}
                    className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                    style={{ background: 'var(--accent-soft)', color: 'var(--fg-muted)' }}
                  >
                    <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: 'var(--fg)' }} />
                    <span className="truncate">
                      {inUse[0]}
                      {inUse.length > 1 ? ` +${inUse.length - 1}` : ''} · {t('inUse')}
                    </span>
                  </motion.span>
                )}
              </motion.div>

              {/* device */}
              <motion.section variants={sectionVariants} className="flex flex-col gap-1.5">
                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  {t('device')}
                </span>
                <DeviceSelect
                  devices={devices}
                  selectedId={state.selectedDeviceId}
                  onChange={handleTargetDevice}
                  onSetDefault={handleSetDefault}
                  disabled={!state.platformSupported}
                />
              </motion.section>

              {/* settings entry: the page replaces the panel instead of
                  overlaying it, so neither view ever needs the window to scroll */}
              <motion.section variants={sectionVariants}>
                <motion.button
                  type="button"
                  onClick={() => setView('settings')}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.12 }}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm outline-none hover:bg-[var(--accent-soft)]"
                  style={{ color: 'var(--fg)' }}
                >
                  <span className="flex items-center gap-2">
                    <SlidersIcon size={15} />
                    {t('settings')}
                  </span>
                  <span style={{ color: 'var(--fg-muted)' }}>
                    <ChevronRightIcon size={14} />
                  </span>
                </motion.button>
              </motion.section>
            </motion.main>
          ) : (
            <Settings
              key="settings"
              onBack={() => setView('main')}
              hotkey={{ value: state.hotkey, error: hotkeyError, onChange: handleHotkey }}
              themePreference={themePreference}
              onThemePreference={onThemePreference}
              behavior={[
                {
                  id: 'startMinimized',
                  label: t('startMinimized'),
                  checked: state.startMinimizedToTray,
                  onChange: (v) =>
                    persist({ startMinimizedToTray: v }, 'set_start_minimized', { value: v }),
                },
                {
                  id: 'closeToTray',
                  label: t('closeToTray'),
                  checked: state.minimizeToTrayOnClose,
                  onChange: (v) =>
                    persist({ minimizeToTrayOnClose: v }, 'set_close_to_tray', { value: v }),
                },
                {
                  id: 'autostart',
                  label: t('autostart'),
                  checked: state.autostart,
                  onChange: (v) => persist({ autostart: v }, 'set_autostart', { value: v }),
                },
                {
                  id: 'zeroVolumeMutes',
                  label: t('zeroVolumeMutes'),
                  checked: state.volumeZeroMutes,
                  onChange: (v) =>
                    persist({ volumeZeroMutes: v }, 'set_volume_zero_mutes', { value: v }),
                },
                {
                  id: 'normalize',
                  label: t('normalize'),
                  checked: state.normalizeVolume,
                  onChange: (v) => persist({ normalizeVolume: v }, 'set_normalize', { value: v }),
                },
                {
                  id: 'showOsd',
                  label: t('showOsd'),
                  note: t('showOsdNote'),
                  checked: state.showOsd,
                  onChange: (v) => persist({ showOsd: v }, 'set_show_osd', { value: v }),
                },
                {
                  id: 'showMeter',
                  label: t('showMeter'),
                  note: t('showMeterNote'),
                  checked: state.showMeter,
                  onChange: (v) => persist({ showMeter: v }, 'set_show_meter', { value: v }),
                },
              ]}
              scrollStep={state.scrollStepPercent}
              onScrollStep={(v) =>
                persist({ scrollStepPercent: v }, 'set_scroll_step', { percent: v })
              }
              pollInterval={state.pollInterval}
              onPollInterval={(v) => persist({ pollInterval: v }, 'set_poll_interval', { seconds: v })}
              normalizeReference={{
                enabled: state.normalizeVolume,
                value: state.referenceVolumePercent,
                onChange: (v) =>
                  persist({ referenceVolumePercent: v }, 'set_reference_volume', { percent: v }),
              }}
              balance={{
                value: state.balance,
                channelCount: state.channelCount,
                onChange: (v) =>
                  invoke<number>('set_balance', { balance: v })
                    .then((applied) => patch({ balance: applied }))
                    .catch(reportError),
              }}
              gainRange={state.volumeRange}
              meta={{ version: state.version, configPath: state.configPath }}
              onExport={handleExport}
              onImport={handleImport}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      )}

      {/* Transient feedback. Positioned rather than laid out, so a message never
          shifts the panel. */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="status"
            className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[80%] truncate rounded-lg px-3 py-1.5 text-xs"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: notice.tone === 'error' ? 'var(--danger)' : 'var(--fg)',
            }}
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>
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
