import { useEffect } from 'react';
import { listenDownloadProgress } from '../lib/tauri';
import { useAppStore } from '../stores/appStore';

export function useDownload(): void {
  const updateDownloadProgress = useAppStore((state) => state.updateDownloadProgress);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listenDownloadProgress(updateDownloadProgress)
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch((error) => console.warn('[Synapps] Download progress events unavailable:', error));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [updateDownloadProgress]);
}
