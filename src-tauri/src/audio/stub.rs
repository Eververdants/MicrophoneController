//! Non-Windows stand-in for [`super::win`].
//!
//! The app shell builds and runs everywhere; only the audio controls are
//! unavailable off Windows. The frontend reads `platformSupported` from
//! `get_initial_state` and disables those controls, so these stubs exist to
//! keep the call sites honest rather than to be reached in practice.

use super::{DeviceInfo, EndpointDetails, Snapshot, VolumeRange};

const UNSUPPORTED: &str = "audio control is not supported on this platform";

pub fn ensure_com() {}

pub fn list_capture_devices() -> Result<Vec<DeviceInfo>, String> {
    Ok(Vec::new())
}

pub fn read_state(_device_id: Option<&str>) -> Result<(bool, i64, f64), String> {
    Err(UNSUPPORTED.into())
}

pub fn read_details(_device_id: Option<&str>) -> Result<EndpointDetails, String> {
    Err(UNSUPPORTED.into())
}

pub fn set_mute(_device_id: Option<&str>, _muted: bool) -> Result<(), String> {
    Err(UNSUPPORTED.into())
}

pub fn toggle_mute(_device_id: Option<&str>) -> Result<bool, String> {
    Err(UNSUPPORTED.into())
}

pub fn set_volume_percent_ex(
    _device_id: Option<&str>,
    _percent: i64,
    _zero_mutes: bool,
) -> Result<VolumeOutcome, String> {
    Err(UNSUPPORTED.into())
}

pub fn read_peak(_device_id: Option<&str>) -> Result<f32, String> {
    Err(UNSUPPORTED.into())
}

pub fn set_balance(_device_id: Option<&str>, _balance: i64) -> Result<i64, String> {
    Err(UNSUPPORTED.into())
}

pub fn set_default_device(_device_id: &str) -> Result<(), String> {
    Err(UNSUPPORTED.into())
}

pub fn active_processes(_device_id: Option<&str>) -> Result<Vec<String>, String> {
    Ok(Vec::new())
}

pub fn watch_devices(_app: tauri::AppHandle) -> Result<(), String> {
    Err(UNSUPPORTED.into())
}

pub fn read_snapshot(fallback_percent: i64, _device_id: Option<&str>) -> Snapshot {
    Snapshot {
        details: EndpointDetails {
            muted: false,
            volume_percent: fallback_percent,
            volume_db: -96.0,
            range: VolumeRange::default(),
            channel_count: 1,
        },
        devices: Vec::new(),
        in_use: Vec::new(),
    }
}

/// Mirrors the Windows helper so call sites compile unchanged.
pub struct VolumeOutcome {
    pub volume_db: f64,
    pub muted: Option<bool>,
}
