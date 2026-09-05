//! Global hotkey registration via tauri-plugin-global-shortcut.
//!
//! The plugin's handler (wired in main.rs) toggles mute; this module tracks
//! the currently registered shortcut and swaps registrations when the user
//! rebinds it.

use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub struct HotkeyState {
    current: Mutex<Shortcut>,
}

fn parse(hotkey: &str) -> Result<Shortcut, String> {
    hotkey
        .parse::<Shortcut>()
        .map_err(|e| format!("invalid hotkey '{hotkey}': {e}"))
}

/// Register the configured shortcut at startup. Registration failures are not
/// fatal (the key may be taken by another app) but are surfaced to the log.
pub fn init(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let shortcut = parse(hotkey)?;
    app.manage(HotkeyState {
        current: Mutex::new(shortcut.clone()),
    });
    if let Err(e) = app.global_shortcut().register(shortcut) {
        log::warn!("could not register global hotkey '{hotkey}': {e}");
    }
    Ok(())
}

/// Swap the registered shortcut. The new one is registered before the old one
/// is released, so a failed rebind leaves the old hotkey working.
pub fn set_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let new_shortcut = parse(hotkey)?;
    let state: State<HotkeyState> = app.state();
    let mut current = state.current.lock().map_err(|e| e.to_string())?;
    if *current == new_shortcut {
        return Ok(());
    }
    let shortcuts = app.global_shortcut();
    shortcuts
        .register(new_shortcut.clone())
        .map_err(|e| format!("could not register hotkey '{hotkey}': {e}"))?;
    let _ = shortcuts.unregister(current.clone());
    *current = new_shortcut;
    Ok(())
}

/// Shared mute toggle for the plugin handler and the toggle_mute command.
pub fn toggle_mute(app: &AppHandle) -> Result<bool, String> {
    let new_state = crate::audio::win::toggle_mute()?;
    let audio = app.state::<crate::audio::AudioController>();
    {
        let mut inner = audio.inner.lock().map_err(|e| e.to_string())?;
        inner.last_known_muted = new_state;
    }
    let _ = app.emit("audio:status", new_state);
    Ok(new_state)
}
