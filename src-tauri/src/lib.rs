pub mod commands;
pub mod error;
pub mod models;
pub mod state;
pub mod utils;

pub use error::AppError;
pub use state::AppState;

/// Main library entry point that configures and initializes the Tauri application.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::Manager;

pub fn run() {
    let _ = env_logger::try_init();

    log::info!("Starting Synapps...");

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::github::fetch_latest_release,
            commands::github::get_local_app_states,
            commands::github::sync_all_apps,
            commands::installer::install_app,
            commands::installer::uninstall_app,
            commands::launcher::launch_app,
            commands::recent_files::get_recent_files,
            commands::recent_files::add_recent_files,
            commands::recent_files::open_recent_file,
            commands::recent_files::reveal_recent_file,
            commands::recent_files::remove_recent_file,
            commands::recent_files::clear_recent_files,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::select_install_directory,
            commands::settings::is_first_run,
            commands::settings::get_available_disk_space,
            commands::settings::list_custom_themes,
            commands::settings::save_custom_theme,
            commands::settings::delete_custom_theme,
            commands::settings::import_custom_theme,
            commands::settings::export_custom_theme,
            commands::settings::open_themes_folder,
            commands::updater::check_launcher_update,
            commands::get_catalog,
        ])
        .setup(|app| {
            if let Some(window) = app.handle().get_webview_window("main") {
                #[cfg(target_os = "windows")]
                {
                    use window_vibrancy::apply_acrylic;
                    let _ = apply_acrylic(&window, Default::default());

                    if let Ok(hwnd) = window.hwnd() {
                        #[link(name = "dwmapi")]
                        extern "system" {
                            fn DwmSetWindowAttribute(
                                hwnd: *mut std::ffi::c_void,
                                dw_attribute: u32,
                                pv_attribute: *const std::ffi::c_void,
                                cb_attribute: u32,
                            ) -> i32;
                        }
                        // DWMWA_WINDOW_CORNER_PREFERENCE (33) = DWMWCP_ROUND (2)
                        let corner_pref: u32 = 2;
                        // DWMWA_BORDER_COLOR (34) = DWMWA_COLOR_NONE (0xFFFFFFFE)
                        let border_none: u32 = 0xFFFF_FFFE;
                        unsafe {
                            let _ = DwmSetWindowAttribute(
                                hwnd.0,
                                33,
                                (&corner_pref as *const u32).cast(),
                                std::mem::size_of::<u32>() as u32,
                            );
                            let _ = DwmSetWindowAttribute(
                                hwnd.0,
                                34,
                                (&border_none as *const u32).cast(),
                                std::mem::size_of::<u32>() as u32,
                            );
                        }
                    }
                }
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            log::info!(
                "Synapps v{} successfully initialized",
                app.package_info().version
            );
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Synapps application");
}
