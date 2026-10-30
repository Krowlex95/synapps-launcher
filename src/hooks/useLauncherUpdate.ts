import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface LauncherUpdateInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  release_notes?: string;
  download_url?: string;
}

export function useLauncherUpdate() {
  const [update, setUpdate] = useState<LauncherUpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkUpdate = async () => {
    setIsChecking(true);
    try {
      const info: LauncherUpdateInfo = await invoke('check_launcher_update');
      if (info.update_available) {
        setUpdate(info);
      }
    } catch (e) {
      console.warn('[Synapps] Failed to check for updates:', e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    void checkUpdate();
  }, []);

  return { update, isChecking, checkUpdate, setUpdate };
}
