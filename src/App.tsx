import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ConcentricCore } from './components/ConcentricCore'
import { VolumeSlider } from './components/VolumeSlider'
import { DeviceSelect } from './components/DeviceSelect'
import { Settings } from './components/Settings'
import { ThemeToggle } from './components/ThemeToggle'
import { LanguageToggle } from './components/LanguageToggle'
import { LanguageProvider, useLanguage } from './i18n/LanguageContext'
import { useTheme } from './hooks/useTheme'
import { invoke, useTauriEvent } from './hooks/useTauri'
import type { InitialState } from './types'

function AppShell() {
  const { t } = useLanguage()
  const { theme, toggle: toggleTheme } = useTheme()
  const [state, setState] = useState<InitialState | null>(null)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    invoke<InitialState>('get_initial_state')
      .then((s) => {
        setState(s)
        setVolume(s.volumePercent)
        setMuted(s.muted)
      })
      .catch((err) => console.error('get_initial_state failed:', err))
  }, [])

  useTauriEvent<boolean>('audio:status', (m) => setMuted(m))

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
      await invoke('set_volume', { percent: v })
    } catch (err) {
      console.error('set_volume failed:', err)
    }
  }

  if (!state) {
    return (
      <div className="grid h-full place-items-center" style={{ color: 'var(--fg-muted)' }}>
        <motion.div
          className="h-8 w-8 rounded-full border-2"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--fg)' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex h-full flex-col gap-4 px-6 py-5"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      {/* header */}
      <header className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">{t('appTitle')}</h1>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* concentric core */}
      <div className="grid place-items-center py-2">
        <ConcentricCore
          muted={muted}
          volumePercent={volume}
          onToggleMute={handleToggleMute}
          disabled={!state.platformSupported}
        />
      </div>

      {/* status pill */}
      <div className="grid place-items-center">
        <motion.span
          key={muted ? 'muted' : 'live'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
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
      </div>

      {/* volume slider */}
      <div className="flex items-center justify-center py-2">
        <VolumeSlider
          value={volume}
          onChange={handleVolume}
          db={state.volumeDb}
          disabled={!state.platformSupported}
        />
      </div>

      {/* device */}
      <div className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          {t('device')}
        </span>
        <DeviceSelect
          devices={state.devices}
          selectedId={state.selectedDeviceId}
          onChange={(id) => invoke('select_device', { deviceId: id }).catch(console.error)}
          disabled={!state.platformSupported}
        />
        {!state.platformSupported && (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {t('platformUnsupported')}
          </p>
        )}
      </div>

      {/* settings */}
      <div className="mt-auto">
        <Settings
          hotkey={state.hotkey}
          onHotkeyChange={(v) => invoke('set_hotkey', { hotkey: v }).catch(console.error)}
          startMinimized={state.startMinimizedToTray}
          onStartMinimizedChange={(v) => invoke('set_start_minimized', { value: v }).catch(console.error)}
          closeToTray={state.minimizeToTrayOnClose}
          onCloseToTrayChange={(v) => invoke('set_close_to_tray', { value: v }).catch(console.error)}
          zeroVolumeMutes={state.volumeZeroMutes}
          onZeroVolumeMutesChange={(v) => invoke('set_volume_zero_mutes', { value: v }).catch(console.error)}
          normalize={state.normalizeVolume}
          onNormalizeChange={(v) => invoke('set_normalize', { value: v }).catch(console.error)}
          referenceVolume={state.referenceVolumePercent}
          onReferenceVolumeChange={(v) => invoke('set_reference_volume', { percent: v }).catch(console.error)}
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  )
}
