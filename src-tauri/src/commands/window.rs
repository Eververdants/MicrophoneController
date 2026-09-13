//! Window commands.

use tauri::{AppHandle, Manager};

/// Show the main window now that the frontend has painted its first frame.
///
/// The window starts hidden (`visible: false` in tauri.conf.json), so this
/// hand-off is what makes it appear — with content already on screen. A window
/// that were shown at startup instead would flash an empty white webview for as
/// long as the bundle takes to boot.
///
/// Synchronous on purpose: window calls want to run on the main thread.
#[tauri::command]
pub fn reveal_window(app: AppHandle) -> Result<(), String> {
    if starts_hidden(&app) {
        return Ok(());
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    Ok(())
}

/// Safety net for a frontend that never reports in — a script error, a missing
/// asset, a webview that throttles too aggressively while hidden. Without it the
/// failure mode would be an app that runs with no visible window at all.
///
/// Deliberately short: a healthy launch reveals in a few hundred milliseconds,
/// and showing the window early is harmless because the native surface is
/// already themed and the static shell in index.html paints from the HTML alone,
/// without JavaScript.
pub fn arm_reveal_fallback(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        if starts_hidden(&app) {
            return;
        }
        if let Some(window) = app.get_webview_window("main") {
            if !window.is_visible().unwrap_or(false) {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });
}

/// "Start minimized to tray" is the user's call to make, and it outranks both
/// the reveal and its fallback.
fn starts_hidden(app: &AppHandle) -> bool {
    app.state::<crate::config::ConfigState>()
        .get()
        .map(|c| c.start_minimized_to_tray)
        .unwrap_or(false)
}
