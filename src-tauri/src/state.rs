use crate::models::{Release, UserSettings};
use reqwest::{redirect::Policy, Client};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedReleaseEntry {
    pub release: Release,
    pub etag: Option<String>,
    pub cached_at_secs: u64,
}

/// Global application state shared across Tauri command handlers.
pub struct AppState {
    pub http_client: Client,
    pub download_client: Client,
    pub no_redirect_client: Client,
    pub release_cache: Mutex<HashMap<String, (Release, Instant, Option<String>)>>,
    pub version_tag_cache: Mutex<HashMap<String, (String, Instant)>>,
    pub settings: Mutex<Option<UserSettings>>,
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn cache_file_path() -> Option<PathBuf> {
    let mut dir = dirs::data_local_dir()?;
    dir.push("Synapps");
    let _ = std::fs::create_dir_all(&dir);
    dir.push("release-cache.json");
    Some(dir)
}

fn load_disk_cache() -> HashMap<String, CachedReleaseEntry> {
    let Some(path) = cache_file_path() else {
        return HashMap::new();
    };
    let Ok(content) = std::fs::read_to_string(path) else {
        return HashMap::new();
    };
    serde_json::from_str(&content).unwrap_or_default()
}

fn save_disk_cache(entries: &HashMap<String, CachedReleaseEntry>) {
    let Some(path) = cache_file_path() else {
        return;
    };
    if let Ok(json) = serde_json::to_string(entries) {
        let _ = std::fs::write(path, json);
    }
}

impl AppState {
    pub fn new() -> Self {
        let user_agent = "Synapps/0.1.0 (tauri; +https://github.com/storytold)";
        let client = Client::builder()
            .user_agent(user_agent)
            .connect_timeout(Duration::from_secs(15))
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| Client::new());

        // Dedicated streaming client without a total body timeout so large app archives
        // (100 MB - 1 GB+) never abort mid-download; read_timeout resets on every chunk.
        let download_client = Client::builder()
            .user_agent(user_agent)
            .connect_timeout(Duration::from_secs(20))
            .read_timeout(Duration::from_secs(120))
            .build()
            .unwrap_or_else(|_| Client::new());

        let no_redirect_client = Client::builder()
            .user_agent(user_agent)
            .redirect(Policy::none())
            .connect_timeout(Duration::from_secs(4))
            .timeout(Duration::from_secs(6))
            .build()
            .unwrap_or_else(|_| Client::new());

        // Hydrate in-memory cache from persistent disk cache (valid for up to 1 hour)
        let disk_entries = load_disk_cache();
        let current_secs = now_secs();
        let mut initial_release_cache = HashMap::new();
        let mut initial_tag_cache = HashMap::new();

        for (slug, entry) in disk_entries {
            if current_secs.saturating_sub(entry.cached_at_secs) < 3600 {
                initial_tag_cache.insert(
                    slug.clone(),
                    (entry.release.tag_name.clone(), Instant::now()),
                );
                initial_release_cache.insert(
                    slug,
                    (entry.release, Instant::now(), entry.etag),
                );
            }
        }

        Self {
            http_client: client,
            download_client,
            no_redirect_client,
            release_cache: Mutex::new(initial_release_cache),
            version_tag_cache: Mutex::new(initial_tag_cache),
            settings: Mutex::new(None),
        }
    }

    /// Retrieves a release from the memory cache if it was fetched within `max_age`.
    pub fn get_cached_release(&self, repo_slug: &str, max_age: Duration) -> Option<Release> {
        let cache = self.release_cache.lock().ok()?;
        if let Some((release, timestamp, _)) = cache.get(repo_slug) {
            if timestamp.elapsed() < max_age {
                return Some(release.clone());
            }
        }
        None
    }

    /// Retrieves any cached release and its ETag (even if expired) for conditional `If-None-Match` requests.
    pub fn get_stale_release_with_etag(&self, repo_slug: &str) -> Option<(Release, Option<String>)> {
        let cache = self.release_cache.lock().ok()?;
        cache
            .get(repo_slug)
            .map(|(rel, _, etag)| (rel.clone(), etag.clone()))
    }

    /// Stores a release in both memory and disk cache.
    pub fn cache_release(&self, repo_slug: String, release: Release, etag: Option<String>) {
        if let Ok(mut tag_cache) = self.version_tag_cache.lock() {
            tag_cache.insert(repo_slug.clone(), (release.tag_name.clone(), Instant::now()));
        }
        if let Ok(mut cache) = self.release_cache.lock() {
            cache.insert(repo_slug.clone(), (release.clone(), Instant::now(), etag.clone()));

            // Persist snapshot to disk
            let mut disk_map = load_disk_cache();
            disk_map.insert(
                repo_slug,
                CachedReleaseEntry {
                    release,
                    etag,
                    cached_at_secs: now_secs(),
                },
            );
            save_disk_cache(&disk_map);
        }
    }

    /// Retrieves a cached latest version tag if within `max_age`.
    pub fn get_cached_version_tag(&self, repo_slug: &str, max_age: Duration) -> Option<String> {
        if let Ok(cache) = self.version_tag_cache.lock() {
            if let Some((tag, timestamp)) = cache.get(repo_slug) {
                if timestamp.elapsed() < max_age {
                    return Some(tag.clone());
                }
            }
        }
        None
    }

    /// Caches a latest version tag in memory.
    pub fn cache_version_tag(&self, repo_slug: String, tag: String) {
        if let Ok(mut cache) = self.version_tag_cache.lock() {
            cache.insert(repo_slug, (tag, Instant::now()));
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
