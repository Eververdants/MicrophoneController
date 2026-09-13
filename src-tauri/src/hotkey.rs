//! Global hotkey registration.
//!
//! The plugin's handler (wired in `main.rs`) performs the action; this module
//! owns the registration lifecycle and — crucially — *reports failures upward*.
//!
//! A global shortcut is a shared, first-come-first-served resource. When the
//! combination is already taken, the honest outcome is "that did not work", not
//! a log line the user never sees while the settings panel claims success.

use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub struct HotkeyState {
    /// `None` when the user has cleared the hotkey: registering nothing is a
    /// valid, intentional configuration.
    current: Mutex<Option<Shortcut>>,
    /// Why the last registration attempt failed, for the settings panel.
    error: Mutex<Option<String>>,
}

fn parse(hotkey: &str) -> Result<Shortcut, String> {
    hotkey
        .trim()
        .parse::<Shortcut>()
        .map_err(|e| format!("invalid hotkey '{hotkey}': {e}"))
}

pub fn init(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    app.manage(HotkeyState {
        current: Mutex::new(None),
        error: Mutex::new(None),
    });
    // Registration failure is not fatal — the key may be taken by another app —
    // but it is remembered so the UI can say so.
    let _ = register(app, hotkey);
    Ok(())
}

/// Why the last registration attempt failed, if it did.
///
/// The *requested* binding lives in the config; this is only the complaint, so
/// a failed registration shows as "F8 — unavailable" rather than as an empty
/// field the user would read as "cleared".
pub fn registration_error(app: &AppHandle) -> Option<String> {
    let state: State<HotkeyState> = app.state();
    state.error.lock().ok().and_then(|e| e.clone())
}

fn record(app: &AppHandle, error: Option<String>) {
    let state: State<HotkeyState> = app.state();
    // Bound to a local rather than locked inline: a `State` borrows the app, and
    // a temporary guard in the tail position would outlive it.
    let mut slot = match state.error.lock() {
        Ok(slot) => slot,
        Err(_) => return,
    };
    *slot = error;
}

/// Swap the registered shortcut.
///
/// An empty string means "no hotkey" and is allowed. A failed rebind leaves the
/// previous binding untouched, so a bad combination cannot cost the user a
/// working key.
pub fn set_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    if hotkey.trim().is_empty() {
        unregister(app)?;
        record(app, None);
        return Ok(());
    }
    register(app, hotkey)?;
    record(app, None);
    Ok(())
}

fn register(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let requested = parse(hotkey)?;
    let state: State<HotkeyState> = app.state();
    let mut current = state.current.lock().map_err(|e| e.to_string())?;
    if *current == Some(requested) {
        return Ok(());
    }

    let shortcuts = app.global_shortcut();
    // Register first, release second: a rejected combination must not leave the
    // app with no hotkey at all.
    shortcuts.register(requested).map_err(|e| {
        let message = format!("hotkey '{hotkey}' is unavailable ({e})");
        log::warn!("{message}");
        message
    })?;
    if let Some(previous) = current.take() {
        let _ = shortcuts.unregister(previous);
    }
    *current = Some(requested);
    Ok(())
}

fn unregister(app: &AppHandle) -> Result<(), String> {
    let state: State<HotkeyState> = app.state();
    let mut current = state.current.lock().map_err(|e| e.to_string())?;
    if let Some(previous) = current.take() {
        let _ = app.global_shortcut().unregister(previous);
    }
    Ok(())
}
