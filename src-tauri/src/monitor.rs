//! Background audio monitor.
//!
//! Three loops, each with a different reason to exist and a different cost
//! ceiling:
//!
//! * **state** — polls the controlled endpoint once a second so a mute toggled
//!   from the headset cable, the Windows sound panel or another app shows up
//!   here. This is the piece that makes the app a *monitor* rather than a
//!   one-way remote.
//! * **meter** — samples the peak level ~20x/s, but only while the frontend
//!   says the window is on screen and the user wants a level display. A hidden
//!   window costs nothing.
//! * **devices** — waits on `IMMNotificationClient` callbacks (see
//!   [`crate::audio::notify`]) and asks the frontend to re-read the device list.
//!
//! All three write through the same [`AudioController`] state that the commands
//! use, so a change made in either direction is visible to the other without a
//! second source of truth.

use crate::audio::{self, win as audio_win, AudioController, Status};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

/// Meter sampling period — 20 Hz reads as continuous to the eye.
const METER_INTERVAL: Duration = Duration::from_millis(50);
/// Poll period while metering is off, so turning it on is still noticed.
const METER_IDLE: Duration = Duration::from_millis(250);
/// Floor for the configured poll interval. Anything faster than this burns CPU
/// re-reading a flag that changes at human speed.
const MIN_POLL_INTERVAL: Duration = Duration::from_millis(250);
/// Ceiling, so a hand-edited config cannot effectively disable the monitor.
const MAX_POLL_INTERVAL: Duration = Duration::from_secs(60);

/// Start every background loop. Called once, from `setup`.
pub fn spawn(app: &AppHandle) {
    spawn_state_monitor(app.clone());
    spawn_meter(app.clone());
    if let Err(e) = audio_win::watch_devices(app.clone()) {
        log::warn!("device watcher unavailable: {e}");
    }
}

/// Turn level sampling on or off, per the user's `show meter` preference.
///
/// This is the *preference* only. Whether the window is on screen is tracked
/// separately (see [`refresh_window_visibility`]) because the frontend cannot
/// be trusted to know: this window is created hidden and revealed after its
/// first paint, and `document.visibilityState` does not reliably follow.
pub fn set_meter_enabled(app: &AppHandle, enabled: bool) {
    let controller = app.state::<AudioController>();
    // Bound to a local rather than used inline: a `State` borrows the app, and
    // a temporary lock guard in the tail position would outlive it.
    let mut inner = match controller.inner.lock() {
        Ok(inner) => inner,
        Err(_) => return,
    };
    if inner.meter_enabled != enabled {
        log::info!(
            "level meter sampling {}",
            if enabled { "on" } else { "off" }
        );
    }
    inner.meter_enabled = enabled;
}

fn target(app: &AppHandle) -> (Option<String>, bool) {
    let controller = app.state::<AudioController>();
    let inner = match controller.inner.lock() {
        Ok(inner) => inner,
        Err(_) => return (None, false),
    };
    // Both conditions are required: the user asked for metering, and the window
    // is on screen to show it. Either one alone would burn CPU for nothing.
    let sampling = inner.meter_enabled && inner.window_visible;
    (inner.target_device_id.clone(), sampling)
}

/// Refresh the "is the main window on screen" flag the meter consults.
///
/// Polled on the slow loop rather than on every meter tick: the consequence of
/// being a second late is a second of harmless sampling, and asking the window
/// 20 times a second would cost more than it saves.
fn refresh_window_visibility(app: &AppHandle) {
    let visible = app
        .get_webview_window("main")
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(true);
    let controller = app.state::<AudioController>();
    // Bound to a local rather than used inline: a `State` borrows the app, and
    // a temporary guard in the tail position would outlive it.
    let mut inner = match controller.inner.lock() {
        Ok(inner) => inner,
        Err(_) => return,
    };
    inner.window_visible = visible;
}

fn poll_interval(app: &AppHandle) -> Duration {
    let configured = app
        .state::<crate::config::ConfigState>()
        .get()
        .map(|c| c.poll_interval_s)
        .unwrap_or(1.0);
    Duration::from_secs_f64(configured.max(0.25)).clamp(MIN_POLL_INTERVAL, MAX_POLL_INTERVAL)
}

/// Push the endpoint's own state to the UI whenever it moves underneath us.
fn spawn_state_monitor(app: AppHandle) {
    let _ = std::thread::Builder::new()
        .name("mc-state-monitor".into())
        .spawn(move || loop {
            std::thread::sleep(poll_interval(&app));
            refresh_window_visibility(&app);
            let (device, _) = target(&app);
            let controller = app.state::<AudioController>();

            if let Ok((muted, volume_percent, volume_db)) = audio_win::read_state(device.as_deref())
            {
                // Peek without recording, so `publish` below stays the only
                // place that writes the last-known state.
                let moved = controller
                    .inner
                    .lock()
                    .map(|inner| {
                        inner.last_known_muted != muted
                            || inner.last_known_volume_percent != volume_percent
                    })
                    .unwrap_or(false);
                if moved {
                    publish(
                        &app,
                        &controller,
                        &Status {
                            muted,
                            volume_percent,
                            volume_db,
                        },
                    );
                }
            }

            // Which apps are holding the microphone. Deliberately on the slow
            // loop: enumerating sessions is far heavier than reading one flag.
            let in_use = audio_win::active_processes(device.as_deref()).unwrap_or_default();
            let moved = match controller.inner.lock() {
                Ok(mut inner) => {
                    let moved = inner.last_in_use != in_use;
                    inner.last_in_use = in_use.clone();
                    moved
                }
                Err(_) => false,
            };
            if moved {
                let _ = app.emit("audio:in-use", in_use);
            }
        });
}

/// Sample the peak level while (and only while) it is wanted.
fn spawn_meter(app: AppHandle) {
    let _ = std::thread::Builder::new()
        .name("mc-meter".into())
        .spawn(move || loop {
            let (device, enabled) = target(&app);
            if !enabled {
                std::thread::sleep(METER_IDLE);
                continue;
            }
            if let Ok(peak) = audio_win::read_peak(device.as_deref()) {
                let _ = app.emit("audio:level", peak);
            }
            std::thread::sleep(METER_INTERVAL);
        });
}

/// Record a change and push it everywhere it is visible.
///
/// The single funnel for "the endpoint state moved": the window, the tray icon
/// and the overlay all follow from here, so a change made by the hotkey, the
/// tray, the window or another application cannot leave one of them stale.
/// Commands go through here after talking to Core Audio so the monitor's
/// "has anything changed?" comparison does not fire a redundant follow-up.
pub fn publish(app: &AppHandle, controller: &AudioController, status: &Status) {
    if let Ok(mut inner) = controller.inner.lock() {
        inner.last_known_muted = status.muted;
        inner.last_known_volume_percent = status.volume_percent;
    }
    let _ = app.emit("audio:status", status.clone());
    crate::tray::refresh(app, status.muted, status.volume_percent);
}

/// Re-read the device list and hand it to the UI.
pub fn publish_devices(app: &AppHandle) -> Vec<audio::DeviceInfo> {
    let devices = audio_win::list_capture_devices().unwrap_or_default();
    let _ = app.emit("audio:devices", devices.clone());
    devices
}
