// Prevents an extra console window on Windows in release mode.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod commands;
mod config;
mod hotkey;
mod tray;

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(audio::AudioController::new())
        .setup(|app| {
            tray::build(app.handle())?;
            hotkey::init(app.handle())?;
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Window close behavior handled by frontend via close-to-tray config.
            }
        })
        .invoke_handler(tauri::generate_handler![
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
