use crate::error::AppError;
use crate::models::{
    get_app_catalog, AppManifest, AppStateInfo, AppStatus, Release, ReleaseAsset, UserSettings,
};
use crate::state::AppState;
use futures_util::future::join_all;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;
use tokio::sync::Semaphore;

/// Normalizes a repository identifier.
/// If `repo` already contains `'/'` (e.g. `"blender/blender"` or `"inkscape/inkscape"`),
/// it is used directly. Otherwise it defaults to `"storytold/{repo}"`.
pub fn resolve_repo_slug(repo: &str) -> String {
    let trimmed = repo.trim().trim_matches('/');
    if trimmed.contains('/') {
        trimmed.to_string()
    } else {
        format!("storytold/{}", trimmed)
    }
}

/// Official mirror release descriptors for open-source applications that host Windows binaries
/// on their own official CDN mirrors (`download.gimp.org`, `download.kde.org`, `download.blender.org`)
/// instead of GitHub Releases.
fn resolve_external_mirror_release(slug: &str) -> Option<Release> {
    match slug.to_ascii_lowercase().as_str() {
        "gnome/gimp" | "storytold/gimp" => Some(Release {
            tag_name: "v3.0.0".to_string(),
            name: Some("GIMP 3.0.0".to_string()),
            body: Some(
                "• Nova arquitetura baseada em GTK3 com suporte completo a telas HiDPI\n• Edição não-destrutiva de filtros e efeitos nas camadas\n• Gerenciamento de cores aprimorado e suporte expandido a arquivos PSD, TIFF e XCF\n• Interface modernizada e melhor suporte a mesas digitalizadoras no Windows".to_string(),
            ),
            published_at: Some("2025-03-16T12:00:00Z".to_string()),
            prerelease: Some(false),
            draft: Some(false),
            assets: vec![
                ReleaseAsset {
                    name: "gimp-3.0.0-setup.exe".to_string(),
                    browser_download_url: "https://download.gimp.org/gimp/v3.0/windows/gimp-3.0.0-setup.exe".to_string(),
                    size: 385_298_496,
                    content_type: Some("application/x-msdownload".to_string()),
                },
                ReleaseAsset {
                    name: "gimp-2.10.38-setup.exe".to_string(),
                    browser_download_url: "https://download.gimp.org/gimp/v2.10/windows/gimp-2.10.38-setup.exe".to_string(),
                    size: 344_465_496,
                    content_type: Some("application/x-msdownload".to_string()),
                },
            ],
        }),
        "kde/krita" | "storytold/krita" => Some(Release {
            tag_name: "v5.2.9".to_string(),
            name: Some("Krita 5.2.9".to_string()),
            body: Some(
                "• Motor de pincéis otimizado para pintura digital e ilustração profissional\n• Melhorias na linha do tempo de animação 2D quadro a quadro e áudio sincronizado\n• Correções de estabilidade no gerenciamento de camadas, máscaras de transformação e texto SVG\n• Pacote portátil Windows x64 otimizado para resposta imediata de canetas e tablets".to_string(),
            ),
            published_at: Some("2025-01-29T12:00:00Z".to_string()),
            prerelease: Some(false),
            draft: Some(false),
            assets: vec![ReleaseAsset {
                name: "krita-x64-5.2.9.zip".to_string(),
                browser_download_url: "https://download.kde.org/stable/krita/5.2.9/krita-x64-5.2.9.zip".to_string(),
                size: 210_995_796,
                content_type: Some("application/zip".to_string()),
            }],
        }),
        "blender/blender" | "storytold/blender" => Some(Release {
            tag_name: "v4.3.2".to_string(),
            name: Some("Blender 4.3.2".to_string()),
            body: Some(
                "• EEVEE Next com iluminação global aprimorada e sombras por raytracing em tempo real\n• Grease Pencil 3 totalmente integrado com Geometry Nodes e camadas renovadas\n• Novos pincéis de escultura 3D, melhorias de UV unwrap e renderização Cycles acelerada por GPU\n• Correções de estabilidade e desempenho para projetos complexos no Windows x64".to_string(),
            ),
            published_at: Some("2024-12-17T12:00:00Z".to_string()),
            prerelease: Some(false),
            draft: Some(false),
            assets: vec![ReleaseAsset {
                name: "blender-4.3.2-windows-x64.zip".to_string(),
                browser_download_url: "https://download.blender.org/release/Blender4.3/blender-4.3.2-windows-x64.zip".to_string(),
                size: 405_138_423,
                content_type: Some("application/zip".to_string()),
            }],
        }),
        _ => None,
    }
}

/// Checks the latest release version tag of a GitHub repository WITHOUT consuming
/// any GitHub REST API rate-limit quota, by inspecting the 302 redirect `Location` header
/// of `https://github.com/{owner}/{repo}/releases/latest`.
pub async fn fetch_latest_version_tag(repo: &str, state: &AppState) -> Option<String> {
    let slug = resolve_repo_slug(repo);

    if let Some(mirror_rel) = resolve_external_mirror_release(&slug) {
        return Some(mirror_rel.tag_name);
    }

    // 1. Check 30-minute tag cache
    if let Some(tag) = state.get_cached_version_tag(&slug, Duration::from_secs(1800)) {
        return Some(tag);
    }

    // 2. Request web redirect (0 REST API quota cost) via HEAD
    let web_url = format!("https://github.com/{}/releases/latest", slug);
    if let Ok(resp) = state.no_redirect_client.head(&web_url).send().await {
        if let Some(loc) = resp.headers().get(reqwest::header::LOCATION) {
            if let Ok(loc_str) = loc.to_str() {
                if let Some((_, tag)) = loc_str.rsplit_once("/releases/tag/") {
                    let clean_tag = tag.split(&['?', '#'][..]).next().unwrap_or(tag).to_string();
                    if !clean_tag.is_empty() {
                        state.cache_version_tag(slug.clone(), clean_tag.clone());
                        return Some(clean_tag);
                    }
                }
            }
        }
    }

    // 3. Request web redirect via GET (follows 302 and gives final tag URL)
    if let Ok(resp) = state.http_client.get(&web_url).send().await {
        let final_url = resp.url().as_str();
        if let Some((_, tag)) = final_url.rsplit_once("/releases/tag/") {
            let clean_tag = tag.split(&['?', '#'][..]).next().unwrap_or(tag).to_string();
            if !clean_tag.is_empty() {
                state.cache_version_tag(slug.clone(), clean_tag.clone());
                return Some(clean_tag);
            }
        }
    }

    // 4. Scrape releases page directly for first tag
    let releases_page = format!("https://github.com/{}/releases", slug);
    if let Ok(resp) = state.http_client.get(&releases_page).send().await {
        if let Ok(html) = resp.text().await {
            let marker = format!("/{}/releases/tag/", slug);
            if let Some(pos) = html.find(&marker) {
                let rest = &html[pos + marker.len()..];
                if let Some(end) = rest.find(&['"', '\'', '/', '?', '#', '>', ' '][..]) {
                    let tag = &rest[..end];
                    if !tag.is_empty() {
                        let clean_tag = tag.to_string();
                        state.cache_version_tag(slug.clone(), clean_tag.clone());
                        return Some(clean_tag);
                    }
                }
            }
        }
    }

    // 5. Fallback to cached release if available
    if let Some((stale_rel, _)) = state.get_stale_release_with_etag(&slug) {
        return Some(stale_rel.tag_name);
    }

    None
}

/// Strips HTML tags and decodes common HTML entities into clean plain text / markdown bullets.
fn html_to_clean_text(html: &str) -> String {
    let mut text = html
        .replace("<li>", "\n• ")
        .replace("</li>", "")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .replace("</p>", "\n\n")
        .replace("</h1>", "\n")
        .replace("</h2>", "\n")
        .replace("</h3>", "\n")
        .replace("</h4>", "\n");

    let mut out = String::with_capacity(text.len());
    let mut in_tag = false;
    for ch in text.chars() {
        if ch == '<' {
            in_tag = true;
        } else if ch == '>' {
            in_tag = false;
        } else if !in_tag {
            out.push(ch);
        }
    }

    text = out
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ");

    let lines: Vec<&str> = text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();
    lines.join("\n")
}

/// Fallback scraper that builds a `Release` (including all downloadable assets, release notes, and date)
/// directly from GitHub's web endpoints (`releases/expanded_assets/{tag}` and `releases/tag/{tag}`)
/// without touching `api.github.com` (0 API rate-limit cost).
async fn fetch_release_via_web_fallback(slug: &str, state: &AppState) -> Result<Release, AppError> {
    log::info!("Using web fallback (rate-limit-free) to fetch release assets for '{}'", slug);

    let tag_name = fetch_latest_version_tag(slug, state)
        .await
        .ok_or_else(|| AppError::GitHub(format!("No published releases found for '{}'", slug)))?;

    let mut assets = Vec::new();
    let mut body: Option<String> = None;
    let mut published_at: Option<String> = None;
    let download_marker = "/releases/download/";

    let tag_url = format!("https://github.com/{}/releases/tag/{}", slug, tag_name);
    if let Ok(resp) = state.http_client.get(&tag_url).send().await {
        if let Ok(html) = resp.text().await {
            if let Some(dt_idx) = html.find("datetime=\"") {
                let rest = &html[dt_idx + 10..];
                if let Some(end_idx) = rest.find('"') {
                    published_at = Some(rest[..end_idx].to_string());
                }
            }
            if let Some(md_idx) = html.find("markdown-body") {
                if let Some(gt_idx) = html[md_idx..].find('>') {
                    let content_start = md_idx + gt_idx + 1;
                    if let Some(div_end) = html[content_start..].find("</div>") {
                        let cleaned = html_to_clean_text(&html[content_start..content_start + div_end]);
                        if !cleaned.is_empty() {
                            body = Some(cleaned);
                        }
                    }
                }
            }
            for part in html.split("href=\"") {
                if let Some(end_idx) = part.find('"') {
                    let href = &part[..end_idx];
                    if href.contains(download_marker) {
                        let name = href
                            .rsplit('/')
                            .next()
                            .unwrap_or("")
                            .split(&['?', '#'][..])
                            .next()
                            .unwrap_or("")
                            .to_string();

                        if !name.is_empty() {
                            let browser_download_url = if href.starts_with("http") {
                                href.to_string()
                            } else {
                                format!("https://github.com{}", href)
                            };

                            if !assets.iter().any(|a: &ReleaseAsset| a.name == name) {
                                assets.push(ReleaseAsset {
                                    name,
                                    browser_download_url,
                                    size: 0,
                                    content_type: None,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    if assets.is_empty() {
        let expanded_url = format!("https://github.com/{}/releases/expanded_assets/{}", slug, tag_name);
        if let Ok(resp) = state.http_client.get(&expanded_url).send().await {
            if let Ok(html) = resp.text().await {
                for part in html.split("href=\"") {
                    if let Some(end_idx) = part.find('"') {
                        let href = &part[..end_idx];
                        if href.contains(download_marker) {
                            let name = href
                                .rsplit('/')
                                .next()
                                .unwrap_or("")
                                .split(&['?', '#'][..])
                                .next()
                                .unwrap_or("")
                                .to_string();

                            if !name.is_empty() {
                                let browser_download_url = if href.starts_with("http") {
                                    href.to_string()
                                } else {
                                    format!("https://github.com{}", href)
                                };

                                if !assets.iter().any(|a: &ReleaseAsset| a.name == name) {
                                    assets.push(ReleaseAsset {
                                        name,
                                        browser_download_url,
                                        size: 0,
                                        content_type: None,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if assets.is_empty() && body.is_none() {
        return Err(AppError::GitHub(format!(
            "No downloadable assets found in release '{}' of '{}'",
            tag_name, slug
        )));
    }

    let release = Release {
        tag_name: tag_name.clone(),
        name: Some(format!("{} {}", slug.rsplit('/').next().unwrap_or(slug), tag_name)),
        body,
        published_at,
        prerelease: Some(false),
        draft: Some(false),
        assets,
    };

    state.cache_release(slug.to_string(), release.clone(), None);
    Ok(release)
}

/// Fetches the latest release from GitHub for a given repository (`storytold/{repo}` or `owner/repo`).
/// Uses:
/// 1. Persistent + In-memory cache (30-minute TTL)
/// 2. Conditional ETag (`If-None-Match`) requests (`304 Not Modified` costs 0 API quota)
/// 3. Automatic web fallback (`expanded_assets`) if GitHub REST API rate limit is exceeded
#[tauri::command]
pub async fn fetch_latest_release(
    repo: String,
    state: State<'_, AppState>,
) -> Result<Release, AppError> {
    let slug = resolve_repo_slug(&repo);

    if let Some(mirror_rel) = resolve_external_mirror_release(&slug) {
        return Ok(mirror_rel);
    }

    // 1. Check 30-minute cache
    if let Some(cached) = state.get_cached_release(&slug, Duration::from_secs(1800)) {
        if cached.body.is_some() {
            log::debug!("Cache hit for release info of repo '{}'", slug);
            return Ok(cached);
        }
    }

    // 2. Check if we have a stale release whose tag still matches the current latest tag on GitHub
    let stale_entry = state.get_stale_release_with_etag(&slug);
    if let Some((ref stale_release, ref etag)) = stale_entry {
        if !stale_release.assets.is_empty() && stale_release.body.is_some() {
            if let Some(live_tag) = fetch_latest_version_tag(&slug, &state).await {
                if live_tag == stale_release.tag_name {
                    log::debug!(
                        "Tag '{}' unchanged for '{}'; refreshing cache without REST API call",
                        live_tag,
                        slug
                    );
                    state.cache_release(slug, stale_release.clone(), etag.clone());
                    return Ok(stale_release.clone());
                }
            }
        }
    }

    let url = format!("https://api.github.com/repos/{}/releases/latest", slug);
    log::info!("Fetching latest release from {}", url);

    let mut request = state
        .http_client
        .get(&url)
        .header("Accept", "application/vnd.github.v3+json");

    // Attach ETag for 304 Not Modified conditional request (0 rate-limit cost on 304)
    if let Some((_, Some(ref etag_val))) = stale_entry {
        request = request.header("If-None-Match", etag_val.as_str());
    }

    // Add GitHub Token for higher rate limits (5,000 req/hr) if configured
    if let Ok(guard) = state.settings.lock() {
        if let Some(settings) = guard.as_ref() {
            if let Some(token) = &settings.github_token {
                if !token.trim().is_empty() {
                    request = request.header("Authorization", format!("token {}", token.trim()));
                }
            }
        }
    }

    match request.send().await {
        Ok(response) => {
            let status = response.status();

            if status == reqwest::StatusCode::NOT_MODIFIED {
                if let Some((stale_release, etag)) = stale_entry {
                    log::info!("304 Not Modified for '{}' (0 API quota used)", slug);
                    state.cache_release(slug, stale_release.clone(), etag);
                    return Ok(stale_release);
                }
            }

            if !status.is_success() {
                log::warn!(
                    "GitHub REST API returned {} for '{}'; attempting web fallback (rate-limit free)",
                    status,
                    slug
                );
                return fetch_release_via_web_fallback(&slug, &state).await;
            }

            let new_etag = response
                .headers()
                .get(reqwest::header::ETAG)
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            match response.json::<Release>().await {
                Ok(release) => {
                    if !release.assets.is_empty() {
                        state.cache_release(slug, release.clone(), new_etag);
                        Ok(release)
                    } else {
                        log::info!(
                            "Release found via REST API for '{}' but has 0 assets; trying web fallback",
                            slug
                        );
                        fetch_release_via_web_fallback(&slug, &state).await
                    }
                }
                Err(err) => {
                    log::warn!(
                        "Failed to parse JSON release from REST API for '{}': {}; trying web fallback",
                        slug,
                        err
                    );
                    fetch_release_via_web_fallback(&slug, &state).await
                }
            }
        }
        Err(err) => {
            log::warn!(
                "Network error querying REST API for '{}': {}; attempting web fallback",
                slug,
                err
            );
            fetch_release_via_web_fallback(&slug, &state).await
        }
    }
}

/// Reads the local manifest file for an application if installed.
pub fn get_installed_manifest<P: AsRef<Path>>(install_dir: P, app_id: &str) -> Option<AppManifest> {
    let manifest_path = install_dir.as_ref().join(app_id).join("manifest.json");
    if manifest_path.is_file() {
        if let Ok(content) = std::fs::read_to_string(&manifest_path) {
            if let Ok(manifest) = serde_json::from_str::<AppManifest>(&content) {
                return Some(manifest);
            }
        }
    }
    None
}

/// Resolves the currently configured installation directory from state, store, or default.
pub fn get_current_install_dir(app_handle: &AppHandle, state: &AppState) -> PathBuf {
    if let Ok(guard) = state.settings.lock() {
        if let Some(settings) = guard.as_ref() {
            let path_str = settings.install_dir.replace("ArtCraft", "Synapps");
            return PathBuf::from(path_str);
        }
    }

    if let Ok(store) = app_handle.store("settings.json") {
        if let Some(val) = store.get("user_settings") {
            if let Ok(settings) = serde_json::from_value::<UserSettings>(val) {
                let path_str = settings.install_dir.replace("ArtCraft", "Synapps");
                return PathBuf::from(path_str);
            }
        }
    }

    PathBuf::from(crate::models::default_install_dir())
}

/// Instantly returns local installation states from disk without any network requests (< 1ms).
#[tauri::command]
pub async fn get_local_app_states(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Vec<AppStateInfo>, AppError> {
    let catalog = get_app_catalog();
    let install_dir = get_current_install_dir(&app_handle, &state);

    let local_states = catalog
        .into_iter()
        .map(|app| {
            let installed_version = get_installed_manifest(&install_dir, &app.id).map(|m| m.version);
            let status = if installed_version.is_some() {
                AppStatus::Installed
            } else {
                AppStatus::NotInstalled
            };
            AppStateInfo {
                app_id: app.id,
                installed_version,
                latest_version: None,
                status,
            }
        })
        .collect();

    Ok(local_states)
}

/// Synchronizes the state of all apps in the catalog concurrently without consuming
/// GitHub REST API quota (uses web 302 redirect checks + persistent cache).
#[tauri::command]
pub async fn sync_all_apps(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Vec<AppStateInfo>, AppError> {
    let catalog = get_app_catalog();
    let install_dir = get_current_install_dir(&app_handle, &state);
    let state_ref = state.inner();
    let sem = Arc::new(Semaphore::new(6));

    let futures = catalog.into_iter().map(|app| {
        let install_dir = install_dir.clone();
        let sem = sem.clone();
        async move {
            // 1. Check local installation
            let installed_manifest = get_installed_manifest(&install_dir, &app.id);
            let installed_version = installed_manifest.map(|m| m.version);

            // Special handling for Graphite (dedicated web/desktop app)
            if app.id.eq_ignore_ascii_case("graphite") {
                let status = if installed_version.is_some() {
                    AppStatus::Installed
                } else {
                    AppStatus::NotInstalled
                };
                return AppStateInfo {
                    app_id: app.id,
                    installed_version,
                    latest_version: Some("1.0 (Web/Desktop)".to_string()),
                    status,
                };
            }

            // 2. Query latest version tag with concurrency throttling
            let _permit = sem.acquire().await;
            let latest_version = fetch_latest_version_tag(&app.repo, state_ref).await;
            drop(_permit);

            // 3. Determine status
            let status = match (&installed_version, &latest_version) {
                (None, _) => AppStatus::NotInstalled,
                (Some(_), None) => AppStatus::Installed,
                (Some(inst), Some(lat)) => {
                    let inst_clean = inst.trim_start_matches(|c| c == 'v' || c == 'V');
                    let lat_clean = lat.trim_start_matches(|c| c == 'v' || c == 'V');

                    match (
                        semver::Version::parse(inst_clean),
                        semver::Version::parse(lat_clean),
                    ) {
                        (Ok(v_inst), Ok(v_lat)) => {
                            if v_lat > v_inst {
                                AppStatus::UpdateAvailable
                            } else {
                                AppStatus::Installed
                            }
                        }
                        _ => {
                            if inst_clean != lat_clean {
                                AppStatus::UpdateAvailable
                            } else {
                                AppStatus::Installed
                            }
                        }
                    }
                }
            };

            AppStateInfo {
                app_id: app.id,
                installed_version,
                latest_version,
                status,
            }
        }
    });

    let app_states = join_all(futures).await;
    Ok(app_states)
}
