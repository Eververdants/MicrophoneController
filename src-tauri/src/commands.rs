use crate::audio::{win as audio_win, AudioController, DeviceInfo};
use crate::config::ConfigState;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InitialState {
    pub muted: bool,
    pub volume_percent: i64,
    pub volume_db: f64,
    pub devices: Vec<DeviceInfo>,
    pub selected_device_id: Option<String>,
    pub selected_device_name: Option<String>,
    pub hotkey: String,
    pub language: String,
    pub start_minimized_to_tray: bool,
    pub minimize_to_tray_on_close: bool,
    pub volume_zero_mutes: bool,
    pub normalize_volume: bool,
    pub reference_volume_percent: i64,
    pub platform_supported: bool,
}

pub mod audio {
    use super::*;

    #[tauri::command(async)]
    pub fn get_initial_state(
        audio: State<'_, AudioController>,
        config: State<'_, ConfigState>,
    ) -> Result<InitialState, String> {
        let cfg = config.get()?;

        let platform_supported = cfg!(windows);

        let (muted, volume_percent, volume_db, devices) = if platform_supported {
            let (muted, percent, db) = audio_win::with_default_endpoint(
                audio_win::read_endpoint_state,
            )
            .unwrap_or((false, cfg.last_volume_percent, -96.0));
            let devices = audio_win::list_capture_devices().unwrap_or_default();
            (muted, percent, db, devices)
        } else {
            (
                false,
                cfg.last_volume_percent,
                -96.0,
                Vec::<DeviceInfo>::new(),
            )
        };

        {
            let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
            inner.last_known_muted = muted;
            inner.last_known_volume_percent = volume_percent;
        }

        let selected_device_name = devices
            .iter()
            .find(|d| Some(&d.id) == cfg.selected_device_id.as_ref())
            .map(|d| d.name.clone());

        Ok(InitialState {
            muted,
            volume_percent,
            volume_db,
            devices,
            selected_device_id: cfg.selected_device_id,
            selected_device_name,
            hotkey: cfg.hotkey,
            language: cfg.language,
            start_minimized_to_tray: cfg.start_minimized_to_tray,
            minimize_to_tray_on_close: cfg.minimize_to_tray_on_close,
            volume_zero_mutes: cfg.volume_zero_mutes,
            normalize_volume: cfg.normalize_volume,
            reference_volume_percent: cfg.reference_volume_percent,
            platform_supported,
        })
    }

    #[tauri::command(async)]
    pub fn toggle_mute(
        app: AppHandle,
        audio: State<'_, AudioController>,
    ) -> Result<bool, String> {
        let new_state = audio_win::toggle_mute()?;
        {
            let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
            inner.last_known_muted = new_state;
        }
        let _ = app.emit("audio:status", new_state);
        Ok(new_state)
    }

    #[tauri::command(async)]
    pub fn set_mute(
        app: AppHandle,
        muted: bool,
        audio: State<'_, AudioController>,
    ) -> Result<(), String> {
        audio_win::set_mute(muted)?;
        {
            let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
            inner.last_known_muted = muted;
        }
        let _ = app.emit("audio:status", muted);
        Ok(())
    }

    #[tauri::command(async)]
    pub fn set_volume(
        app: AppHandle,
        percent: i64,
        audio: State<'_, AudioController>,
        config: State<'_, ConfigState>,
    ) -> Result<f64, String> {
        let clamped = percent.clamp(0, 100);

        // Cache-only: last volume is persisted on app exit, not on every
        // slider tick.
        let cfg = config.mutate(|c| {
            c.last_volume_percent = clamped;
            if c.normalize_volume {
                c.reference_volume_percent = clamped;
            }
        })?;

        let outcome = audio_win::set_volume_percent_ex(clamped, cfg.volume_zero_mutes)?;
        if let Some(muted) = outcome.muted {
            let _ = app.emit("audio:status", muted);
        }

        {
            let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
            inner.last_known_volume_percent = clamped;
            if let Some(muted) = outcome.muted {
                inner.last_known_muted = muted;
            }
        }

        Ok(outcome.volume_db)
    }

    #[tauri::command(async)]
    pub fn list_devices() -> Result<Vec<DeviceInfo>, String> {
        audio_win::list_capture_devices()
    }

    #[tauri::command(async)]
    pub fn select_device(
        app: AppHandle,
        device_id: Option<String>,
        config: State<'_, ConfigState>,
    ) -> Result<(), String> {
        audio_win::select_device(device_id.as_deref())?;
        config.update(&app, |cfg| cfg.selected_device_id = device_id)?;
        Ok(())
    }
}

pub mod config {
    use super::*;

    #[tauri::command(async)]
    pub fn set_hotkey(
        app: AppHandle,
        hotkey: String,
        config: State<'_, ConfigState>,
    ) -> Result<(), String> {
        // Validate + register before persisting, so a bad rebinding is
        // rejected without losing the previous hotkey.
        crate::hotkey::set_hotkey(&app, &hotkey)?;
        config.update(&app, |c| c.hotkey = hotkey)
    }

    #[tauri::command(async)]
    pub fn set_language(
        app: AppHandle,
        language: String,
        config: State<'_, ConfigState>,
    ) -> Result<(), String> {
        config.update(&app, |c| c.language = language)
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
}
