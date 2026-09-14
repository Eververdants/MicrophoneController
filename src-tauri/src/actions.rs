//! User-initiated audio actions.
//!
//! The window, the global hotkey and the tray all have to produce the *same*
//! effect — a mute from the tray must move the tray icon, the window and the
//! overlay exactly like the hotkey does. That sequence lives here so it cannot
//! drift between the three entry points; callers only choose whether the
//! overlay should appear.

use crate::audio::{win as audio_win, AudioController, Status};
use crate::config::ConfigState;
use crate::{monitor, osd};
use tauri::{AppHandle, Manager};

/// Whether an action should also surface in the overlay.
///
/// A change made from the window is already visible there — repeating it in a
/// floating box would be noise, not feedback.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Feedback {
    Overlay,
    Silent,
}

/// The config values every action needs, read once.
struct Ctx {
    target: Option<String>,
    zero_mutes: bool,
    show_osd: bool,
}

fn ctx(app: &AppHandle) -> Ctx {
    let cfg = app.state::<ConfigState>().get().unwrap_or_default();
    Ctx {
        target: cfg.selected_device_id,
        zero_mutes: cfg.volume_zero_mutes,
        show_osd: cfg.show_osd,
    }
}

fn publish(app: &AppHandle, status: Status) {
    let controller = app.state::<AudioController>();
    monitor::publish(app, &controller, &status);
}

pub fn toggle_mute(app: &AppHandle, feedback: Feedback) -> Result<bool, String> {
    let ctx = ctx(app);
    let muted = audio_win::toggle_mute(ctx.target.as_deref())?;
    let (_, volume_percent, volume_db) =
        audio_win::read_state(ctx.target.as_deref()).unwrap_or((muted, 100, -96.0));

    publish(
        app,
        Status {
            muted,
            volume_percent,
            volume_db,
        },
    );
    show_overlay(
        app,
        &ctx,
        osd::OsdKind::Mute,
        muted,
        volume_percent,
        feedback,
    );
    Ok(muted)
}

pub fn set_mute(app: &AppHandle, muted: bool, feedback: Feedback) -> Result<(), String> {
    let ctx = ctx(app);
    audio_win::set_mute(ctx.target.as_deref(), muted)?;
    let (_, volume_percent, volume_db) =
        audio_win::read_state(ctx.target.as_deref()).unwrap_or((muted, 100, -96.0));

    publish(
        app,
        Status {
            muted,
            volume_percent,
            volume_db,
        },
    );
    show_overlay(
        app,
        &ctx,
        osd::OsdKind::Mute,
        muted,
        volume_percent,
        feedback,
    );
    Ok(())
}

/// Set the level in percent. Returns the resulting level in dB.
pub fn set_volume(app: &AppHandle, percent: i64, feedback: Feedback) -> Result<f64, String> {
    let ctx = ctx(app);
    let clamped = percent.clamp(0, 100);

    // Cache-only: the last volume is persisted on app exit, not on every slider
    // tick, because `update` would rewrite the file dozens of times a second.
    app.state::<ConfigState>().mutate(|c| {
        c.last_volume_percent = clamped;
        if c.normalize_volume {
            c.reference_volume_percent = clamped;
        }
    })?;

    let outcome = audio_win::set_volume_percent_ex(ctx.target.as_deref(), clamped, ctx.zero_mutes)?;
    let muted = outcome.muted.unwrap_or_else(|| last_known_muted(app));

    publish(
        app,
        Status {
            muted,
            volume_percent: clamped,
            volume_db: outcome.volume_db,
        },
    );

    show_overlay(app, &ctx, osd::OsdKind::Volume, muted, clamped, feedback);
    Ok(outcome.volume_db)
}

/// Step the volume by `delta` percent, clamped. Returns the new level.
pub fn nudge_volume(app: &AppHandle, delta: i64, feedback: Feedback) -> Result<i64, String> {
    let ctx = ctx(app);
    let current = audio_win::read_state(ctx.target.as_deref())
        .map(|(_, percent, _)| percent)
        .unwrap_or_else(|_| {
            app.state::<ConfigState>()
                .get()
                .map(|c| c.last_volume_percent)
                .unwrap_or(100)
        });
    let next = (current + delta).clamp(0, 100);
    set_volume(app, next, feedback)?;
    Ok(next)
}

/// Apply a stereo balance. Returns the value actually applied (0 when the
/// endpoint is mono, where balance has no meaning).
pub fn set_balance(app: &AppHandle, balance: i64) -> Result<i64, String> {
    let ctx = ctx(app);
    let applied = audio_win::set_balance(ctx.target.as_deref(), balance)?;
    app.state::<ConfigState>()
        .update(app, |c| c.balance = applied)?;
    Ok(applied)
}

fn last_known_muted(app: &AppHandle) -> bool {
    app.state::<AudioController>()
        .snapshot_inner()
        .map(|inner| inner.last_known_muted)
        .unwrap_or(false)
}

fn show_overlay(
    app: &AppHandle,
    ctx: &Ctx,
    kind: osd::OsdKind,
    muted: bool,
    volume_percent: i64,
    feedback: Feedback,
) {
    if feedback == Feedback::Silent || !ctx.show_osd {
        return;
    }
    osd::show(
        app,
        osd::OsdPayload {
            kind,
            muted,
            volume_percent,
        },
    );
}
