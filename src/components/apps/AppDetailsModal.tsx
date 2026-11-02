import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  APP_ICON_COLORS,
  FULL_BLEED_SQUARE_IDS,
  PADDED_SQUIRCLE_IDS,
  getAppInitials,
  resolveAppTileBackground,
} from '../../lib/appVisuals';
import { APP_COMPATIBLE_EXTENSIONS, CATEGORIES } from '../../lib/constants';
import { notify } from '../../lib/notifications';
import {
  createDesktopShortcut,
  fetchLatestRelease,
  getAppDiskUsage,
  openAppFolder,
} from '../../lib/tauri';
import { AppStatus, type Release } from '../../lib/types';
import { useAppStore } from '../../stores/appStore';
import { CloseIcon, FolderIcon } from '../common/SidebarIcons';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export default function AppDetailsModal() {
  const { t } = useTranslation();
  const selectedAppId = useAppStore((s) => s.selectedDetailsAppId);
  const appsMap = useAppStore((s) => s.apps);
  const pinnedAppIds = useAppStore((s) => s.pinnedAppIds);
  const lastLaunchedMap = useAppStore((s) => s.lastLaunchedMap);
  const closeDetails = useAppStore((s) => s.closeAppDetails);
  const togglePinApp = useAppStore((s) => s.togglePinApp);
  const installApp = useAppStore((s) => s.installApp);
  const launchApp = useAppStore((s) => s.launchApp);
  const uninstallApp = useAppStore((s) => s.uninstallApp);
  const linkAppFromDisk = useAppStore((s) => s.linkAppFromDisk);

  const [diskBytes, setDiskBytes] = useState<number>(0);
  const [releaseInfo, setReleaseInfo] = useState<Release | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const state = selectedAppId ? appsMap.get(selectedAppId) : undefined;

  useEffect(() => {
    setImgFailed(false);
    setDiskBytes(0);
    setReleaseInfo(null);
    if (!state) return;

    let cancelled = false;
    const isInstalled =
      state.status === AppStatus.Installed || state.status === AppStatus.UpdateAvailable;

    if (isInstalled) {
      void getAppDiskUsage(state.app.id)
        .then((bytes) => {
          if (!cancelled) setDiskBytes(bytes);
        })
        .catch(() => {});
    }

    void fetchLatestRelease(state.app.repo)
      .then((rel) => {
        if (!cancelled && rel) setReleaseInfo(rel);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedAppId, state?.status]);

  useEffect(() => {
    if (!selectedAppId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetails();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAppId, closeDetails]);

  if (!state) return null;

  const { app, status, installedVersion, latestVersion } = state;
  const isInstalled = status === AppStatus.Installed || status === AppStatus.UpdateAvailable;
  const isPinned = pinnedAppIds.includes(app.id);
  const lastLaunched = lastLaunchedMap[app.id];
  const extensions = APP_COMPATIBLE_EXTENSIONS[app.id] ?? [];
  const categoryObj = CATEGORIES.find((c) => c.id === app.category);
  const iconColor = APP_ICON_COLORS[app.id] ?? 'var(--color-primary)';
  const tileBackground = resolveAppTileBackground(app.id, iconColor);
  const isFullBleed = FULL_BLEED_SQUARE_IDS.has(app.id);
  const isPaddedSquircle = PADDED_SQUIRCLE_IDS.has(app.id);

  const handleCreateShortcut = async () => {
    try {
      await createDesktopShortcut(app.id);
      notify({ variant: 'success', message: t('app.shortcutCreated', { name: app.name }) });
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
    }
  };

  const handleOpenFolder = async () => {
    try {
      await openAppFolder(app.id);
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeDetails();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-details-title"
        className="floating-popover theme-text custom-scrollbar max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-[28px] p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] shadow-lg"
              style={tileBackground ? { background: tileBackground } : undefined}
            >
              {!imgFailed ? (
                <img
                  src={app.iconUrl || `/icons/apps/${app.id}.png`}
                  alt={app.name}
                  className={`h-full w-full ${
                    isPaddedSquircle
                      ? 'scale-[1.18] object-cover'
                      : isFullBleed
                        ? 'object-cover'
                        : 'object-contain p-2.5'
                  }`}
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-xl font-black text-white"
                  style={{ background: iconColor }}
                >
                  {getAppInitials(app.name)}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="app-details-title" className="text-lg font-bold tracking-tight">
                  {app.name}
                </h2>
                {categoryObj && (
                  <span className="theme-pill rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold">
                    {t(categoryObj.labelKey)}
                  </span>
                )}
              </div>
              <p className="theme-text-muted mt-0.5 text-xs font-medium">{app.developer}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDetails}
            aria-label={t('common.close')}
            className="theme-pill-interactive flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Description */}
        <p className="theme-text-secondary mt-4 text-xs leading-relaxed">
          {t(app.description, { defaultValue: t('app.noDescription') })}
        </p>

        {/* Metadata Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div
            className="rounded-2xl border p-3 surface-border"
            style={{ background: 'color-mix(in srgb, var(--color-surface) 65%, transparent)' }}
          >
            <span className="theme-text-muted block text-[10px] uppercase tracking-wider">
              {t('app.version')}
            </span>
            <span className="mt-1 block truncate text-xs font-bold">
              {installedVersion || latestVersion || releaseInfo?.tagName || '—'}
            </span>
          </div>

          <div
            className="rounded-2xl border p-3 surface-border"
            style={{ background: 'color-mix(in srgb, var(--color-surface) 65%, transparent)' }}
          >
            <span className="theme-text-muted block text-[10px] uppercase tracking-wider">
              {isInstalled ? t('app.diskSize') : t('news.latestRelease')}
            </span>
            <span className="mt-1 block truncate text-xs font-bold">
              {isInstalled
                ? formatBytes(diskBytes)
                : releaseInfo?.assets?.[0]?.size
                  ? formatBytes(releaseInfo.assets[0].size)
                  : latestVersion || '—'}
            </span>
          </div>

          <div
            className="col-span-2 rounded-2xl border p-3 sm:col-span-1 surface-border"
            style={{ background: 'color-mix(in srgb, var(--color-surface) 65%, transparent)' }}
          >
            <span className="theme-text-muted block text-[10px] uppercase tracking-wider">
              {t('app.lastUsed')}
            </span>
            <span className="mt-1 block truncate text-xs font-bold">
              {lastLaunched ? new Date(lastLaunched).toLocaleDateString() : t('common.none')}
            </span>
          </div>
        </div>

        {/* Compatible Extensions */}
        {extensions.length > 0 && (
          <div className="mt-4">
            <span className="theme-text-secondary mb-2 block text-[11px] font-semibold uppercase tracking-wider">
              {t('app.compatibleFormats')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {extensions.map((ext) => (
                <span
                  key={ext}
                  className="theme-pill rounded-md px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase"
                >
                  .{ext}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Release Notes Preview */}
        {releaseInfo?.body && (
          <div className="mt-4">
            <span className="theme-text-secondary mb-1.5 block text-[11px] font-semibold uppercase tracking-wider">
              {t('news.whatsNew')} ({releaseInfo.tagName})
            </span>
            <div
              className="custom-scrollbar max-h-32 overflow-y-auto rounded-2xl border p-3 text-xs leading-relaxed whitespace-pre-line surface-border"
              style={{ background: 'color-mix(in srgb, var(--color-bg) 60%, transparent)' }}
            >
              {releaseInfo.body}
            </div>
          </div>
        )}

        {/* Primary & Secondary Action Buttons */}
        <div className="theme-divider mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {isInstalled ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    closeDetails();
                    void launchApp(app.id);
                  }}
                  className="cursor-pointer rounded-xl bg-[#4ade80] px-4 py-2 text-xs font-bold text-[#052010] shadow-sm transition hover:bg-[#22c55e]"
                >
                  {t('home.startApp')}
                </button>

                {status === AppStatus.UpdateAvailable && (
                  <button
                    type="button"
                    onClick={() => {
                      closeDetails();
                      void installApp(app.id);
                    }}
                    className="cursor-pointer rounded-xl bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/35 transition hover:bg-amber-500/30"
                  >
                    {t('app.update')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => togglePinApp(app.id)}
                  className="theme-pill-interactive cursor-pointer rounded-xl px-3 py-2 text-xs font-medium"
                >
                  {isPinned ? `★ ${t('home.unpinApp')}` : `☆ ${t('home.pinApp')}`}
                </button>

                <button
                  type="button"
                  onClick={() => void handleOpenFolder()}
                  className="theme-pill-interactive inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <FolderIcon className="h-3.5 w-3.5" />
                  <span>{t('app.openFolder')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCreateShortcut()}
                  className="theme-pill-interactive cursor-pointer rounded-xl px-3 py-2 text-xs font-medium"
                >
                  {t('app.createDesktopShortcut')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    closeDetails();
                    void installApp(app.id);
                  }}
                  className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {t('app.install')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void linkAppFromDisk(app.id);
                    closeDetails();
                  }}
                  className="theme-pill-interactive cursor-pointer rounded-xl px-3.5 py-2 text-xs font-medium"
                >
                  {t('app.locateExisting')}
                </button>
              </>
            )}
          </div>

          {isInstalled && (
            <button
              type="button"
              onClick={() => {
                closeDetails();
                void uninstallApp(app.id);
              }}
              className="cursor-pointer rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              {t('app.uninstall')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
