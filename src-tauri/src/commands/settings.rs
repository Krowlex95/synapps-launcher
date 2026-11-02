use crate::error::AppError;
use crate::models::{themes_dir, CustomTheme, UserSettings};
use crate::state::AppState;
use std::collections::HashMap;
use std::fs;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;

fn sanitize_theme_id(raw: &str) -> String {
    let cleaned: String = raw
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();
    let trimmed = cleaned.trim_matches('-').to_string();
    if trimmed.is_empty() || trimmed == "default" {
        format!(
            "custom-theme-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(1)
        )
    } else {
        trimmed
    }
}

fn seed_default_community_themes(dir: &std::path::Path) {
    let marker = dir.join(".seeded_v1");
    if marker.exists() {
        return;
    }

    let presets = vec![
        CustomTheme {
            id: "dracula-studio".to_string(),
            name: "Dracula Studio".to_string(),
            author: Some("Synapps Community".to_string()),
            version: "1.0.0".to_string(),
            description: Some("Tema escuro inspirado na paleta clássica Dracula com tons vampíricos e roxo vibrante.".to_string()),
            base_mode: "dark".to_string(),
            bg_color: Some("#191a24".to_string()),
            surface_color: Some("#282a36".to_string()),
            popover_color: Some("#21222c".to_string()),
            accent_color: Some("#bd93f9".to_string()),
            icon_color: Some("#ff79c6".to_string()),
            text_color: Some("#f8f8f2".to_string()),
            text_secondary_color: Some("#cbd5e1".to_string()),
            border_color: Some("#44475a".to_string()),
            variables: HashMap::new(),
            custom_css: None,
        },
        CustomTheme {
            id: "nord-frost".to_string(),
            name: "Nord Frost".to_string(),
            author: Some("Synapps Community".to_string()),
            version: "1.0.0".to_string(),
            description: Some("Paleta ártica minimalista com tons azul-gelo suaves para longas sessões criativas.".to_string()),
            base_mode: "dark".to_string(),
            bg_color: Some("#242933".to_string()),
            surface_color: Some("#2e3440".to_string()),
            popover_color: Some("#292e39".to_string()),
            accent_color: Some("#88c0d0".to_string()),
            icon_color: Some("#81a1c1".to_string()),
            text_color: Some("#eceff4".to_string()),
            text_secondary_color: Some("#d8dee9".to_string()),
            border_color: Some("#434c5e".to_string()),
            variables: HashMap::new(),
            custom_css: None,
        },
        CustomTheme {
            id: "cyberpunk-neon".to_string(),
            name: "Cyberpunk Neon".to_string(),
            author: Some("Synapps Community".to_string()),
            version: "1.0.0".to_string(),
            description: Some("Contraste futurista de alto impacto com ciano elétrico e magenta neon.".to_string()),
            base_mode: "dark".to_string(),
            bg_color: Some("#090414".to_string()),
            surface_color: Some("#140a29".to_string()),
            popover_color: Some("#0e061e".to_string()),
            accent_color: Some("#00f0ff".to_string()),
            icon_color: Some("#ff2a85".to_string()),
            text_color: Some("#fdf8ff".to_string()),
            text_secondary_color: Some("#d8b4fe".to_string()),
            border_color: Some("#3b1d6e".to_string()),
            variables: HashMap::new(),
            custom_css: None,
        },
        CustomTheme {
            id: "latte-paper".to_string(),
            name: "Catppuccin Latte".to_string(),
            author: Some("Synapps Community".to_string()),
            version: "1.0.0".to_string(),
            description: Some("Tema claro aconchegante em tons pastel de café e papel creme.".to_string()),
            base_mode: "light".to_string(),
            bg_color: Some("#eff1f5".to_string()),
            surface_color: Some("#e6e9ef".to_string()),
            popover_color: Some("#dce0e8".to_string()),
            accent_color: Some("#8839ef".to_string()),
            icon_color: Some("#fe640b".to_string()),
            text_color: Some("#4c4f69".to_string()),
            text_secondary_color: Some("#5c5f77".to_string()),
            border_color: Some("#bcc0cc".to_string()),
            variables: HashMap::new(),
            custom_css: None,
        },
    ];

    for preset in presets {
        let file_path = dir.join(format!("{}.json", preset.id));
        if !file_path.exists() {
            if let Ok(json) = serde_json::to_string_pretty(&preset) {
                let _ = fs::write(file_path, json);
            }
        }
    }

    let _ = fs::write(marker, "1");
}

/// Lists all installed custom themes from the user's `Synapps/themes` folder.
#[tauri::command]
pub async fn list_custom_themes() -> Result<Vec<CustomTheme>, AppError> {
    let dir = themes_dir();
    let _ = fs::create_dir_all(&dir);
    seed_default_community_themes(&dir);

    let mut themes = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file()
                && path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.eq_ignore_ascii_case("json"))
                    .unwrap_or(false)
            {
                if let Ok(raw) = fs::read_to_string(&path) {
                    if let Ok(mut parsed) = serde_json::from_str::<CustomTheme>(&raw) {
                        if parsed.id.trim().is_empty() || parsed.id == "default" {
                            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                                parsed.id = sanitize_theme_id(stem);
                            }
                        }
                        themes.push(parsed);
                    }
                }
            }
        }
    }

    themes.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(themes)
}

/// Saves or updates a custom theme `.json` file inside the `Synapps/themes` directory.
#[tauri::command]
pub async fn save_custom_theme(mut theme: CustomTheme) -> Result<CustomTheme, AppError> {
    let dir = themes_dir();
    fs::create_dir_all(&dir).map_err(|e| AppError::Settings(e.to_string()))?;

    theme.id = sanitize_theme_id(if theme.id.trim().is_empty() {
        &theme.name
    } else {
        &theme.id
    });

    if theme.name.trim().is_empty() {
        theme.name = "Tema Personalizado".to_string();
    }

    let file_path = dir.join(format!("{}.json", theme.id));
    let json =
        serde_json::to_string_pretty(&theme).map_err(|e| AppError::Settings(e.to_string()))?;
    fs::write(&file_path, json).map_err(|e| AppError::Settings(e.to_string()))?;

    Ok(theme)
}

/// Deletes an installed custom theme `.json` file from the `Synapps/themes` directory.
#[tauri::command]
pub async fn delete_custom_theme(theme_id: String) -> Result<(), AppError> {
    let safe_id = sanitize_theme_id(&theme_id);
    let dir = themes_dir();
    let file_path = dir.join(format!("{}.json", safe_id));
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| AppError::Settings(e.to_string()))?;
    }
    Ok(())
}

/// Opens a file dialog to import/install a `.json` theme file created by another user.
#[tauri::command]
pub async fn import_custom_theme(app_handle: AppHandle) -> Result<Option<CustomTheme>, AppError> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = tokio::sync::oneshot::channel();
    app_handle
        .dialog()
        .file()
        .add_filter("Tema do Synapps (*.json)", &["json"])
        .pick_file(move |picked| {
            let path_opt = picked.and_then(|fp| match fp {
                tauri_plugin_dialog::FilePath::Path(p) => Some(p),
                _ => None,
            });
            let _ = tx.send(path_opt);
        });

    let Some(source_path) = rx.await.ok().flatten() else {
        return Ok(None);
    };

    let raw = fs::read_to_string(&source_path)
        .map_err(|e| AppError::Settings(format!("Falha ao ler arquivo de tema: {e}")))?;
    let mut parsed: CustomTheme = serde_json::from_str(&raw)
        .map_err(|e| AppError::Settings(format!("Arquivo de tema JSON inválido: {e}")))?;

    if parsed.id.trim().is_empty() || parsed.id == "default" {
        let fallback_name = if !parsed.name.trim().is_empty() {
            parsed.name.clone()
        } else {
            source_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("custom-theme")
                .to_string()
        };
        parsed.id = sanitize_theme_id(&fallback_name);
    } else {
        parsed.id = sanitize_theme_id(&parsed.id);
    }

    let saved = save_custom_theme(parsed).await?;
    Ok(Some(saved))
}

/// Exports a custom theme to a user-selected `.json` file so it can be shared with others.
#[tauri::command]
pub async fn export_custom_theme(
    theme: CustomTheme,
    app_handle: AppHandle,
) -> Result<bool, AppError> {
    use tauri_plugin_dialog::DialogExt;

    let default_filename = format!("{}.synapps-theme.json", sanitize_theme_id(&theme.id));
    let (tx, rx) = tokio::sync::oneshot::channel();
    app_handle
        .dialog()
        .file()
        .set_file_name(&default_filename)
        .add_filter("Tema do Synapps (*.json)", &["json"])
        .save_file(move |dest| {
            let path_opt = dest.and_then(|fp| match fp {
                tauri_plugin_dialog::FilePath::Path(p) => Some(p),
                _ => None,
            });
            let _ = tx.send(path_opt);
        });

    let Some(target_path) = rx.await.ok().flatten() else {
        return Ok(false);
    };

    let json =
        serde_json::to_string_pretty(&theme).map_err(|e| AppError::Settings(e.to_string()))?;
    fs::write(&target_path, json).map_err(|e| AppError::Settings(e.to_string()))?;
    Ok(true)
}

/// Opens the local `Synapps/themes` directory in the system file explorer.
#[tauri::command]
pub async fn open_themes_folder() -> Result<(), AppError> {
    let dir = themes_dir();
    fs::create_dir_all(&dir).map_err(|e| AppError::Settings(e.to_string()))?;
    seed_default_community_themes(&dir);

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&dir)
            .spawn()
            .map_err(|e| AppError::Settings(e.to_string()))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(|e| AppError::Settings(e.to_string()))?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(|e| AppError::Settings(e.to_string()))?;
    }

    Ok(())
}

/// Fetches community themes from the official GitHub repository (`Krowlex95/synapps-launcher/themes`)
/// combined with the online gallery catalog.
#[tauri::command]
pub async fn fetch_community_themes(
    state: State<'_, AppState>,
) -> Result<Vec<CustomTheme>, AppError> {
    let mut online_themes: Vec<CustomTheme> = Vec::new();

    // 1. Try fetching dynamic `.json` files from GitHub repository `Krowlex95/synapps-launcher/themes`
    let contents_url = "https://api.github.com/repos/Krowlex95/synapps-launcher/contents/themes";
    if let Ok(resp) = state
        .http_client
        .get(contents_url)
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(items) = resp.json::<Vec<serde_json::Value>>().await {
                for item in items {
                    if let Some(download_url) = item.get("download_url").and_then(|v| v.as_str()) {
                        if download_url.ends_with(".json") {
                            if let Ok(file_resp) = state.http_client.get(download_url).send().await
                            {
                                if let Ok(theme) = file_resp.json::<CustomTheme>().await {
                                    if !online_themes.iter().any(|t| t.id == theme.id) {
                                        online_themes.push(theme);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Include additional curated online gallery themes
    let gallery_extras = vec![
        CustomTheme {
            id: "tokyo-night".to_string(),
            name: "Tokyo Night".to_string(),
            author: Some("Synapps Hub".to_string()),
            version: "1.0.0".to_string(),
            description: Some(
                "Inspirado nas luzes noturnas de Tóquio com índigo profundo e azul elétrico."
                    .to_string(),
            ),
            base_mode: "dark".to_string(),
            bg_color: Some("#16161e".to_string()),
            surface_color: Some("#1a1b26".to_string()),
            popover_color: Some("#1f2335".to_string()),
            accent_color: Some("#7aa2f7".to_string()),
            icon_color: Some("#bb9af7".to_string()),
            text_color: Some("#c0caf5".to_string()),
            text_secondary_color: Some("#a9b1d6".to_string()),
            border_color: Some("#292e42".to_string()),
            variables: HashMap::new(),
            custom_css: None,
        },
        CustomTheme {
            id: "rose-pine".to_string(),
            name: "Rosé Pine".to_string(),
            author: Some("Synapps Hub".to_string()),
            version: "1.0.0".to_string(),
            description: Some(
                "Estética orgânica sofisticada com pinho escuro, ouro suave e rosa seco."
                    .to_string(),
            ),
            base_mode: "dark".to_string(),
            bg_color: Some("#191724".to_string()),
            surface_color: Some("#1f1d2e".to_string()),
            popover_color: Some("#26233a".to_string()),
            accent_color: Some("#ebbcba".to_string()),
            icon_color: Some("#f6c177".to_string()),
            text_color: Some("#e0def4".to_string()),
            text_secondary_color: Some("#908caa".to_string()),
            border_color: Some("#403d52".to_string()),
            variables: HashMap::new(),
            custom_css: None,
        },
        CustomTheme {
            id: "emerald-matrix".to_string(),
            name: "Emerald Studio".to_string(),
            author: Some("Synapps Hub".to_string()),
            version: "1.0.0".to_string(),
            description: Some(
                "Tema escuro de alto contraste com tons de ardósia e verde-esmeralda."
                    .to_string(),
            ),
            base_mode: "dark".to_string(),
            bg_color: Some("#071310".to_string()),
            surface_color: Some("#0d211b".to_string()),
            popover_color: Some("#0a1915".to_string()),
            accent_color: Some("#10b981".to_string()),
            icon_color: Some("#34d399".to_string()),
            text_color: Some("#ecfdf5".to_string()),
            text_secondary_color: Some("#a7f3d0".to_string()),
            border_color: Some("#065f46".to_string()),
            variables: HashMap::new(),
            custom_css: None,
        },
    ];

    for extra in gallery_extras {
        if !online_themes.iter().any(|t| t.id == extra.id) {
            online_themes.push(extra);
        }
    }

    Ok(online_themes)
}

/// Retrieves the current user settings from memory or persistent storage.
#[tauri::command]
pub async fn get_settings(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<UserSettings, AppError> {
    // 1. Check in-memory cache
    if let Ok(guard) = state.settings.lock() {
        if let Some(cached) = guard.as_ref() {
            return Ok(cached.clone());
        }
    }

    // 2. Load from persistent store
    let store = app_handle
        .store("settings.json")
        .map_err(|e| AppError::Settings(e.to_string()))?;

    let mut settings = if let Some(val) = store.get("user_settings") {
        serde_json::from_value::<UserSettings>(val).unwrap_or_default()
    } else {
        UserSettings::default()
    };

    if settings.install_dir.contains("ArtCraft") {
        settings.install_dir = settings.install_dir.replace("ArtCraft", "Synapps");
        let _ = store.set("user_settings", serde_json::to_value(&settings).unwrap_or_default());
        let _ = store.save();
    }

    // Update in-memory cache
    if let Ok(mut guard) = state.settings.lock() {
        *guard = Some(settings.clone());
    }

    Ok(settings)
}

/// Saves user settings to both in-memory state and persistent store file.
#[tauri::command]
pub async fn save_settings(
    settings: UserSettings,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    // Update memory cache
    if let Ok(mut guard) = state.settings.lock() {
        *guard = Some(settings.clone());
    }

    // Persist to store
    let store = app_handle
        .store("settings.json")
        .map_err(|e| AppError::Settings(e.to_string()))?;

    store.set("user_settings", serde_json::to_value(&settings)?);
    store
        .save()
        .map_err(|e| AppError::Settings(e.to_string()))?;

    log::info!("User settings saved successfully: {:?}", settings);
    Ok(())
}

/// Checks if this is the first time the launcher is being run.
#[tauri::command]
pub async fn is_first_run(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, AppError> {
    let settings = get_settings(app_handle, state).await?;
    Ok(settings.first_run)
}

/// Opens a native folder selection dialog for choosing the installation directory.
#[tauri::command]
pub async fn select_install_directory(
    app_handle: AppHandle,
) -> Result<Option<String>, AppError> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = tokio::sync::oneshot::channel();
    app_handle.dialog().file().pick_folder(move |folder| {
        let path_str = folder.map(|fp| match fp {
            tauri_plugin_dialog::FilePath::Path(p) => p.to_string_lossy().to_string(),
            other => other.to_string(),
        });
        let _ = tx.send(path_str);
    });

    match rx.await {
        Ok(opt_path) => Ok(opt_path),
        Err(_) => Ok(None),
    }
}

/// Queries available disk space in bytes for a given directory path.
#[tauri::command]
pub async fn get_available_disk_space(path: String) -> Result<Option<u64>, AppError> {
    #[cfg(target_os = "windows")]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;

        #[link(name = "kernel32")]
        extern "system" {
            fn GetDiskFreeSpaceExW(
                lpDirectoryName: *const u16,
                lpFreeBytesAvailableToCaller: *mut u64,
                lpTotalNumberOfBytes: *mut u64,
                lpTotalNumberOfFreeBytes: *mut u64,
            ) -> i32;
        }

        let mut path_wide: Vec<u16> = OsStr::new(&path).encode_wide().collect();
        path_wide.push(0);

        let mut free_bytes_available: u64 = 0;
        let mut total_bytes: u64 = 0;
        let mut total_free_bytes: u64 = 0;

        let success = unsafe {
            GetDiskFreeSpaceExW(
                path_wide.as_ptr(),
                &mut free_bytes_available,
                &mut total_bytes,
                &mut total_free_bytes,
            )
        };

        if success != 0 {
            Ok(Some(free_bytes_available))
        } else {
            Ok(None)
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Ok(None)
    }
}
