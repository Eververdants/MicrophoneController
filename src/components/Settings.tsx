import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { Toggle } from './ui/Toggle'
import { Slider } from './ui/Slider'
import { ChevronDownIcon, CloseIcon, SlidersIcon } from './icons'

interface SettingsProps {
  hotkey: string
  onHotkeyChange: (v: string) => void
  startMinimized: boolean
  onStartMinimizedChange: (v: boolean) => void
  closeToTray: boolean
  onCloseToTrayChange: (v: boolean) => void
  zeroVolumeMutes: boolean
  onZeroVolumeMutesChange: (v: boolean) => void
  normalize: boolean
  onNormalizeChange: (v: boolean) => void
  referenceVolume: number
  onReferenceVolumeChange: (v: number) => void
}

// Settings opens as a centred modal overlay instead of an expanding section:
// the main layout never reflows, which keeps the window scroll-free at any size.
export function Settings(props: SettingsProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.12 }}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm outline-none hover:bg-[var(--accent-soft)]"
        style={{ color: 'var(--fg)' }}
      >
        <span className="flex items-center gap-2">
          <SlidersIcon size={15} />
          {t('settings')}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          <ChevronDownIcon size={14} />
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            // top-10 keeps the custom title bar (and its window controls) usable.
            className="fixed inset-x-0 bottom-0 top-10 z-10 grid place-items-center p-6"
            style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)' }}
            onMouseDown={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-label={t('settings')}
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-sm rounded-xl border p-4 shadow-xl"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                  {t('settings')}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('close')}
                  className="cursor-pointer rounded-md p-1 outline-none hover:bg-[var(--accent-soft)]"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  <CloseIcon size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <Field label={t('hotkey')}>
                  <HotkeyInput value={props.hotkey} onCommit={props.onHotkeyChange} />
                </Field>
                <Toggle label={t('startMinimized')} checked={props.startMinimized} onChange={props.onStartMinimizedChange} />
                <Toggle label={t('closeToTray')} checked={props.closeToTray} onChange={props.onCloseToTrayChange} />
                <Toggle label={t('zeroVolumeMutes')} checked={props.zeroVolumeMutes} onChange={props.onZeroVolumeMutesChange} />
                <Toggle label={t('normalize')} checked={props.normalize} onChange={props.onNormalizeChange} />
                {props.normalize && (
                  <Field label={`${t('referenceVolume')} — ${props.referenceVolume}%`}>
                    <Slider
                      value={props.referenceVolume}
                      min={0}
                      max={100}
                      step={1}
                      onChange={props.onReferenceVolumeChange}
                      ariaLabel={t('referenceVolume')}
                    />
                  </Field>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Registering a hotkey on every keystroke would churn OS registrations (and
// reject partial strings like "F"), so the draft is committed on blur/Enter.
function HotkeyInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [prevValue, setPrevValue] = useState(value)

  // Resync the draft when the committed value changes, without an effect.
  if (prevValue !== value) {
    setPrevValue(value)
    setDraft(value)
  }

  const commit = () => {
    const next = draft.trim()
    if (next !== value) onCommit(next)
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
          e.currentTarget.blur()
        }
      }}
      className="w-full rounded-md border px-2 py-1.5 text-sm"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
    />
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      {children}
    </label>
  )
}
