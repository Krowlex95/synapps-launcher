use crate::models::ReleaseAsset;

/// Returns the normalized operating system name for the current platform.
/// Possible values: "windows", "macos", "linux", or "unknown".
pub fn current_os() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
}

/// Returns the normalized CPU architecture name for the current platform.
/// Possible values: "x86_64" or "aarch64".
pub fn current_arch() -> &'static str {
    if cfg!(target_arch = "x86_64") {
        "x86_64"
    } else if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        "x86_64"
    }
}

/// Returns prioritized file extensions for the specified OS.
/// Pattern:
/// - Windows: .zip (portable), .msi, .exe
/// - macOS: .dmg, .zip, .tar.gz
/// - Linux: .AppImage, .tar.gz, .zip
pub fn supported_extensions_for_os(os: &str) -> &'static [&'static str] {
    match os {
        "windows" => &[".zip", ".7z", ".msi", ".exe"],
        "macos" => &[".dmg", ".zip", ".tar.gz"],
        "linux" => &[".appimage", ".tar.gz", ".zip"],
        _ => &[".zip", ".tar.gz"],
    }
}

fn is_excluded_os(name: &str, os: &str) -> bool {
    let other_os_keywords: &[&str] = match os {
        "windows" => &[
            "macos", "darwin", "osx", "-mac", "_mac", ".mac.", "linux", "ubuntu", "debian",
            "fedora", "freebsd", "android", "ios",
        ],
        "macos" => &[
            "windows", "win64", "win32", "win-x64", "-win", "_win", "linux", "ubuntu", "debian",
            "freebsd", "android",
        ],
        "linux" => &[
            "windows", "win64", "win32", "win-x64", "-win", "_win", "macos", "darwin", "osx",
            "-mac", "freebsd", "android", "ios",
        ],
        _ => &[],
    };
    other_os_keywords.iter().any(|kw| name.contains(kw))
}

fn is_excluded_arch(name: &str, arch: &str) -> bool {
    if arch == "x86_64" {
        name.contains("arm64")
            || name.contains("aarch64")
            || name.contains("armv7")
            || name.contains("riscv")
            || name.contains("ppc64")
            || name.contains("s390x")
    } else if arch == "aarch64" {
        name.contains("x86_64")
            || name.contains("x64")
            || name.contains("amd64")
            || name.contains("win64")
            || name.contains("i386")
            || name.contains("i686")
    } else {
        false
    }
}

/// Selects and ranks all compatible binary release assets for the given app, OS, and architecture.
/// Returns a sorted Vec of ReleaseAsset from highest scoring to lowest scoring.
pub fn select_best_assets(
    assets: &[ReleaseAsset],
    app_id: &str,
    os: &str,
    arch: &str,
) -> Vec<ReleaseAsset> {
    let os_lower = os.to_lowercase();
    let arch_lower = arch.to_lowercase();

    log::info!(
        "Ranking assets for app: {}, os: {}, arch: {}",
        app_id,
        os,
        arch
    );

    let os_aliases: &[&str] = match os_lower.as_str() {
        "windows" => &["windows", "win64", "win-x64", "win_x64", "win32", "win", "msvc"],
        "macos" => &["macos", "darwin", "osx", "mac", "universal", "apple"],
        "linux" => &["linux", "appimage", "ubuntu", "gnu"],
        _ => &[os_lower.as_str()],
    };

    let arch_aliases: &[&str] = if arch_lower == "x86_64" {
        &["x86_64", "x64", "amd64", "win64", "64bit", "64-bit"]
    } else if arch_lower == "aarch64" {
        &["aarch64", "arm64"]
    } else {
        &[]
    };

    // Stems of all macOS .dmg assets to detect companion macOS .zip packages (e.g. electron-builder mac zips)
    let dmg_stems: Vec<String> = assets
        .iter()
        .filter_map(|a| {
            let n = a.name.to_lowercase();
            if n.ends_with(".dmg") {
                Some(n[..n.len() - 4].to_string())
            } else {
                None
            }
        })
        .collect();

    let has_any_windows_binary = assets.iter().any(|a| {
        let n = a.name.to_lowercase();
        n.ends_with(".exe") || n.ends_with(".msi") || os_aliases.iter().any(|o| n.contains(o))
    });

    let mut scored: Vec<(i32, ReleaseAsset)> = Vec::new();

    for asset in assets {
        let n = asset.name.to_lowercase();

        // 1. Noise and unwanted file filters
        if n.contains("symbols")
            || n.contains("debug")
            || n.contains("pdb")
            || n.contains("sha256")
            || n.contains("sha512")
            || n.contains("export_templates")
            || n.contains("template")
            || n.contains("headless")
            || n.contains("server")
            || n.contains("-web")
            || n.contains("_web")
            || n.contains("source")
            || n.contains("addon")
            || n.contains("dont-use-this-file")
            || n.ends_with(".blockmap")
            || n.ends_with(".yml")
            || n.ends_with(".yaml")
            || n.ends_with(".txt")
            || n.ends_with(".apk")
            || n.ends_with(".deb")
            || n.ends_with(".rpm")
            || n.ends_with(".flatpak")
            || n.ends_with(".snap")
            || (os_lower == "windows" && n.ends_with(".appimage"))
        {
            continue;
        }

        // 2. OS and Arch exclusions
        if is_excluded_os(&n, &os_lower) || is_excluded_arch(&n, &arch_lower) {
            continue;
        }

        // 3. Detect macOS zips masquerading as generic zips (e.g. Blockbench_x64_5.2.2.zip)
        if os_lower == "windows" && has_any_windows_binary && n.ends_with(".zip") {
            let stem = &n[..n.len() - 4];
            if dmg_stems.iter().any(|d| d == stem) && !os_aliases.iter().any(|o| n.contains(o)) {
                log::info!("Filtering out macOS companion zip: {}", asset.name);
                continue;
            }
        }

        // 4. File extension classification
        let is_zip = n.ends_with(".zip");
        let is_7z = n.ends_with(".7z");
        let is_archive = is_zip || is_7z || n.ends_with(".tar.gz");
        let is_msi = n.ends_with(".msi");
        let is_exe = n.ends_with(".exe");
        let is_appimage = n.ends_with(".appimage");
        let is_dmg = n.ends_with(".dmg");

        let supported = match os_lower.as_str() {
            "windows" => is_archive || is_msi || is_exe,
            "macos" => is_dmg || is_archive,
            "linux" => is_appimage || is_archive,
            _ => is_archive,
        };
        if !supported {
            continue;
        }

        let has_os_alias = os_aliases.iter().any(|o| n.contains(o));
        let has_arch_alias = arch_aliases.iter().any(|a| n.contains(a));
        let is_portable = n.contains("portable");

        let mut score: i32 = 0;
        if os_lower == "windows" {
            if has_os_alias && has_arch_alias && is_portable {
                score = 100;
            } else if is_portable && is_archive {
                score = 95;
            } else if has_os_alias && has_arch_alias && is_archive {
                score = 90;
            } else if has_os_alias && has_arch_alias && is_msi {
                score = 85;
            } else if has_os_alias && has_arch_alias && is_exe {
                score = 80;
            } else if is_portable && is_exe {
                score = 75;
            } else if has_os_alias && is_archive {
                score = 72;
            } else if has_os_alias && (is_msi || is_exe) {
                score = 70;
            } else if has_arch_alias && is_archive {
                score = 65;
            } else if has_arch_alias && is_exe {
                score = 60;
            } else if is_archive && !dmg_stems.iter().any(|d| n.starts_with(d)) {
                score = 50;
            } else if is_exe {
                score = 40;
            } else if is_archive {
                score = 30;
            }

            // Adjustments
            if n.contains("mono") {
                score -= 15;
            }
            if n.contains("portable.exe") || n.ends_with("-x64.exe") {
                score += 8;
            }
            if n.contains("setup") || n.contains("installer") {
                score -= 10;
            }
        } else {
            // General scoring for macOS / Linux
            if has_os_alias && has_arch_alias {
                score = 90;
            } else if has_os_alias {
                score = 70;
            } else if has_arch_alias {
                score = 60;
            } else {
                score = 40;
            }
        }

        if score > 0 {
            scored.push((score, asset.clone()));
        }
    }

    scored.sort_by(|a, b| b.0.cmp(&a.0));
    scored.into_iter().map(|(_, a)| a).collect()
}

/// Selects the best matching binary release asset for the given app, OS, and architecture.
/// Supports both ArtCraft (`{appname}-v{version}-{os}-{arch}.{ext}`) and third-party
/// open-source release conventions (`win64`, `win-x64`, `Windows-x86_64`, `64bit`, etc.).
pub fn select_asset(
    assets: &[ReleaseAsset],
    app_id: &str,
    os: &str,
    arch: &str,
    target_ext: &str,
) -> Option<ReleaseAsset> {
    let ext_lower = target_ext.to_lowercase();
    select_best_assets(assets, app_id, os, arch)
        .into_iter()
        .find(|a| a.name.to_lowercase().ends_with(&ext_lower))
}

/// Looks for a companion checksum asset (.sha256, .sha256sum, SHA256SUMS, or checksums.txt).
pub fn find_checksum_asset(assets: &[ReleaseAsset], target_asset_name: &str) -> Option<ReleaseAsset> {
    let target_name_lower = target_asset_name.to_lowercase();

    // Specific file: {target}.sha256 or {target}.sha256sum
    for asset in assets {
        let name = asset.name.to_lowercase();
        if name == format!("{}.sha256", target_name_lower)
            || name == format!("{}.sha256sum", target_name_lower)
        {
            return Some(asset.clone());
        }
    }

    // General checksum files: sha256sums.txt, SHA256SUMS, checksums.txt
    for asset in assets {
        let name = asset.name.to_lowercase();
        if name.contains("sha256") || name.contains("checksum") {
            return Some(asset.clone());
        }
    }

    None
}

/// Kind of Windows installer detected from the binary contents.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstallerKind {
    Nsis,
    Inno,
}

/// Inspects the header of a Windows executable (up to 2 MB) to determine
/// whether it is an NSIS or Inno Setup installer.
pub fn detect_installer_kind(path: &std::path::Path) -> Option<InstallerKind> {
    let Ok(mut file) = std::fs::File::open(path) else {
        return None;
    };
    use std::io::Read;
    let mut buffer = vec![0u8; 2 * 1024 * 1024];
    let mut total = 0usize;
    while total < buffer.len() {
        match file.read(&mut buffer[total..]) {
            Ok(0) | Err(_) => break,
            Ok(n) => total += n,
        }
    }
    let slice = &buffer[..total];
    if slice.windows(12).any(|w| w == b"NullsoftInst") {
        Some(InstallerKind::Nsis)
    } else if slice.windows(10).any(|w| w == b"Inno Setup") {
        Some(InstallerKind::Inno)
    } else {
        None
    }
}

/// Returns true if the executable is an NSIS or Inno Setup installer.
pub fn is_installer_binary(path: &std::path::Path) -> bool {
    detect_installer_kind(path).is_some()
}
