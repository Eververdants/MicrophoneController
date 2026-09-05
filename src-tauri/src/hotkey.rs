use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

const DEFAULT_HOTKEY: &str = "F8";

pub struct HotkeyState {
    pub current: Mutex<String>,
}

pub fn init(app: &AppHandle) -> Result<(), String> {
    let state = HotkeyState {
        current: Mutex::new(DEFAULT_HOTKEY.into()),
    };
    app.manage(state);
    Ok(())
}

pub fn register_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let state: State<HotkeyState> = app.state();
    let mut current = state.current.lock().map_err(|e| e.to_string())?;
    *current = hotkey.to_string();
    Ok(())
}

pub fn get_hotkey(app: &AppHandle) -> Result<String, String> {
    let state: State<HotkeyState> = app.state();
    let current = state.current.lock().map_err(|e| e.to_string())?;
    Ok(current.clone())
}
