import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppStatus, Category, type CategoryFilter } from '../../lib/types';
import { useAppStore } from '../../stores/appStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { SearchIcon } from './SidebarIcons';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectCategory: (cat: CategoryFilter) => void;
  onOpenSettings: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  iconUrl?: string;
  action: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  onSelectCategory,
  onOpenSettings,
}: CommandPaletteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const appsMap = useAppStore((s) => s.apps);
  const launchApp = useAppStore((s) => s.launchApp);
  const openAppDetails = useAppStore((s) => s.openAppDetails);
  const scanSystemForApps = useAppStore((s) => s.scanSystemForApps);

  const customThemes = useSettingsStore((s) => s.customThemes);
  const updateActiveThemeId = useSettingsStore((s) => s.updateActiveThemeId);
  const updateTheme = useSettingsStore((s) => s.updateTheme);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: CommandItem[] = [];

    // 1. Installed Apps (Prioritized at top)
    for (const state of appsMap.values()) {
      const isInstalled =
        state.status === AppStatus.Installed || state.status === AppStatus.UpdateAvailable;
      if (!isInstalled) continue;
      if (
        !q ||
        state.app.name.toLowerCase().includes(q) ||
        state.app.developer.toLowerCase().includes(q)
      ) {
        list.push({
          id: `launch-${state.app.id}`,
          title: `${t('home.startApp')} ${state.app.name}`,
          subtitle: state.app.developer,
          badge: t('status.installed'),
          iconUrl: state.app.iconUrl || `/icons/apps/${state.app.id}.png`,
          action: () => {
            onClose();
            void launchApp(state.app.id);
          },
        });
      }
    }

    // 2. Quick Actions & Navigation
    const quickActions: CommandItem[] = [
      {
        id: 'act-scan-pc',
        title: t('app.scanSystemApps'),
        subtitle: t('commandPalette.scanSubtitle'),
        badge: t('commandPalette.actionBadge'),
        action: () => {
          onClose();
          void scanSystemForApps();
        },
      },
      {
        id: 'nav-home',
        title: t('sidebar.home'),
        subtitle: t('commandPalette.navSubtitle'),
        badge: t('commandPalette.navBadge'),
        action: () => {
          onClose();
          onSelectCategory(Category.Home);
        },
      },
      {
        id: 'nav-all',
        title: t('sidebar.all'),
        subtitle: t('commandPalette.navSubtitle'),
        badge: t('commandPalette.navBadge'),
        action: () => {
          onClose();
          onSelectCategory(Category.All);
        },
      },
      {
        id: 'nav-news',
        title: t('sidebar.news'),
        subtitle: t('commandPalette.navSubtitle'),
        badge: t('commandPalette.navBadge'),
        action: () => {
          onClose();
          onSelectCategory(Category.News);
        },
      },
      {
        id: 'nav-settings',
        title: t('sidebar.settings'),
        subtitle: t('settings.themes.sectionTitle'),
        badge: t('commandPalette.navBadge'),
        action: () => {
          onClose();
          onOpenSettings();
        },
      },
      {
        id: 'theme-default-dark',
        title: `${t('settings.theme')}: ${t('settings.themes.defaultThemeName')} (${t('settings.themeDark')})`,
        subtitle: t('settings.themes.sectionTitle'),
        badge: t('settings.theme'),
        action: () => {
          onClose();
          void updateActiveThemeId('default');
          void updateTheme('dark');
        },
      },
      {
        id: 'theme-default-light',
        title: `${t('settings.theme')}: ${t('settings.themes.defaultThemeName')} (${t('settings.themeLight')})`,
        subtitle: t('settings.themes.sectionTitle'),
        badge: t('settings.theme'),
        action: () => {
          onClose();
          void updateActiveThemeId('default');
          void updateTheme('light');
        },
      },
    ];

    for (const item of quickActions) {
      if (!q || item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)) {
        list.push(item);
      }
    }

    // 3. Custom Themes
    for (const th of customThemes) {
      if (!q || th.name.toLowerCase().includes(q) || 'tema theme'.includes(q)) {
        list.push({
          id: `theme-${th.id}`,
          title: `${t('settings.theme')}: ${th.name}`,
          subtitle: th.author || t('settings.themes.customThemeLabel'),
          badge: t('settings.theme'),
          action: () => {
            onClose();
            void updateActiveThemeId(th.id);
          },
        });
      }
    }

    // 4. Uninstalled Catalog Apps (when searching or browsing)
    for (const state of appsMap.values()) {
      const isInstalled =
        state.status === AppStatus.Installed || state.status === AppStatus.UpdateAvailable;
      if (isInstalled) continue;
      if (
        q &&
        (state.app.name.toLowerCase().includes(q) ||
          state.app.developer.toLowerCase().includes(q))
      ) {
        list.push({
          id: `details-${state.app.id}`,
          title: state.app.name,
          subtitle: state.app.developer,
          badge: t('app.viewDetails'),
          iconUrl: state.app.iconUrl || `/icons/apps/${state.app.id}.png`,
          action: () => {
            onClose();
            openAppDetails(state.app.id);
          },
        });
      }
    }

    return list.slice(0, 12);
  }, [
    appsMap,
    customThemes,
    launchApp,
    onClose,
    onOpenSettings,
    onSelectCategory,
    openAppDetails,
    query,
    scanSystemForApps,
    t,
    updateActiveThemeId,
    updateTheme,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 pt-20 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('commandPalette.placeholder')}
        className="floating-popover theme-text w-full max-w-lg overflow-hidden rounded-[26px] shadow-2xl"
      >
        <div className="theme-divider flex items-center gap-3 border-b px-4 py-3.5">
          <span className="theme-text-muted">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  items.length ? (prev - 1 + items.length) % items.length : 0,
                );
              } else if (e.key === 'Enter' && items[activeIndex]) {
                e.preventDefault();
                items[activeIndex].action();
              }
            }}
            placeholder={t('commandPalette.placeholder')}
            className="theme-text min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
          <kbd className="theme-pill rounded-md px-2 py-0.5 font-mono text-[10px]">ESC</kbd>
        </div>

        <div className="custom-scrollbar max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="theme-text-muted py-6 text-center text-xs">{t('app.empty')}</p>
          ) : (
            items.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => item.action()}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition outline-none ${
                    active ? 'theme-nav-active font-semibold' : 'hover:bg-[var(--item-hover-bg)]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {item.iconUrl ? (
                      <img
                        src={item.iconUrl}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-lg bg-black/15 object-contain p-0.5"
                      />
                    ) : (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        ⌘
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{item.title}</div>
                      <div className="theme-text-muted truncate text-[11px]">{item.subtitle}</div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className="theme-pill shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
