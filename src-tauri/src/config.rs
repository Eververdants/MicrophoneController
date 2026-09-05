use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default = "default_hotkey")]
    pub hotkey: String,
    #[serde(default = "default_poll_interval")]
    pub poll_interval_s: f64,
    #[serde(default)]
    pub start_minimized_to_tray: bool,
    #[serde(default = "default_true")]
    pub minimize_to_tray_on_close: bool,
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default)]
    pub selected_device_id: Option<String>,
    #[serde(default = "default_volume")]
    pub last_volume_percent: i64,
    #[serde(default)]
    pub volume_zero_mutes: bool,
    #[serde(default)]
    pub normalize_volume: bool,
    #[serde(default = "default_reference_volume")]
    pub reference_volume_percent: i64,
}

fn default_hotkey() -> String {
    "F8".into()
}
fn default_poll_interval() -> f64 {
    1.0
}
fn default_true() -> bool {
    true
}
fn default_language() -> String {
    "zh-CN".into()
}
fn default_volume() -> i64 {
    100
}
fn default_reference_volume() -> i64 {
    50
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            hotkey: default_hotkey(),
            poll_interval_s: default_poll_interval(),
            start_minimized_to_tray: false,
            minimize_to_tray_on_close: default_true(),
            language: default_language(),
            selected_device_id: None,
            last_volume_percent: default_volume(),
            volume_zero_mutes: false,
            normalize_volume: false,
            reference_volume_percent: default_reference_volume(),
        }
    }
}

pub fn config_path(_app: &AppHandle) -> Result<PathBuf, String> {
    let base = dirs::data_dir().ok_or("cannot resolve data dir")?;
    let dir = base.join("MicrophoneController");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir.join("config.json"))
}

pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let cfg: AppConfig = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    Ok(cfg)
}

pub fn save_config(app: &AppHandle, cfg: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let data = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(())
}
