use crate::commands::github::{fetch_latest_release, get_current_install_dir, get_installed_manifest};
use crate::error::AppError;
use crate::models::{get_app_catalog, AppManifest};
use crate::state::AppState;
use crate::utils::platform::{current_arch, current_os};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State, Window};
use tauri_plugin_notification::NotificationExt;
use tokio::io::AsyncWriteExt;
use zip::ZipArchive;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressPayload {
    #[serde(alias = "app_id")]
    pub app_id: String,
    pub progress: f64,
    pub downloaded: u64,
    pub total: u64,
    #[serde(default)]
    pub speed_bps: u64,
    pub phase: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallCompletePayload {
    #[serde(alias = "app_id")]
    pub app_id: String,
    pub version: String,
    #[serde(alias = "installed_version")]
    pub installed_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallErrorPayload {
    #[serde(alias = "app_id")]
    pub app_id: String,
    pub error: String,
}

fn extract_zip(archive_path: &Path, destination: &Path) -> Result<(), AppError> {
    let file = File::open(archive_path)?;
    let mut archive = ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => destination.join(path),
            None => continue,
        };

        if file.is_dir() {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p)?;
                }
            }
            let mut outfile = File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                let _ = std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode));
            }
        }
    }
    Ok(())
}

fn extract_7z(archive_path: &Path, destination: &Path) -> Result<(), AppError> {
    log::info!("Extracting 7z archive {:?} to {:?}", archive_path, destination);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let status = std::process::Command::new("tar")
            .arg("-xf")
            .arg(archive_path)
            .arg("-C")
            .arg(destination)
            .creation_flags(CREATE_NO_WINDOW)
            .status()?;
        if !status.success() {
            return Err(AppError::InstallFailed(format!(
                "Failed to extract 7z archive: tar exited with code {:?}",
                status.code()
            )));
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let status = std::process::Command::new("tar")
            .arg("-xf")
            .arg(archive_path)
            .arg("-C")
            .arg(destination)
            .status()?;
        if !status.success() {
            return Err(AppError::InstallFailed(format!(
                "Failed to extract 7z archive: tar exited with code {:?}",
                status.code()
            )));
        }
        Ok(())
    }
}

fn unpack_nested_archives(destination: &Path) {
    if let Ok(entries) = std::fs::read_dir(destination) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let name = path
                    .file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if name.ends_with(".zip") {
                    log::info!("Detected nested zip archive: {:?}. Unpacking...", path);
                    if let Ok(_) = extract_zip(&path, destination) {
                        let _ = std::fs::remove_file(&path);
                    }
                } else if name.ends_with(".7z") {
                    log::info!("Detected nested 7z archive: {:?}. Unpacking...", path);
                    if let Ok(_) = extract_7z(&path, destination) {
                        let _ = std::fs::remove_file(&path);
                    }
                }
            }
        }
    }
}

/// Runs an NSIS or Inno Setup installer fully silently, extracting into `dest`
/// without requesting administrator rights (RunAsInvoker compatibility layer).
///
/// The installer must NOT live inside `dest` (it would lock its own output file).
#[cfg(target_os = "windows")]
pub fn run_silent_installer(installer: &Path, dest: &Path) -> Result<(), AppError> {
    use crate::utils::platform::{detect_installer_kind, InstallerKind};
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    std::fs::create_dir_all(dest)?;
    let kind = detect_installer_kind(installer);
    log::info!("Running silent installer {:?} (kind: {:?}) into {:?}", installer, kind, dest);

    let status = match kind {
        Some(InstallerKind::Inno) => std::process::Command::new(installer)
            .env("__COMPAT_LAYER", "RunAsInvoker")
            .args(["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/SP-", "/CURRENTUSER", "/NOICONS"])
            .arg(format!("/DIR={}", dest.display()))
            .creation_flags(CREATE_NO_WINDOW)
            .status()?,
        // NSIS: "/D=" must be the LAST parameter and must NOT be quoted, even with spaces,
        // so it is passed raw (Rust would otherwise wrap it in quotes).
        _ => std::process::Command::new(installer)
            .env("__COMPAT_LAYER", "RunAsInvoker")
            .arg("/S")
            .raw_arg(format!("/D={}", dest.display()))
            .creation_flags(CREATE_NO_WINDOW)
            .status()?,
    };

    log::info!("Silent installer exited with code {:?}", status.code());
    if !status.success() {
        return Err(AppError::InstallFailed(format!(
            "Silent installer exited with code {:?}",
            status.code()
        )));
    }
    Ok(())
}

fn is_helper_binary(file_name_lower: &str) -> bool {
    let helper_keywords = [
        "unins",
        "crash",
        "-cli",
        "vc_redist",
        "vcredist",
        "dxsetup",
        "ffmpeg",
        "ffprobe",
        "ffplay",
        "elevate",
        "updater",
        "update.exe",
        "7z.exe",
        "7za.exe",
        "putty",
        "plink",
        "pageant",
    ];
    helper_keywords.iter().any(|kw| file_name_lower.contains(kw))
}

fn collect_executables(dir: &Path, depth: usize, max_depth: usize, out: &mut Vec<PathBuf>) {
    if depth > max_depth {
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            #[cfg(target_os = "macos")]
            if path
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s.eq_ignore_ascii_case("app"))
                .unwrap_or(false)
            {
                out.push(path);
                continue;
            }
            collect_executables(&path, depth + 1, max_depth, out);
        } else if path.is_file() {
            let file_name = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            if is_helper_binary(&file_name) {
                continue;
            }
            #[cfg(target_os = "windows")]
            if path
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s.eq_ignore_ascii_case("exe"))
                .unwrap_or(false)
            {
                out.push(path);
            }
            #[cfg(target_os = "linux")]
            if file_name.ends_with(".appimage") || !file_name.contains('.') {
                out.push(path);
            }
        }
    }
}

pub fn find_executable(app_dir: &Path, app_id: &str) -> Option<PathBuf> {
    let app_id_lower = app_id.to_lowercase();

    #[cfg(target_os = "windows")]
    {
        let direct_exe = app_dir.join(format!("{}.exe", app_id));
        if direct_exe.is_file() {
            return Some(direct_exe);
        }
    }

    #[cfg(target_os = "macos")]
    {
        let direct_app = app_dir.join(format!("{}.app", app_id));
        if direct_app.exists() {
            return Some(direct_app);
        }
    }

    #[cfg(target_os = "linux")]
    {
        let direct_appimage = app_dir.join(format!("{}.AppImage", app_id));
        if direct_appimage.is_file() {
            return Some(direct_appimage);
        }
        let direct_bin = app_dir.join(app_id);
        if direct_bin.is_file() {
            return Some(direct_bin);
        }
    }

    let mut candidates = Vec::new();
    collect_executables(app_dir, 0, 4, &mut candidates);

    // App-specific alias mappings for apps whose binaries differ from the id
    let aliases: &[&str] = match app_id_lower.as_str() {
        "onlyoffice" => &["desktopeditors"],
        "obs" => &["obs64", "obs32"],
        "orcaslicer" => &["orca-slicer"],
        "prusaslicer" => &["prusa-slicer"],
        "superproductivity" => &["superproductivity", "super-productivity"],
        "fontforge" => &["run_fontforge"],
        "gimp" => &["gimp-3.0", "gimp-2.10", "gimp"],
        "krita" => &["krita"],
        "blender" => &["blender"],
        _ => &[],
    };

    // Priority 0: Exact stem match with known preferred launchers/aliases
    // (e.g., "run_fontforge.exe", "desktopeditors.exe", "obs64.exe")
    for cand in &candidates {
        let stem = cand
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        if aliases.iter().any(|&alias| stem == alias) {
            return Some(cand.clone());
        }
    }

    // Priority 1: Exact stem match with app_id (e.g., "shotcut.exe", "audacity.exe", "freecad.exe", "dust3d.exe")
    for cand in &candidates {
        let stem = cand
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        if stem == app_id_lower {
            return Some(cand.clone());
        }
    }

    // Priority 1b: Exact stem match with known aliases (e.g., "desktopeditors.exe", "obs64.exe")
    for cand in &candidates {
        let stem = cand
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        if aliases.iter().any(|&alias| stem == alias) {
            return Some(cand.clone());
        }
    }

    // Priority 2: Filename contains app_id (e.g., "obs64.exe", "Godot_v4.4-stable_win64.exe", "orca-slicer.exe", "prusa-slicer.exe")
    let normalized_id = app_id_lower.replace('-', "").replace('_', "");
    for cand in &candidates {
        let stem = cand
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase()
            .replace('-', "")
            .replace('_', "");
        if stem.contains(&normalized_id) && !stem.contains("console") {
            return Some(cand.clone());
        }
    }

    // Priority 3: First non-setup executable found
    for cand in &candidates {
        let name = cand
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !name.contains("setup") && !name.contains("install") {
            return Some(cand.clone());
        }
    }

    if let Some(cand) = candidates.into_iter().next() {
        return Some(cand);
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let possible_paths = [
                PathBuf::from(&local_app_data).join("Programs").join(app_id).join(format!("{}.exe", app_id)),
                PathBuf::from(&local_app_data).join(app_id).join(format!("{}.exe", app_id)),
            ];
            for p in &possible_paths {
                if p.is_file() {
                    return Some(p.clone());
                }
            }
        }
    }

    None
}

#[tauri::command]
pub async fn install_app(
    app_id: String,
    _window: Window,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<InstallCompletePayload, AppError> {
    log::info!("Starting installation for app: {}", app_id);

    let catalog = get_app_catalog();
    let app = catalog
        .iter()
        .find(|a| a.id.eq_ignore_ascii_case(&app_id))
        .ok_or_else(|| AppError::AppNotFound(app_id.clone()))?;

    // Special handling for Graphite (cloud/web vector editor)
    if app.id.eq_ignore_ascii_case("graphite") {
        log::info!("Installing Graphite as standalone desktop application...");
        let install_dir = get_current_install_dir(&app_handle, &state);
        let target_app_dir = install_dir.join(&app.id);
        tokio::fs::create_dir_all(&target_app_dir).await?;

        let _ = app_handle.emit(
            "download-progress",
            DownloadProgressPayload {
                app_id: app_id.clone(),
                progress: 50.0,
                downloaded: 1,
                total: 1,
                speed_bps: 0,
                phase: "installing".to_string(),
            },
        );

        #[cfg(target_os = "windows")]
        {
            let script_content = "@echo off\r\nstart \"\" https://editor.graphite.art\r\n";
            let _ = tokio::fs::write(target_app_dir.join("graphite.cmd"), script_content).await;
        }

        let exe_path = target_app_dir.join("graphite.cmd").to_string_lossy().to_string();
        let manifest = AppManifest {
            app_id: app.id.clone(),
            version: "1.0 (Web/Desktop)".to_string(),
            installed_at: chrono_like_now(),
            executable_path: exe_path,
            asset_name: "graphite-web-desktop".to_string(),
        };
        let manifest_json = serde_json::to_string_pretty(&manifest)?;
        tokio::fs::write(target_app_dir.join("manifest.json"), manifest_json).await?;

        let _ = app_handle.emit(
            "download-progress",
            DownloadProgressPayload {
                app_id: app_id.clone(),
                progress: 100.0,
                downloaded: 1,
                total: 1,
                speed_bps: 0,
                phase: "installing".to_string(),
            },
        );

        let payload = InstallCompletePayload {
            app_id: app.id.clone(),
            version: "1.0".to_string(),
            installed_version: "1.0 (Web/Desktop)".to_string(),
        };
        let _ = app_handle.emit("install-complete", payload.clone());
        return Ok(payload);
    }

    let release = match fetch_latest_release(app.repo.clone(), state.clone()).await {
        Ok(r) => r,
        Err(e) => {
            let err_msg = format!("Failed to fetch release for {}: {}", app.name, e);
            let _ = app_handle.emit(
                "install-error",
                InstallErrorPayload {
                    app_id: app_id.clone(),
                    error: err_msg.clone(),
                },
            );
            return Err(AppError::GitHub(err_msg));
        }
    };

    let os = current_os();
    let arch = current_arch();
    let candidates = crate::utils::platform::select_best_assets(&release.assets, &app.id, os, arch);

    if candidates.is_empty() {
        let err_msg = format!("No compatible installation assets found for {}", app.name);
        let _ = app_handle.emit(
            "install-error",
            InstallErrorPayload {
                app_id: app_id.clone(),
                error: err_msg.clone(),
            },
        );
        return Err(AppError::InstallFailed(err_msg));
    }

    let cancel_flag = Arc::new(AtomicBool::new(false));
    if let Ok(mut flags) = state.download_cancel_flags.lock() {
        flags.insert(app_id.clone(), cancel_flag.clone());
    }

    let mut last_error: Option<String> = None;
    let mut was_cancelled = false;

    for asset in &candidates {
        if cancel_flag.load(Ordering::Relaxed) {
            was_cancelled = true;
            break;
        }
        log::info!("Attempting installation with candidate asset: {}", asset.name);

        let temp_dir = std::env::temp_dir().join("synapps_downloads");
        tokio::fs::create_dir_all(&temp_dir).await?;
        let download_path = temp_dir.join(&asset.name);
        let part_path = temp_dir.join(format!("{}.part", asset.name));

        let download_result: Result<(), AppError> = async {
            let response = state
                .download_client
                .get(&asset.browser_download_url)
                .send()
                .await?;
            if !response.status().is_success() {
                return Err(AppError::Network(response.error_for_status().unwrap_err()));
            }

            let total_size = response.content_length().unwrap_or(asset.size);
            let mut stream = response.bytes_stream();
            let mut file = tokio::fs::File::create(&part_path).await?;
            let mut downloaded: u64 = 0;
            let start_time = Instant::now();
            let mut last_emit = Instant::now();

            let _ = app_handle.emit(
                "download-progress",
                DownloadProgressPayload {
                    app_id: app_id.clone(),
                    progress: 0.0,
                    downloaded: 0,
                    total: total_size,
                    speed_bps: 0,
                    phase: "downloading".to_string(),
                },
            );

            while let Some(chunk_res) = stream.next().await {
                if cancel_flag.load(Ordering::Relaxed) {
                    drop(file);
                    let _ = tokio::fs::remove_file(&part_path).await;
                    return Err(AppError::InstallFailed("__CANCELLED__".to_string()));
                }

                let chunk = chunk_res?;
                file.write_all(&chunk).await?;
                downloaded += chunk.len() as u64;

                if last_emit.elapsed().as_millis() > 150 || (total_size > 0 && downloaded >= total_size) {
                    let progress = if total_size > 0 {
                        (downloaded as f64 / total_size as f64) * 100.0
                    } else {
                        50.0
                    };
                    let elapsed_secs = start_time.elapsed().as_secs_f64();
                    let speed_bps = if elapsed_secs > 0.05 {
                        (downloaded as f64 / elapsed_secs) as u64
                    } else {
                        0
                    };
                    let _ = app_handle.emit(
                        "download-progress",
                        DownloadProgressPayload {
                            app_id: app_id.clone(),
                            progress,
                            downloaded,
                            total: total_size,
                            speed_bps,
                            phase: "downloading".to_string(),
                        },
                    );
                    last_emit = Instant::now();
                }
            }
            file.flush().await?;
            drop(file);

            if total_size > 0 && downloaded < total_size {
                let _ = tokio::fs::remove_file(&part_path).await;
                return Err(AppError::InstallFailed(format!(
                    "Incomplete download ({} of {} bytes received)",
                    downloaded, total_size
                )));
            }

            if download_path.exists() {
                let _ = tokio::fs::remove_file(&download_path).await;
            }
            tokio::fs::rename(&part_path, &download_path).await?;
            Ok(())
        }
        .await;

        if let Err(e) = download_result {
            let err_str = e.to_string();
            let _ = tokio::fs::remove_file(&part_path).await;
            if err_str.contains("__CANCELLED__") || cancel_flag.load(Ordering::Relaxed) {
                was_cancelled = true;
                break;
            }
            let msg = format!("Download failed for {}: {}", asset.name, e);
            log::warn!("{}. Trying next candidate...", msg);
            last_error = Some(msg);
            continue;
        }

        // Installation Phase
        let install_dir = get_current_install_dir(&app_handle, &state);
        let target_app_dir = install_dir.join(&app.id);

        // Clean previous installation attempt to ensure atomic update
        if target_app_dir.exists() {
            let _ = tokio::fs::remove_dir_all(&target_app_dir).await;
        }
        tokio::fs::create_dir_all(&target_app_dir).await?;

        let _ = app_handle.emit(
            "download-progress",
            DownloadProgressPayload {
                app_id: app_id.clone(),
                progress: 100.0,
                downloaded: 0,
                total: 0,
                speed_bps: 0,
                phase: "installing".to_string(),
            },
        );

        let asset_name_lower = asset.name.to_lowercase();
        let install_result: Result<(), AppError> = if asset_name_lower.ends_with(".zip") {
            tokio::task::spawn_blocking({
                let archive_path = download_path.clone();
                let dest = target_app_dir.clone();
                move || {
                    extract_zip(&archive_path, &dest)?;
                    unpack_nested_archives(&dest);
                    Ok(())
                }
            })
            .await
            .map_err(|e| AppError::InstallFailed(format!("Thread panic: {}", e)))?
        } else if asset_name_lower.ends_with(".7z") {
            tokio::task::spawn_blocking({
                let archive_path = download_path.clone();
                let dest = target_app_dir.clone();
                move || {
                    extract_7z(&archive_path, &dest)?;
                    unpack_nested_archives(&dest);
                    Ok(())
                }
            })
            .await
            .map_err(|e| AppError::InstallFailed(format!("Thread panic: {}", e)))?
        } else if asset_name_lower.ends_with(".msi") {
            #[cfg(target_os = "windows")]
            {
                let status = tokio::process::Command::new("msiexec")
                    .arg("/i")
                    .arg(&download_path)
                    .arg("/quiet")
                    .arg("/norestart")
                    .arg(format!("TARGETDIR={}", target_app_dir.display()))
                    .status()
                    .await?;
                let code = status.code().unwrap_or(-1);
                if code != 0 && code != 3010 {
                    if code == 1633 {
                        log::warn!("MSI error 1633: incompatible architecture. Trying fallback...");
                        Err(AppError::InstallFailed("1633".to_string()))
                    } else {
                        Err(AppError::InstallFailed(format!("msiexec error {}", code)))
                    }
                } else {
                    unpack_nested_archives(&target_app_dir);
                    Ok(())
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                Err(AppError::InstallFailed("MSI only on Windows".to_string()))
            }
        } else if asset_name_lower.ends_with(".exe") {
            #[cfg(target_os = "windows")]
            {
                let is_explicit_portable = asset_name_lower.contains("portable");
                let is_installer = !is_explicit_portable
                    && (asset_name_lower.contains("setup")
                        || asset_name_lower.contains("install")
                        || crate::utils::platform::is_installer_binary(&download_path));

                if is_installer {
                    log::info!(
                        "Detected installer executable: {}. Running silent installation...",
                        asset.name
                    );
                    let installer = download_path.clone();
                    let dest = target_app_dir.clone();
                    tokio::task::spawn_blocking(move || run_silent_installer(&installer, &dest))
                        .await
                        .map_err(|e| AppError::InstallFailed(format!("Thread panic: {}", e)))??;
                }

                unpack_nested_archives(&target_app_dir);

                // If not an installer or if it's explicitly portable, copy directly to target_app_dir
                if find_executable(&target_app_dir, &app.id).is_none() {
                    if !is_installer {
                        tokio::fs::copy(
                            &download_path,
                            target_app_dir.join(format!("{}.exe", app.id)),
                        )
                        .await?;
                    }
                }
                Ok(())
            }
            #[cfg(not(target_os = "windows"))]
            {
                tokio::fs::copy(&download_path, target_app_dir.join(&asset.name)).await?;
                Ok(())
            }
        } else {
            let dest_file = target_app_dir.join(&asset.name);
            tokio::fs::copy(&download_path, &dest_file).await?;
            unpack_nested_archives(&target_app_dir);
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(meta) = std::fs::metadata(&dest_file) {
                    let mut perms = meta.permissions();
                    perms.set_mode(0o755);
                    let _ = std::fs::set_permissions(&dest_file, perms);
                }
            }
            Ok(())
        };

        if let Err(e) = install_result {
            let msg = format!("Extraction/execution failed for {}: {}", asset.name, e);
            log::warn!("{}. Trying next candidate...", msg);
            last_error = Some(msg);
            let _ = tokio::fs::remove_file(&download_path).await;
            continue;
        }

        // Verify that a valid executable exists
        let exe_path = find_executable(&target_app_dir, &app.id)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        if exe_path.is_empty() {
            let msg = format!("No executable found after extracting {}.", asset.name);
            log::warn!("{}. Trying next candidate...", msg);
            last_error = Some(msg);
            let _ = tokio::fs::remove_file(&download_path).await;
            continue;
        }

        log::info!("Verified executable found at: {}", exe_path);

        let manifest = AppManifest {
            app_id: app.id.clone(),
            version: release.tag_name.clone(),
            installed_at: chrono_like_now(),
            executable_path: exe_path,
            asset_name: asset.name.clone(),
        };
        let manifest_json = serde_json::to_string_pretty(&manifest)?;
        tokio::fs::write(target_app_dir.join("manifest.json"), manifest_json).await?;

        // Clean temporary archive after successful installation
        let _ = tokio::fs::remove_file(&download_path).await;
        if let Ok(mut flags) = state.download_cancel_flags.lock() {
            flags.remove(&app_id);
        }

        let payload = InstallCompletePayload {
            app_id: app.id.clone(),
            version: release.tag_name.clone(),
            installed_version: release.tag_name.clone(),
        };

        let _ = app_handle.emit("install-complete", payload.clone());
        return Ok(payload);
    }

    if let Ok(mut flags) = state.download_cancel_flags.lock() {
        flags.remove(&app_id);
    }

    if was_cancelled {
        let cancel_msg = "__CANCELLED__".to_string();
        return Err(AppError::InstallFailed(cancel_msg));
    }

    let final_err = last_error
        .unwrap_or_else(|| "No compatible installation assets succeeded".to_string());
    log::error!("All candidates failed for {}: {}", app.name, final_err);
    let _ = app_handle.emit(
        "install-error",
        InstallErrorPayload {
            app_id: app_id.clone(),
            error: final_err.clone(),
        },
    );
    Err(AppError::InstallFailed(final_err))
}

#[tauri::command]
pub async fn cancel_install(
    app_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    log::info!("Cancelling installation for app: {}", app_id);
    if let Ok(flags) = state.download_cancel_flags.lock() {
        if let Some(flag) = flags.get(&app_id) {
            flag.store(true, Ordering::Relaxed);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn open_app_folder(
    app_id: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let install_dir = get_current_install_dir(&app_handle, &state);
    let mut folder_to_open = install_dir.join(&app_id);

    if let Some(manifest) = get_installed_manifest(&install_dir, &app_id) {
        let exe_path = PathBuf::from(&manifest.executable_path);
        if exe_path.exists() {
            if let Some(parent) = exe_path.parent() {
                folder_to_open = parent.to_path_buf();
            }
        }
    }

    if !folder_to_open.exists() {
        return Err(AppError::ExecutionFailed(format!(
            "Diretório do aplicativo '{}' não encontrado.",
            app_id
        )));
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&folder_to_open)
            .spawn()?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = open::that(&folder_to_open);
    }
    Ok(())
}

#[tauri::command]
pub async fn create_desktop_shortcut(
    app_id: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let catalog = get_app_catalog();
    let app = catalog
        .iter()
        .find(|a| a.id.eq_ignore_ascii_case(&app_id))
        .ok_or_else(|| AppError::AppNotFound(app_id.clone()))?;

    let install_dir = get_current_install_dir(&app_handle, &state);
    let app_dir = install_dir.join(&app_id);
    let mut exe_path: Option<PathBuf> = None;

    if let Some(manifest) = get_installed_manifest(&install_dir, &app_id) {
        let p = PathBuf::from(&manifest.executable_path);
        if p.is_file() {
            exe_path = Some(p);
        }
    }
    if exe_path.is_none() {
        exe_path = find_executable(&app_dir, &app_id);
    }

    let exe_path = exe_path.ok_or_else(|| {
        AppError::ExecutionFailed(format!("Executável de {} não encontrado.", app.name))
    })?;

    let desktop_dir = dirs::desktop_dir().ok_or_else(|| {
        AppError::ExecutionFailed("Não foi possível localizar a Área de Trabalho.".to_string())
    })?;
    let shortcut_path = desktop_dir.join(format!("{}.lnk", app.name));

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let work_dir = exe_path.parent().unwrap_or(&app_dir);
        let ps_script = format!(
            "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); $s.TargetPath = '{}'; $s.WorkingDirectory = '{}'; $s.Save()",
            shortcut_path.to_string_lossy().replace('\'', "''"),
            exe_path.to_string_lossy().replace('\'', "''"),
            work_dir.to_string_lossy().replace('\'', "''")
        );
        let status = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
            .creation_flags(CREATE_NO_WINDOW)
            .status()?;

        if !status.success() {
            return Err(AppError::ExecutionFailed(
                "Falha ao criar atalho na Área de Trabalho.".to_string(),
            ));
        }
    }

    Ok(())
}

fn compute_dir_size(dir: &Path, depth: usize, max_depth: usize) -> u64 {
    if depth > max_depth {
        return 0;
    }
    let Ok(entries) = std::fs::read_dir(dir) else {
        return 0;
    };
    let mut total: u64 = 0;
    for entry in entries.flatten() {
        let path = entry.path();
        if let Ok(meta) = entry.metadata() {
            if meta.is_file() {
                total = total.saturating_add(meta.len());
            } else if meta.is_dir() {
                total = total.saturating_add(compute_dir_size(&path, depth + 1, max_depth));
            }
        }
    }
    total
}

#[tauri::command]
pub async fn get_app_disk_usage(
    app_id: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<u64, AppError> {
    let install_dir = get_current_install_dir(&app_handle, &state);
    let app_dir = install_dir.join(&app_id);

    let target_dir = if let Some(manifest) = get_installed_manifest(&install_dir, &app_id) {
        let exe_path = PathBuf::from(&manifest.executable_path);
        if manifest.asset_name == "external-linked" {
            exe_path.parent().map(|p| p.to_path_buf()).unwrap_or(app_dir)
        } else {
            app_dir
        }
    } else {
        app_dir
    };

    if !target_dir.exists() {
        return Ok(0);
    }

    let bytes = tokio::task::spawn_blocking(move || compute_dir_size(&target_dir, 0, 5))
        .await
        .unwrap_or(0);
    Ok(bytes)
}

#[tauri::command]
pub async fn link_existing_app(
    app_id: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Option<InstallCompletePayload>, AppError> {
    use tauri_plugin_dialog::DialogExt;

    let catalog = get_app_catalog();
    let app = catalog
        .iter()
        .find(|a| a.id.eq_ignore_ascii_case(&app_id))
        .ok_or_else(|| AppError::AppNotFound(app_id.clone()))?;

    let (tx, rx) = tokio::sync::oneshot::channel();
    app_handle
        .dialog()
        .file()
        .set_title(&format!("Localizar executável de {}", app.name))
        .add_filter("Aplicativo Executável (*.exe)", &["exe"])
        .pick_file(move |picked| {
            let path_opt = picked.and_then(|fp| match fp {
                tauri_plugin_dialog::FilePath::Path(p) => Some(p),
                _ => None,
            });
            let _ = tx.send(path_opt);
        });

    let Some(exe_path) = rx.await.ok().flatten() else {
        return Ok(None);
    };

    let install_dir = get_current_install_dir(&app_handle, &state);
    let target_app_dir = install_dir.join(&app.id);
    tokio::fs::create_dir_all(&target_app_dir).await?;

    let latest_ver = crate::commands::github::fetch_latest_version_tag(&app.repo, &state)
        .await
        .unwrap_or_else(|| "Sistema".to_string());

    let manifest = AppManifest {
        app_id: app.id.clone(),
        version: latest_ver.clone(),
        installed_at: chrono_like_now(),
        executable_path: exe_path.to_string_lossy().to_string(),
        asset_name: "external-linked".to_string(),
    };
    let manifest_json = serde_json::to_string_pretty(&manifest)?;
    tokio::fs::write(target_app_dir.join("manifest.json"), manifest_json).await?;

    let payload = InstallCompletePayload {
        app_id: app.id.clone(),
        version: latest_ver.clone(),
        installed_version: latest_ver,
    };
    let _ = app_handle.emit("install-complete", payload.clone());
    Ok(Some(payload))
}

#[tauri::command]
pub async fn scan_system_apps(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Vec<InstallCompletePayload>, AppError> {
    let install_dir = get_current_install_dir(&app_handle, &state);
    let catalog = get_app_catalog();
    let mut newly_linked = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let mut search_roots = Vec::new();
        if let Ok(pf) = std::env::var("ProgramFiles") {
            search_roots.push(PathBuf::from(pf));
        }
        if let Ok(pf86) = std::env::var("ProgramFiles(x86)") {
            search_roots.push(PathBuf::from(pf86));
        }
        if let Ok(local_app) = std::env::var("LOCALAPPDATA") {
            let local_path = PathBuf::from(&local_app);
            search_roots.push(local_path.join("Programs"));
            search_roots.push(local_path);
        }

        let known_locations: &[(&str, &[&str])] = &[
            ("blender", &["Blender Foundation\\Blender 4.3\\blender.exe", "Blender Foundation\\Blender 4.2\\blender.exe", "Blender Foundation\\Blender 4.1\\blender.exe", "Blender Foundation\\Blender 4.0\\blender.exe", "Blender Foundation\\Blender\\blender.exe"]),
            ("gimp", &["GIMP 3\\bin\\gimp-3.0.exe", "GIMP 2\\bin\\gimp-2.10.exe", "GIMP\\bin\\gimp.exe"]),
            ("krita", &["Krita (x64)\\bin\\krita.exe", "Krita\\bin\\krita.exe"]),
            ("obs", &["obs-studio\\bin\\64bit\\obs64.exe"]),
            ("audacity", &["Audacity\\Audacity.exe"]),
            ("shotcut", &["Shotcut\\shotcut.exe"]),
            ("freecad", &["FreeCAD 1.0\\bin\\freecad.exe", "FreeCAD\\bin\\freecad.exe"]),
            ("librecad", &["LibreCAD\\LibreCAD.exe"]),
            ("sharex", &["ShareX\\ShareX.exe"]),
            ("imageglass", &["ImageGlass\\ImageGlass.exe"]),
            ("onlyoffice", &["ONLYOFFICE\\DesktopEditors\\DesktopEditors.exe"]),
            ("lmms", &["LMMS\\lmms.exe"]),
            ("orcaslicer", &["OrcaSlicer\\orca-slicer.exe"]),
            ("prusaslicer", &["Prusa3D\\PrusaSlicer\\prusa-slicer.exe"]),
            ("fontforge", &["FontForgeBuilds\\run_fontforge.exe", "FontForgeBuilds\\bin\\fontforge.exe"]),
            ("upscayl", &["Upscayl\\Upscayl.exe", "upscayl\\Upscayl.exe"]),
            ("superproductivity", &["superProductivity\\Super Productivity.exe", "Super Productivity\\Super Productivity.exe"]),
            ("appflowy", &["AppFlowy\\AppFlowy.exe"]),
            ("affine", &["AFFiNE\\AFFiNE.exe"]),
            ("blockbench", &["Blockbench\\Blockbench.exe"]),
        ];

        for (app_id, rel_paths) in known_locations {
            if get_installed_manifest(&install_dir, app_id).is_some() {
                continue;
            }
            let mut found_exe: Option<PathBuf> = None;
            for root in &search_roots {
                for rel in *rel_paths {
                    let candidate = root.join(rel);
                    if candidate.is_file() {
                        found_exe = Some(candidate);
                        break;
                    }
                }
                if found_exe.is_some() {
                    break;
                }
            }

            if let Some(exe_path) = found_exe {
                if let Some(app) = catalog.iter().find(|a| a.id == *app_id) {
                    let target_app_dir = install_dir.join(&app.id);
                    let _ = tokio::fs::create_dir_all(&target_app_dir).await;
                    let ver = crate::commands::github::fetch_latest_version_tag(&app.repo, &state)
                        .await
                        .unwrap_or_else(|| "Sistema".to_string());
                    let manifest = AppManifest {
                        app_id: app.id.clone(),
                        version: ver.clone(),
                        installed_at: chrono_like_now(),
                        executable_path: exe_path.to_string_lossy().to_string(),
                        asset_name: "external-linked".to_string(),
                    };
                    if let Ok(json) = serde_json::to_string_pretty(&manifest) {
                        let _ = tokio::fs::write(target_app_dir.join("manifest.json"), json).await;
                        let payload = InstallCompletePayload {
                            app_id: app.id.clone(),
                            version: ver.clone(),
                            installed_version: ver,
                        };
                        let _ = app_handle.emit("install-complete", payload.clone());
                        newly_linked.push(payload);
                    }
                }
            }
        }
    }

    Ok(newly_linked)
}

#[tauri::command]
pub async fn uninstall_app(
    app_id: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    log::info!("Uninstalling app: {}", app_id);
    let install_dir = get_current_install_dir(&app_handle, &state);
    let target_app_dir = install_dir.join(&app_id);
    if target_app_dir.exists() {
        tokio::fs::remove_dir_all(&target_app_dir).await?;
    }
    let catalog = get_app_catalog();
    let app_name = catalog.iter().find(|a| a.id.eq_ignore_ascii_case(&app_id)).map(|a| a.name.as_str()).unwrap_or(&app_id);
    let _ = app_handle.notification().builder().title("Synapps").body(format!("{} has been uninstalled.", app_name)).show();
    Ok(())
}

fn chrono_like_now() -> String {
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{}", duration.as_secs())
}
