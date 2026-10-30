import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { APP_CATALOG, DEFAULT_SETTINGS } from './constants';
import {
  AppStatus,
  type AppState,
  type CustomTheme,
  type DownloadProgressEvent,
  type InstallCompleteEvent,
  type InstallErrorEvent,
  type RecentFileItem,
  type Release,
  type UserSettings,
} from './types';

export const isTauri =
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

function normalizeRelease(raw: any): Release | null {
  if (!raw || typeof raw !== 'object') return null;
  const tagName = raw.tagName ?? raw.tag_name;
  if (!tagName) return null;
  return {
    id: raw.id ?? tagName,
    tagName,
    name: raw.name ?? undefined,
    body: raw.body ?? undefined,
    publishedAt: raw.publishedAt ?? raw.published_at ?? undefined,
    prerelease: raw.prerelease ?? false,
    assets: Array.isArray(raw.assets)
      ? raw.assets.map((a: any) => ({
          name: a.name ?? '',
          downloadUrl: a.downloadUrl ?? a.browser_download_url ?? '',
          size: a.size ?? 0,
          contentType: a.contentType ?? a.content_type ?? undefined,
        }))
      : [],
  };
}

/** Typed frontend bridge. Delegates to Tauri native commands when in Tauri, or uses browser simulation when in web dev. */
export const fetchLatestRelease = async (repo: string): Promise<Release | null> => {
  if (isTauri) {
    try {
      const raw = await invoke<any>('fetch_latest_release', { repo });
      return normalizeRelease(raw);
    } catch {
      return null;
    }
  }
  try {
    const slug = repo.includes('/') ? repo : `storytold/${repo}`;
    const res = await fetch(`https://api.github.com/repos/${slug}/releases/latest`);
    if (res.ok) {
      const data = await res.json();
      return normalizeRelease(data);
    }
  } catch (e) {
    console.debug('Web preview release fetch error:', e);
  }
  return null;
};

export const fetchReleases = async (repo: string): Promise<Release[]> => {
  const rel = await fetchLatestRelease(repo);
  return rel ? [rel] : [];
};

export const getLocalAppStates = async (): Promise<AppState[]> => {
  if (isTauri) {
    return invoke<AppState[]>('get_local_app_states');
  }
  return APP_CATALOG.map((app) => ({
    app,
    status: AppStatus.NotInstalled,
  }));
};

export const syncAllApps = async (): Promise<AppState[]> => {
  if (isTauri) {
    return invoke<AppState[]>('sync_all_apps');
  }
  return APP_CATALOG.map((app) => ({
    app,
    status: AppStatus.NotInstalled,
  }));
};

export const installApp = async (appId: string, repo: string): Promise<InstallCompleteEvent | void> => {
  if (isTauri) {
    const raw = await invoke<any>('install_app', { appId, repo });
    if (raw && typeof raw === 'object') {
      return {
        appId: raw.appId ?? raw.app_id ?? appId,
        installedVersion: raw.installedVersion ?? raw.installed_version ?? raw.version,
        latestVersion: raw.latestVersion ?? raw.latest_version ?? raw.version,
      };
    }
    return { appId };
  }
  // Browser preview: simulate instant installation
  await new Promise((r) => setTimeout(r, 600));
  return { appId, installedVersion: 'latest' };
};

export const uninstallApp = async (appId: string): Promise<void> => {
  if (isTauri) {
    return invoke<void>('uninstall_app', { appId });
  }
  await new Promise((r) => setTimeout(r, 300));
};

export const launchApp = async (appId: string): Promise<void> => {
  if (isTauri) {
    return invoke<void>('launch_app', { appId });
  }
  console.log(`[Synapps Dev Preview] Launched application: ${appId}`);
};

export const getSettings = async (): Promise<Partial<UserSettings>> => {
  if (isTauri) {
    const raw = await invoke<any>('get_settings');
    if (!raw) return {};
    return {
      installDir: raw.installDir ?? raw.install_dir,
      theme: raw.theme,
      activeThemeId: raw.activeThemeId ?? raw.active_theme_id ?? 'default',
      accentColor: raw.accentColor ?? raw.accent_color,
      sidebarIconColor: raw.sidebarIconColor ?? raw.sidebar_icon_color,
      language: raw.language,
      firstRun: raw.firstRun ?? raw.first_run,
      githubToken: raw.githubToken ?? raw.github_token,
    };
  }
  const saved = localStorage.getItem('artcraft_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = async (settings: UserSettings): Promise<void> => {
  if (isTauri) {
    return invoke<void>('save_settings', { settings });
  }
  localStorage.setItem('artcraft_settings', JSON.stringify(settings));
};

function normalizeCustomTheme(raw: any): CustomTheme {
  return {
    id: String(raw?.id || 'custom-theme'),
    name: String(raw?.name || 'Tema Personalizado'),
    author: raw?.author ? String(raw.author) : undefined,
    version: String(raw?.version || '1.0.0'),
    description: raw?.description ? String(raw.description) : undefined,
    baseMode: (raw?.baseMode ?? raw?.base_mode) === 'light' ? 'light' : 'dark',
    bgColor: raw?.bgColor ?? raw?.bg_color ?? undefined,
    surfaceColor: raw?.surfaceColor ?? raw?.surface_color ?? undefined,
    popoverColor: raw?.popoverColor ?? raw?.popover_color ?? undefined,
    accentColor: raw?.accentColor ?? raw?.accent_color ?? undefined,
    iconColor: raw?.iconColor ?? raw?.icon_color ?? undefined,
    textColor: raw?.textColor ?? raw?.text_color ?? undefined,
    textSecondaryColor: raw?.textSecondaryColor ?? raw?.text_secondary_color ?? undefined,
    borderColor: raw?.borderColor ?? raw?.border_color ?? undefined,
    variables: raw?.variables && typeof raw.variables === 'object' ? raw.variables : {},
    customCss: raw?.customCss ?? raw?.custom_css ?? undefined,
  };
}

export const listCustomThemes = async (): Promise<CustomTheme[]> => {
  if (isTauri) {
    const raw = await invoke<any[]>('list_custom_themes');
    return Array.isArray(raw) ? raw.map(normalizeCustomTheme) : [];
  }
  const saved = localStorage.getItem('synapps_custom_themes');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.map(normalizeCustomTheme);
    } catch {
      // ignore
    }
  }
  return [];
};

export const saveCustomTheme = async (theme: CustomTheme): Promise<CustomTheme> => {
  if (isTauri) {
    const saved = await invoke<any>('save_custom_theme', { theme });
    return normalizeCustomTheme(saved);
  }
  const existing = await listCustomThemes();
  const normalized = normalizeCustomTheme(theme);
  const next = [...existing.filter((t) => t.id !== normalized.id), normalized];
  localStorage.setItem('synapps_custom_themes', JSON.stringify(next));
  return normalized;
};

export const deleteCustomTheme = async (themeId: string): Promise<void> => {
  if (isTauri) {
    return invoke<void>('delete_custom_theme', { themeId });
  }
  const existing = await listCustomThemes();
  const next = existing.filter((t) => t.id !== themeId);
  localStorage.setItem('synapps_custom_themes', JSON.stringify(next));
};

export const importCustomTheme = async (): Promise<CustomTheme | null> => {
  if (isTauri) {
    const raw = await invoke<any>('import_custom_theme');
    return raw ? normalizeCustomTheme(raw) : null;
  }
  return null;
};

export const exportCustomTheme = async (theme: CustomTheme): Promise<boolean> => {
  if (isTauri) {
    return invoke<boolean>('export_custom_theme', { theme });
  }
  return false;
};

export const openThemesFolder = async (): Promise<void> => {
  if (isTauri) {
    return invoke<void>('open_themes_folder');
  }
};

export const selectInstallDirectory = async (): Promise<string | null> => {
  if (isTauri) {
    return invoke<string | null>('select_install_directory');
  }
  const current = localStorage.getItem('synapps_install_dir') ?? 'C:\\Synapps\\apps';
  const custom = window.prompt('Informe o diretório de instalação desejado:', current);
  if (custom) {
    localStorage.setItem('synapps_install_dir', custom);
    return custom;
  }
  return current;
};

export const isFirstRun = async (): Promise<boolean> => {
  if (isTauri) {
    return invoke<boolean>('is_first_run');
  }
  return localStorage.getItem('artcraft_first_run_done') !== 'true';
};

export const checkLauncherUpdate = async (): Promise<Release | null> => {
  if (isTauri) {
    return invoke<Release | null>('check_launcher_update');
  }
  return null;
};

export const getAvailableDiskSpace = async (path: string): Promise<number | null> => {
  if (isTauri) {
    return invoke<number | null>('get_available_disk_space', { path });
  }
  return 85 * 1024 * 1024 * 1024; // 85 GB in browser mock
};

export const getRecentFiles = async (): Promise<RecentFileItem[]> => {
  if (isTauri) {
    return invoke<RecentFileItem[]>('get_recent_files');
  }
  const saved = localStorage.getItem('artcraft_recent_files');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const addRecentFiles = async (): Promise<RecentFileItem[]> => {
  if (isTauri) {
    return invoke<RecentFileItem[]>('add_recent_files');
  }
  const input = window.prompt('Informe o caminho do arquivo para adicionar aos recentes:');
  const existing = await getRecentFiles();
  if (!input?.trim()) return existing;
  const cleaned = input.trim();
  const parts = cleaned.split(/[\\/]/);
  const name = parts[parts.length - 1] || cleaned;
  const extParts = name.split('.');
  const extension = extParts.length > 1 ? extParts[extParts.length - 1].toLowerCase() : '';
  const directory = parts.length > 1 ? parts[parts.length - 2] : '';
  const next: RecentFileItem[] = [
    {
      path: cleaned,
      name,
      extension,
      directory,
      modifiedAt: Date.now(),
      sizeBytes: 0,
      pinned: true,
    },
    ...existing.filter((item) => item.path.toLowerCase() !== cleaned.toLowerCase()),
  ];
  localStorage.setItem('artcraft_recent_files', JSON.stringify(next));
  return next;
};

export const openRecentFile = async (path: string, appId?: string): Promise<void> => {
  if (isTauri) {
    return invoke<void>('open_recent_file', { path, appId: appId ?? null });
  }
  console.log(`[Synapps Dev Preview] Opened recent file: ${path} (app: ${appId ?? 'default'})`);
};

export const revealRecentFile = async (path: string): Promise<void> => {
  if (isTauri) {
    return invoke<void>('reveal_recent_file', { path });
  }
  console.log(`[Synapps Dev Preview] Revealed recent file in folder: ${path}`);
};

export const removeRecentFile = async (path: string): Promise<RecentFileItem[]> => {
  if (isTauri) {
    return invoke<RecentFileItem[]>('remove_recent_file', { path });
  }
  const existing = await getRecentFiles();
  const next = existing.filter((item) => item.path.toLowerCase() !== path.toLowerCase());
  localStorage.setItem('artcraft_recent_files', JSON.stringify(next));
  return next;
};

export const clearRecentFiles = async (): Promise<void> => {
  if (isTauri) {
    return invoke<void>('clear_recent_files');
  }
  localStorage.removeItem('artcraft_recent_files');
};

export function listenDownloadProgress(
  handler: (payload: DownloadProgressEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauri) {
    return Promise.resolve(() => {});
  }
  return listen<any>('download-progress', (event) => {
    const raw = event.payload;
    if (!raw) return;
    const appId = raw.appId ?? raw.app_id ?? '';
    let progress = raw.progress;
    if (progress === undefined && typeof raw.downloaded === 'number' && typeof raw.total === 'number' && raw.total > 0) {
      progress = Math.round((raw.downloaded / raw.total) * 100);
    }
    handler({
      appId,
      progress: progress ?? 0,
      downloadedBytes: raw.downloaded ?? raw.downloadedBytes,
      totalBytes: raw.total ?? raw.totalBytes,
      phase: raw.phase,
    });
  });
}

export function listenInstallComplete(
  handler: (payload: InstallCompleteEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauri) {
    return Promise.resolve(() => {});
  }
  return listen<any>('install-complete', (event) => {
    const raw = event.payload;
    if (!raw) return;
    handler({
      appId: raw.appId ?? raw.app_id ?? '',
      installedVersion: raw.installedVersion ?? raw.version ?? raw.installed_version,
      latestVersion: raw.latestVersion ?? raw.latest_version,
    });
  });
}

export function listenInstallError(
  handler: (payload: InstallErrorEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauri) {
    return Promise.resolve(() => {});
  }
  return listen<any>('install-error', (event) => {
    const raw = event.payload;
    if (!raw) return;
    handler({
      appId: raw.appId ?? raw.app_id ?? '',
      error: raw.error ?? 'Unknown error',
    });
  });
}
