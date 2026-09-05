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
    use windows::Win32::Foundation::BOOL;
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::Media::Audio::{
        eCapture, eConsole, IMMDevice, IMMDeviceCollection, IMMDeviceEnumerator,
        DEVICE_STATE_ACTIVE,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Shell::PropertiesSystem::PROPERTYKEY;
    use windows::core::{Interface, GUID};

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
            0xa45c254e, 0xdf1c, 0x4efd, [0x80, 0x20, 0x67, 0xd1, 0x46, 0xa8, 0x50, 0xe0],
        ),
        pid: 14,
    };

    pub fn list_capture_devices() -> Result<Vec<DeviceInfo>, String> {
        ensure_com();
        unsafe {
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&IMMDeviceEnumerator, None, CLSCTX_ALL)
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
            let id_bstr = dev.GetId().ok()?;
            let id = id_bstr.to_string().ok()?;
            let store = dev.OpenPropertyStore(0).ok()?; // 0 = STGM_READ
            let value = store.GetValue(&PKEY_DEVICE_FRIENDLY_NAME).ok()?;
            let name = value.to_string().ok()?;
            Some(DeviceInfo { id, name })
        }
    }

    fn get_default_endpoint() -> Result<IAudioEndpointVolume, String> {
        ensure_com();
        unsafe {
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&IMMDeviceEnumerator, None, CLSCTX_ALL)
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

    fn bool_to_rust(b: BOOL) -> bool {
        b.0 != 0
    }

    pub fn is_muted() -> Result<bool, String> {
        let ep = get_default_endpoint()?;
        unsafe {
            ep.GetMute()
                .map(bool_to_rust)
                .map_err(|e| format!("GetMute: {e}"))
        }
    }

    pub fn set_mute(muted: bool) -> Result<(), String> {
        let ep = get_default_endpoint()?;
        unsafe {
            ep.SetMute(muted, None)
                .map_err(|e| format!("SetMute: {e}"))
        }
    }

    pub fn toggle_mute() -> Result<bool, String> {
        let current = is_muted()?;
        set_mute(!current)?;
        Ok(!current)
    }

    pub fn get_volume_percent() -> Result<i64, String> {
        let ep = get_default_endpoint()?;
        unsafe {
            ep.GetMasterVolumeLevelScalar()
                .map(|s| (s * 100.0).round() as i64)
                .map_err(|e| format!("GetMasterVolumeLevelScalar: {e}"))
        }
    }

    pub fn get_volume_db() -> Result<f64, String> {
        let ep = get_default_endpoint()?;
        unsafe {
            ep.GetMasterVolumeLevel()
                .map_err(|e| format!("GetMasterVolumeLevel: {e}"))
        }
    }

    pub fn set_volume_percent(percent: i64) -> Result<(), String> {
        let clamped = (percent.clamp(0, 100) as f32) / 100.0;
        let ep = get_default_endpoint()?;
        unsafe {
            ep.SetMasterVolumeLevelScalar(clamped, None)
                .map_err(|e| format!("SetMasterVolumeLevelScalar: {e}"))
        }
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
    pub fn is_muted() -> Result<bool, String> {
        Err("audio not supported on this platform".into())
    }
    pub fn set_mute(_: bool) -> Result<(), String> {
        Err("audio not supported on this platform".into())
    }
    pub fn toggle_mute() -> Result<bool, String> {
        Err("audio not supported on this platform".into())
    }
    pub fn get_volume_percent() -> Result<i64, String> {
        Err("audio not supported on this platform".into())
    }
    pub fn get_volume_db() -> Result<f64, String> {
        Err("audio not supported on this platform".into())
    }
    pub fn set_volume_percent(_: i64) -> Result<(), String> {
        Err("audio not supported on this platform".into())
    }
    pub fn select_device(_: Option<&str>) -> Result<(), String> {
        Err("audio not supported on this platform".into())
    }
}
