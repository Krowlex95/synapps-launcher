import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EXTENSION_APP_CANDIDATES, MAX_RECENT_FILES } from '../../lib/constants';
import { notify } from '../../lib/notifications';
import {
  addRecentFiles,
  clearRecentFiles,
  getRecentFiles,
  openRecentFile,
  removeRecentFile,
  revealRecentFile,
} from '../../lib/tauri';
import { AppStatus, type AppState, type RecentFileItem } from '../../lib/types';
import { useAppStore } from '../../stores/appStore';
import { CloseIcon, FolderIcon, PlusIcon } from '../common/SidebarIcons';
import HomeAppCard from './HomeAppCard';

interface HomeViewProps {
  searchQuery: string;
  onExploreCatalog: () => void;
}

const extensionAccentColors: Record<string, string> = {
  psd: '#2b7fff',
  psb: '#2b7fff',
  pxo: '#a855f7',
  graphite: '#64748b',
  svg: '#3b82f6',
  svgz: '#3b82f6',
  ai: '#ec4899',
  eps: '#ec4899',
  idml: '#ec4899',
  indd: '#ec4899',
  sla: '#ec4899',
  fig: '#db2777',
  pcl: '#f59e0b',
  pclx: '#f59e0b',
  sfd: '#f97316',
  otf: '#f97316',
  ttf: '#f97316',
  woff: '#f97316',
  woff2: '#f97316',
  png: '#06b6d4',
  jpg: '#06b6d4',
  jpeg: '#06b6d4',
  webp: '#06b6d4',
  raw: '#e9a23b',
  dng: '#e9a23b',
  mp4: '#8b5cf6',
  mkv: '#8b5cf6',
  mov: '#8b5cf6',
  mlt: '#0284c7',
  llc: '#10b981',
  aup3: '#2563eb',
  aup: '#2563eb',
  mmpz: '#22c55e',
  mmp: '#22c55e',
  wav: '#6366f1',
  mp3: '#6366f1',
  flac: '#6366f1',
  pdf: '#ef4444',
  doc: '#2563eb',
  docx: '#2563eb',
  xls: '#16a34a',
  xlsx: '#16a34a',
  ppt: '#f97316',
  pptx: '#f97316',
  md: '#9333ea',
  markdown: '#9333ea',
  affine: '#4f46e5',
  bbmodel: '#0ea5e9',
  fcstd: '#dc2626',
  step: '#0d9488',
  stp: '#0d9488',
  stl: '#0d9488',
  '3mf': '#0d9488',
  gcode: '#f97316',
  bgcode: '#f97316',
  dxf: '#65a30d',
  dwg: '#65a30d',
  ds3: '#52525b',
  godot: '#3b82f6',
  tscn: '#3b82f6',
  scn: '#3b82f6',
  tres: '#3b82f6',
  res: '#3b82f6',
  gd: '#3b82f6',
  gdshader: '#3b82f6',
};

function formatRelativeDate(
  timestampMs: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!timestampMs) return '';
  const now = new Date();
  const date = new Date(timestampMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / 86_400_000);

  if (diffDays <= 0) return t('home.today');
  if (diffDays === 1) return t('home.yesterday');
  if (diffDays < 30) return t('home.daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}

export default function HomeView({ searchQuery, onExploreCatalog }: HomeViewProps) {
  const { t } = useTranslation();
  const appsMap = useAppStore((state) => state.apps);
  const isLoadingApps = useAppStore((state) => state.isLoading);

  const [recentFiles, setRecentFiles] = useState<RecentFileItem[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const [openMenuAppId, setOpenMenuAppId] = useState<string | null>(null);

  // Close open app card dropdown on outside click or Escape
  useEffect(() => {
    if (!openMenuAppId) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-home-app-card]')) {
        setOpenMenuAppId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuAppId(null);
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuAppId]);

  const installedIdsSignature = useMemo(() => {
    const ids: string[] = [];
    for (const [id, state] of appsMap.entries()) {
      if (state.status === AppStatus.Installed || state.status === AppStatus.UpdateAvailable) {
        ids.push(id);
      }
    }
    return ids.sort().join(',');
  }, [appsMap]);

  const hasAnyInstalledApp = installedIdsSignature.length > 0;

  const refreshRecentFiles = useCallback(async () => {
    try {
      const files = await getRecentFiles();
      setRecentFiles(files);
    } catch (err) {
      console.warn('[Synapps] Could not load recent files:', err);
    } finally {
      setLoadingRecents(false);
    }
  }, []);

  useEffect(() => {
    void refreshRecentFiles();
  }, [refreshRecentFiles, installedIdsSignature]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshRecentFiles();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshRecentFiles]);

  const query = searchQuery.trim().toLocaleLowerCase();

  const installedApps = useMemo(() => {
    return [...appsMap.values()].filter((state) => {
      const active =
        state.status === AppStatus.Installed ||
        state.status === AppStatus.UpdateAvailable ||
        state.status === AppStatus.Downloading ||
        state.status === AppStatus.Installing ||
        state.status === AppStatus.Fallback;
      if (!active) return false;
      if (!query) return true;
      return (
        state.app.name.toLocaleLowerCase().includes(query) ||
        state.app.developer.toLocaleLowerCase().includes(query)
      );
    });
  }, [appsMap, query]);

  const resolveInstalledAppForExtension = useCallback(
    (ext: string): AppState | undefined => {
      const candidates = EXTENSION_APP_CANDIDATES[ext.toLowerCase()];
      if (!candidates) return undefined;
      for (const appId of candidates) {
        const candidateState = appsMap.get(appId);
        if (
          candidateState &&
          (candidateState.status === AppStatus.Installed ||
            candidateState.status === AppStatus.UpdateAvailable)
        ) {
          return candidateState;
        }
      }
      return undefined;
    },
    [appsMap],
  );

  // Strictly filter recent files to those compatible with installed apps, capped at 5 items
  const compatibleRecentFiles = useMemo(() => {
    const result: Array<{ item: RecentFileItem; matchedApp: AppState }> = [];
    for (const item of recentFiles) {
      const matchedApp = resolveInstalledAppForExtension(item.extension);
      if (!matchedApp) continue;

      if (query) {
        const matchesQuery =
          item.name.toLocaleLowerCase().includes(query) ||
          item.directory.toLocaleLowerCase().includes(query) ||
          item.extension.toLocaleLowerCase().includes(query) ||
          matchedApp.app.name.toLocaleLowerCase().includes(query);
        if (!matchesQuery) continue;
      }

      result.push({ item, matchedApp });
      if (result.length >= MAX_RECENT_FILES) break;
    }
    return result;
  }, [recentFiles, resolveInstalledAppForExtension, query]);

  const handleAddShortcuts = async () => {
    if (!hasAnyInstalledApp) return;
    try {
      const updated = await addRecentFiles();
      setRecentFiles(updated);
    } catch (err) {
      notify({
        message: err instanceof Error ? err.message : t('common.error'),
        variant: 'error',
      });
    }
  };

  const handleOpenFile = async (item: RecentFileItem, matchedApp: AppState) => {
    try {
      await openRecentFile(item.path, matchedApp.app.id);
      void refreshRecentFiles();
    } catch (err) {
      notify({
        message: err instanceof Error ? err.message : t('home.openError'),
        variant: 'error',
      });
      void refreshRecentFiles();
    }
  };

  const handleRevealFile = async (e: React.MouseEvent, item: RecentFileItem) => {
    e.stopPropagation();
    try {
      await revealRecentFile(item.path);
    } catch (err) {
      notify({
        message: err instanceof Error ? err.message : t('common.error'),
        variant: 'error',
      });
    }
  };

  const handleRemoveFile = async (e: React.MouseEvent, item: RecentFileItem) => {
    e.stopPropagation();
    try {
      const updated = await removeRecentFile(item.path);
      setRecentFiles(updated);
    } catch (err) {
      notify({
        message: err instanceof Error ? err.message : t('common.error'),
        variant: 'error',
      });
    }
  };

  const handleClearRecents = async () => {
    try {
      await clearRecentFiles();
      setRecentFiles([]);
    } catch (err) {
      notify({
        message: err instanceof Error ? err.message : t('common.error'),
        variant: 'error',
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pt-2">
      {/* Section 1: Installed Apps (Square Frosted Glass Tiles + Click Dropdown) */}
      <section aria-labelledby="home-installed-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2
              id="home-installed-heading"
              className="theme-text-secondary text-xs font-semibold uppercase tracking-wider"
            >
              {t('home.installedApps')}
            </h2>
            <span className="theme-pill rounded-full px-2 py-0.5 text-[10.5px] font-medium">
              {installedApps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onExploreCatalog}
            className="theme-pill-interactive cursor-pointer rounded-full px-3 py-1 text-xs font-medium"
          >
            {t('home.browseCatalog')}
          </button>
        </div>

        {isLoadingApps && installedApps.length === 0 ? (
          <div className="flex flex-wrap items-start gap-6 pb-8">
            {Array.from({ length: 3 }, (_, idx) => (
              <div
                key={idx}
                className="home-app-tile flex h-[132px] w-[138px] animate-pulse flex-col items-center justify-center gap-3 rounded-[22px] p-3.5"
              >
                <div
                  className="h-[68px] w-[68px] rounded-[18px]"
                  style={{ background: 'var(--skeleton-bg)' }}
                />
                <div
                  className="h-3 w-20 rounded"
                  style={{ background: 'var(--skeleton-bg)' }}
                />
              </div>
            ))}
          </div>
        ) : installedApps.length === 0 ? (
          <div className="home-recents-panel theme-text mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-6 py-6">
            <div className="min-w-0">
              <p className="theme-text text-sm font-semibold">{t('home.noInstalledApps')}</p>
              <p className="theme-text-secondary mt-1 text-xs">{t('home.noInstalledAppsHint')}</p>
            </div>
            <button
              type="button"
              onClick={onExploreCatalog}
              className="cursor-pointer rounded-full px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
              style={{ background: 'var(--color-primary)' }}
            >
              {t('home.exploreApps')}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-6 pb-8">
            {installedApps.map((state) => (
              <HomeAppCard
                key={state.app.id}
                state={state}
                menuOpen={openMenuAppId === state.app.id}
                onToggleMenu={() =>
                  setOpenMenuAppId((prev) => (prev === state.app.id ? null : state.app.id))
                }
                onCloseMenu={() => setOpenMenuAppId(null)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Unified Frosted Glass Recent Files Panel (Max 5 Compatible Files) */}
      <section aria-labelledby="home-recents-heading">
        <div className="home-recents-panel theme-text rounded-[26px] px-7 py-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2
                id="home-recents-heading"
                className="theme-text-secondary text-xs font-semibold uppercase tracking-wider"
              >
                {t('home.recentFiles')}
              </h2>
              {!loadingRecents && (
                <span className="theme-pill rounded-full px-2 py-0.5 text-[10.5px] font-medium">
                  {compatibleRecentFiles.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {compatibleRecentFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleClearRecents()}
                  className="theme-text-muted cursor-pointer rounded-full px-2.5 py-1 text-xs transition hover:text-red-500"
                >
                  {t('home.clearRecents')}
                </button>
              )}
              {hasAnyInstalledApp && (
                <button
                  type="button"
                  onClick={() => void handleAddShortcuts()}
                  className="theme-pill-interactive inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>{t('home.addShortcut')}</span>
                </button>
              )}
            </div>
          </div>

          {loadingRecents ? (
            <div className="flex flex-col">
              {Array.from({ length: 4 }, (_, idx) => (
                <div
                  key={idx}
                  className="theme-divider flex animate-pulse items-center gap-3 border-b py-3.5"
                >
                  <div
                    className="h-7 w-7 shrink-0 rounded-lg"
                    style={{ background: 'var(--skeleton-bg)' }}
                  />
                  <div
                    className="h-3.5 w-48 rounded"
                    style={{ background: 'var(--skeleton-bg)' }}
                  />
                </div>
              ))}
            </div>
          ) : compatibleRecentFiles.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="theme-text text-[13px] font-medium">{t('home.noRecentFiles')}</p>
                <p className="theme-text-secondary mt-1 text-xs">
                  {hasAnyInstalledApp
                    ? t('home.noRecentFilesHint')
                    : t('home.noRecentFilesNeedApps')}
                </p>
              </div>
              {hasAnyInstalledApp && (
                <button
                  type="button"
                  onClick={() => void handleAddShortcuts()}
                  className="theme-pill-interactive inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>{t('home.addShortcut')}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {compatibleRecentFiles.map(({ item, matchedApp }) => {
                const badgeColor =
                  extensionAccentColors[item.extension.toLowerCase()] ?? 'var(--color-primary)';
                const isGodotProject = item.name.toLowerCase() === 'project.godot';
                const displayName =
                  isGodotProject && item.directory ? item.directory : item.name;
                const relativeDate = formatRelativeDate(item.modifiedAt, t);
                const extLabel = (item.extension || 'FILE').slice(0, 5).toUpperCase();

                return (
                  <div
                    key={item.path}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleOpenFile(item, matchedApp)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void handleOpenFile(item, matchedApp);
                      }
                    }}
                    title={`${t('home.openWithApp', { app: matchedApp.app.name })} — ${item.path}`}
                    className="theme-divider group flex cursor-pointer items-center justify-between gap-4 border-b px-2 py-3 transition-colors duration-150 hover:bg-[var(--item-hover-bg)] outline-none"
                  >
                    {/* Left: Compatible Program Icon + File Name + Extension Pill */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <img
                        src={matchedApp.app.iconUrl || `/icons/apps/${matchedApp.app.id}.png`}
                        alt={matchedApp.app.name}
                        className="h-6 w-6 shrink-0 rounded-md bg-black/15 object-contain p-0.5 ring-1 ring-inset ring-[var(--pill-ring)]"
                      />

                      <span className="theme-text truncate text-[13px] font-medium">
                        {displayName}
                      </span>

                      <span
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider"
                        style={{
                          color: 'var(--color-text)',
                          background: `color-mix(in srgb, ${badgeColor} 22%, var(--pill-bg))`,
                          border: `1px solid color-mix(in srgb, ${badgeColor} 38%, var(--pill-ring))`,
                        }}
                      >
                        {extLabel}
                      </span>
                    </div>

                    {/* Right: App Name / Relative Date + Hover Actions */}
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="theme-text-muted hidden text-[11px] sm:inline">
                        {[matchedApp.app.name, relativeDate].filter(Boolean).join(' · ')}
                      </span>

                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => void handleRevealFile(e, item)}
                          title={t('home.openFileLocation')}
                          aria-label={t('home.openFileLocation')}
                          className="theme-text-muted flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition hover:bg-[var(--item-hover-bg)] hover:text-[var(--color-text)]"
                        >
                          <FolderIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => void handleRemoveFile(e, item)}
                          title={t('home.removeShortcut')}
                          aria-label={t('home.removeShortcut')}
                          className="theme-text-muted flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition hover:bg-red-500/15 hover:text-red-500"
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
