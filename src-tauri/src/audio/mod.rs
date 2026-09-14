//! Audio backend facade.
//!
//! [`AudioController`] owns the state the Tauri commands and the background
//! monitor share. The Core Audio work itself lives in [`win`] (a stub stands in
//! on other platforms), split further by concern:
//!
//! * [`policy`] — moving the Windows default endpoint (`IPolicyConfig`)
//! * [`sessions`] — which applications are currently holding the microphone
//! * [`notify`] — device hotplug callbacks (`IMMNotificationClient`)
//!
//! Everything below is pure data so the commands can stay thin.

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[cfg(windows)]
pub mod notify;
#[cfg(windows)]
mod policy;
#[cfg(windows)]
mod sessions;
#[cfg(windows)]
pub mod win;

#[cfg(not(windows))]
#[path = "stub.rs"]
pub mod win;

/// A capture endpoint, as the UI sees it.
///
/// `volume_percent` / `muted` are filled in per device so the device list can
/// show each endpoint's own state rather than only the one being controlled.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    /// Console-role default — what Windows itself calls the default device.
    pub is_default: bool,
    /// Communications-role default, which Windows lets apps pick separately.
    pub is_default_comms: bool,
    pub muted: bool,
    pub volume_percent: i64,
}

/// A status push: everything that changes when the endpoint state moves.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub muted: bool,
    pub volume_percent: i64,
    pub volume_db: f64,
}

/// The hardware gain window of an endpoint, in dB.
///
/// A slider in percent hides how much headroom the hardware actually has; the
/// UI shows this so "100%" is not read as "maximum possible".
#[derive(Debug, Clone, Copy, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VolumeRange {
    pub min_db: f64,
    pub max_db: f64,
    pub increment_db: f64,
}

/// Everything one activation of `IAudioEndpointVolume` can tell us.
///
/// Grouped because acquiring the endpoint is the expensive part: reading these
/// individually would repeat `CoCreateInstance` + `Activate` four times.
#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EndpointDetails {
    pub muted: bool,
    pub volume_percent: i64,
    pub volume_db: f64,
    pub range: VolumeRange,
    /// 1 means mono, where a balance control would be meaningless.
    pub channel_count: u32,
    /// Stereo balance derived from the per-channel levels, -100..=100.
    pub balance: i64,
}

/// Everything `get_initial_state` needs from the device stack.
///
/// Probing it means initialising a COM apartment, activating the endpoint,
/// reading a property store per capture device and enumerating audio sessions —
/// the single slowest thing the app does at startup.
/// [`AudioController::spawn_prewarm`] gets it out of the way while the webview
/// is still booting.
#[derive(Debug, Clone, Default)]
pub struct Snapshot {
    pub details: EndpointDetails,
    pub devices: Vec<DeviceInfo>,
    /// Applications holding the microphone, as base image names.
    pub in_use: Vec<String>,
}

/// How long a startup snapshot stays usable. Long enough to cover a cold webview
/// boot, short enough that a device plugged in at launch is still picked up.
const PREWARM_TTL: Duration = Duration::from_secs(5);

/// State shared by every command and by the background monitor.
#[derive(Debug, Clone, Default)]
pub struct AudioInner {
    pub last_known_muted: bool,
    pub last_known_volume_percent: i64,
    /// Endpoint the commands act on. `None` follows the system default, which
    /// is what most users want; picking a device pins control to it without
    /// touching the system default.
    pub target_device_id: Option<String>,
    /// Whether the meter pump should be sampling. Set from the frontend, which
    /// owns the user's preference; whether the window is actually on screen is
    /// decided separately by [`AudioInner::window_visible`].
    pub meter_enabled: bool,
    /// Whether the main window is on screen, refreshed by the state monitor.
    ///
    /// Deliberately owned here rather than by the webview: the window is
    /// created hidden and revealed later, and `document.visibilityState` in
    /// that webview does not reliably report the transition — a frontend-driven
    /// gate silently leaves the meter off for the whole session.
    pub window_visible: bool,
    /// Applications holding the microphone at the last check, so the monitor
    /// only pushes when that set actually moves.
    pub last_in_use: Vec<String>,
}

pub struct AudioController {
    pub inner: Arc<Mutex<AudioInner>>,
    prewarm: Arc<Mutex<Option<(Snapshot, Instant)>>>,
}

impl AudioController {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(AudioInner {
                last_known_muted: false,
                last_known_volume_percent: 100,
                target_device_id: None,
                meter_enabled: false,
                window_visible: true,
                last_in_use: Vec::new(),
            })),
            prewarm: Arc::new(Mutex::new(None)),
        }
    }

    /// Probe the device stack on a worker thread, in parallel with the frontend
    /// loading, and stash the result for the first `get_initial_state`.
    ///
    /// `fallback_percent` is the persisted volume, used when the device stack
    /// cannot be reached (no capture endpoint, COM failure).
    pub fn spawn_prewarm(&self, fallback_percent: i64, target_device_id: Option<String>) {
        let inner = Arc::clone(&self.inner);
        let slot = Arc::clone(&self.prewarm);
        std::thread::spawn(move || {
            let snapshot = win::read_snapshot(fallback_percent, target_device_id.as_deref());

            // Publish to `inner` *before* the snapshot becomes visible: the
            // "has anything changed since?" check in `take_prewarm` compares the
            // two, and a mutation landing in between must not be missed.
            if let Ok(mut guard) = inner.lock() {
                guard.last_known_muted = snapshot.details.muted;
                guard.last_known_volume_percent = snapshot.details.volume_percent;
                guard.last_in_use = snapshot.in_use.clone();
            }
            if let Ok(mut guard) = slot.lock() {
                *guard = Some((snapshot, Instant::now()));
            }
        });
    }

    /// Take the startup snapshot, if it is still fresh and no audio change has
    /// landed since it was produced.
    ///
    /// Consumed on first use, so later reads always go back to the device stack.
    pub fn take_prewarm(&self) -> Option<Snapshot> {
        let (snapshot, created) = self.prewarm.lock().ok()?.take()?;
        if created.elapsed() > PREWARM_TTL {
            return None;
        }
        // A hotkey or mute between the probe and the first read would otherwise
        // be silently overwritten by the pre-toggle values.
        let inner = self.inner.lock().ok()?;
        if inner.last_known_muted != snapshot.details.muted
            || inner.last_known_volume_percent != snapshot.details.volume_percent
        {
            return None;
        }
        drop(inner);
        Some(snapshot)
    }

    /// Read the shared state without holding the lock across the call site.
    pub fn snapshot_inner(&self) -> Result<AudioInner, String> {
        self.inner
            .lock()
            .map(|g| g.clone())
            .map_err(|e| e.to_string())
    }
}

impl Default for AudioController {
    fn default() -> Self {
        Self::new()
    }
}
