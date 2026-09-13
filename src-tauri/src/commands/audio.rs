//! Audio commands: the initial state, mute/volume, device selection and the
//! meter gate.
//!
//! These are thin on purpose. Every mutation goes through [`crate::actions`] so
//! that the window, the hotkey and the tray cannot drift apart; what is left
//! here is argument validation and shaping the results for the UI.

use crate::audio::{
    win as audio_win, AudioController, DeviceInfo, EndpointDetails, Status, VolumeRange,
};
use crate::config::ConfigState;
use crate::hotkey;
use crate::{actions, monitor};
use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InitialState {
    pub muted: bool,
    pub volume_percent: i64,
    pub volume_db: f64,
    pub volume_range: VolumeRange,
    pub channel_count: u32,
    pub devices: Vec<DeviceInfo>,
    /// Endpoint the controls act on; `null` follows the system default.
    pub selected_device_id: Option<String>,
    pub selected_device_name: Option<String>,
    /// Applications currently holding the microphone.
    pub in_use: Vec<String>,
    pub hotkey: String,
    /// Set when the configured hotkey could not be registered (usually because
    /// another application owns it). The settings panel surfaces this instead of
    /// pretending the binding works.
    pub hotkey_error: Option<String>,
    pub language: String,
    pub theme: String,
    pub start_minimized_to_tray: bool,
    pub minimize_to_tray_on_close: bool,
    pub volume_zero_mutes: bool,
    pub normalize_volume: bool,
    pub reference_volume_percent: i64,
    pub show_osd: bool,
    pub show_meter: bool,
    pub scroll_step_percent: i64,
    pub balance: i64,
    /// Named without the `_s` suffix on purpose: serde's camelCase rename
    /// would otherwise produce `pollIntervalS`, which nothing reads.
    pub poll_interval: f64,
    pub autostart: bool,
    pub config_path: String,
    pub version: String,
    pub platform_supported: bool,
}

#[tauri::command(async)]
pub fn get_initial_state(
    app: AppHandle,
    audio: State<'_, AudioController>,
    config: State<'_, ConfigState>,
) -> Result<InitialState, String> {
    let cfg = config.get()?;
    let platform_supported = cfg!(windows);
    let target = cfg.selected_device_id.clone();

    // The startup probe normally beat the frontend here, in which case the
    // device stack is not touched at all on this call. Fall back to reading it
    // inline when the snapshot is missing, stale, or invalidated by an audio
    // change that happened while the webview was loading.
    let (details, devices, in_use) = match audio.take_prewarm() {
        Some(snapshot) => (snapshot.details, snapshot.devices, snapshot.in_use),
        None if platform_supported => (
            audio_win::read_details(target.as_deref()).unwrap_or(EndpointDetails {
                muted: false,
                volume_percent: cfg.last_volume_percent,
                volume_db: -96.0,
                ..Default::default()
            }),
            audio_win::list_capture_devices().unwrap_or_default(),
            audio_win::active_processes(target.as_deref()).unwrap_or_default(),
        ),
        None => (
            EndpointDetails {
                muted: false,
                volume_percent: cfg.last_volume_percent,
                volume_db: -96.0,
                ..Default::default()
            },
            Vec::<DeviceInfo>::new(),
            Vec::new(),
        ),
    };

    {
        let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
        inner.last_known_muted = details.muted;
        inner.last_known_volume_percent = details.volume_percent;
        inner.target_device_id = target.clone();
        inner.last_in_use = in_use.clone();
    }

    let selected_device_name = devices
        .iter()
        .find(|d| Some(&d.id) == target.as_ref())
        .map(|d| d.name.clone());

    Ok(InitialState {
        muted: details.muted,
        volume_percent: details.volume_percent,
        volume_db: details.volume_db,
        volume_range: details.range,
        channel_count: details.channel_count,
        devices,
        selected_device_id: target,
        selected_device_name,
        in_use,
        hotkey: cfg.hotkey,
        hotkey_error: hotkey::registration_error(&app),
        language: cfg.language,
        theme: cfg.theme,
        start_minimized_to_tray: cfg.start_minimized_to_tray,
        minimize_to_tray_on_close: cfg.minimize_to_tray_on_close,
        volume_zero_mutes: cfg.volume_zero_mutes,
        normalize_volume: cfg.normalize_volume,
        reference_volume_percent: cfg.reference_volume_percent,
        show_osd: cfg.show_osd,
        show_meter: cfg.show_meter,
        scroll_step_percent: cfg.scroll_step_percent,
        balance: details.balance,
        poll_interval: cfg.poll_interval_s,
        autostart: app.autolaunch().is_enabled().unwrap_or(false),
        config_path: crate::config::config_path(&app)
            .map(|p| p.display().to_string())
            .unwrap_or_default(),
        version: app.package_info().version.to_string(),
        platform_supported,
    })
}

#[tauri::command(async)]
pub fn toggle_mute(app: AppHandle) -> Result<bool, String> {
    // Silent: the window is on screen, so the overlay would be a duplicate.
    actions::toggle_mute(&app, actions::Feedback::Silent)
}

#[tauri::command(async)]
pub fn set_mute(app: AppHandle, muted: bool) -> Result<(), String> {
    actions::set_mute(&app, muted, actions::Feedback::Silent)
}

#[tauri::command(async)]
pub fn set_volume(app: AppHandle, percent: i64) -> Result<f64, String> {
    actions::set_volume(&app, percent, actions::Feedback::Silent)
}

/// Step the volume, for the in-window arrow keys.
#[tauri::command(async)]
pub fn nudge_volume(app: AppHandle, delta: i64) -> Result<i64, String> {
    actions::nudge_volume(&app, delta, actions::Feedback::Silent)
}

#[tauri::command(async)]
pub fn list_devices() -> Result<Vec<DeviceInfo>, String> {
    audio_win::list_capture_devices()
}

/// Choose which endpoint the controls act on. `None` follows the system
/// default.
///
/// This does *not* change what Windows considers the default device — see
/// [`set_default_device`] for that. Pinning control without moving the system
/// default is the more common need, and the only one that works cleanly for
/// every role.
#[tauri::command(async)]
pub fn set_target_device(
    app: AppHandle,
    device_id: Option<String>,
    audio: State<'_, AudioController>,
    config: State<'_, ConfigState>,
) -> Result<EndpointDetails, String> {
    config.update(&app, |c| c.selected_device_id = device_id.clone())?;

    let details = audio_win::read_details(device_id.as_deref()).unwrap_or_default();
    {
        let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
        inner.target_device_id = device_id;
    }
    monitor::publish(
        &app,
        &audio,
        &Status {
            muted: details.muted,
            volume_percent: details.volume_percent,
            volume_db: details.volume_db,
        },
    );
    // The new endpoint brings its own balance, so push the config in step or the
    // next write would apply the previous device's setting to this one.
    config.update(&app, |c| c.balance = details.balance)?;
    Ok(details)
}

/// Move the Windows default capture endpoint (all three roles).
#[tauri::command(async)]
pub fn set_default_device(app: AppHandle, device_id: String) -> Result<Vec<DeviceInfo>, String> {
    audio_win::set_default_device(&device_id)?;
    Ok(monitor::publish_devices(&app))
}

/// Turn the peak meter on or off, per the user's preference.
///
/// The window's own visibility is not part of this: the backend tracks it and
/// stops sampling while the window is hidden (see `monitor.rs`).
#[tauri::command]
pub fn set_meter_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    monitor::set_meter_enabled(&app, enabled);
    Ok(())
}

/// Apply a stereo balance. Returns what was actually applied — 0 on a mono
/// endpoint, where the control has no meaning.
#[tauri::command(async)]
pub fn set_balance(app: AppHandle, balance: i64) -> Result<i64, String> {
    actions::set_balance(&app, balance)
}
