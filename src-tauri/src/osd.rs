//! The mute / volume overlay.
//!
//! Toggling mute by hotkey while a game is in full screen is a blind action:
//! the main window is behind the game, and the tray is covered. The overlay is
//! a small always-on-top window that appears where the user is looking and
//! disappears on its own.
//!
//! Two properties matter more than the visual:
//!
//! * **It must not take focus.** The window is created unfocusable (see
//!   [`prepare`]), so showing it never pulls the user out of what they were
//!   doing.
//! * **It must survive being re-triggered.** Each show claims a generation
//!   number; the pending hide only fires if no newer show has landed, so
//!   hammering the hotkey extends the overlay instead of making it flicker.

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow};

pub const OSD_LABEL: &str = "osd";

/// How long the overlay stays up.
const VISIBLE: Duration = Duration::from_millis(1600);
/// Gap between the overlay and the bottom of the screen.
const MARGIN: i32 = 72;

/// Which control moved — drives the icon and the wording.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OsdKind {
    Mute,
    Volume,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OsdPayload {
    pub kind: OsdKind,
    pub muted: bool,
    pub volume_percent: i64,
}

static GENERATION: AtomicU64 = AtomicU64::new(0);

/// Last payload, so a show that races the overlay's own listener is not lost.
static LAST: Mutex<Option<(OsdPayload, Instant)>> = Mutex::new(None);

/// Make the overlay unfocusable. Called once at startup, while it is hidden.
pub fn prepare(app: &AppHandle) {
    let Some(window) = app.get_webview_window(OSD_LABEL) else {
        log::warn!("osd window missing from the app config");
        return;
    };
    // Clears WS_EX_NOACTIVATE, i.e. `show()` will no longer activate the window.
    if let Err(e) = window.set_focusable(false) {
        log::warn!("osd: could not make the overlay unfocusable: {e}");
    }
    let _ = window.set_ignore_cursor_events(true);
}

pub fn show(app: &AppHandle, payload: OsdPayload) {
    let Some(window) = app.get_webview_window(OSD_LABEL) else {
        return;
    };

    if let Ok(mut last) = LAST.lock() {
        *last = Some((payload.clone(), Instant::now()));
    }

    let _ = app.emit_to(OSD_LABEL, "osd:show", payload);
    position(app, &window);
    let _ = window.show();

    let claimed = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    let app = app.clone();
    let _ = std::thread::Builder::new()
        .name("mc-osd-hide".into())
        .spawn(move || {
            std::thread::sleep(VISIBLE);
            // A newer show landed meanwhile — that one owns the hide.
            if GENERATION.load(Ordering::SeqCst) != claimed {
                return;
            }
            if let Some(window) = app.get_webview_window(OSD_LABEL) {
                let _ = window.hide();
            }
        });
}

/// Replay the current overlay state to a frontend that has just subscribed.
///
/// The overlay window is created at startup but its listener only attaches once
/// the page has booted; without this, an overlay triggered in that window would
/// silently do nothing.
pub fn replay(app: &AppHandle) {
    let payload = LAST.lock().ok().and_then(|last| {
        last.as_ref()
            .and_then(|(payload, at)| (at.elapsed() < VISIBLE).then(|| payload.clone()))
    });
    if let Some(payload) = payload {
        let _ = app.emit_to(OSD_LABEL, "osd:show", payload);
    }
}

fn position(app: &AppHandle, window: &WebviewWindow) {
    let Ok(size) = window.outer_size() else {
        return;
    };
    // Prefer the monitor under the cursor: on a multi-monitor desk the overlay
    // should land where the user is looking, not always on the primary.
    let monitor = app
        .cursor_position()
        .ok()
        .and_then(|p| app.monitor_from_point(p.x, p.y).ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());
    let Some(monitor) = monitor else {
        return;
    };
    let origin = monitor.position();
    let area = monitor.size();
    let x = origin.x + (area.width as i32 - size.width as i32) / 2;
    let y = origin.y + area.height as i32 - size.height as i32 - MARGIN;
    let _ = window.set_position(PhysicalPosition::new(x, y));
}
