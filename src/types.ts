export interface DeviceInfo {
  id: string
  name: string
  /** Console-role default — what Windows itself calls the default device. */
  isDefault: boolean
  /** Communications-role default, which apps are allowed to pick separately. */
  isDefaultComms: boolean
  muted: boolean
  volumePercent: number
}

/** The endpoint's hardware gain window, in dB. */
export interface VolumeRange {
  minDb: number
  maxDb: number
  incrementDb: number
}

/** Everything one read of the controlled endpoint returns. */
export interface EndpointDetails {
  muted: boolean
  volumePercent: number
  volumeDb: number
  range: VolumeRange
  /** 1 means mono, where a balance control would be meaningless. */
  channelCount: number
  /** -100 (all left) to 100 (all right). */
  balance: number
}

/** A status push, from the monitor or from one of our own actions. */
export interface AudioStatus {
  muted: boolean
  volumePercent: number
  volumeDb: number
}

/** Theme choice. `system` follows the OS and re-resolves when it changes. */
export type ThemePreference = 'system' | 'light' | 'dark'

export interface InitialState {
  muted: boolean
  volumePercent: number
  volumeDb: number
  volumeRange: VolumeRange
  channelCount: number
  devices: DeviceInfo[]
  selectedDeviceId: string | null
  selectedDeviceName: string | null
  /** Applications currently holding the microphone, as base image names. */
  inUse: string[]
  hotkey: string
  /** Set when the configured hotkey could not be registered. */
  hotkeyError: string | null
  language: string
  theme: ThemePreference
  startMinimizedToTray: boolean
  minimizeToTrayOnClose: boolean
  volumeZeroMutes: boolean
  normalizeVolume: boolean
  referenceVolumePercent: number
  showOsd: boolean
  showMeter: boolean
  scrollStepPercent: number
  balance: number
  /** How often the monitor re-reads external state, in seconds. */
  pollInterval: number
  autostart: boolean
  configPath: string
  version: string
  platformSupported: boolean
}

/**
 * The config as `import_config` / `reset_config` hand it back.
 *
 * Kept separate from `InitialState` because it is the persisted file, not the
 * runtime view: it has no devices, no meter and no error fields.
 */
export interface ConfigSnapshot {
  hotkey: string
  pollIntervalS: number
  startMinimizedToTray: boolean
  minimizeToTrayOnClose: boolean
  language: string
  selectedDeviceId: string | null
  lastVolumePercent: number
  volumeZeroMutes: boolean
  normalizeVolume: boolean
  referenceVolumePercent: number
  theme: ThemePreference
  showOsd: boolean
  showMeter: boolean
  scrollStepPercent: number
  balance: number
}
