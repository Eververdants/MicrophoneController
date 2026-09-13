//! System tray.
//!
//! The tray is the app's second face: the icon carries the mute state, and the
//! menu carries the actions that must work with the window hidden — toggle
//! mute, step the volume, show the window, exit.
//!
//! Note on the mouse wheel: the obvious gesture for a tray icon would be to
//! scroll it for volume. Neither Tauri v2 nor the `tray-icon` crate underneath
//! surfaces `WM_MOUSEWHEEL` from the notification area (the shell owns that
//! region and forwards only click events), so the step controls live in the
//! menu and on the window instead of being faked.

use crate::status_icon;
use crate::{
    actions::{self, Feedback},
    config::ConfigState,
};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Wry};

pub const TRAY_ID: &str = "main-tray";

const ID_MUTE: &str = "toggle-mute";
const ID_VOLUME_UP: &str = "volume-up";
const ID_VOLUME_DOWN: &str = "volume-down";
const ID_SHOW: &str = "show";
const ID_HIDE: &str = "hide";
const ID_QUIT: &str = "quit";

/// Menu labels. The tray is built by Rust, so it cannot borrow the frontend's
/// i18n bundle; the handful of strings it needs are kept here.
struct Labels {
    app: &'static str,
    mute: &'static str,
    unmute: &'static str,
    volume_up: &'static str,
    volume_down: &'static str,
    show: &'static str,
    hide: &'static str,
    quit: &'static str,
    muted: &'static str,
    live: &'static str,
}

fn labels(lang: &str) -> Labels {
    if lang == "en" {
        Labels {
            app: "Microphone Controller",
            mute: "Mute",
            unmute: "Unmute",
            volume_up: "Volume +",
            volume_down: "Volume −",
            show: "Show window",
            hide: "Hide window",
            quit: "Exit",
            muted: "muted",
            live: "live",
        }
    } else {
        Labels {
            app: "麦克风控制器",
            mute: "静音",
            unmute: "取消静音",
            volume_up: "音量 +",
            volume_down: "音量 −",
            show: "显示窗口",
            hide: "隐藏窗口",
            quit: "退出",
            muted: "已静音",
            live: "收音中",
        }
    }
}

/// Tray handles that need to survive between refreshes.
pub struct TrayState {
    mute_item: MenuItem<Wry>,
    /// Mute state the icon was last rasterised for. Rendering is cheap but not
    /// free, and this runs on every volume tick too.
    rendered_muted: Mutex<Option<bool>>,
}

fn language(app: &AppHandle) -> String {
    app.state::<ConfigState>()
        .get()
        .map(|c| c.language)
        .unwrap_or_else(|_| "zh-CN".into())
}

fn step(app: &AppHandle) -> i64 {
    app.state::<ConfigState>()
        .get()
        .map(|c| c.scroll_step_percent)
        .unwrap_or(5)
        .max(1)
}

pub fn build(app: &AppHandle) -> Result<(), String> {
    let labels = labels(&language(app));
    let to_string = |e: tauri::Error| e.to_string();

    let mute_item =
        MenuItem::with_id(app, ID_MUTE, labels.mute, true, None::<&str>).map_err(to_string)?;
    // The step is deliberately not in the label: it is user-configurable, and a
    // stale "Volume + 5%" would be worse than no number at all.
    let volume_up =
        MenuItem::with_id(app, ID_VOLUME_UP, labels.volume_up, true, None::<&str>).map_err(to_string)?;
    let volume_down = MenuItem::with_id(app, ID_VOLUME_DOWN, labels.volume_down, true, None::<&str>)
        .map_err(to_string)?;
    let show_item =
        MenuItem::with_id(app, ID_SHOW, labels.show, true, None::<&str>).map_err(to_string)?;
    let hide_item =
        MenuItem::with_id(app, ID_HIDE, labels.hide, true, None::<&str>).map_err(to_string)?;
    let quit_item =
        MenuItem::with_id(app, ID_QUIT, labels.quit, true, None::<&str>).map_err(to_string)?;
    let separator_a = PredefinedMenuItem::separator(app).map_err(to_string)?;
    let separator_b = PredefinedMenuItem::separator(app).map_err(to_string)?;

    let menu = Menu::with_items(
        app,
        &[
            &mute_item,
            &separator_a,
            &volume_up,
            &volume_down,
            &separator_b,
            &show_item,
            &hide_item,
            &quit_item,
        ],
    )
    .map_err(to_string)?;

    TrayIconBuilder::with_id(TRAY_ID)
        .tooltip(labels.app)
        .icon(status_icon::render(false))
        .menu(&menu)
        // Left click toggles the window; the menu belongs on the right button.
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| on_menu(app, event.id.as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                match app.get_webview_window("main") {
                    Some(window) if window.is_visible().unwrap_or(false) => {
                        let _ = window.hide();
                    }
                    Some(window) => reveal(&window),
                    None => {}
                }
            }
        })
        .build(app)
        .map_err(to_string)?;

    app.manage(TrayState {
        mute_item,
        rendered_muted: Mutex::new(None),
    });
    Ok(())
}

fn reveal(window: &tauri::WebviewWindow) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn on_menu(app: &AppHandle, id: &str) {
    let result = match id {
        ID_MUTE => actions::toggle_mute(app, Feedback::Overlay).map(|_| ()),
        ID_VOLUME_UP => actions::nudge_volume(app, step(app), Feedback::Overlay).map(|_| ()),
        ID_VOLUME_DOWN => actions::nudge_volume(app, -step(app), Feedback::Overlay).map(|_| ()),
        ID_SHOW => {
            if let Some(window) = app.get_webview_window("main") {
                reveal(&window);
            }
            Ok(())
        }
        ID_HIDE => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
            Ok(())
        }
        ID_QUIT => {
            app.exit(0);
            Ok(())
        }
        _ => Ok(()),
    };
    if let Err(e) = result {
        log::warn!("tray action '{id}' failed: {e}");
    }
}

/// Bring the icon, tooltip and mute label in step with the endpoint.
///
/// Called from [`crate::monitor::publish`], which is the single place any state
/// change passes through — so the tray follows changes made from the window,
/// the hotkey, the tray itself and other applications alike.
pub fn refresh(app: &AppHandle, muted: bool, volume_percent: i64) {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return;
    };
    let labels = labels(&language(app));

    let Some(state) = app.try_state::<TrayState>() else {
        return;
    };

    let needs_icon = match state.rendered_muted.lock() {
        Ok(mut last) => {
            let changed = *last != Some(muted);
            *last = Some(muted);
            changed
        }
        Err(_) => true,
    };
    if needs_icon {
        let _ = tray.set_icon(Some(status_icon::render(muted)));
    }

    let _ = tray.set_tooltip(Some(format!(
        "{} · {} · {}%",
        labels.app,
        if muted { labels.muted } else { labels.live },
        volume_percent
    )));
    let _ = state
        .mute_item
        .set_text(if muted { labels.unmute } else { labels.mute });
}

/// Re-label the tray after a language change, keeping the current state.
pub fn refresh_labels(app: &AppHandle) {
    let controller = app.state::<crate::audio::AudioController>();
    let (muted, volume) = controller
        .snapshot_inner()
        .map(|inner| (inner.last_known_muted, inner.last_known_volume_percent))
        .unwrap_or((false, 100));
    refresh(app, muted, volume);
}
