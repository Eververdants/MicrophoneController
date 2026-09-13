//! Windows Core Audio backend.
//!
//! Every command funnels through [`with_endpoint`], which resolves a capture
//! endpoint (the system default, or a specific device id) and activates
//! `IAudioEndpointVolume` on it. Acquisition costs a `CoCreateInstance` plus an
//! `Activate`, so callers that need several operations batch them inside the
//! closure instead of calling the one-shot wrappers in a row.
//!
//! COM is apartment-threaded and initialised per thread ([`ensure_com`]): the
//! commands run on Tauri's async pool and the monitor on its own thread, and
//! neither may inherit an apartment from the other.

use super::{policy, DeviceInfo, EndpointDetails, Snapshot, VolumeRange};
use std::cell::RefCell;
use windows::core::{GUID, HSTRING, PCWSTR};
use windows::Win32::Foundation::PROPERTYKEY;
use windows::Win32::Media::Audio::Endpoints::{IAudioEndpointVolume, IAudioMeterInformation};
use windows::Win32::Media::Audio::{
    eCapture, eCommunications, eConsole, ERole, IMMDevice, IMMDeviceCollection,
    IMMDeviceEnumerator, MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_APARTMENTTHREADED, STGM_READ,
};

thread_local! {
    static COM_INIT: RefCell<bool> = const { RefCell::new(false) };

    /// `IAudioMeterInformation` cached per thread.
    ///
    /// The meter is sampled ~20x/s; re-activating the interface every tick would
    /// be the app's single largest background cost. The cache key is the device
    /// so that switching targets or unplugging a device invalidates it.
    static METER_CACHE: RefCell<Option<(Option<String>, IAudioMeterInformation)>> =
        const { RefCell::new(None) };
}

pub fn ensure_com() {
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

fn enumerator() -> Result<IMMDeviceEnumerator, String> {
    ensure_com();
    unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
        .map_err(|e| format!("CoCreateInstance(IMMDeviceEnumerator): {e}"))
}

/// Resolve the endpoint to act on: a named device, or the system default.
pub(super) fn resolve_device(device_id: Option<&str>) -> Result<IMMDevice, String> {
    let enumr = enumerator()?;
    match device_id {
        Some(id) => {
            let wide = HSTRING::from(id);
            unsafe { enumr.GetDevice(PCWSTR(wide.as_ptr())) }
                .map_err(|e| format!("GetDevice: {e}"))
        }
        None => unsafe { enumr.GetDefaultAudioEndpoint(eCapture, eConsole) }
            .map_err(|e| format!("GetDefaultAudioEndpoint: {e}")),
    }
}

/// Run `f` against `IAudioEndpointVolume` for the given endpoint.
pub fn with_endpoint<T>(
    device_id: Option<&str>,
    f: impl FnOnce(&IAudioEndpointVolume) -> Result<T, String>,
) -> Result<T, String> {
    let dev = resolve_device(device_id)?;
    let endpoint: IAudioEndpointVolume = unsafe { dev.Activate(CLSCTX_ALL, None) }
        .map_err(|e| format!("Activate(IAudioEndpointVolume): {e}"))?;
    f(&endpoint)
}

fn read_device_identity(dev: &IMMDevice) -> Option<(String, String)> {
    unsafe {
        let id_pwstr = dev.GetId().ok()?;
        let id = id_pwstr.to_string().ok()?;
        CoTaskMemFree(Some(id_pwstr.as_ptr().cast()));
        let store = dev.OpenPropertyStore(STGM_READ).ok()?;
        let value = store.GetValue(&PKEY_DEVICE_FRIENDLY_NAME).ok()?;
        Some((id, value.to_string()))
    }
}

fn default_device_id(enumr: &IMMDeviceEnumerator, role: ERole) -> Option<String> {
    unsafe {
        let dev = enumr.GetDefaultAudioEndpoint(eCapture, role).ok()?;
        let id_pwstr = dev.GetId().ok()?;
        let id = id_pwstr.to_string().ok();
        CoTaskMemFree(Some(id_pwstr.as_ptr().cast()));
        id
    }
}

/// Read (muted, volume percent) from an already-activated endpoint.
fn read_endpoint_state(ep: &IAudioEndpointVolume) -> Result<(bool, i64), String> {
    unsafe {
        let muted = ep
            .GetMute()
            .map(bool::from)
            .map_err(|e| format!("GetMute: {e}"))?;
        let percent = ep
            .GetMasterVolumeLevelScalar()
            .map(|s| (s * 100.0).round() as i64)
            .map_err(|e| format!("GetMasterVolumeLevelScalar: {e}"))?;
        Ok((muted, percent))
    }
}

fn read_endpoint_volume_db(ep: &IAudioEndpointVolume) -> Result<f64, String> {
    unsafe { ep.GetMasterVolumeLevel() }
        .map(f64::from)
        .map_err(|e| format!("GetMasterVolumeLevel: {e}"))
}

/// Enumerate active capture endpoints with their own mute/volume state.
///
/// Per-device state costs one activation each, so callers should treat this as
/// a refresh operation rather than something to poll at high frequency.
pub fn list_capture_devices() -> Result<Vec<DeviceInfo>, String> {
    let enumr = enumerator()?;
    let default_console = default_device_id(&enumr, eConsole);
    let default_comms = default_device_id(&enumr, eCommunications);

    let collection: IMMDeviceCollection = unsafe { enumr.EnumAudioEndpoints(eCapture, DEVICE_STATE_ACTIVE) }
        .map_err(|e| format!("EnumAudioEndpoints: {e}"))?;
    let count = unsafe { collection.GetCount() }.map_err(|e| format!("GetCount: {e}"))?;

    let mut out = Vec::new();
    for index in 0..count {
        let Ok(dev) = (unsafe { collection.Item(index) }) else {
            continue;
        };
        let Some((id, name)) = read_device_identity(&dev) else {
            continue;
        };
        // An endpoint that refuses activation is still listed — it is plugged
        // in — but reports neutral state instead of dropping out of the list.
        let (muted, volume_percent) = unsafe { dev.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) }
            .ok()
            .and_then(|ep| read_endpoint_state(&ep).ok())
            .unwrap_or((false, 100));

        out.push(DeviceInfo {
            is_default: default_console.as_deref() == Some(id.as_str()),
            is_default_comms: default_comms.as_deref() == Some(id.as_str()),
            id,
            name,
            muted,
            volume_percent,
        });
    }
    Ok(out)
}

/// Outcome of a volume change: the resulting level in dB and, when the
/// zero-volume-mute policy toggled muting, the new mute state.
pub struct VolumeOutcome {
    pub volume_db: f64,
    pub muted: Option<bool>,
}

pub fn read_state(device_id: Option<&str>) -> Result<(bool, i64, f64), String> {
    with_endpoint(device_id, |ep| {
        let (muted, percent) = read_endpoint_state(ep)?;
        let db = read_endpoint_volume_db(ep)?;
        Ok((muted, percent, db))
    })
}

/// Read every field `get_initial_state` needs in one endpoint activation.
pub fn read_details(device_id: Option<&str>) -> Result<EndpointDetails, String> {
    with_endpoint(device_id, |ep| unsafe {
        let (muted, volume_percent) = read_endpoint_state(ep)?;
        let volume_db = read_endpoint_volume_db(ep)?;

        let mut min_db = 0.0f32;
        let mut max_db = 0.0f32;
        let mut increment_db = 0.0f32;
        ep.GetVolumeRange(&mut min_db, &mut max_db, &mut increment_db)
            .map_err(|e| format!("GetVolumeRange: {e}"))?;

        let channel_count = ep.GetChannelCount().unwrap_or(1);
        let balance = if channel_count >= 2 {
            let left = ep.GetChannelVolumeLevelScalar(0).unwrap_or(1.0);
            let right = ep.GetChannelVolumeLevelScalar(1).unwrap_or(1.0);
            balance_from_channels(left, right)
        } else {
            0
        };

        Ok(EndpointDetails {
            muted,
            volume_percent,
            volume_db,
            range: VolumeRange {
                min_db: f64::from(min_db),
                max_db: f64::from(max_db),
                increment_db: f64::from(increment_db),
            },
            channel_count,
            balance,
        })
    })
}

pub fn set_mute(device_id: Option<&str>, muted: bool) -> Result<(), String> {
    with_endpoint(device_id, |ep| unsafe {
        ep.SetMute(muted, std::ptr::null())
            .map_err(|e| format!("SetMute: {e}"))
    })
}

pub fn toggle_mute(device_id: Option<&str>) -> Result<bool, String> {
    with_endpoint(device_id, |ep| unsafe {
        let current = ep
            .GetMute()
            .map(bool::from)
            .map_err(|e| format!("GetMute: {e}"))?;
        ep.SetMute(!current, std::ptr::null())
            .map_err(|e| format!("SetMute: {e}"))?;
        Ok(!current)
    })
}

pub fn set_volume_percent_ex(
    device_id: Option<&str>,
    percent: i64,
    zero_mutes: bool,
) -> Result<VolumeOutcome, String> {
    let clamped = percent.clamp(0, 100);
    let target = (clamped as f32) / 100.0;
    with_endpoint(device_id, |ep| unsafe {
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

        Ok(VolumeOutcome {
            volume_db: read_endpoint_volume_db(ep)?,
            muted,
        })
    })
}

/// Sample the peak level of the endpoint, 0.0..=1.0.
pub fn read_peak(device_id: Option<&str>) -> Result<f32, String> {
    let key = device_id.map(str::to_string);
    METER_CACHE.with(|cache| {
        let mut slot = cache.borrow_mut();
        let stale = match slot.as_ref() {
            Some((cached, _)) => *cached != key,
            None => true,
        };
        if stale {
            *slot = None;
        }
        if slot.is_none() {
            let dev = resolve_device(device_id)?;
            let meter: IAudioMeterInformation = unsafe { dev.Activate(CLSCTX_ALL, None) }
                .map_err(|e| format!("Activate(IAudioMeterInformation): {e}"))?;
            *slot = Some((key, meter));
        }

        let peak = {
            let (_, meter) = slot.as_ref().expect("meter cache primed above");
            unsafe { meter.GetPeakValue() }
        };

        match peak {
            Ok(value) => Ok(value.clamp(0.0, 1.0)),
            Err(e) => {
                // A device that went away invalidates the cached interface; the
                // next tick re-acquires (or fails cleanly).
                *slot = None;
                Err(format!("GetPeakValue: {e}"))
            }
        }
    })
}

/// Split a -100..=100 balance into per-channel scalars.
pub fn channels_for_balance(balance: i64) -> (f32, f32) {
    let b = balance.clamp(-100, 100) as f32 / 100.0;
    let left = if b <= 0.0 { 1.0 } else { 1.0 - b };
    let right = if b >= 0.0 { 1.0 } else { 1.0 + b };
    (left, right)
}

/// Inverse of [`channels_for_balance`], tolerant of levels some driver already
/// normalised differently.
fn balance_from_channels(left: f32, right: f32) -> i64 {
    let raw = if left <= right {
        (left - 1.0) * 100.0
    } else {
        (1.0 - right) * 100.0
    };
    (raw as i64).clamp(-100, 100)
}

pub fn set_balance(device_id: Option<&str>, balance: i64) -> Result<i64, String> {
    let (left, right) = channels_for_balance(balance);
    let clamped = balance.clamp(-100, 100);
    with_endpoint(device_id, |ep| unsafe {
        if ep.GetChannelCount().map_err(|e| format!("GetChannelCount: {e}"))? < 2 {
            return Ok(0);
        }
        ep.SetChannelVolumeLevelScalar(0, left, std::ptr::null())
            .map_err(|e| format!("SetChannelVolumeLevelScalar(0): {e}"))?;
        ep.SetChannelVolumeLevelScalar(1, right, std::ptr::null())
            .map_err(|e| format!("SetChannelVolumeLevelScalar(1): {e}"))?;
        Ok(clamped)
    })
}

/// Move the Windows default capture endpoint (all three roles).
pub fn set_default_device(device_id: &str) -> Result<(), String> {
    policy::set_default_endpoint(device_id)
}

/// Applications holding the microphone, as base image names. Re-exported from
/// [`super::sessions`] so call sites only depend on this module.
pub fn active_processes(device_id: Option<&str>) -> Result<Vec<String>, String> {
    super::sessions::active_processes(device_id)
}

pub fn watch_devices(app: tauri::AppHandle) -> Result<(), String> {
    super::notify::start(app)
}

/// One probe of the whole device stack.
///
/// Called from the prewarm thread, so this thread's COM apartment — and the two
/// enumerations that dominate the cost — are paid for while the webview is
/// still booting rather than while the user is waiting for a first frame.
pub fn read_snapshot(fallback_percent: i64, device_id: Option<&str>) -> Snapshot {
    Snapshot {
        details: read_details(device_id).unwrap_or(EndpointDetails {
            muted: false,
            volume_percent: fallback_percent,
            volume_db: -96.0,
            ..Default::default()
        }),
        devices: list_capture_devices().unwrap_or_default(),
        in_use: super::sessions::active_processes(device_id).unwrap_or_default(),
    }
}
