import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import HomeView from './components/home/HomeView';
import NewsView from './components/news/NewsView';
import AppGrid from './components/apps/AppGrid';
import SettingsPanel from './components/settings/SettingsPanel';
import SetupDialog from './components/onboarding/SetupDialog';
import NotificationHost from './components/common/Notification';
import AppDetailsModal from './components/apps/AppDetailsModal';
import CommandPalette from './components/common/CommandPalette';
import {
  CategoryIcon,
  ChevronDownIcon,
  CloseIcon,
  DeveloperItemIcon,
  FilterIcon,
  SearchIcon,
} from './components/common/SidebarIcons';
import { useTheme } from './hooks/useTheme';
import { useDownload } from './hooks/useDownload';
import { useApps } from './hooks/useApps';
import { useLauncherUpdate } from './hooks/useLauncherUpdate';
import { useAppStore } from './stores/appStore';
import { useSettingsStore } from './stores/settingsStore';
import { CATEGORIES, DEVELOPER_CATEGORIES, FILTER_CATEGORIES } from './lib/constants';
import { isFirstRun, listenInstallComplete, listenInstallError } from './lib/tauri';
import { Category, type CategoryFilter } from './lib/types';

export default function App() {
  const { t } = useTranslation();
  useTheme();
  useDownload();
  const {
    update,
    setUpdate,
    isInstalling: isInstallingLauncherUpdate,
    progress: launcherUpdateProgress,
    triggerInstallUpdate,
  } = useLauncherUpdate();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(Category.Home);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategories, setFilterCategories] = useState<Category[]>([]);
  const [filterDevelopers, setFilterDevelopers] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  const effectiveSearchQuery = selectedCategory === Category.All ? searchQuery : '';
  const effectiveFilterCategories = selectedCategory === Category.All ? filterCategories : [];
  const effectiveFilterDevelopers = selectedCategory === Category.All ? filterDevelopers : [];
  const activeFilterCount = filterCategories.length + filterDevelopers.length;

  const firstRun = useSettingsStore((state) => state.firstRun);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const setFirstRun = useSettingsStore((state) => state.setFirstRun);
  const syncApps = useAppStore((state) => state.syncApps);
  const setInstallComplete = useAppStore((state) => state.setInstallComplete);
  const setInstallError = useAppStore((state) => state.setInstallError);
  const scanSystemForApps = useAppStore((state) => state.scanSystemForApps);
  const { apps, isLoading, error } = useApps(
    selectedCategory,
    effectiveSearchQuery,
    effectiveFilterCategories,
    effectiveFilterDevelopers,
  );
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filterOpen]);

  const toggleCategoryFilter = (cat: Category) => {
    setFilterCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleDeveloperFilter = (devId: string) => {
    setFilterDevelopers((prev) =>
      prev.includes(devId) ? prev.filter((d) => d !== devId) : [...prev, devId],
    );
  };

  const clearAllFilters = () => {
    setFilterCategories([]);
    setFilterDevelopers([]);
  };

  useEffect(() => {
    let disposed = false;
    let stopComplete: (() => void) | undefined;
    let stopError: (() => void) | undefined;
    void loadSettings().then(async () => {
      try {
        const result = await isFirstRun();
        if (!disposed) setFirstRun(result);
      } catch {
        /* Web preview or an older Rust backend: settings decide whether onboarding is needed. */
      }
      if (!disposed) void syncApps();
    });
    void listenInstallComplete(setInstallComplete)
      .then((stop) => {
        if (disposed) stop();
        else stopComplete = stop;
      })
      .catch((eventError) => console.warn('[Synapps] Install events unavailable:', eventError));
    void listenInstallError(setInstallError)
      .then((stop) => {
        if (disposed) stop();
        else stopError = stop;
      })
      .catch((eventError) => console.warn('[Synapps] Install events unavailable:', eventError));
    return () => {
      disposed = true;
      stopComplete?.();
      stopError?.();
    };
  }, [loadSettings, setFirstRun, syncApps, setInstallComplete, setInstallError]);

  const activeDeveloper = useMemo(
    () =>
      selectedCategory.startsWith('dev:')
        ? DEVELOPER_CATEGORIES.find((d) => d.id === selectedCategory)
        : undefined,
    [selectedCategory],
  );

  const header = useMemo(() => {
    if (activeDeveloper) return activeDeveloper.name;
    const cat = CATEGORIES.find((c) => c.id === selectedCategory);
    return t(cat?.labelKey ?? 'sidebar.home');
  }, [activeDeveloper, selectedCategory, t]);

  return (
    <div className="app-shell">
      <TitleBar />

      <Sidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onSettingsClick={() => setSettingsOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />

      <MainContent sidebarCollapsed={sidebarCollapsed}>
        {update && (
          <div className="mx-auto mb-5 flex w-full max-w-4xl items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-white">
                !
              </div>
              <div>
                <p className="font-bold">
                  {t('common.updateAvailable', { version: update.latest_version })}
                </p>
                <p className="text-xs opacity-80">
                  {update.release_notes || t('common.updateNotes')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isInstallingLauncherUpdate}
                className="cursor-pointer rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                onClick={() => void triggerInstallUpdate()}
              >
                {isInstallingLauncherUpdate
                  ? `${t('settings.downloadingUpdate')} (${launcherUpdateProgress?.progress ?? 0}%)`
                  : t('common.updateNow')}
              </button>
              <button
                type="button"
                className="p-2 opacity-50 hover:opacity-100"
                onClick={() => setUpdate(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="status"
            className="mx-auto mb-5 flex w-full max-w-4xl items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs surface-border"
            style={{ background: 'color-mix(in srgb, var(--color-warning) 9%, transparent)' }}
          >
            <span>
              {t('common.error')}: {error}
            </span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void syncApps()}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {selectedCategory === Category.Home ? (
          <HomeView
            searchQuery=""
            onExploreCatalog={() => setSelectedCategory(Category.All)}
          />
        ) : selectedCategory === Category.News ? (
          <NewsView />
        ) : (
          <section aria-labelledby="category-heading" className="mx-auto w-full max-w-4xl pt-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <h1
                  id="category-heading"
                  className="theme-text text-lg font-bold tracking-tight"
                >
                  {header}
                </h1>
                <span className="theme-pill rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  {t('app.appCount', { count: apps.length })}
                </span>
              </div>

              {/* Search Bar + Filter Dropdown Exclusively in the "All Apps" Menu */}
              {selectedCategory === Category.All && (
                <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => void scanSystemForApps()}
                    title={t('app.scanSystemApps')}
                    className="frosted-panel theme-text-secondary hover:text-[var(--color-text)] flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition hover:bg-[var(--item-hover-bg)]"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="9" r="5.5" />
                      <path d="M13.5 13.5 17 17" />
                    </svg>
                    <span>{t('app.scanSystemApps')}</span>
                  </button>

                  <div ref={filterPopoverRef} className="relative">
                    <button
                      type="button"
                      aria-expanded={filterOpen}
                      onClick={() => setFilterOpen((prev) => !prev)}
                      className={`frosted-panel theme-text flex h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs font-medium transition outline-none ${
                        activeFilterCount > 0 || filterOpen
                          ? 'ring-1 ring-[var(--color-primary)]'
                          : 'hover:bg-[var(--item-hover-bg)]'
                      }`}
                    >
                      <span className={activeFilterCount > 0 ? 'sidebar-icon-active' : 'sidebar-icon'}>
                        <FilterIcon className="h-3.5 w-3.5" />
                      </span>
                      <span>{t('app.filter')}</span>
                      {activeFilterCount > 0 && (
                        <span
                          className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                          style={{ background: 'var(--color-primary)' }}
                        >
                          {activeFilterCount}
                        </span>
                      )}
                      <span
                        className={`theme-text-muted transition-transform duration-200 ${
                          filterOpen ? 'rotate-180' : ''
                        }`}
                      >
                        <ChevronDownIcon className="h-3.5 w-3.5" />
                      </span>
                    </button>

                    {filterOpen && (
                      <div className="floating-popover theme-text absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-[24px] p-4 shadow-2xl">
                        <div className="theme-divider mb-3 flex items-center justify-between border-b pb-2.5">
                          <span className="text-xs font-semibold">{t('app.filter')}</span>
                          {activeFilterCount > 0 && (
                            <button
                              type="button"
                              onClick={clearAllFilters}
                              className="cursor-pointer text-[11px] font-semibold transition hover:underline"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              {t('app.clearFilters')}
                            </button>
                          )}
                        </div>

                        {/* Category Section */}
                        <div className="mb-4">
                          <span className="theme-text-secondary mb-2 block text-[11px] font-semibold uppercase tracking-wider">
                            {t('app.filterByCategory')}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {FILTER_CATEGORIES.map((cat) => {
                              const selected = filterCategories.includes(cat.id);
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => toggleCategoryFilter(cat.id)}
                                  className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition outline-none ${
                                    selected
                                      ? 'theme-nav-active font-semibold'
                                      : 'theme-pill-interactive'
                                  }`}
                                >
                                  <span className={selected ? 'sidebar-icon-active' : 'sidebar-icon'}>
                                    <CategoryIcon category={cat.id} className="h-3.5 w-3.5" />
                                  </span>
                                  <span>{t(cat.labelKey)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Developers Section */}
                        <div>
                          <span className="theme-text-secondary mb-2 block text-[11px] font-semibold uppercase tracking-wider">
                            {t('app.filterByDeveloper')}
                          </span>
                          <div className="custom-scrollbar flex max-h-52 flex-col gap-0.5 overflow-y-auto pr-1">
                            {DEVELOPER_CATEGORIES.map((dev) => {
                              const selected = filterDevelopers.includes(dev.developerId);
                              return (
                                <button
                                  key={dev.id}
                                  type="button"
                                  onClick={() => toggleDeveloperFilter(dev.developerId)}
                                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition outline-none ${
                                    selected
                                      ? 'theme-nav-active font-semibold'
                                      : 'theme-text-secondary hover:bg-[var(--item-hover-bg)] hover:text-[var(--color-text)]'
                                  }`}
                                >
                                  <span
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center ${
                                      selected ? 'sidebar-icon-active' : 'sidebar-icon'
                                    }`}
                                  >
                                    <DeveloperItemIcon isSuite={dev.developerId === 'artcraft'} />
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-xs">{dev.name}</span>
                                  <span className="theme-pill rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                                    {dev.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="flex-1 sm:w-64 sm:flex-initial">
                    <span className="sr-only">{t('common.search')}</span>
                    <div className="frosted-panel theme-text flex h-9 items-center gap-2.5 rounded-full px-3.5 transition focus-within:ring-1 focus-within:ring-[var(--color-primary)]">
                      <span className="theme-text-muted shrink-0">
                        <SearchIcon className="h-4 w-4" />
                      </span>
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
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
              )}
            </div>

            {/* Active Filter Chips */}
            {selectedCategory === Category.All && activeFilterCount > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {filterCategories.map((catId) => {
                  const cat = FILTER_CATEGORIES.find((c) => c.id === catId);
                  if (!cat) return null;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategoryFilter(cat.id)}
                      className="theme-pill-interactive flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                    >
                      <span className="sidebar-icon-active">
                        <CategoryIcon category={cat.id} className="h-3 w-3" />
                      </span>
                      <span>{t(cat.labelKey)}</span>
                      <CloseIcon className="h-2.5 w-2.5 opacity-70" />
                    </button>
                  );
                })}
                {filterDevelopers.map((devId) => {
                  const dev = DEVELOPER_CATEGORIES.find((d) => d.developerId === devId);
                  if (!dev) return null;
                  return (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => toggleDeveloperFilter(dev.developerId)}
                      className="theme-pill-interactive flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                    >
                      <span className="sidebar-icon-active">
                        <DeveloperItemIcon isSuite={dev.developerId === 'artcraft'} className="h-3 w-3" />
                      </span>
                      <span>{dev.name}</span>
                      <CloseIcon className="h-2.5 w-2.5 opacity-70" />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="ml-1 cursor-pointer text-[11px] font-semibold transition hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('app.clearFilters')}
                </button>
              </div>
            )}

            <AppGrid apps={apps} isLoading={isLoading} category={selectedCategory} />
          </section>
        )}
      </MainContent>

      <SettingsPanel open={settingsOpen} onClose={closeSettings} />
      <AppDetailsModal />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectCategory={setSelectedCategory}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SetupDialog open={firstRun} />
      <NotificationHost />
    </div>
  );
}
