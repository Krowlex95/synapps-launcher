use serde::Serialize;
use thiserror::Error;

/// Central application error type implementing `serde::Serialize`
/// for seamless error propagation across Tauri IPC command boundaries.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Zip extraction error: {0}")]
    Zip(#[from] zip::result::ZipError),

    #[error("GitHub API error: {0}")]
    GitHub(String),

    #[error("Application '{0}' not found in catalog")]
    AppNotFound(String),

    #[error("Asset for application '{app_id}' not found for {os}/{arch}")]
    AssetNotFound {
        app_id: String,
        os: String,
        arch: String,
    },

    #[error("Checksum mismatch for '{file}': expected '{expected}', computed '{actual}'")]
    ChecksumMismatch {
        file: String,
        expected: String,
        actual: String,
    },

    #[error("Installation failed: {0}")]
    InstallFailed(String),

    #[error("Launch failed: {0}")]
    ExecutionFailed(String),

    #[error("Settings error: {0}")]
    Settings(String),

    #[error("{0}")]
    Custom(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
