//! Windows Core Audio backend.
//!
//! On non-Windows platforms this module exposes stub implementations so the
//! app shell still builds — audio controls degrade gracefully in the frontend.

use std::sync::Mutex;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Default)]
pub struct AudioInner {
    pub last_known_muted: bool,
    pub last_known_volume_percent: i64,
}

pub struct AudioController {
    pub inner: Mutex<AudioInner>,
}

impl AudioController {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(AudioInner {
                last_known_muted: false,
                last_known_volume_percent: 100,
            }),
        }
    }
}

// ---------------------------------------------------------------------------
// Windows implementation
// ---------------------------------------------------------------------------
#[cfg(windows)]
pub mod win {
    use super::*;
    use std::cell::RefCell;
    use windows::core::GUID;
    use windows::Win32::Foundation::PROPERTYKEY;
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::Media::Audio::{
        eCapture, eConsole, IMMDevice, IMMDeviceCollection, IMMDeviceEnumerator,
        MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
        STGM_READ,
    };

    thread_local! {
        static COM_INIT: RefCell<bool> = const { RefCell::new(false) };
    }

    fn ensure_com() {
        COM_INIT.with(|flag| {
            if !*flag.borrow() {
                unsafe {
                    let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
                }
                *flag.borrow_mut() = true;
            }
        });
    }

    // PKEY_Device_FriendlyName = {a45c254e-df1c-4efd-8020-67d146a850e0 14}
    const PKEY_DEVICE_FRIENDLY_NAME: PROPERTYKEY = PROPERTYKEY {
        fmtid: GUID::from_values(
            0xa45c254e,
            0xdf1c,
            0x4efd,
            [0x80, 0x20, 0x67, 0xd1, 0x46, 0xa8, 0x50, 0xe0],
        ),
        pid: 14,
    };

    pub fn list_capture_devices() -> Result<Vec<DeviceInfo>, String> {
        ensure_com();
        unsafe {
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                    .map_err(|e| format!("CoCreateInstance(IMMDeviceEnumerator): {e}"))?;

            let collection: IMMDeviceCollection = enumerator
                .EnumAudioEndpoints(eCapture, DEVICE_STATE_ACTIVE)
                .map_err(|e| format!("EnumAudioEndpoints: {e}"))?;

            let count = collection
                .GetCount()
                .map_err(|e| format!("GetCount: {e}"))?;

            let mut out = Vec::new();
            for i in 0..count {
                if let Ok(dev) = collection.Item(i) {
                    if let Some(info) = read_device_info(&dev) {
                        out.push(info);
                    }
                }
            }
            Ok(out)
        }
    }

    fn read_device_info(dev: &IMMDevice) -> Option<DeviceInfo> {
        unsafe {
            let id_pwstr = dev.GetId().ok()?;
            let id = id_pwstr.to_string().ok()?;
            CoTaskMemFree(Some(id_pwstr.as_ptr().cast()));
            let store = dev.OpenPropertyStore(STGM_READ).ok()?;
            let value = store.GetValue(&PKEY_DEVICE_FRIENDLY_NAME).ok()?;
            let name = value.to_string();
            Some(DeviceInfo { id, name })
        }
    }

    fn get_default_endpoint() -> Result<IAudioEndpointVolume, String> {
        ensure_com();
        unsafe {
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                    .map_err(|e| format!("CoCreateInstance: {e}"))?;

            let dev = enumerator
                .GetDefaultAudioEndpoint(eCapture, eConsole)
                .map_err(|e| format!("GetDefaultAudioEndpoint: {e}"))?;

            let endpoint: IAudioEndpointVolume = dev
                .Activate(CLSCTX_ALL, None)
                .map_err(|e| format!("Activate(IAudioEndpointVolume): {e}"))?;

            Ok(endpoint)
        }
    }

    /// Run `f` with the default capture endpoint. Acquiring the endpoint means
    /// CoCreateInstance + GetDefaultAudioEndpoint + Activate, so callers doing
    /// several operations should batch them behind this helper instead of
    /// going through one-shot wrappers.
    pub fn with_default_endpoint<T>(
        f: impl FnOnce(&IAudioEndpointVolume) -> Result<T, String>,
    ) -> Result<T, String> {
        let ep = get_default_endpoint()?;
        f(&ep)
    }

    /// Read (muted, volume percent, volume dB) from one endpoint.
    pub fn read_endpoint_state(ep: &IAudioEndpointVolume) -> Result<(bool, i64, f64), String> {
        unsafe {
            let muted = ep
                .GetMute()
                .map(bool::from)
                .map_err(|e| format!("GetMute: {e}"))?;
            let percent = ep
                .GetMasterVolumeLevelScalar()
                .map(|s| (s * 100.0).round() as i64)
                .map_err(|e| format!("GetMasterVolumeLevelScalar: {e}"))?;
            let db = ep
                .GetMasterVolumeLevel()
                .map(f64::from)
                .map_err(|e| format!("GetMasterVolumeLevel: {e}"))?;
            Ok((muted, percent, db))
        }
    }

    /// Outcome of a volume change: the resulting level in dB and, when the
    /// zero-volume-mute policy toggled muting, the new mute state.
    pub struct VolumeOutcome {
        pub volume_db: f64,
        pub muted: Option<bool>,
    }

    pub fn set_volume_percent_ex(percent: i64, zero_mutes: bool) -> Result<VolumeOutcome, String> {
        let clamped = percent.clamp(0, 100);
        let target = (clamped as f32) / 100.0;
        with_default_endpoint(|ep| unsafe {
            ep.SetMasterVolumeLevelScalar(target, std::ptr::null())
                .map_err(|e| format!("SetMasterVolumeLevelScalar: {e}"))?;

            let mut muted = None;
            if zero_mutes {
                let is_muted = ep
                    .GetMute()
                    .map(bool::from)
                    .map_err(|e| format!("GetMute: {e}"))?;
                if clamped <= 0 && !is_muted {
                    ep.SetMute(true, std::ptr::null())
                        .map_err(|e| format!("SetMute: {e}"))?;
                    muted = Some(true);
                } else if clamped > 0 && is_muted {
                    ep.SetMute(false, std::ptr::null())
                        .map_err(|e| format!("SetMute: {e}"))?;
                    muted = Some(false);
                }
            }

            let volume_db = ep
                .GetMasterVolumeLevel()
                .map(f64::from)
                .map_err(|e| format!("GetMasterVolumeLevel: {e}"))?;
            Ok(VolumeOutcome { volume_db, muted })
        })
    }

    pub fn set_mute(muted: bool) -> Result<(), String> {
        with_default_endpoint(|ep| unsafe {
            ep.SetMute(muted, std::ptr::null())
                .map_err(|e| format!("SetMute: {e}"))
        })
    }

    pub fn toggle_mute() -> Result<bool, String> {
        with_default_endpoint(|ep| unsafe {
            let current = ep
                .GetMute()
                .map(bool::from)
                .map_err(|e| format!("GetMute: {e}"))?;
            ep.SetMute(!current, std::ptr::null())
                .map_err(|e| format!("SetMute: {e}"))?;
            Ok(!current)
        })
    }

    pub fn select_device(_device_id: Option<&str>) -> Result<(), String> {
        // Windows Core Audio does not permit programmatic reassignment of the
        // default capture endpoint without policy changes. Surface a no-op so
        // the frontend can disable the control gracefully.
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Non-Windows stubs
// ---------------------------------------------------------------------------
#[cfg(not(windows))]
pub mod win {
    use super::*;
    pub fn list_capture_devices() -> Result<Vec<DeviceInfo>, String> {
        Ok(Vec::new())
    }
    pub fn with_default_endpoint<T>(_: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
        Err("audio not supported on this platform".into())
    }
    pub fn is_muted() -> Result<bool, String> {
        Err("audio not supported on this platform".into())
    }
    pub fn set_mute(_: bool) -> Result<(), String> {
        Err("audio not supported on this platform".into())
    }
    pub fn toggle_mute() -> Result<bool, String> {
        Err("audio not supported on this platform".into())
    }
    pub fn set_volume_percent_ex(_: i64, _: bool) -> Result<VolumeOutcome, String> {
        Err("audio not supported on this platform".into())
    }
    pub fn select_device(_: Option<&str>) -> Result<(), String> {
        Err("audio not supported on this platform".into())
    }
}
