// Prevents an extra console window on Windows in release mode.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod commands;
mod config;
mod hotkey;
mod tray;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // A second launch should surface the existing window instead of
            // doing nothing (the window may be sitting in the tray).
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Err(e) = hotkey::toggle_mute(app) {
                            log::warn!("hotkey mute toggle failed: {e}");
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(audio::AudioController::new())
        .setup(|app| {
            app.manage(config::ConfigState::load(app.handle())?);
            let cfg = app.state::<config::ConfigState>().get()?;
            tray::build(app.handle())?;
            hotkey::init(app.handle(), &cfg.hotkey)?;

            // Probe the audio device stack on a worker thread so it overlaps
            // with the webview booting instead of queueing behind it. The first
            // `get_initial_state` then returns a cached snapshot.
            app.state::<audio::AudioController>()
                .spawn_prewarm(cfg.last_volume_percent);

            if let Some(w) = app.get_webview_window("main") {
                // The webview surface is white until the page paints its first
                // frame. Colour the native window *and* webview to the theme
                // background so the very first frame the user can see is the
                // app's own colour rather than a blank white rectangle. The
                // frontend's critical CSS continues from there.
                let background = match w.theme() {
                    Ok(tauri::Theme::Light) => tauri::window::Color(0xf7, 0xf7, 0xf5, 0xff),
                    _ => tauri::window::Color(0x0e, 0x0e, 0x0c, 0xff),
                };
                let _ = w.set_background_color(Some(background));

                if cfg.start_minimized_to_tray {
                    let _ = w.hide();
                } else {
                    // Deliberately not shown here. The window stays hidden until
                    // the frontend reports its first paint, so it can never be
                    // seen empty; `arm_reveal_fallback` covers a frontend that
                    // never reports in.
                    commands::window::arm_reveal_fallback(app.handle().clone());
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let close_to_tray = window
                    .app_handle()
                    .state::<config::ConfigState>()
                    .get()
                    .map(|c| c.minimize_to_tray_on_close)
                    .unwrap_or(true);
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::reveal_window,
            commands::audio::get_initial_state,
            commands::audio::toggle_mute,
            commands::audio::set_mute,
            commands::audio::set_volume,
            commands::audio::list_devices,
            commands::audio::select_device,
            commands::config::set_hotkey,
            commands::config::set_language,
            commands::config::set_start_minimized,
            commands::config::set_close_to_tray,
            commands::config::set_volume_zero_mutes,
            commands::config::set_normalize,
            commands::config::set_reference_volume,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Err(e) = app.state::<config::ConfigState>().save(app) {
                    log::warn!("failed to persist config on exit: {e}");
                }
            }
        });
}
