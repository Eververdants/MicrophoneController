import { Select, type SelectOption } from './ui/Select'
import type { DeviceInfo } from '../types'
import { useLanguage } from '../i18n/LanguageContext'

interface DeviceSelectProps {
  devices: DeviceInfo[]
  selectedId: string | null
  onChange: (id: string | null) => void
  onSetDefault: (id: string) => void
  disabled?: boolean
}

/**
 * Picks the endpoint the controls act on.
 *
 * Two different ideas live here, and conflating them is what made the old
 * version a dead control:
 *
 * * **target** — which microphone this app adjusts. It can be pinned to a
 *   device while Windows keeps handing apps another one.
 * * **system default** — what Windows itself uses. Moving it is a separate,
 *   explicit action, offered only when the selected device is not already it.
 */
export function DeviceSelect({
  devices,
  selectedId,
  onChange,
  onSetDefault,
  disabled,
}: DeviceSelectProps) {
  const { t } = useLanguage()

  const options: SelectOption[] = [
    { value: '', label: t('followDefault') },
    ...devices.map((device) => ({
      value: device.id,
      label: (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{device.name}</span>
          <Badge tone="default" hidden={!device.isDefault}>
            {t('defaultBadge')}
          </Badge>
          {/* The communications default is a separate role, and the usual
              reason a call app picks a different microphone. */}
          <Badge tone="comms" hidden={device.isDefault || !device.isDefaultComms}>
            {t('commsBadge')}
          </Badge>
        </span>
      ),
    })),
  ]

  const selected = devices.find((device) => device.id === selectedId)
  const canPromote = Boolean(selected && !selected.isDefault)

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={selectedId ?? ''}
        options={options}
        onChange={(id) => onChange(id || null)}
        disabled={disabled}
        ariaLabel={t('device')}
      />
      <div className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
        <span className="truncate">
          {devices.length === 0 ? t('noDevices') : selectedId ? t('pinned') : t('deviceNote')}
        </span>
        {canPromote && selected && (
          <button
            type="button"
            onClick={() => onSetDefault(selected.id)}
            className="flex-none cursor-pointer underline underline-offset-2 outline-none"
            style={{ color: 'var(--fg)' }}
          >
            {t('setAsDefault')}
          </button>
        )}
      </div>
    </div>
  )
}

function Badge({
  tone,
  hidden,
  children,
}: {
  tone: 'default' | 'comms'
  hidden: boolean
  children: React.ReactNode
}) {
  if (hidden) return null
  return (
    <span
      className="flex-none rounded px-1 text-[10px] leading-4"
      style={
        tone === 'default'
          ? { background: 'color-mix(in srgb, var(--fg) 10%, transparent)', color: 'var(--fg)' }
          : { background: 'var(--accent-soft)', color: 'var(--fg-muted)' }
      }
    >
      {children}
    </span>
  )
}
