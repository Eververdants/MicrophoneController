import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import type { TranslationKey } from '../i18n/translations'

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

export function Settings(props: SettingsProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm"
        style={{ color: 'var(--fg)' }}
      >
        <span>{t('settings')}</span>
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          ›
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 px-1 pb-2 pt-1">
              <Field label={t('hotkey')}>
                <input
                  value={props.hotkey}
                  onChange={(e) => props.onHotkeyChange(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-sm"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                />
              </Field>
              <Toggle label={t('startMinimized')} value={props.startMinimized} onChange={props.onStartMinimizedChange} />
              <Toggle label={t('closeToTray')} value={props.closeToTray} onChange={props.onCloseToTrayChange} />
              <Toggle label={t('zeroVolumeMutes')} value={props.zeroVolumeMutes} onChange={props.onZeroVolumeMutesChange} />
              <Toggle label={t('normalize')} value={props.normalize} onChange={props.onNormalizeChange} />
              {props.normalize && (
                <Field label={t('referenceVolume')}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={props.referenceVolume}
                    onChange={(e) => props.onReferenceVolumeChange(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between text-sm"
      style={{ color: 'var(--fg)' }}
    >
      <span>{label}</span>
      <span
        className="relative h-5 w-9 rounded-full"
        style={{ background: value ? 'var(--fg)' : 'var(--accent-soft)' }}
      >
        <motion.span
          className="absolute top-0.5 h-4 w-4 rounded-full"
          style={{ background: 'var(--bg)' }}
          animate={{ left: value ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  )
}
