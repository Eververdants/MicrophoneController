import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { Toggle } from './ui/Toggle'
import { Slider } from './ui/Slider'
import { HotkeyRecorder } from './HotkeyRecorder'
import {
  AlertIcon,
  ArrowLeftIcon,
  DownloadIcon,
  ResetIcon,
  UploadIcon,
} from './icons'
import type { ThemePreference, VolumeRange } from '../types'

interface ToggleSpec {
  id: string
  label: string
  note?: string
  checked: boolean
  onChange: (value: boolean) => void
}

export interface SettingsProps {
  onBack: () => void
  hotkey: { value: string; error: string | null; onChange: (v: string) => void }
  themePreference: ThemePreference
  onThemePreference: (v: ThemePreference) => void
  behavior: ToggleSpec[]
  scrollStep: number
  onScrollStep: (v: number) => void
  pollInterval: number
  onPollInterval: (v: number) => void
  normalizeReference: { enabled: boolean; value: number; onChange: (v: number) => void }
  balance: { value: number; channelCount: number; onChange: (v: number) => void }
  gainRange: VolumeRange
  meta: { version: string; configPath: string }
  onExport: () => void
  onImport: () => void
  onReset: () => void
}

// Settings is a dedicated view that replaces the main panel, not a modal on top
// of it: the window is small, and a page gives every control room to breathe
// with a body that scrolls naturally instead of a card floating over the core.
export function Settings(props: SettingsProps) {
  const { t, lang, setLang } = useLanguage()
  const { onBack } = props
  const [confirmingReset, setConfirmingReset] = useState(false)

  // Escape goes back a level. The hotkey recorder stops propagation in the
  // capture phase while it is recording, so the two never fight over Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  return (
    // Same wrapper as the main panel, so switching views keeps the content
    // column in place; only the page itself slides in.
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden px-6 pb-4 pt-1"
    >
      <header className="flex flex-none items-center gap-2 pb-2">
        <button
          type="button"
          onClick={props.onBack}
          aria-label={t('back')}
          title={t('back')}
          className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs outline-none hover:bg-[var(--accent-soft)]"
          style={{ color: 'var(--fg-muted)' }}
        >
          <ArrowLeftIcon size={14} />
          {t('back')}
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
          {t('settings')}
        </span>
      </header>

      {/* Only the body scrolls: the header stays put on a window this short. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-1 pr-1">
        <Section label={t('hotkey')}>
          <HotkeyRecorder
            value={props.hotkey.value}
            onChange={props.hotkey.onChange}
            recordingLabel={t('hotkeyRecording')}
            emptyLabel={t('hotkeyEmpty')}
            ariaLabel={t('hotkey')}
          />
          {props.hotkey.error && (
            <p
              className="flex items-start gap-1.5 text-xs"
              style={{ color: 'var(--danger)' }}
              role="alert"
              // The backend's own message names the system error; it is
              // kept as a tooltip rather than shown, because the
              // actionable part is already in the sentence above it.
              title={props.hotkey.error}
            >
              <span className="mt-px flex-none">
                <AlertIcon size={13} />
              </span>
              <span>{t('hotkeyUnavailable')}</span>
            </p>
          )}
          <Note>{t('hotkeyHint')}</Note>
          <Note>{t('keyboardHint')}</Note>
        </Section>

        <Section label={t('theme')}>
          <Segmented
            ariaLabel={t('theme')}
            value={props.themePreference}
            options={[
              { value: 'system', label: t('followSystem') },
              { value: 'light', label: t('light') },
              { value: 'dark', label: t('dark') },
            ]}
            onChange={props.onThemePreference}
          />
        </Section>

        <Section label={t('language')}>
          <Segmented
            ariaLabel={t('language')}
            value={lang}
            options={[
              { value: 'zh-CN', label: '中文' },
              { value: 'en', label: 'English' },
            ]}
            onChange={setLang}
          />
        </Section>

        <Section label={t('systemSection')}>
          <div className="flex flex-col gap-3">
            {props.behavior.map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <Toggle label={item.label} checked={item.checked} onChange={item.onChange} />
                {item.note && <Note>{item.note}</Note>}
              </div>
            ))}
          </div>
        </Section>

        <Section label={t('volume')}>
          <Field label={`${t('scrollStep')} — ${props.scrollStep}%`}>
            <Slider
              value={props.scrollStep}
              min={1}
              max={20}
              step={1}
              onChange={props.onScrollStep}
              ariaLabel={t('scrollStep')}
            />
          </Field>

          {props.normalizeReference.enabled && (
            <Field
              label={`${t('referenceVolume')} — ${props.normalizeReference.value}%`}
            >
              <Slider
                value={props.normalizeReference.value}
                min={0}
                max={100}
                step={1}
                onChange={props.normalizeReference.onChange}
                ariaLabel={t('referenceVolume')}
              />
            </Field>
          )}

          {props.balance.channelCount >= 2 ? (
            <Field
              label={`${t('balance')} — ${
                props.balance.value === 0
                  ? t('balanceCenter')
                  : `${props.balance.value < 0 ? t('balanceLeft') : t('balanceRight')} ${Math.abs(
                      props.balance.value,
                    )}`
              }`}
            >
              <Slider
                value={props.balance.value}
                min={-100}
                max={100}
                step={1}
                onChange={props.balance.onChange}
                ariaLabel={t('balance')}
              />
            </Field>
          ) : (
            <Note>{t('balanceMonoNote')}</Note>
          )}

          <Note>
            {t('gainRange')}: {formatDb(props.gainRange.minDb)} ~{' '}
            {formatDb(props.gainRange.maxDb)} dB · {t('channels')}:{' '}
            {props.balance.channelCount === 1
              ? t('mono')
              : String(props.balance.channelCount)}
          </Note>
        </Section>

        <Section label={t('monitorSection')}>
          <Field label={`${t('pollInterval')} — ${props.pollInterval.toFixed(2)} s`}>
            <Slider
              value={props.pollInterval}
              min={0.25}
              max={5}
              step={0.25}
              onChange={props.onPollInterval}
              ariaLabel={t('pollInterval')}
            />
          </Field>
          <Note>{t('pollIntervalNote')}</Note>
        </Section>

        <Section label={t('configSection')}>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={<DownloadIcon size={13} />} onClick={props.onExport}>
              {t('exportConfig')}
            </ActionButton>
            <ActionButton icon={<UploadIcon size={13} />} onClick={props.onImport}>
              {t('importConfig')}
            </ActionButton>
            <ActionButton
              icon={<ResetIcon size={13} />}
              danger={confirmingReset}
              onClick={() => {
                if (!confirmingReset) {
                  setConfirmingReset(true)
                  return
                }
                setConfirmingReset(false)
                props.onReset()
              }}
            >
              {confirmingReset ? t('resetConfirm') : t('resetConfig')}
            </ActionButton>
          </div>
          <Note>
            {t('configPath')}: {props.meta.configPath || '—'}
          </Note>
        </Section>

        <Section label={t('about')}>
          <Note>
            {t('version')} {props.meta.version}
          </Note>
        </Section>
      </div>
    </motion.div>
  )
}

function formatDb(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      {/* Hairline rule under the label, per the project's list conventions. */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          {label}
        </span>
        <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>
      {children}
    </section>
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

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
      {children}
    </p>
  )
}

function ActionButton({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs outline-none hover:bg-[var(--accent-soft)]"
      style={{
        borderColor: danger ? 'var(--danger)' : 'var(--border)',
        color: danger ? 'var(--danger)' : 'var(--fg)',
      }}
    >
      {icon}
      {children}
    </button>
  )
}

/** Segmented control with a sliding indicator, matching LanguageToggle. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  ariaLabel: string
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const share = 100 / options.length
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative flex rounded-lg p-0.5"
      style={{ background: 'var(--accent-soft)' }}
    >
      {/* The indicator lives in an inset wrapper so its percentages are
          relative to the padded box — animating calc() strings would snap
          instead of sliding. */}
      <div aria-hidden className="pointer-events-none absolute inset-0.5">
        <motion.span
          className="absolute top-0 bottom-0 rounded-md"
          style={{ background: 'var(--fg)' }}
          animate={{ left: `${index * share}%`, width: `${share}%` }}
          transition={{ type: 'spring', stiffness: 480, damping: 34 }}
        />
      </div>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className="relative z-10 flex-1 cursor-pointer rounded-md py-1.5 text-xs outline-none"
          style={{ color: value === option.value ? 'var(--bg)' : 'var(--fg-muted)' }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
