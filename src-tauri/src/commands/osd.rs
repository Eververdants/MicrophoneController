//! Overlay commands.
//!
//! The overlay window has its own React root and boots independently of the
//! main one, so it can finish loading after an overlay was already triggered.
//! It announces itself with this command and the backend replays whatever is
//! still on screen.

use tauri::AppHandle;

/// Tell the backend the overlay's listener is attached.
#[tauri::command]
pub fn osd_ready(app: AppHandle) -> Result<(), String> {
    crate::osd::replay(&app);
    Ok(())
}

