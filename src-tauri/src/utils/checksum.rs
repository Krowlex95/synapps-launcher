use crate::error::AppError;
use sha2::{Digest, Sha256};
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

/// Computes the SHA-256 checksum of a file asynchronously in 64KB chunks.
pub async fn compute_sha256<P: AsRef<Path>>(path: P) -> Result<String, AppError> {
    let mut file = File::open(path.as_ref()).await?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];

    loop {
        let bytes_read = file.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    let result = hasher.finalize();
    Ok(hex::encode(result))
}

/// Verifies whether the SHA-256 checksum of a file matches the expected hash.
pub async fn verify_sha256<P: AsRef<Path>>(
    path: P,
    expected_hash: &str,
) -> Result<bool, AppError> {
    let computed = compute_sha256(path.as_ref()).await?;
    let expected = expected_hash.trim().to_lowercase();
    let matches = computed.to_lowercase() == expected;

    if !matches {
        log::warn!(
            "Checksum mismatch for {}: computed {}, expected {}",
            path.as_ref().display(),
            computed,
            expected
        );
    } else {
        log::info!(
            "Checksum verified for {}: {}",
            path.as_ref().display(),
            computed
        );
    }

    Ok(matches)
}

/// Parses a SHA-256 hash from either a standalone hash string or a `sha256sum` output line.
/// (e.g., `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  target.zip`).
pub fn parse_checksum(content: &str, target_filename: Option<&str>) -> Option<String> {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let hash = parts[0];
        if hash.len() == 64 && hash.chars().all(|c| c.is_ascii_hexdigit()) {
            if let Some(target) = target_filename {
                if parts.len() > 1 {
                    let file_part = parts[1].trim_start_matches('*');
                    if file_part.ends_with(target) {
                        return Some(hash.to_lowercase());
                    }
                }
            } else {
                return Some(hash.to_lowercase());
            }
        }
    }

    // Direct single hash check
    let trimmed = content.trim();
    if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        return Some(trimmed.to_lowercase());
    }

    None
}
