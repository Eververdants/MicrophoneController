//! Settings commands.
//!
//! Two rules hold throughout this module:
//!
//! * A setting that can fail is validated *before* it is persisted, so a
//!   rejected change never becomes the stored truth.
//! * Anything that changes the audio backend is applied immediately rather than
//!   at next launch, because "it works after a restart" is indistinguishable
//!   from "it is broken" for most users.

use crate::audio::{win as audio_win, AudioController};
use crate::config::{AppConfig, ConfigState};
use crate::{monitor, tray};
use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

#[tauri::command(async)]
pub fn set_hotkey(
    app: AppHandle,
    hotkey: String,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    // Validate + register before persisting, so a bad rebinding is rejected
    // without losing the previous hotkey. An empty string is a valid request:
    // it clears the binding.
    crate::hotkey::set_hotkey(&app, &hotkey)?;
    config.update(&app, |c| c.hotkey = hotkey)
}

#[tauri::command(async)]
pub fn set_language(
    app: AppHandle,
    language: String,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.language = language)?;
    // The tray is built by Rust and carries its own labels.
    tray::refresh_labels(&app);
    Ok(())
}

#[tauri::command(async)]
pub fn set_theme(app: AppHandle, value: String, config: State<'_, ConfigState>) -> Result<(), String> {
    config.update(&app, |c| c.theme = value)
}

#[tauri::command(async)]
pub fn set_start_minimized(
    app: AppHandle,
    value: bool,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.start_minimized_to_tray = value)
}

#[tauri::command(async)]
pub fn set_close_to_tray(
    app: AppHandle,
    value: bool,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.minimize_to_tray_on_close = value)
}

#[tauri::command(async)]
pub fn set_volume_zero_mutes(
    app: AppHandle,
    value: bool,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.volume_zero_mutes = value)
}

#[tauri::command(async)]
pub fn set_normalize(
    app: AppHandle,
    value: bool,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.normalize_volume = value)
}

#[tauri::command(async)]
pub fn set_reference_volume(
    app: AppHandle,
    percent: i64,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.reference_volume_percent = percent.clamp(0, 100))
}

#[tauri::command(async)]
pub fn set_show_osd(
    app: AppHandle,
    value: bool,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.show_osd = value)
}

#[tauri::command(async)]
pub fn set_show_meter(
    app: AppHandle,
    value: bool,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.show_meter = value)
}

#[tauri::command(async)]
pub fn set_scroll_step(
    app: AppHandle,
    percent: i64,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.scroll_step_percent = percent.clamp(1, 25))
}

/// How often the monitor re-reads the endpoint state, in seconds.
///
/// Takes effect on the monitor's next tick: it re-reads the value each round
/// rather than caching it at startup.
#[tauri::command(async)]
pub fn set_poll_interval(
    app: AppHandle,
    seconds: f64,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    config.update(&app, |c| c.poll_interval_s = seconds.clamp(0.25, 60.0))
}

#[tauri::command(async)]
pub fn set_autostart(app: AppHandle, value: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    let result = if value {
        manager.enable()
    } else {
        manager.disable()
    };
    result.map_err(|e| format!("could not change the autostart entry: {e}"))
}

/// Write the current config to `path`.
///
/// The path comes from a native save dialog on the frontend; the file I/O stays
/// on this side so the webview never needs filesystem access.
#[tauri::command(async)]
pub fn export_config(path: String, config: State<'_, ConfigState>) -> Result<(), String> {
    let cfg = config.get()?;
    let json = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("could not write the file: {e}"))
}

/// Read a config file, validate it and apply it.
///
/// Returns the applied config so the frontend can resync everything the backend
/// does not render itself (theme, language, layout-affecting options).
#[tauri::command(async)]
pub fn import_config(
    app: AppHandle,
    path: String,
    config: State<'_, ConfigState>,
    audio: State<'_, AudioController>,
) -> Result<AppConfig, String> {
    let json = std::fs::read_to_string(&path).map_err(|e| format!("could not read the file: {e}"))?;
    let parsed: AppConfig =
        serde_json::from_str(&json).map_err(|e| format!("not a valid config file: {e}"))?;
    let applied = config.replace(&app, parsed)?;
    apply(&app, &applied, &audio);
    Ok(applied)
}

/// Restore every setting to its default and apply it immediately.
#[tauri::command(async)]
pub fn reset_config(
    app: AppHandle,
    config: State<'_, ConfigState>,
    audio: State<'_, AudioController>,
) -> Result<AppConfig, String> {
    let applied = config.replace(&app, AppConfig::default())?;
    apply(&app, &applied, &audio);
    Ok(applied)
}

/// Push a freshly-replaced config into the subsystems that cached it.
fn apply(app: &AppHandle, cfg: &AppConfig, audio: &AudioController) {
    if let Ok(mut inner) = audio.inner.lock() {
        inner.target_device_id = cfg.selected_device_id.clone();
    }

    // The hotkey is a shared OS resource, so a config that names a taken
    // combination is reported rather than silently ignored.
    if let Err(e) = crate::hotkey::set_hotkey(app, &cfg.hotkey) {
        log::warn!("imported config hotkey rejected: {e}");
    }

    if let Err(e) = audio_win::set_balance(cfg.selected_device_id.as_deref(), cfg.balance) {
        log::warn!("imported config balance not applied: {e}");
    }

    tray::refresh_labels(app);
    let devices = monitor::publish_devices(app);
    log::info!("config applied ({} capture devices)", devices.len());
}
