use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Application appearance theme.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Theme {
    #[serde(rename = "light", alias = "Light")]
    Light,
    #[serde(rename = "dark", alias = "Dark")]
    Dark,
    #[serde(rename = "system", alias = "System")]
    System,
}

/// Supported interface languages.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Language {
    #[serde(rename = "pt-BR", alias = "PtBr", alias = "pt")]
    PtBr,
    #[serde(rename = "en", alias = "En", alias = "en-US")]
    En,
}

fn default_sidebar_icon_color() -> String {
    "#f8fafc".to_string()
}

fn default_active_theme_id() -> String {
    "default".to_string()
}

fn default_base_mode() -> String {
    "dark".to_string()
}

fn default_theme_version() -> String {
    "1.0.0".to_string()
}

/// Modular custom theme definition that can be created, edited, exported, and shared as JSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomTheme {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default = "default_theme_version")]
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default = "default_base_mode", alias = "base_mode")]
    pub base_mode: String,
    #[serde(default, alias = "bg_color")]
    pub bg_color: Option<String>,
    #[serde(default, alias = "surface_color")]
    pub surface_color: Option<String>,
    #[serde(default, alias = "popover_color")]
    pub popover_color: Option<String>,
    #[serde(default, alias = "accent_color")]
    pub accent_color: Option<String>,
    #[serde(default, alias = "icon_color")]
    pub icon_color: Option<String>,
    #[serde(default, alias = "text_color")]
    pub text_color: Option<String>,
    #[serde(default, alias = "text_secondary_color")]
    pub text_secondary_color: Option<String>,
    #[serde(default, alias = "border_color")]
    pub border_color: Option<String>,
    #[serde(default)]
    pub variables: HashMap<String, String>,
    #[serde(default, alias = "custom_css")]
    pub custom_css: Option<String>,
}

/// Persistent user settings for Synapps.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSettings {
    #[serde(alias = "install_dir")]
    pub install_dir: String,
    pub theme: Theme,
    #[serde(default = "default_active_theme_id", alias = "active_theme_id")]
    pub active_theme_id: String,
    #[serde(alias = "accent_color")]
    pub accent_color: String,
    #[serde(default = "default_sidebar_icon_color", alias = "sidebar_icon_color")]
    pub sidebar_icon_color: String,
    pub language: Language,
    #[serde(alias = "first_run")]
    pub first_run: bool,
    pub github_token: Option<String>,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            install_dir: default_install_dir(),
            theme: Theme::System,
            active_theme_id: default_active_theme_id(),
            accent_color: "#6366f1".to_string(),
            sidebar_icon_color: default_sidebar_icon_color(),
            language: Language::PtBr,
            first_run: true,
            github_token: None,
        }
    }
}

/// Computes the default application installation directory based on the host OS.
pub fn default_install_dir() -> String {
    if let Some(mut local_data) = dirs::data_local_dir() {
        local_data.push("Synapps");
        local_data.push("apps");
        return local_data.to_string_lossy().to_string();
    }

    if let Some(mut home) = dirs::home_dir() {
        home.push(".synapps");
        home.push("apps");
        return home.to_string_lossy().to_string();
    }

    #[cfg(target_os = "windows")]
    {
        "C:\\Synapps\\apps".to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        "/opt/Synapps/apps".to_string()
    }
}

/// Computes the directory where custom user/community themes (.json) are stored.
pub fn themes_dir() -> PathBuf {
    if let Some(mut local_data) = dirs::data_local_dir() {
        local_data.push("Synapps");
        local_data.push("themes");
        return local_data;
    }

    if let Some(mut home) = dirs::home_dir() {
        home.push(".synapps");
        home.push("themes");
        return home;
    }

    #[cfg(target_os = "windows")]
    {
        PathBuf::from("C:\\Synapps\\themes")
    }
    #[cfg(not(target_os = "windows"))]
    {
        PathBuf::from("/opt/Synapps/themes")
    }
}
