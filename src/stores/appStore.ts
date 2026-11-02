import { create } from 'zustand';
import i18n from '../lib/i18n';
import { APP_CATALOG, INITIAL_APP_STATES } from '../lib/constants';
import { notify } from '../lib/notifications';
import {
  cancelInstall as cancelInstallCommand,
  getLocalAppStates,
  installApp as installAppCommand,
  launchApp as launchAppCommand,
  linkExistingApp,
  scanSystemApps,
  syncAllApps,
  uninstallApp as uninstallAppCommand,
} from '../lib/tauri';
import {
  AppStatus,
  type AppState,
  type DownloadProgressEvent,
  type InstallCompleteEvent,
  type InstallErrorEvent,
} from '../lib/types';

function loadPinnedIds(): string[] {
  try {
    const raw = localStorage.getItem('synapps_pinned_apps');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadLastLaunchedMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem('synapps_last_launched');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

interface AppStore {
  apps: Map<string, AppState>;
  isLoading: boolean;
  isBatchUpdating: boolean;
  error: string | null;
  pinnedAppIds: string[];
  lastLaunchedMap: Record<string, number>;
  selectedDetailsAppId: string | null;
  openAppDetails: (appId: string) => void;
  closeAppDetails: () => void;
  togglePinApp: (appId: string) => void;
  syncApps: () => Promise<void>;
  installApp: (appId: string) => Promise<void>;
  cancelAppInstall: (appId: string) => Promise<void>;
  updateAllApps: () => Promise<void>;
  linkAppFromDisk: (appId: string) => Promise<void>;
  scanSystemForApps: () => Promise<number>;
  uninstallApp: (appId: string) => Promise<void>;
  launchApp: (appId: string) => Promise<void>;
  updateDownloadProgress: (event: DownloadProgressEvent) => void;
  setInstallComplete: (event: InstallCompleteEvent) => void;
  setInstallError: (event: InstallErrorEvent) => void;
}

function updateOne(apps: Map<string, AppState>, appId: string, changes: Partial<AppState>): Map<string, AppState> {
  const next = new Map(apps);
  const current = next.get(appId);
  if (current) next.set(appId, { ...current, ...changes });
  return next;
}

function mergeSyncedItems(prev: Map<string, AppState>, items: any[]): Map<string, AppState> {
  const next = new Map(INITIAL_APP_STATES);
  for (const item of items) {
    const id = item.appId ?? item.app_id ?? item.app?.id;
    if (!id) continue;
    const current = next.get(id);
    if (!current) continue;
    const prevEntry = prev.get(id);
    if (
      prevEntry &&
      (prevEntry.status === AppStatus.Downloading ||
        prevEntry.status === AppStatus.Installing ||
        prevEntry.status === AppStatus.Fallback)
    ) {
      next.set(id, prevEntry);
      continue;
    }
    const catalogApp = APP_CATALOG.find((app) => app.id === id) ?? current.app;
    next.set(id, {
      ...current,
      app: catalogApp,
      status: item.status ?? current.status,
      installedVersion: item.installedVersion ?? item.installed_version ?? current.installedVersion,
      latestVersion: item.latestVersion ?? item.latest_version ?? prevEntry?.latestVersion ?? current.latestVersion,
    });
  }
  return next;
}

export const useAppStore = create<AppStore>((set, get) => ({
  apps: new Map(INITIAL_APP_STATES),
  isLoading: false,
  isBatchUpdating: false,
  error: null,
  pinnedAppIds: loadPinnedIds(),
  lastLaunchedMap: loadLastLaunchedMap(),
  selectedDetailsAppId: null,

  openAppDetails: (appId) => set({ selectedDetailsAppId: appId }),
  closeAppDetails: () => set({ selectedDetailsAppId: null }),

  togglePinApp: (appId) => {
    const current = get().pinnedAppIds;
    const next = current.includes(appId)
      ? current.filter((id) => id !== appId)
      : [...current, appId];
    try {
      localStorage.setItem('synapps_pinned_apps', JSON.stringify(next));
    } catch {
      // ignore
    }
    set({ pinnedAppIds: next });
  },

  syncApps: async () => {
    set({ error: null });
    // 1. Instant local disk hydration (< 1ms) so installed apps render immediately without waiting on network
    try {
      const localItems = await getLocalAppStates();
      set({ apps: mergeSyncedItems(get().apps, localItems as any[]), isLoading: false });
    } catch {
      set({ isLoading: true });
    }

    // 2. Background GitHub version check for update badges
    try {
      const synced = await syncAllApps();
      set({ apps: mergeSyncedItems(get().apps, synced as any[]), isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ isLoading: false, error: message });
      console.warn('[Synapps] Could not sync apps:', error);
    }
  },

  installApp: async (appId) => {
    const current = get().apps.get(appId);
    if (!current || current.status === AppStatus.ComingSoon) return;
    set({
      apps: updateOne(get().apps, appId, {
        status: AppStatus.Downloading,
        downloadProgress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        downloadSpeedBps: 0,
      }),
      error: null,
    });
    try {
      const result = await installAppCommand(appId, current.app.repo);
      const after = get().apps.get(appId);
      const alreadyMarkedInstalled = after?.status === AppStatus.Installed;
      const resolvedVersion =
        (result && typeof result === 'object' ? result.installedVersion : undefined) ??
        after?.installedVersion ??
        after?.latestVersion;

      set({
        apps: updateOne(get().apps, appId, {
          status: AppStatus.Installed,
          installedVersion: resolvedVersion,
          downloadProgress: undefined,
          downloadedBytes: undefined,
          totalBytes: undefined,
          downloadSpeedBps: undefined,
        }),
      });

      if (!alreadyMarkedInstalled) {
        notify({ variant: 'success', message: i18n.t('notifications.installed') });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const after = get().apps.get(appId);
      const fallbackStatus = after?.installedVersion ? AppStatus.UpdateAvailable : AppStatus.NotInstalled;
      if (message.includes('__CANCELLED__')) {
        set({
          apps: updateOne(get().apps, appId, {
            status: fallbackStatus,
            downloadProgress: undefined,
            downloadedBytes: undefined,
            totalBytes: undefined,
            downloadSpeedBps: undefined,
          }),
        });
        notify({ variant: 'info', message: i18n.t('notifications.downloadCancelled') });
        return;
      }
      const alreadyReset = after?.status === fallbackStatus;
      set({
        apps: updateOne(get().apps, appId, {
          status: fallbackStatus,
          downloadProgress: undefined,
          downloadedBytes: undefined,
          totalBytes: undefined,
          downloadSpeedBps: undefined,
        }),
        error: message,
      });
      if (!alreadyReset) {
        notify({ variant: 'error', message });
      }
    }
  },

  cancelAppInstall: async (appId) => {
    try {
      await cancelInstallCommand(appId);
      const current = get().apps.get(appId);
      const fallbackStatus = current?.installedVersion ? AppStatus.UpdateAvailable : AppStatus.NotInstalled;
      set({
        apps: updateOne(get().apps, appId, {
          status: fallbackStatus,
          downloadProgress: undefined,
          downloadedBytes: undefined,
          totalBytes: undefined,
          downloadSpeedBps: undefined,
        }),
      });
    } catch (error) {
      console.warn('[Synapps] Failed to cancel install:', error);
    }
  },

  updateAllApps: async () => {
    if (get().isBatchUpdating) return;
    const updatable = [...get().apps.values()].filter(
      (item) => item.status === AppStatus.UpdateAvailable,
    );
    if (updatable.length === 0) return;

    set({ isBatchUpdating: true });
    for (const item of updatable) {
      await get().installApp(item.app.id);
    }
    set({ isBatchUpdating: false });
  },

  linkAppFromDisk: async (appId) => {
    try {
      const res = await linkExistingApp(appId);
      if (res) {
        set({
          apps: updateOne(get().apps, appId, {
            status: AppStatus.Installed,
            installedVersion: res.installedVersion ?? 'Sistema',
            downloadProgress: undefined,
          }),
        });
        notify({ variant: 'success', message: i18n.t('notifications.linkedExisting') });
      }
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
    }
  },

  scanSystemForApps: async () => {
    try {
      const found = await scanSystemApps();
      if (found.length > 0) {
        let next = new Map(get().apps);
        for (const item of found) {
          next = updateOne(next, item.appId, {
            status: AppStatus.Installed,
            installedVersion: item.installedVersion ?? 'Sistema',
          });
        }
        set({ apps: next });
        notify({
          variant: 'success',
          message: i18n.t('notifications.scannedSystemFound', { count: found.length }),
        });
      } else {
        notify({ variant: 'info', message: i18n.t('notifications.scannedSystemNone') });
      }
      return found.length;
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
      return 0;
    }
  },

  uninstallApp: async (appId) => {
    const current = get().apps.get(appId);
    if (!current) return;
    try {
      await uninstallAppCommand(appId);
      set({
        apps: updateOne(get().apps, appId, {
          status: AppStatus.NotInstalled,
          installedVersion: undefined,
          downloadProgress: undefined,
        }),
      });
      notify({ variant: 'success', message: i18n.t('notifications.uninstalled') });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      notify({ variant: 'error', message });
    }
  },

  launchApp: async (appId) => {
    try {
      await launchAppCommand(appId);
      const nextMap = { ...get().lastLaunchedMap, [appId]: Date.now() };
      try {
        localStorage.setItem('synapps_last_launched', JSON.stringify(nextMap));
      } catch {
        // ignore
      }
      set({ lastLaunchedMap: nextMap });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      notify({ variant: 'error', message });
    }
  },

  updateDownloadProgress: ({ appId, progress, downloadedBytes, totalBytes, speedBps, phase }) => {
    const safeProgress = Math.min(100, Math.max(0, progress));
    let status = AppStatus.Downloading;
    if (phase === 'installing') status = AppStatus.Installing;
    if (phase === 'fallback') status = AppStatus.Fallback;
    set({
      apps: updateOne(get().apps, appId, {
        status,
        downloadProgress: safeProgress,
        downloadedBytes,
        totalBytes,
        downloadSpeedBps: speedBps,
      }),
    });
  },

  setInstallComplete: ({ appId, installedVersion, latestVersion }) => {
    const current = get().apps.get(appId);
    if (!current) return;
    const alreadyMarkedInstalled = current.status === AppStatus.Installed;
    set({
      apps: updateOne(get().apps, appId, {
        status: AppStatus.Installed,
        installedVersion: installedVersion ?? latestVersion ?? current.latestVersion,
        latestVersion: latestVersion ?? current.latestVersion,
        downloadProgress: undefined,
        downloadedBytes: undefined,
        totalBytes: undefined,
        downloadSpeedBps: undefined,
      }),
    });
    if (!alreadyMarkedInstalled) {
      notify({ variant: 'success', message: i18n.t('notifications.installed') });
    }
  },

  setInstallError: ({ appId, error }) => {
    const current = get().apps.get(appId);
    const fallbackStatus = current?.installedVersion ? AppStatus.UpdateAvailable : AppStatus.NotInstalled;
    if (error.includes('__CANCELLED__')) {
      set({
        apps: updateOne(get().apps, appId, {
          status: fallbackStatus,
          downloadProgress: undefined,
          downloadedBytes: undefined,
          totalBytes: undefined,
          downloadSpeedBps: undefined,
        }),
      });
      return;
    }
    const alreadyReset = current?.status === fallbackStatus;
    set({
      apps: updateOne(get().apps, appId, {
        status: fallbackStatus,
        downloadProgress: undefined,
        downloadedBytes: undefined,
        totalBytes: undefined,
        downloadSpeedBps: undefined,
      }),
      error,
    });
    if (!alreadyReset) {
      notify({ variant: 'error', message: error });
    }
  },
}));
