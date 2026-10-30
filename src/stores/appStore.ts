import { create } from 'zustand';
import i18n from '../lib/i18n';
import { APP_CATALOG, INITIAL_APP_STATES } from '../lib/constants';
import { notify } from '../lib/notifications';
import {
  getLocalAppStates,
  installApp as installAppCommand,
  launchApp as launchAppCommand,
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

interface AppStore {
  apps: Map<string, AppState>;
  isLoading: boolean;
  error: string | null;
  syncApps: () => Promise<void>;
  installApp: (appId: string) => Promise<void>;
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
  error: null,

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
      apps: updateOne(get().apps, appId, { status: AppStatus.Downloading, downloadProgress: 0 }),
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
        }),
      });

      if (!alreadyMarkedInstalled) {
        notify({ variant: 'success', message: i18n.t('notifications.installed') });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const after = get().apps.get(appId);
      const alreadyReset = after?.status === AppStatus.NotInstalled;
      set({
        apps: updateOne(get().apps, appId, { status: AppStatus.NotInstalled, downloadProgress: undefined }),
        error: message,
      });
      if (!alreadyReset) {
        notify({ variant: 'error', message });
      }
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      notify({ variant: 'error', message });
    }
  },

  updateDownloadProgress: ({ appId, progress, phase }) => {
    const safeProgress = Math.min(100, Math.max(0, progress));
    let status = AppStatus.Downloading;
    if (phase === 'installing') status = AppStatus.Installing;
    if (phase === 'fallback') status = AppStatus.Fallback;
    set({ apps: updateOne(get().apps, appId, { status, downloadProgress: safeProgress }) });
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
      }),
    });
    if (!alreadyMarkedInstalled) {
      notify({ variant: 'success', message: i18n.t('notifications.installed') });
    }
  },

  setInstallError: ({ appId, error }) => {
    const current = get().apps.get(appId);
    const alreadyReset = current?.status === AppStatus.NotInstalled;
    set({
      apps: updateOne(get().apps, appId, { status: AppStatus.NotInstalled, downloadProgress: undefined }),
      error,
    });
    if (!alreadyReset) {
      notify({ variant: 'error', message: error });
    }
  },
}));
