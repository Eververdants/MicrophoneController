import type { DeviceInfo } from '../types'
import { useLanguage } from '../i18n/LanguageContext'

interface DeviceSelectProps {
  devices: DeviceInfo[]
  selectedId: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
}

export function DeviceSelect({ devices, selectedId, onChange, disabled }: DeviceSelectProps) {
  const { t } = useLanguage()
  return (
    <select
      value={selectedId ?? ''}
      disabled={disabled || devices.length === 0}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-lg border px-3 py-2 text-sm"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
        color: 'var(--fg)',
      }}
    >
      <option value="">{t('defaultDevice')}</option>
      {devices.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  )
}
