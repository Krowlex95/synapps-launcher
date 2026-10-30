pub mod github;
pub mod installer;
pub mod launcher;
pub mod recent_files;
pub mod settings;
pub mod updater;

pub use github::*;
pub use installer::*;
pub use launcher::*;
pub use recent_files::*;
pub use settings::*;
pub use updater::*;

use crate::models::{get_app_catalog, AppInfo};

/// Tauri command to retrieve the list of all applications in the ArtCraft suite.
#[tauri::command]
pub fn get_catalog() -> Vec<AppInfo> {
    get_app_catalog()
}
