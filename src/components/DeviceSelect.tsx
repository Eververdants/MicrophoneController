import { Select } from './ui/Select'
import type { DeviceInfo } from '../types'
import { useLanguage } from '../i18n/LanguageContext'

interface DeviceSelectProps {
  devices: DeviceInfo[]
  selectedId: string | null
  onChange: (id: string | null) => void
}

export function DeviceSelect({ devices, selectedId, onChange }: DeviceSelectProps) {
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
      // `select_device` is a no-op on every platform (Core Audio does not permit
      // programmatic default-endpoint reassignment), so the control must stay
      // disabled — it only reflects the current device. Switching happens in
      // system sound settings (see the note below).
      disabled
      ariaLabel={t('device')}
    />
  )
}
