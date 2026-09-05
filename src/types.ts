export interface DeviceInfo {
  id: string
  name: string
}

export interface InitialState {
  muted: boolean
  volumePercent: number
  volumeDb: number
  devices: DeviceInfo[]
  selectedDeviceId: string | null
  selectedDeviceName: string | null
  hotkey: string
  language: string
  startMinimizedToTray: boolean
  minimizeToTrayOnClose: boolean
  volumeZeroMutes: boolean
  normalizeVolume: boolean
  referenceVolumePercent: number
  platformSupported: boolean
}
