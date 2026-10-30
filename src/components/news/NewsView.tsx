import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  APP_ICON_COLORS,
  FULL_BLEED_SQUARE_IDS,
  PADDED_SQUIRCLE_IDS,
  getAppInitials,
  resolveAppTileBackground,
} from '../../lib/appVisuals';
import { fetchLatestRelease } from '../../lib/tauri';
import { AppStatus, type AppInfo, type AppState, type Release } from '../../lib/types';
import { useAppStore } from '../../stores/appStore';
import { CloseIcon, DeveloperItemIcon, SearchIcon } from '../common/SidebarIcons';

const releaseNotesCache = new Map<string, Release>();

function NewsAppIcon({ app }: { app: AppInfo }) {
  const [failed, setFailed] = useState(false);
  const imgSrc = app.iconUrl || `/icons/apps/${app.id}.png`;
  const iconColor = APP_ICON_COLORS[app.id] ?? 'var(--color-primary)';
  const isFullBleed = FULL_BLEED_SQUARE_IDS.has(app.id);
  const isPaddedSquircle = PADDED_SQUIRCLE_IDS.has(app.id);
  const isPixelArt = app.id === 'pixelorama';
  const tileBackground = resolveAppTileBackground(app.id, iconColor);

  return (
    <div
      className="relative flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] shadow-[0_6px_16px_rgba(0,0,0,0.22)]"
      style={tileBackground ? { background: tileBackground } : undefined}
    >
      {!failed ? (
        <img
          src={imgSrc}
          alt={app.name}
          className={`h-full w-full ${
            isPaddedSquircle
              ? 'scale-[1.18] object-cover'
              : isFullBleed
                ? 'object-cover'
                : 'object-contain p-1.5'
          } ${isPixelArt ? '[image-rendering:pixelated]' : ''}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-sm font-black text-white"
          style={{ background: iconColor }}
        >
          {getAppInitials(app.name)}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset ring-black/10 dark:ring-white/14" />
    </div>
  );
}

function formatChangelogLines(rawBody: string): string[] {
  return rawBody
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/^#{1,6}\s+/, '')
        .replace(/^[-*+]\s+/, '• ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1'),
    )
    .filter((line) => line.length > 0 && !line.startsWith('---') && !line.startsWith('==='));
}

export default function NewsView() {
  const { t, i18n } = useTranslation();
  const appsMap = useAppStore((state) => state.apps);
  const installApp = useAppStore((state) => state.installApp);
  const launchApp = useAppStore((state) => state.launchApp);

  const [onlyInstalled, setOnlyInstalled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [releases, setReleases] = useState<Record<string, Release>>(() => {
    const initial: Record<string, Release> = {};
    releaseNotesCache.forEach((value, key) => {
      initial[key] = value;
    });
    return initial;
  });
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const sortedApps = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const list = [...appsMap.values()].filter((entry) => {
      if (onlyInstalled) {
        const isInstalled =
          entry.status === AppStatus.Installed || entry.status === AppStatus.UpdateAvailable;
        if (!isInstalled) return false;
      }
      if (!query) return true;
      const rel = releases[entry.app.id];
      return (
        entry.app.name.toLocaleLowerCase().includes(query) ||
        entry.app.developer.toLocaleLowerCase().includes(query) ||
        (entry.latestVersion ?? '').toLocaleLowerCase().includes(query) ||
        (rel?.body ?? '').toLocaleLowerCase().includes(query)
      );
    });

    const priority = (status: AppStatus) => {
      if (status === AppStatus.UpdateAvailable) return 0;
      if (status === AppStatus.Installed) return 1;
      return 2;
    };

    return list.sort((a, b) => {
      const diff = priority(a.status) - priority(b.status);
      if (diff !== 0) return diff;
      return a.app.name.localeCompare(b.app.name);
    });
  }, [appsMap, onlyInstalled, searchQuery, releases]);

  useEffect(() => {
    let cancelled = false;
    const queue = [...appsMap.values()].filter((item) => !releaseNotesCache.has(item.app.id));
    if (queue.length === 0) return;

    const loadBatch = async () => {
      const concurrency = 4;
      for (let i = 0; i < queue.length; i += concurrency) {
        if (cancelled) break;
        const slice = queue.slice(i, i + concurrency);
        await Promise.all(
          slice.map(async (item: AppState) => {
            const rel = await fetchLatestRelease(item.app.repo);
            if (rel && !cancelled) {
              releaseNotesCache.set(item.app.id, rel);
              setReleases((prev) => ({ ...prev, [item.app.id]: rel }));
            }
          }),
        );
      }
    };

    void loadBatch();
    return () => {
      cancelled = true;
    };
  }, [appsMap]);

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleExpand = (appId: string) => {
    setExpandedCards((prev) => ({ ...prev, [appId]: !prev[appId] }));
  };

  return (
    <section aria-labelledby="news-heading" className="mx-auto w-full max-w-4xl pt-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id="news-heading" className="theme-text text-lg font-bold tracking-tight">
              {t('news.title')}
            </h1>
            <span className="theme-pill rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              {t('app.appCount', { count: sortedApps.length })}
            </span>
          </div>
          <p className="theme-text-secondary mt-0.5 text-xs">{t('news.subtitle')}</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <div className="frosted-panel flex h-9 items-center rounded-full p-1">
            <button
              type="button"
              onClick={() => setOnlyInstalled(false)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition outline-none ${
                !onlyInstalled ? 'theme-nav-active font-semibold' : 'theme-text-secondary'
              }`}
            >
              {t('news.allApps')}
            </button>
            <button
              type="button"
              onClick={() => setOnlyInstalled(true)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition outline-none ${
                onlyInstalled ? 'theme-nav-active font-semibold' : 'theme-text-secondary'
              }`}
            >
              {t('news.installedOnly')}
            </button>
          </div>

          <label className="flex-1 sm:w-60 sm:flex-initial">
            <span className="sr-only">{t('common.search')}</span>
            <div className="frosted-panel theme-text flex h-9 items-center gap-2.5 rounded-full px-3.5 transition focus-within:ring-1 focus-within:ring-[var(--color-primary)]">
              <span className="theme-text-muted shrink-0">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('app.searchPlaceholder')}
                className="theme-text min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--color-text-muted)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={t('common.clearSearch')}
                  onClick={() => setSearchQuery('')}
                  className="theme-text-muted flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition hover:bg-[var(--item-hover-bg)] hover:text-[var(--color-text)]"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </label>
        </div>
      </div>

      {sortedApps.length === 0 ? (
        <div className="frosted-panel theme-text flex min-h-56 flex-col items-center justify-center rounded-[26px] px-6 py-14 text-center">
          <h2 className="theme-text text-sm font-semibold">
            {onlyInstalled ? t('news.noInstalledNews') : t('app.empty')}
          </h2>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 pb-6">
          {sortedApps.map((entry) => {
            const { app, status, installedVersion, latestVersion } = entry;
            const release = releases[app.id];
            const versionTag =
              release?.tagName || latestVersion || installedVersion || 'v1.0.0';
            const cleanVersion = versionTag.startsWith('v') ? versionTag : `v${versionTag}`;
            const formattedDate = formatDate(release?.publishedAt);
            const lines = release?.body ? formatChangelogLines(release.body) : [];
            const isExpanded = Boolean(expandedCards[app.id]);
            const visibleLines = isExpanded ? lines.slice(0, 25) : lines.slice(0, 4);
            const hasMoreLines = lines.length > 4;

            return (
              <article
                key={app.id}
                className="app-card flex flex-col gap-3.5 rounded-[24px] p-4 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <NewsAppIcon app={app} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="theme-text truncate text-sm font-bold">{app.name}</h2>
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{ background: 'var(--color-primary)' }}
                        >
                          {cleanVersion}
                        </span>
                        {status === AppStatus.UpdateAvailable && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-amber-400">
                            {t('app.updateAvailable')}
                          </span>
                        )}
                        {status === AppStatus.Installed && (
                          <span className="theme-pill rounded-full px-2 py-0.5 text-[10.5px] font-medium">
                            {t('app.installed')}
                          </span>
                        )}
                      </div>

                      <div className="theme-text-muted mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <DeveloperItemIcon
                            isSuite={app.developerId === 'artcraft'}
                            className="h-3 w-3"
                          />
                          {app.developer}
                        </span>
                        {formattedDate && (
                          <>
                            <span>•</span>
                            <span>{t('news.releasedOn', { date: formattedDate })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {status === AppStatus.UpdateAvailable && (
                      <button
                        type="button"
                        onClick={() => void installApp(app.id)}
                        className="cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        {t('app.update')}
                      </button>
                    )}
                    {status === AppStatus.Installed && (
                      <button
                        type="button"
                        onClick={() => void launchApp(app.id)}
                        className="theme-pill-interactive cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-semibold"
                      >
                        {t('app.open')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="theme-divider border-t pt-3">
                  <span className="theme-text-secondary mb-1.5 block text-[11px] font-semibold uppercase tracking-wider">
                    {t('news.whatsNew')}
                  </span>

                  {visibleLines.length > 0 ? (
                    <div className="space-y-1 text-xs leading-relaxed theme-text-secondary">
                      {visibleLines.map((line, idx) => (
                        <p key={idx} className="break-words">
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs leading-relaxed theme-text-secondary">
                      <p>• {t(app.description, { defaultValue: t('app.noDescription') })}</p>
                      <p>• {t('news.defaultHighlights')}</p>
                    </div>
                  )}

                  {hasMoreLines && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(app.id)}
                      className="mt-2 cursor-pointer text-xs font-semibold transition hover:underline"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {isExpanded ? t('news.showLess') : t('news.showMore')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
