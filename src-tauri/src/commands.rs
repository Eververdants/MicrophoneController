use crate::audio::{win as audio_win, AudioController, DeviceInfo};
use crate::config::{self, AppConfig};
use tauri::{AppHandle, State};

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

    #[tauri::command]
    pub fn get_initial_state(
        app: AppHandle,
        audio: State<'_, AudioController>,
    ) -> Result<InitialState, String> {
        let cfg = config::load_config(&app)?;

        let platform_supported = cfg!(windows);

        let (muted, volume_percent, volume_db, devices) = if platform_supported {
            let muted = audio_win::is_muted().unwrap_or(false);
            let vol = audio_win::get_volume_percent().unwrap_or(cfg.last_volume_percent);
            let db = audio_win::get_volume_db().unwrap_or(-96.0);
            let devices = audio_win::list_capture_devices().unwrap_or_default();
            (muted, vol, db, devices)
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

        Ok(InitialState {
            muted,
            volume_percent,
            volume_db: volume_db,
            devices,
            selected_device_id: cfg.selected_device_id,
            selected_device_name: None,
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

    #[tauri::command]
    pub fn toggle_mute(
        app: AppHandle,
        audio: State<'_, AudioController>,
    ) -> Result<bool, String> {
        let cfg = config::load_config(&app)?;
        let new_state = audio_win::toggle_mute()?;
        {
            let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
            inner.last_known_muted = new_state;
        }
        let _ = app.emit("audio:status", new_state);
        Ok(new_state)
    }

    #[tauri::command]
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

    #[tauri::command]
    pub fn set_volume(
        app: AppHandle,
        percent: i64,
        audio: State<'_, AudioController>,
    ) -> Result<(), String> {
        let clamped = percent.clamp(0, 100);
        audio_win::set_volume_percent(clamped)?;

        let mut cfg = config::load_config(&app)?;
        cfg.last_volume_percent = clamped;
        if cfg.normalize_volume {
            cfg.reference_volume_percent = clamped;
        }
        config::save_config(&app, &cfg)?;

        if cfg.volume_zero_mutes {
            if clamped <= 0 && !audio_win::is_muted().unwrap_or(false) {
                audio_win::set_mute(true)?;
                let _ = app.emit("audio:status", true);
            } else if clamped > 0 && audio_win::is_muted().unwrap_or(false) {
                audio_win::set_mute(false)?;
                let _ = app.emit("audio:status", false);
            }
        }

        {
            let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
            inner.last_known_volume_percent = clamped;
        }

        Ok(())
    }

    #[tauri::command]
    pub fn list_devices() -> Result<Vec<DeviceInfo>, String> {
        audio_win::list_capture_devices()
    }

    #[tauri::command]
    pub fn select_device(
        app: AppHandle,
        device_id: Option<String>,
    ) -> Result<(), String> {
        audio_win::select_device(device_id.as_deref())?;
        let mut cfg = config::load_config(&app)?;
        cfg.selected_device_id = device_id;
        config::save_config(&app, &cfg)?;
        Ok(())
    }
}

pub mod config {
    use super::*;

    fn update(app: &AppHandle, f: impl FnOnce(&mut AppConfig)) -> Result<(), String> {
        let mut cfg = config::load_config(app)?;
        f(&mut cfg);
        config::save_config(app, &cfg)
    }

    #[tauri::command]
    pub fn set_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
        update(app, |c| c.hotkey = hotkey)
    }

    #[tauri::command]
    pub fn set_language(app: AppHandle, language: String) -> Result<(), String> {
        update(app, |c| c.language = language)
    }

    #[tauri::command]
    pub fn set_start_minimized(app: AppHandle, value: bool) -> Result<(), String> {
        update(app, |c| c.start_minimized_to_tray = value)
    }

    #[tauri::command]
    pub fn set_close_to_tray(app: AppHandle, value: bool) -> Result<(), String> {
        update(app, |c| c.minimize_to_tray_on_close = value)
    }

    #[tauri::command]
    pub fn set_volume_zero_mutes(app: AppHandle, value: bool) -> Result<(), String> {
        update(app, |c| c.volume_zero_mutes = value)
    }

    #[tauri::command]
    pub fn set_normalize(app: AppHandle, value: bool) -> Result<(), String> {
        update(app, |c| c.normalize_volume = value)
    }

    #[tauri::command]
    pub fn set_reference_volume(app: AppHandle, percent: i64) -> Result<(), String> {
        update(app, |c| c.reference_volume_percent = percent.clamp(0, 100))
    }
}
