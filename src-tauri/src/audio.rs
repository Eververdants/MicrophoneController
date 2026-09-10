//! Windows Core Audio backend.
//!
//! On non-Windows platforms this module exposes stub implementations so the
//! app shell still builds — audio controls degrade gracefully in the frontend.

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

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

/// Everything `get_initial_state` needs from the device stack.
///
/// Probing it means initialising a COM apartment, activating the default
/// endpoint and reading a property store per capture device — the single
/// slowest thing the app does at startup. [`AudioController::spawn_prewarm`]
/// gets it out of the way while the webview is still booting.
#[derive(Debug, Clone, Default)]
pub struct Snapshot {
    pub muted: bool,
    pub volume_percent: i64,
    pub volume_db: f64,
    pub devices: Vec<DeviceInfo>,
}

/// How long a startup snapshot stays usable. Long enough to cover a cold webview
/// boot, short enough that a device plugged in at launch is still picked up.
const PREWARM_TTL: Duration = Duration::from_secs(5);

pub struct AudioController {
    pub inner: Arc<Mutex<AudioInner>>,
    prewarm: Arc<Mutex<Option<(Snapshot, Instant)>>>,
}

impl AudioController {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(AudioInner {
                last_known_muted: false,
                last_known_volume_percent: 100,
            })),
            prewarm: Arc::new(Mutex::new(None)),
        }
    }

    /// Probe the device stack on a worker thread, in parallel with the frontend
    /// loading, and stash the result for the first `get_initial_state`.
    ///
    /// `fallback_percent` is the persisted volume, used when the device stack
    /// cannot be reached (no capture endpoint, COM failure).
    pub fn spawn_prewarm(&self, fallback_percent: i64) {
        let inner = Arc::clone(&self.inner);
        let slot = Arc::clone(&self.prewarm);
        std::thread::spawn(move || {
            let snapshot = win::read_snapshot(fallback_percent);

            // Publish to `inner` *before* the snapshot becomes visible: the
            // "has anything changed since?" check in `take_prewarm` compares the
            // two, and a mutation landing in between must not be missed.
            if let Ok(mut inner) = inner.lock() {
                inner.last_known_muted = snapshot.muted;
                inner.last_known_volume_percent = snapshot.volume_percent;
            }
            if let Ok(mut slot) = slot.lock() {
                *slot = Some((snapshot, Instant::now()));
            }
        });
    }

    /// Take the startup snapshot, if it is still fresh and no audio change has
    /// landed since it was produced.
    ///
    /// Consumed on first use, so later reads always go back to the device stack.
    pub fn take_prewarm(&self) -> Option<Snapshot> {
        let (snapshot, created) = self.prewarm.lock().ok()?.take()?;
        if created.elapsed() > PREWARM_TTL {
            return None;
        }
        // A hotkey or mute between the probe and the first read would otherwise
        // be silently overwritten by the pre-toggle values.
        let inner = self.inner.lock().ok()?;
        if inner.last_known_muted != snapshot.muted
            || inner.last_known_volume_percent != snapshot.volume_percent
        {
            return None;
        }
        drop(inner);
        Some(snapshot)
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

    /// One probe of the whole device stack. Called from the prewarm thread, so
    /// this thread's COM apartment is initialised off the critical path.
    pub fn read_snapshot(fallback_percent: i64) -> Snapshot {
        let (muted, volume_percent, volume_db) = with_default_endpoint(read_endpoint_state)
            .unwrap_or((false, fallback_percent, -96.0));
        let devices = list_capture_devices().unwrap_or_default();
        Snapshot {
            muted,
            volume_percent,
            volume_db,
            devices,
        }
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

    pub fn read_snapshot(fallback_percent: i64) -> Snapshot {
        Snapshot {
            muted: false,
            volume_percent: fallback_percent,
            volume_db: -96.0,
            devices: Vec::new(),
        }
    }
}
