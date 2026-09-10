import { Select } from './ui/Select'
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
  const options = [
    { value: '', label: t('defaultDevice') },
    ...devices.map((d) => ({ value: d.id, label: d.name })),
  ]
  return (
    <Select
      value={selectedId ?? ''}
      options={options}
      onChange={(id) => onChange(id || null)}
      disabled={disabled || devices.length === 0}
      ariaLabel={t('device')}
    />
  )
}
