use crate::commands::github::{get_current_install_dir, get_installed_manifest};
use crate::commands::installer::find_executable;
use crate::error::AppError;
use crate::models::get_app_catalog;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;

const RECENT_STORE_FILE: &str = "recent-files.json";
const RECENT_STORE_KEY: &str = "recent_files_data";
pub const MAX_RECENT_ITEMS: usize = 5;

/// Returns file extensions created by and/or compatible with each app in the catalog.
pub fn compatible_extensions_for_app(app_id: &str) -> &'static [&'static str] {
    match app_id {
        // Design
        "photocraft" => &[
            "psd", "psb", "xcf", "ora", "kra", "png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff",
            "tga", "avif",
        ],
        "gimp" => &[
            "xcf", "psd", "psb", "ora", "png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff", "tga",
            "avif", "gif",
        ],
        "krita" => &[
            "kra", "ora", "psd", "psb", "xcf", "png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff",
            "exr", "gif",
        ],
        "vectorcraft" => &["svg", "svgz", "ai", "eps", "pdf"],
        "designcraft" => &["idml", "indd", "sla", "svg", "eps", "pdf"],
        "figcraft" => &["fig", "svg", "png", "jpg", "jpeg", "webp"],
        "graphite" => &["graphite", "svg", "png", "jpg", "jpeg"],
        "pixelorama" => &["pxo", "png", "gif", "webp", "bmp"],
        "pencil2d" => &["pclx", "pcl", "gif", "mp4", "avi", "png"],
        "upscayl" => &["png", "jpg", "jpeg", "webp"],
        "fontforge" => &["sfd", "otf", "ttf", "woff", "woff2", "ufo", "bdf", "svg"],
        "imageglass" => &[
            "png", "jpg", "jpeg", "webp", "gif", "bmp", "ico", "svg", "psd", "tif", "tiff", "heic",
            "heif", "avif", "raw", "cr2", "cr3", "nef", "arw", "dng", "orf", "rw2", "tga", "exr",
        ],
        "librecad" => &["dxf", "dwg", "jww", "lff"],

        // Media
        "lightcraft" => &[
            "raw", "cr2", "cr3", "nef", "arw", "dng", "orf", "rw2", "raf", "pef", "tif", "tiff",
            "jpg", "jpeg", "heic",
        ],
        "filmcraft" => &["mp4", "mkv", "mov", "webm", "avi", "m4v", "mts", "m2ts"],
        "effectcraft" => &["aep", "mp4", "mov", "webm", "exr", "png"],
        "soundcraft" => &["wav", "flac", "mp3", "ogg", "m4a", "aac", "aiff", "mid", "midi"],
        "obs" => &["mkv", "mp4", "flv", "mov", "ts"],
        "shotcut" => &["mlt", "mp4", "mkv", "mov", "webm", "avi", "m4v", "mpg", "mpeg"],
        "losslesscut" => &[
            "llc", "mp4", "mkv", "mov", "webm", "avi", "m4v", "ts", "mp3", "wav", "flac", "m4a",
            "aac", "ogg",
        ],
        "audacity" => &[
            "aup3", "aup", "wav", "mp3", "flac", "ogg", "m4a", "aac", "aiff", "opus",
        ],
        "lmms" => &["mmpz", "mmp", "mid", "midi", "wav", "ogg", "flac", "mp3"],
        "sharex" => &["png", "jpg", "jpeg", "gif", "webp", "mp4", "webm"],

        // Office
        "wordcraft" => &["docx", "doc", "odt", "rtf", "txt", "md"],
        "deckcraft" => &["pptx", "ppt", "odp"],
        "gridcraft" => &["xlsx", "xls", "ods", "csv", "tsv"],
        "pdfcraft" => &["pdf"],
        "appflowy" => &["md", "markdown", "csv", "txt"],
        "affine" => &["affine", "md", "markdown", "html"],
        "onlyoffice" => &[
            "docx", "doc", "odt", "rtf", "txt", "xlsx", "xls", "ods", "csv", "pptx", "ppt", "odp",
            "pdf", "epub",
        ],

        // 3D
        "cadcraft" => &["step", "stp", "iges", "igs", "dxf", "dwg", "stl", "obj"],
        "blender" => &[
            "blend", "fbx", "obj", "glb", "gltf", "stl", "dae", "abc", "usd", "usdc", "usda", "ply",
        ],
        "blockbench" => &["bbmodel", "gltf", "glb", "obj", "fbx", "dae"],
        "freecad" => &[
            "fcstd", "step", "stp", "iges", "igs", "brep", "stl", "obj", "3mf", "ifc", "dae",
            "dxf", "dwg",
        ],
        "orcaslicer" => &["3mf", "stl", "step", "stp", "obj", "amf", "gcode", "bgcode"],
        "prusaslicer" => &["3mf", "stl", "step", "stp", "obj", "amf", "gcode", "bgcode"],
        "dust3d" => &["ds3", "obj", "fbx", "glb"],

        // Dev
        "godot" => &["godot", "tscn", "scn", "tres", "res", "gd", "gdshader", "glb", "gltf"],
        "superproductivity" => &["md"],

        _ => &[],
    }
}

/// Collects the union of file extensions supported by the currently installed apps.
fn collect_compatible_extensions(install_dir: &Path) -> HashSet<&'static str> {
    let mut allowed = HashSet::new();
    for app in get_app_catalog() {
        if get_installed_manifest(install_dir, &app.id).is_some() {
            for &ext in compatible_extensions_for_app(&app.id) {
                allowed.insert(ext);
            }
        }
    }
    allowed
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentFileItem {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub directory: String,
    pub modified_at: u64,
    pub size_bytes: u64,
    pub pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredRecentEntry {
    path: String,
    last_opened_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct RecentFilesStoreData {
    #[serde(default)]
    entries: Vec<StoredRecentEntry>,
    #[serde(default)]
    dismissed_paths: Vec<String>,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn system_time_to_ms(time: SystemTime) -> u64 {
    time.duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn normalize_key(path: &str) -> String {
    path.trim().replace('/', "\\").to_lowercase()
}

fn load_store_data(app_handle: &AppHandle) -> RecentFilesStoreData {
    let Ok(store) = app_handle.store(RECENT_STORE_FILE) else {
        return RecentFilesStoreData::default();
    };
    store
        .get(RECENT_STORE_KEY)
        .and_then(|val| serde_json::from_value::<RecentFilesStoreData>(val).ok())
        .unwrap_or_default()
}

fn save_store_data(app_handle: &AppHandle, data: &RecentFilesStoreData) -> Result<(), AppError> {
    let store = app_handle
        .store(RECENT_STORE_FILE)
        .map_err(|e| AppError::Settings(e.to_string()))?;
    store.set(RECENT_STORE_KEY, serde_json::to_value(data)?);
    store
        .save()
        .map_err(|e| AppError::Settings(e.to_string()))?;
    Ok(())
}

fn build_recent_item(
    path: &Path,
    override_time_ms: Option<u64>,
    pinned: bool,
) -> Option<RecentFileItem> {
    let meta = std::fs::metadata(path).ok()?;
    if !meta.is_file() {
        return None;
    }

    let file_name = path.file_name()?.to_string_lossy().to_string();
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let directory = path
        .parent()
        .and_then(|p| p.file_name().or(Some(p.as_os_str())))
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    let file_mtime = meta.modified().ok().map(system_time_to_ms).unwrap_or(0);
    let modified_at = match override_time_ms {
        Some(ts) if ts > file_mtime => ts,
        _ => file_mtime,
    };

    Some(RecentFileItem {
        path: path.to_string_lossy().to_string(),
        name: file_name,
        extension,
        directory,
        modified_at,
        size_bytes: meta.len(),
        pinned,
    })
}

/// Parses a Windows Shell Link (`.lnk`, `[MS-SHLLINK]`) binary buffer and extracts its local target path.
pub fn parse_lnk_target(bytes: &[u8]) -> Option<PathBuf> {
    if bytes.len() < 76 {
        return None;
    }

    let header_size = u32::from_le_bytes(bytes[0..4].try_into().ok()?);
    if header_size != 0x0000_004C {
        return None;
    }

    // LinkCLSID: 00021401-0000-0000-C000-000000000046
    const EXPECTED_CLSID: [u8; 16] = [
        0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x46,
    ];
    if bytes[4..20] != EXPECTED_CLSID {
        return None;
    }

    let link_flags = u32::from_le_bytes(bytes[20..24].try_into().ok()?);
    let has_target_id_list = (link_flags & 0x01) != 0;
    let has_link_info = (link_flags & 0x02) != 0;

    if !has_link_info {
        return None;
    }

    let mut pos: usize = 76;
    if has_target_id_list {
        if pos + 2 > bytes.len() {
            return None;
        }
        let id_list_size = u16::from_le_bytes(bytes[pos..pos + 2].try_into().ok()?) as usize;
        pos = pos.checked_add(2)?.checked_add(id_list_size)?;
    }

    if pos + 28 > bytes.len() {
        return None;
    }

    let info_size = u32::from_le_bytes(bytes[pos..pos + 4].try_into().ok()?) as usize;
    let info_header_size = u32::from_le_bytes(bytes[pos + 4..pos + 8].try_into().ok()?) as usize;
    let info_flags = u32::from_le_bytes(bytes[pos + 8..pos + 12].try_into().ok()?);

    if info_size < 28 || pos.checked_add(info_size)? > bytes.len() {
        return None;
    }

    // VolumeIDAndLocalBasePath flag
    if (info_flags & 0x01) == 0 {
        return None;
    }

    let info_slice = &bytes[pos..pos + info_size];

    // Prefer Unicode offsets if LinkInfoHeaderSize >= 0x24
    if info_header_size >= 0x24 && info_slice.len() >= 0x24 {
        let base_off_u = u32::from_le_bytes(info_slice[28..32].try_into().ok()?) as usize;
        let suffix_off_u = u32::from_le_bytes(info_slice[32..36].try_into().ok()?) as usize;
        if base_off_u > 0 && base_off_u < info_slice.len() {
            if let Some(base) = read_utf16le_nul(&info_slice[base_off_u..]) {
                let suffix = if suffix_off_u > 0 && suffix_off_u < info_slice.len() {
                    read_utf16le_nul(&info_slice[suffix_off_u..]).unwrap_or_default()
                } else {
                    String::new()
                };
                let combined = join_base_and_suffix(&base, &suffix);
                if !combined.is_empty() {
                    return Some(PathBuf::from(combined));
                }
            }
        }
    }

    // Fallback to ANSI / Latin-1 LocalBasePath + CommonPathSuffix
    let base_off = u32::from_le_bytes(info_slice[16..20].try_into().ok()?) as usize;
    let suffix_off = u32::from_le_bytes(info_slice[24..28].try_into().ok()?) as usize;
    if base_off > 0 && base_off < info_slice.len() {
        let base = read_latin1_nul(&info_slice[base_off..]);
        let suffix = if suffix_off > 0 && suffix_off < info_slice.len() {
            read_latin1_nul(&info_slice[suffix_off..])
        } else {
            String::new()
        };
        let combined = join_base_and_suffix(&base, &suffix);
        if !combined.is_empty() {
            return Some(PathBuf::from(combined));
        }
    }

    None
}

fn read_utf16le_nul(buf: &[u8]) -> Option<String> {
    let mut units = Vec::new();
    let mut chunks = buf.chunks_exact(2);
    for pair in &mut chunks {
        let code = u16::from_le_bytes([pair[0], pair[1]]);
        if code == 0 {
            break;
        }
        units.push(code);
    }
    String::from_utf16(&units).ok()
}

fn read_latin1_nul(buf: &[u8]) -> String {
    buf.iter()
        .take_while(|&&b| b != 0)
        .map(|&b| b as char)
        .collect()
}

fn join_base_and_suffix(base: &str, suffix: &str) -> String {
    if suffix.is_empty() {
        base.to_string()
    } else if base.ends_with('\\') || suffix.starts_with('\\') {
        format!("{}{}", base, suffix)
    } else {
        format!("{}\\{}", base, suffix)
    }
}

fn collect_os_recent_files(
    compatible: &HashSet<&'static str>,
    dismissed: &HashSet<String>,
) -> Vec<(PathBuf, u64)> {
    if compatible.is_empty() {
        return Vec::new();
    }

    let mut discovered: Vec<(PathBuf, u64)> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Some(roaming) = dirs::data_dir() {
            let recent_dir = roaming.join("Microsoft").join("Windows").join("Recent");
            if let Ok(read_dir) = std::fs::read_dir(recent_dir) {
                let mut lnk_files: Vec<(PathBuf, u64)> = read_dir
                    .flatten()
                    .filter_map(|entry| {
                        let path = entry.path();
                        let is_lnk = path
                            .extension()
                            .and_then(|e| e.to_str())
                            .map(|e| e.eq_ignore_ascii_case("lnk"))
                            .unwrap_or(false);
                        if !is_lnk {
                            return None;
                        }
                        let mtime = entry
                            .metadata()
                            .ok()
                            .and_then(|m| m.modified().ok())
                            .map(system_time_to_ms)
                            .unwrap_or(0);
                        Some((path, mtime))
                    })
                    .collect();

                // Inspect newest shortcuts first across up to 300 OS recent links
                lnk_files.sort_by(|a, b| b.1.cmp(&a.1));

                for (lnk_path, lnk_mtime) in lnk_files.into_iter().take(200) {
                    if let Ok(bytes) = std::fs::read(&lnk_path) {
                        if let Some(target) = parse_lnk_target(&bytes) {
                            let target_str = target.to_string_lossy();
                            // Skip UNC network shares to avoid blocking on offline SMB servers
                            if target_str.starts_with("\\\\") {
                                continue;
                            }
                            let ext = target
                                .extension()
                                .and_then(|e| e.to_str())
                                .unwrap_or("")
                                .to_lowercase();
                            if !compatible.contains(ext.as_str()) {
                                continue;
                            }
                            let key = normalize_key(&target_str);
                            if dismissed.contains(&key) {
                                continue;
                            }
                            if target.is_file() {
                                discovered.push((target, lnk_mtime));
                                if discovered.len() >= MAX_RECENT_ITEMS * 2 {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = dismissed;
    }

    discovered
}

fn assemble_recent_files(app_handle: &AppHandle, state: &AppState) -> Vec<RecentFileItem> {
    let install_dir = get_current_install_dir(app_handle, state);
    let store_data = load_store_data(app_handle);
    assemble_recent_files_from_dir(&install_dir, &store_data)
}

fn assemble_recent_files_from_dir(
    install_dir: &Path,
    store_data: &RecentFilesStoreData,
) -> Vec<RecentFileItem> {
    let compatible = collect_compatible_extensions(install_dir);
    if compatible.is_empty() {
        return Vec::new();
    }

    let dismissed: HashSet<String> = store_data
        .dismissed_paths
        .iter()
        .map(|p| normalize_key(p))
        .collect();

    let mut by_key: HashMap<String, RecentFileItem> = HashMap::new();

    // 1. User-added / Launcher-opened shortcuts (filtered to installed apps' compatible formats)
    for entry in &store_data.entries {
        let key = normalize_key(&entry.path);
        if dismissed.contains(&key) {
            continue;
        }
        let path = PathBuf::from(&entry.path);
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !compatible.contains(ext.as_str()) {
            continue;
        }
        if let Some(item) = build_recent_item(&path, Some(entry.last_opened_ms), true) {
            by_key.insert(key, item);
        }
    }

    // 2. OS Recent Files matching installed apps' compatible formats
    for (target_path, lnk_mtime) in collect_os_recent_files(&compatible, &dismissed) {
        let key = normalize_key(&target_path.to_string_lossy());
        if by_key.contains_key(&key) {
            continue;
        }
        if let Some(item) = build_recent_item(&target_path, Some(lnk_mtime), false) {
            by_key.insert(key, item);
        }
    }

    let mut items: Vec<RecentFileItem> = by_key.into_values().collect();
    items.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    items.truncate(MAX_RECENT_ITEMS);
    items
}

/// Returns up to 5 recent files created by and/or compatible with the currently installed apps.
#[tauri::command]
pub async fn get_recent_files(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Vec<RecentFileItem>, AppError> {
    let install_dir = get_current_install_dir(&app_handle, &state);
    let store_data = load_store_data(&app_handle);

    tokio::task::spawn_blocking(move || Ok(assemble_recent_files_from_dir(&install_dir, &store_data)))
        .await
        .map_err(|e| AppError::ExecutionFailed(e.to_string()))?
}

/// Opens a native file dialog filtered to formats compatible with installed apps.
#[tauri::command]
pub async fn add_recent_files(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Vec<RecentFileItem>, AppError> {
    use tauri_plugin_dialog::DialogExt;

    let install_dir = get_current_install_dir(&app_handle, &state);
    let compatible = collect_compatible_extensions(&install_dir);
    if compatible.is_empty() {
        return Ok(Vec::new());
    }

    let mut filter_exts: Vec<&str> = compatible.iter().copied().collect();
    filter_exts.sort_unstable();

    let (tx, rx) = tokio::sync::oneshot::channel();
    app_handle
        .dialog()
        .file()
        .add_filter("Compatíveis", &filter_exts)
        .pick_files(move |files| {
            let paths: Vec<String> = files
                .unwrap_or_default()
                .into_iter()
                .map(|fp| match fp {
                    tauri_plugin_dialog::FilePath::Path(p) => p.to_string_lossy().to_string(),
                    other => other.to_string(),
                })
                .collect();
            let _ = tx.send(paths);
        });

    let selected = rx.await.unwrap_or_default();
    if !selected.is_empty() {
        let mut data = load_store_data(&app_handle);
        let ts = now_ms();
        for path in selected {
            let ext = Path::new(&path)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if !compatible.contains(ext.as_str()) {
                continue;
            }
            let key = normalize_key(&path);
            data.dismissed_paths.retain(|p| normalize_key(p) != key);
            data.entries.retain(|e| normalize_key(&e.path) != key);
            data.entries.insert(
                0,
                StoredRecentEntry {
                    path,
                    last_opened_ms: ts,
                },
            );
        }
        data.entries.truncate(30);
        save_store_data(&app_handle, &data)?;
    }

    Ok(assemble_recent_files(&app_handle, &state))
}

/// Opens a recent file using an installed ArtCraft/Launcher app if matched, or the OS default handler.
#[tauri::command]
pub async fn open_recent_file(
    path: String,
    app_id: Option<String>,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let file_path = PathBuf::from(&path);
    if !file_path.is_file() {
        return Err(AppError::ExecutionFailed(format!(
            "File does not exist: {}",
            file_path.display()
        )));
    }

    // Bump timestamp in persistent store
    let mut data = load_store_data(&app_handle);
    let key = normalize_key(&path);
    data.dismissed_paths.retain(|p| normalize_key(p) != key);
    data.entries.retain(|e| normalize_key(&e.path) != key);
    data.entries.insert(
        0,
        StoredRecentEntry {
            path: path.clone(),
            last_opened_ms: now_ms(),
        },
    );
    data.entries.truncate(30);
    let _ = save_store_data(&app_handle, &data);

    // Try opening with matched installed launcher app first
    if let Some(ref target_app_id) = app_id {
        let install_dir = get_current_install_dir(&app_handle, &state);
        let app_dir = install_dir.join(target_app_id);
        if app_dir.is_dir() {
            let mut exe_path: Option<PathBuf> = None;
            if let Some(manifest) = get_installed_manifest(&install_dir, target_app_id) {
                if !manifest.executable_path.is_empty() {
                    let candidate = PathBuf::from(&manifest.executable_path);
                    if candidate.is_file() {
                        exe_path = Some(candidate);
                    }
                }
            }
            if exe_path.is_none() {
                exe_path = find_executable(&app_dir, target_app_id);
            }

            if let Some(exe) = exe_path {
                if spawn_app_with_file(&exe, target_app_id, &file_path).is_ok() {
                    return Ok(());
                }
            }
        }
    }

    // Fallback to OS default file handler
    open::that(&file_path)
        .map_err(|e| AppError::ExecutionFailed(format!("Could not open file {}: {}", path, e)))
}

fn spawn_app_with_file(exe_path: &Path, app_id: &str, file_path: &Path) -> Result<(), AppError> {
    let parent_dir = exe_path
        .parent()
        .or_else(|| file_path.parent())
        .unwrap_or_else(|| Path::new("."));

    let mut cmd = std::process::Command::new(exe_path);
    cmd.current_dir(parent_dir);

    if app_id.eq_ignore_ascii_case("godot") {
        let is_project_file = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .map(|n| n.eq_ignore_ascii_case("project.godot"))
            .unwrap_or(false);

        if is_project_file {
            if let Some(proj_dir) = file_path.parent() {
                cmd.arg("-e").arg("--path").arg(proj_dir);
            } else {
                cmd.arg("-e").arg(file_path);
            }
        } else {
            let mut current = file_path.parent();
            let mut found_proj_root: Option<&Path> = None;
            for _ in 0..4 {
                if let Some(dir) = current {
                    if dir.join("project.godot").is_file() {
                        found_proj_root = Some(dir);
                        break;
                    }
                    current = dir.parent();
                } else {
                    break;
                }
            }
            if let Some(proj_root) = found_proj_root {
                cmd.arg("-e").arg("--path").arg(proj_root).arg(file_path);
            } else {
                cmd.arg("-e").arg(file_path);
            }
        }
    } else {
        cmd.arg(file_path);
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        cmd.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP);
    }

    cmd.spawn().map_err(|e| {
        AppError::ExecutionFailed(format!(
            "Failed to launch {} with file {}: {}",
            exe_path.display(),
            file_path.display(),
            e
        ))
    })?;

    Ok(())
}

/// Reveals a recent file inside the OS file manager (Explorer / Finder).
#[tauri::command]
pub async fn reveal_recent_file(path: String) -> Result<(), AppError> {
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(AppError::ExecutionFailed(format!(
            "File does not exist: {}",
            path
        )));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .raw_arg(format!("/select,\"{}\"", file_path.display()))
            .spawn()
            .map_err(|e| AppError::ExecutionFailed(e.to_string()))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&file_path)
            .spawn()
            .map_err(|e| AppError::ExecutionFailed(e.to_string()))?;
        return Ok(());
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let dir = file_path.parent().unwrap_or(&file_path);
        open::that(dir).map_err(|e| AppError::ExecutionFailed(e.to_string()))
    }
}

/// Removes a single file from the recent list (and hides it from future OS Recent scans).
#[tauri::command]
pub async fn remove_recent_file(
    path: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Vec<RecentFileItem>, AppError> {
    let mut data = load_store_data(&app_handle);
    let key = normalize_key(&path);
    data.entries.retain(|e| normalize_key(&e.path) != key);
    if !data.dismissed_paths.iter().any(|p| normalize_key(p) == key) {
        data.dismissed_paths.push(path);
    }
    save_store_data(&app_handle, &data)?;
    Ok(assemble_recent_files(&app_handle, &state))
}

/// Clears all currently visible recent files from the Home page.
#[tauri::command]
pub async fn clear_recent_files(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let current = assemble_recent_files(&app_handle, &state);
    let mut data = load_store_data(&app_handle);
    data.entries.clear();
    for item in current {
        let key = normalize_key(&item.path);
        if !data.dismissed_paths.iter().any(|p| normalize_key(p) == key) {
            data.dismissed_paths.push(item.path);
        }
    }
    save_store_data(&app_handle, &data)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_unicode_ms_shllink_target() {
        let mut buf = vec![0u8; 76];
        buf[0..4].copy_from_slice(&0x4Cu32.to_le_bytes());
        buf[4..20].copy_from_slice(&[
            0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x46,
        ]);
        buf[20..24].copy_from_slice(&0x02u32.to_le_bytes());

        let path_str = r"C:\Users\Alys\Projetos\Edição\arte.psd";
        let utf16: Vec<u16> = path_str.encode_utf16().chain(std::iter::once(0)).collect();
        let utf16_bytes: Vec<u8> = utf16.iter().flat_map(|u| u.to_le_bytes()).collect();

        let header_size = 0x24u32;
        let base_u_offset = 0x24u32;
        let suffix_u_offset = base_u_offset + utf16_bytes.len() as u32;
        let info_size = suffix_u_offset + 2;

        let mut link_info = vec![0u8; info_size as usize];
        link_info[0..4].copy_from_slice(&info_size.to_le_bytes());
        link_info[4..8].copy_from_slice(&header_size.to_le_bytes());
        link_info[8..12].copy_from_slice(&0x01u32.to_le_bytes());
        link_info[28..32].copy_from_slice(&base_u_offset.to_le_bytes());
        link_info[32..36].copy_from_slice(&suffix_u_offset.to_le_bytes());
        link_info[36..36 + utf16_bytes.len()].copy_from_slice(&utf16_bytes);

        buf.extend_from_slice(&link_info);

        let parsed = parse_lnk_target(&buf).expect("should parse unicode target");
        assert_eq!(parsed, PathBuf::from(path_str));
    }

    #[test]
    fn every_catalog_app_has_compatible_extensions() {
        assert_eq!(MAX_RECENT_ITEMS, 5);
        for app in get_app_catalog() {
            let exts = compatible_extensions_for_app(&app.id);
            assert!(
                !exts.is_empty(),
                "catalog app '{}' should define compatible extensions",
                app.id
            );
        }
    }
}
