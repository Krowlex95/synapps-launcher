import { useEffect, useState } from 'react';
import {
  checkLauncherUpdate,
  installLauncherUpdate,
  listenLauncherUpdateProgress,
  type LauncherUpdateInfo,
  type LauncherUpdateProgress,
} from '../lib/tauri';

export type { LauncherUpdateInfo, LauncherUpdateProgress };

export function useLauncherUpdate() {
  const [update, setUpdate] = useState<LauncherUpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<LauncherUpdateProgress | null>(null);

  const checkUpdate = async (): Promise<LauncherUpdateInfo | null> => {
    setIsChecking(true);
    try {
      const info = await checkLauncherUpdate();
      if (info && info.update_available) {
        setUpdate(info);
      } else {
        setUpdate(null);
      }
      return info;
    } catch (e) {
      console.warn('[Synapps] Failed to check for updates:', e);
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  const triggerInstallUpdate = async (downloadUrl?: string) => {
    if (isInstalling) return;
    setIsInstalling(true);
    setProgress({ downloaded: 0, total: 0, progress: 0, speedBps: 0 });
    const unlisten = await listenLauncherUpdateProgress((payload) => {
      setProgress(payload);
    });
    try {
      await installLauncherUpdate(downloadUrl ?? update?.download_url);
    } catch (e) {
      setIsInstalling(false);
      setProgress(null);
      unlisten();
      throw e;
    }
  };

  useEffect(() => {
    void checkUpdate();
  }, []);

  return {
    update,
    isChecking,
    isInstalling,
    progress,
    checkUpdate,
    triggerInstallUpdate,
    setUpdate,
  };
}
