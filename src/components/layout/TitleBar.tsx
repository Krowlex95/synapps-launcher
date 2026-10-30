import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isTauri } from '../../lib/tauri';
import { useSettingsStore } from '../../stores/settingsStore';

export default function TitleBar() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);
  // Subscribe to icon color to ensure immediate re-render when user selects a color
  const sidebarIconColor = useSettingsStore((state) => state.sidebarIconColor);

  useEffect(() => {
    if (!isTauri) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => {
        if (disposed) return;
        try {
          const win = getCurrentWindow();
          void win
            .isMaximized()
            .then((value) => {
              if (!disposed) setMaximized(value);
            })
            .catch(() => undefined);
          void win
            .onResized(() => {
              void win
                .isMaximized()
                .then((value) => {
                  if (!disposed) setMaximized(value);
                })
                .catch(() => undefined);
            })
            .then((stop) => {
              if (disposed) stop();
              else unlisten = stop;
            })
            .catch(() => undefined);
        } catch (e) {
          console.warn('[Synapps] Native window controls unavailable:', e);
        }
      })
      .catch((e) => console.warn('[Synapps] Window API unavailable:', e));

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const handleMinimize = async () => {
    if (!isTauri) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleMaximize = async () => {
    if (!isTauri) {
      setMaximized((v) => !v);
      return;
    }
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      await win.toggleMaximize();
      setMaximized(await win.isMaximized());
    } catch (e) {
      console.warn(e);
    }
  };

  const handleClose = async () => {
    if (!isTauri) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="drag-region fixed inset-x-0 top-0 z-40 flex h-11 items-center justify-end px-4 select-none"
    >
      {/* Open Acrylic Drag Region */}
      <div data-tauri-drag-region aria-hidden="true" className="drag-region h-full flex-1" />

      {/* Minimalist Colored Window Controls Synchronized with Icon Color Selection */}
      <div
        className="no-drag group/controls flex shrink-0 items-center gap-0.5"
        style={{ color: sidebarIconColor }}
      >
        <button
          type="button"
          aria-label={t('common.minimize')}
          title={t('common.minimize')}
          onClick={() => void handleMinimize()}
          className="group/btn flex h-6 w-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-icon-color)]/60"
        >
          <span className="window-control-dot flex h-3.5 w-3.5 items-center justify-center rounded-full">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="var(--sidebar-icon-contrast, #07090e)"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-2 w-2 opacity-0 transition-opacity duration-150 group-hover/controls:opacity-90 group-focus-within/controls:opacity-90"
              aria-hidden="true"
            >
              <path d="M2.75 6h6.5" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          aria-label={maximized ? t('common.restore') : t('common.maximize')}
          title={maximized ? t('common.restore') : t('common.maximize')}
          onClick={() => void handleMaximize()}
          className="group/btn flex h-6 w-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-icon-color)]/60"
        >
          <span className="window-control-dot flex h-3.5 w-3.5 items-center justify-center rounded-full">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="var(--sidebar-icon-contrast, #07090e)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-2 w-2 opacity-0 transition-opacity duration-150 group-hover/controls:opacity-90 group-focus-within/controls:opacity-90"
              aria-hidden="true"
            >
              {maximized ? (
                <path d="M9.25 5H7V2.75M2.75 7H5v2.25" />
              ) : (
                <path d="M4.5 3H9v4.5M7.5 9H3V4.5" />
              )}
            </svg>
          </span>
        </button>

        <button
          type="button"
          aria-label={t('common.close')}
          title={t('common.close')}
          onClick={() => void handleClose()}
          className="group/btn flex h-6 w-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-icon-color)]/60"
        >
          <span className="window-control-dot flex h-3.5 w-3.5 items-center justify-center rounded-full">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="var(--sidebar-icon-contrast, #07090e)"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-2 w-2 opacity-0 transition-opacity duration-150 group-hover/controls:opacity-90 group-focus-within/controls:opacity-90"
              aria-hidden="true"
            >
              <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
            </svg>
          </span>
        </button>
      </div>
    </header>
  );
}
