use crate::commands::github::{get_current_install_dir, get_installed_manifest};
use crate::commands::installer::find_executable;
use crate::error::AppError;
use crate::models::get_app_catalog;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, State};
use tauri_plugin_notification::NotificationExt;

/// Launches an installed application by locating its executable and spawning a detached process.
#[tauri::command]
pub async fn launch_app(
    app_id: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    log::info!("Launching application: {}", app_id);

    // Special launcher for Graphite (Web/Desktop application)
    if app_id.eq_ignore_ascii_case("graphite") {
        log::info!("Launching Graphite (Web/Desktop mode)...");
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const DETACHED_PROCESS: u32 = 0x00000008;
            const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;

            let browser_candidates = [
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            ];
            let mut launched = false;
            for candidate in browser_candidates {
                if std::path::Path::new(candidate).is_file() {
                    let _ = std::process::Command::new(candidate)
                        .arg("--app=https://editor.graphite.art")
                        .creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP)
                        .spawn();
                    launched = true;
                    break;
                }
            }
            if !launched {
                let _ = open::that("https://editor.graphite.art");
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = open::that("https://editor.graphite.art");
        }

        let _ = app_handle
            .notification()
            .builder()
            .title("Synapps")
            .body("Starting Graphite...")
            .show();
        return Ok(());
    }

    let install_dir = get_current_install_dir(&app_handle, &state);
    let app_dir = install_dir.join(&app_id);

    if !app_dir.is_dir() {
        return Err(AppError::ExecutionFailed(format!(
            "Application '{}' is not installed (directory {:?} does not exist)",
            app_id, app_dir
        )));
    }

    // 1. Try finding executable path from manifest
    let mut exe_path: Option<PathBuf> = None;
    if let Some(manifest) = get_installed_manifest(&install_dir, &app_id) {
        if !manifest.executable_path.is_empty() {
            let manifest_exe = PathBuf::from(&manifest.executable_path);
            if manifest_exe.is_file() || manifest_exe.is_dir() {
                exe_path = Some(manifest_exe);
            }
        }
    }

    // 2. Fall back to automatic directory scanning
    if exe_path.is_none() {
        exe_path = find_executable(&app_dir, &app_id);
    }

    let mut exe_path = exe_path.ok_or_else(|| {
        AppError::ExecutionFailed(format!(
            "Could not locate an executable for application '{}' in {:?}",
            app_id, app_dir
        ))
    })?;

    #[cfg(target_os = "windows")]
    {
        // Auto-heal legacy installs where the raw installer was saved as the app executable
        if crate::utils::platform::is_installer_binary(&exe_path) {
            log::warn!(
                "Executable {:?} is an installer binary. Repairing installation silently...",
                exe_path
            );

            // Move the installer out of the app folder: it would otherwise lock the
            // file it needs to write (e.g. lmms.exe / LibreCAD.exe).
            let temp_dir = std::env::temp_dir().join("synapps_downloads");
            let _ = std::fs::create_dir_all(&temp_dir);
            let temp_installer = temp_dir.join(format!("{}-repair-installer.exe", app_id));
            let _ = std::fs::remove_file(&temp_installer);
            if std::fs::rename(&exe_path, &temp_installer).is_err() {
                std::fs::copy(&exe_path, &temp_installer)?;
                let _ = std::fs::remove_file(&exe_path);
            }

            let app_dir_clone = app_dir.clone();
            let installer_clone = temp_installer.clone();
            let repair = tokio::task::spawn_blocking(move || {
                crate::commands::installer::run_silent_installer(&installer_clone, &app_dir_clone)
            })
            .await
            .map_err(|e| AppError::ExecutionFailed(format!("Thread panic: {}", e)))?;
            let _ = std::fs::remove_file(&temp_installer);
            repair?;

            let new_exe = find_executable(&app_dir, &app_id)
                .filter(|p| !crate::utils::platform::is_installer_binary(p))
                .ok_or_else(|| {
                    AppError::ExecutionFailed(format!(
                        "Repair of '{}' failed: no application executable found. Please reinstall.",
                        app_id
                    ))
                })?;
            log::info!("Repair succeeded. Executable is now {:?}", new_exe);

            // Persist the corrected path in the manifest
            if let Some(mut manifest) = get_installed_manifest(&install_dir, &app_id) {
                manifest.executable_path = new_exe.to_string_lossy().to_string();
                if let Ok(json) = serde_json::to_string_pretty(&manifest) {
                    let _ = std::fs::write(app_dir.join("manifest.json"), json);
                }
            }
            exe_path = new_exe;
        }
    }

    log::info!("Found executable at {:?}", exe_path);

    let parent_dir = exe_path.parent().unwrap_or(&app_dir);

    // 3. Spawn detached process
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;

        let spawn_res = std::process::Command::new(&exe_path)
            .current_dir(parent_dir)
            .creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP)
            .spawn();

        if let Err(e) = spawn_res {
            if e.raw_os_error() == Some(740) {
                log::info!("Process requires elevation (error 740), spawning with RunAs verb...");
                std::process::Command::new("powershell")
                    .arg("-NoProfile")
                    .arg("-Command")
                    .arg(format!(
                        "Start-Process -FilePath '{}' -WorkingDirectory '{}' -Verb RunAs",
                        exe_path.display(),
                        parent_dir.display()
                    ))
                    .creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP)
                    .spawn()
                    .map_err(|e2| {
                        AppError::ExecutionFailed(format!(
                            "Failed to start elevated executable {}: {}",
                            exe_path.display(),
                            e2
                        ))
                    })?;
            } else {
                return Err(AppError::ExecutionFailed(format!(
                    "Failed to start executable {}: {}",
                    exe_path.display(),
                    e
                )));
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let is_app_bundle = exe_path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.eq_ignore_ascii_case("app"))
            .unwrap_or(false);

        if is_app_bundle {
            std::process::Command::new("open")
                .arg(&exe_path)
                .spawn()
                .map_err(|e| {
                    AppError::ExecutionFailed(format!(
                        "Failed to open bundle {}: {}",
                        exe_path.display(),
                        e
                    ))
                })?;
        } else {
            std::process::Command::new(&exe_path)
                .current_dir(parent_dir)
                .spawn()
                .map_err(|e| {
                    AppError::ExecutionFailed(format!(
                        "Failed to spawn binary {}: {}",
                        exe_path.display(),
                        e
                    ))
                })?;
        }
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new(&exe_path)
            .current_dir(parent_dir)
            .spawn()
            .map_err(|e| {
                AppError::ExecutionFailed(format!(
                    "Failed to spawn binary {}: {}",
                    exe_path.display(),
                    e
                ))
            })?;
    }

    // 4. Send notification
    let catalog = get_app_catalog();
    let app_name = catalog
        .iter()
        .find(|a| a.id.eq_ignore_ascii_case(&app_id))
        .map(|a| a.name.as_str())
        .unwrap_or(&app_id);

    let _ = app_handle
        .notification()
        .builder()
        .title("Synapps")
        .body(format!("Starting {}...", app_name))
        .show();

    Ok(())
}
