use crate::commands::github::fetch_latest_release;
use crate::error::AppError;
use crate::state::AppState;
use crate::utils::platform::{current_arch, current_os, select_asset};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::io::AsyncWriteExt;

/// Status and metadata regarding launcher updates.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LauncherUpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub release_notes: Option<String>,
    pub download_url: Option<String>,
    pub published_at: Option<String>,
}

/// Real-time progress payload emitted during launcher self-update download.
#[derive(Debug, Clone, Serialize)]
pub struct LauncherUpdateProgressPayload {
    pub downloaded: u64,
    pub total: u64,
    pub progress: u8,
    pub speed_bps: u64,
}

const LAUNCHER_REPO: &str = "Krowlex95/synapps-launcher";

/// Checks whether an updated version of Synapps is available on GitHub Releases.
#[tauri::command]
pub async fn check_launcher_update(
    state: State<'_, AppState>,
) -> Result<LauncherUpdateInfo, AppError> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();

    log::info!(
        "Checking for launcher updates (current v{})",
        current_version
    );

    // Clear cached release/tag for the launcher repo so manual checks always query live GitHub
    if let Ok(mut cache) = state.release_cache.lock() {
        cache.remove(LAUNCHER_REPO);
    }
    if let Ok(mut tag_cache) = state.version_tag_cache.lock() {
        tag_cache.remove(LAUNCHER_REPO);
    }

    let release = match fetch_latest_release(LAUNCHER_REPO.to_string(), state).await {
        Ok(rel) => rel,
        Err(e) => {
            log::info!("Update check returned '{}' - assuming launcher is up-to-date", e);
            return Ok(LauncherUpdateInfo {
                current_version: current_version.clone(),
                latest_version: current_version,
                update_available: false,
                release_notes: None,
                download_url: None,
                published_at: None,
            });
        }
    };
    let latest_tag = release.clean_version();
    let current_clean = current_version.trim_start_matches(|c| c == 'v' || c == 'V');

    let update_available = match (
        semver::Version::parse(current_clean),
        semver::Version::parse(latest_tag),
    ) {
        (Ok(current_sem), Ok(latest_sem)) => latest_sem > current_sem,
        _ => latest_tag != current_clean && !latest_tag.is_empty(),
    };

    let download_url = select_asset(
        &release.assets,
        "synapps-launcher",
        current_os(),
        current_arch(),
        ".exe",
    )
    .map(|a| a.browser_download_url)
    .or_else(|| {
        release
            .assets
            .iter()
            .find(|a| a.name.to_ascii_lowercase().ends_with(".exe"))
            .map(|a| a.browser_download_url.clone())
    })
    .or_else(|| {
        select_asset(
            &release.assets,
            "synapps-launcher",
            current_os(),
            current_arch(),
            ".msi",
        )
        .map(|a| a.browser_download_url)
    })
    .or_else(|| release.assets.first().map(|a| a.browser_download_url.clone()));

    log::info!(
        "Update check complete. Latest: {}, available: {}",
        release.tag_name,
        update_available
    );

    Ok(LauncherUpdateInfo {
        current_version,
        latest_version: release.tag_name,
        update_available,
        release_notes: release.body,
        download_url,
        published_at: release.published_at,
    })
}

/// Downloads the latest Synapps Launcher NSIS setup `.exe`, launches it in silent mode
/// to overwrite the current installation, and automatically restarts the updated launcher.
#[tauri::command]
pub async fn install_launcher_update(
    download_url: Option<String>,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let resolved_url = match download_url.filter(|u| !u.trim().is_empty()) {
        Some(url) => url,
        None => {
            let info = check_launcher_update(state.clone()).await?;
            info.download_url.ok_or_else(|| {
                AppError::InstallFailed("Nenhum instalador de atualização encontrado no GitHub.".into())
            })?
        }
    };

    log::info!("Downloading launcher update from {}", resolved_url);

    let response = state
        .http_client
        .get(&resolved_url)
        .send()
        .await
        .map_err(AppError::Network)?;

    if !response.status().is_success() {
        return Err(AppError::InstallFailed(format!(
            "Falha ao baixar atualização do launcher (HTTP {})",
            response.status()
        )));
    }

    let total_size = response.content_length().unwrap_or(0);
    let temp_setup_path = std::env::temp_dir().join("synapps-launcher-update-setup.exe");
    let _ = tokio::fs::remove_file(&temp_setup_path).await;

    let mut file = tokio::fs::File::create(&temp_setup_path).await?;
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let start_instant = std::time::Instant::now();
    let mut last_emit_instant = std::time::Instant::now();

    while let Some(chunk_res) = stream.next().await {
        let chunk = chunk_res.map_err(AppError::Network)?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let now = std::time::Instant::now();
        if now.duration_since(last_emit_instant).as_millis() >= 80
            || (total_size > 0 && downloaded >= total_size)
        {
            last_emit_instant = now;
            let elapsed_secs = start_instant.elapsed().as_secs_f64();
            let speed_bps = if elapsed_secs > 0.05 {
                (downloaded as f64 / elapsed_secs) as u64
            } else {
                0
            };
            let progress = if total_size > 0 {
                ((downloaded as f64 / total_size as f64) * 100.0).min(100.0) as u8
            } else {
                50
            };

            let _ = app_handle.emit(
                "launcher-update-progress",
                LauncherUpdateProgressPayload {
                    downloaded,
                    total: total_size,
                    progress,
                    speed_bps,
                },
            );
        }
    }

    file.flush().await?;
    drop(file);

    let setup_str = temp_setup_path.to_string_lossy().to_string();
    let current_exe_str = std::env::current_exe()
        .ok()
        .map(|p| p.to_string_lossy().to_string());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // Wait ~1.5s for the current process to exit, run the NSIS installer silently (/S),
        // then relaunch the updated executable automatically.
        let batch_cmd = if let Some(exe_path) = current_exe_str {
            format!(
                "ping 127.0.0.1 -n 2 > nul & \"{}\" /S & start \"\" \"{}\"",
                setup_str, exe_path
            )
        } else {
            format!("ping 127.0.0.1 -n 2 > nul & \"{}\"", setup_str)
        };

        std::process::Command::new("cmd")
            .args(["/C", &batch_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| {
                AppError::InstallFailed(format!(
                    "Falha ao iniciar o instalador de atualização: {}",
                    e
                ))
            })?;
    }

    let handle_clone = app_handle.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        handle_clone.exit(0);
    });

    Ok(())
}
