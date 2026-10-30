use crate::commands::github::fetch_latest_release;
use crate::error::AppError;
use crate::state::AppState;
use crate::utils::platform::{current_arch, current_os, select_asset};
use serde::{Deserialize, Serialize};
use tauri::State;

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

    let release = match fetch_latest_release("Krowlex95/synapps-launcher".to_string(), state).await {
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
    .or_else(|| select_asset(
        &release.assets,
        "synapps-launcher",
        current_os(),
        current_arch(),
        ".msi",
    ).map(|a| a.browser_download_url))
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
