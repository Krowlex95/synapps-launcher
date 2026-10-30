use serde::{Deserialize, Serialize};

/// Represents an individual asset attached to a GitHub Release.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
    #[serde(default)]
    pub content_type: Option<String>,
}

/// Represents a GitHub Release object returned by the GitHub REST API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Release {
    pub tag_name: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub published_at: Option<String>,
    #[serde(default)]
    pub prerelease: Option<bool>,
    #[serde(default)]
    pub draft: Option<bool>,
    #[serde(default)]
    pub assets: Vec<ReleaseAsset>,
}

impl Release {
    /// Returns the semantic version string with any leading 'v' or 'V' stripped.
    pub fn clean_version(&self) -> &str {
        self.tag_name.trim_start_matches(|c| c == 'v' || c == 'V')
    }
}
