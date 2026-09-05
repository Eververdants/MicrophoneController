use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;

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
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

/// A corrupt or unreadable config must not brick the app (every command loads
/// the config), so fall back to defaults and keep the broken file as .bak.
pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let data = match fs::read_to_string(&path) {
        Ok(data) => data,
        Err(e) => {
            log::warn!("config.json unreadable ({e}); using defaults");
            return Ok(AppConfig::default());
        }
    };
    match serde_json::from_str(&data) {
        Ok(cfg) => Ok(cfg),
        Err(e) => {
            log::warn!(
                "config.json invalid ({e}); using defaults, original kept as config.json.bak"
            );
            let _ = fs::rename(&path, path.with_extension("json.bak"));
            Ok(AppConfig::default())
        }
    }
}

/// Write to a sibling temp file and rename, so a crash mid-write cannot leave
/// a truncated config.json behind.
pub fn save_config(app: &AppHandle, cfg: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let data = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, data).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

/// Process-lifetime config cache. Commands read this instead of re-reading the
/// file per invocation; setting changes save through [`Self::update`], while
/// high-frequency volume ticks only mutate the cache and are persisted on exit.
pub struct ConfigState {
    cfg: Mutex<AppConfig>,
}

impl ConfigState {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        Ok(Self {
            cfg: Mutex::new(load_config(app)?),
        })
    }

    pub fn get(&self) -> Result<AppConfig, String> {
        self.cfg
            .lock()
            .map(|c| c.clone())
            .map_err(|e| e.to_string())
    }

    /// Mutate the cached config without touching disk.
    pub fn mutate(&self, f: impl FnOnce(&mut AppConfig)) -> Result<AppConfig, String> {
        let mut cfg = self.cfg.lock().map_err(|e| e.to_string())?;
        f(&mut cfg);
        Ok(cfg.clone())
    }

    /// Mutate the cached config and persist it (for rare, user-initiated
    /// setting changes where durability matters).
    pub fn update(&self, app: &AppHandle, f: impl FnOnce(&mut AppConfig)) -> Result<(), String> {
        let cfg = self.mutate(f)?;
        save_config(app, &cfg)
    }

    pub fn save(&self, app: &AppHandle) -> Result<(), String> {
        let cfg = self.cfg.lock().map_err(|e| e.to_string())?;
        save_config(app, &cfg)
    }
}
