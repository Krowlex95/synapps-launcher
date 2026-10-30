import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SIDEBAR_CATEGORIES, SIDEBAR_ICON_COLORS } from '../../lib/constants';
import { Category, type CategoryFilter } from '../../lib/types';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  CategoryIcon,
  PaletteIcon,
  SettingsIcon,
  SidebarToggleIcon,
  ThemeModeIcon,
} from '../common/SidebarIcons';

interface SidebarProps {
  selectedCategory: CategoryFilter;
  onSelectCategory: (category: CategoryFilter) => void;
  onSettingsClick: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Sidebar({
  selectedCategory,
  onSelectCategory,
  onSettingsClick,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const { t } = useTranslation();
  const asideRef = useRef<HTMLElement>(null);

  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const theme = useSettingsStore((state) => state.theme);
  const activeThemeId = useSettingsStore((state) => state.activeThemeId);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const updateTheme = useSettingsStore((state) => state.updateTheme);
  const updateActiveThemeId = useSettingsStore((state) => state.updateActiveThemeId);
  const sidebarIconColor = useSettingsStore((state) => state.sidebarIconColor);
  const updateSidebarIconColor = useSettingsStore((state) => state.updateSidebarIconColor);

  const activeCustomTheme =
    activeThemeId !== 'default' ? customThemes.find((t) => t.id === activeThemeId) : undefined;

  const isLightActive = activeCustomTheme
    ? activeCustomTheme.baseMode === 'light'
    : theme === 'light' ||
      (theme === 'system' &&
        typeof window !== 'undefined' &&
        !window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Close floating popovers on outside click
  useEffect(() => {
    if (!colorPopoverOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (asideRef.current && !asideRef.current.contains(event.target as Node)) {
        setColorPopoverOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [colorPopoverOpen]);

  const anyFlyoutOpen = colorPopoverOpen;

  const renderTooltip = (key: string, label: string) => {
    if (!collapsed || anyFlyoutOpen || hoveredKey !== key) return null;
    return (
      <span
        role="tooltip"
        className="floating-popover theme-text pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium"
      >
        {label}
      </span>
    );
  };

  const handleToggleTheme = () => {
    if (activeCustomTheme) {
      void updateActiveThemeId('default');
    }
    void updateTheme(isLightActive ? 'dark' : 'light');
  };

  const themeButtonLabel = activeCustomTheme
    ? activeCustomTheme.name
    : isLightActive
      ? t('settings.themeLight')
      : t('settings.themeDark');

  return (
    <aside
      ref={asideRef}
      aria-label={t('common.navigation')}
      className={`frosted-panel theme-text absolute bottom-4 left-4 top-11 z-50 flex flex-col rounded-[26px] py-3.5 select-none transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? 'w-[68px] items-center px-2' : 'w-[232px] px-3'
      }`}
    >
      {/* Top Brand Header + Collapse/Expand Toggle */}
      <div
        className={`theme-divider flex w-full items-center border-b pb-3 ${
          collapsed ? 'flex-col gap-2' : 'justify-between gap-2 px-1'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setColorPopoverOpen(false);
            onSelectCategory(Category.Home);
          }}
          onMouseEnter={() => setHoveredKey('brand')}
          onMouseLeave={() => setHoveredKey((prev) => (prev === 'brand' ? null : prev))}
          aria-label="Synapps"
          className="group relative flex cursor-pointer items-center gap-2.5 rounded-full outline-none"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden shadow-sm transition-transform duration-200 group-hover:scale-105">
            <img src="/logo.png" alt="Synapps" className="h-full w-full object-contain select-none pointer-events-none" />
          </span>
          {!collapsed && (
            <span className="theme-text truncate text-[14px] font-bold tracking-tight">
              Synapps
            </span>
          )}
          {renderTooltip('brand', 'Synapps')}
        </button>

        <button
          type="button"
          onClick={() => {
            setHoveredKey(null);
            setColorPopoverOpen(false);
            onToggleCollapsed();
          }}
          onMouseEnter={() => setHoveredKey('toggle')}
          onMouseLeave={() => setHoveredKey((prev) => (prev === 'toggle' ? null : prev))}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          title={!collapsed ? t('sidebar.collapse') : undefined}
          className="group relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl transition hover:bg-[var(--item-hover-bg)] outline-none"
        >
          <span className="sidebar-icon flex items-center justify-center">
            <SidebarToggleIcon collapsed={collapsed} />
          </span>
          {renderTooltip('toggle', t('sidebar.expand'))}
        </button>
      </div>

      {/* Main Navigation Items (Home & All) */}
      <nav
        className={`custom-scrollbar mt-3 flex min-h-0 flex-1 flex-col gap-1 ${
          collapsed ? 'w-full items-center overflow-visible' : 'w-full overflow-y-auto pr-0.5'
        }`}
      >
        {SIDEBAR_CATEGORIES.map((item) => {
          const active = selectedCategory === item.id;
          const label = t(item.labelKey);

          return (
            <button
              key={item.id}
              type="button"
              aria-label={collapsed ? label : undefined}
              aria-current={active ? 'page' : undefined}
              onMouseEnter={() => setHoveredKey(item.id)}
              onMouseLeave={() => setHoveredKey((prev) => (prev === item.id ? null : prev))}
              onClick={() => {
                setColorPopoverOpen(false);
                onSelectCategory(item.id);
              }}
              className={`group relative flex cursor-pointer items-center rounded-2xl transition-all duration-200 outline-none ${
                collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full gap-3 px-3 text-left'
              } ${
                active
                  ? 'theme-nav-active font-semibold'
                  : 'theme-text-secondary hover:bg-[var(--item-hover-bg)] hover:text-[var(--color-text)]'
              }`}
            >
              <span
                className={`flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
                  active ? 'sidebar-icon-active' : 'sidebar-icon'
                }`}
              >
                <CategoryIcon category={item.id} />
              </span>
              {!collapsed && <span className="truncate text-[12.5px]">{label}</span>}
              {renderTooltip(item.id, label)}
            </button>
          );
        })}
      </nav>

      {/* Bottom Controls: Theme Toggle + Icon Color Palette + Settings */}
      <div
        className={`theme-divider mt-3 flex w-full flex-col gap-1 border-t pt-3 ${
          collapsed ? 'items-center' : ''
        }`}
      >
        <button
          type="button"
          aria-label={collapsed ? `${t('settings.theme')}: ${themeButtonLabel}` : undefined}
          onMouseEnter={() => setHoveredKey('theme')}
          onMouseLeave={() => setHoveredKey((prev) => (prev === 'theme' ? null : prev))}
          onClick={handleToggleTheme}
          className={`group relative flex cursor-pointer items-center rounded-2xl theme-text-secondary transition hover:bg-[var(--item-hover-bg)] hover:text-[var(--color-text)] outline-none ${
            collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full gap-3 px-3 text-left'
          }`}
        >
          <span className="sidebar-icon flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <ThemeModeIcon isLight={isLightActive} />
          </span>
          {!collapsed && (
            <span className="truncate text-[12.5px]">
              {t('settings.theme')}: {themeButtonLabel}
            </span>
          )}
          {renderTooltip('theme', `${t('settings.theme')}: ${themeButtonLabel}`)}
        </button>

        <button
          type="button"
          aria-label={collapsed ? t('settings.sidebarIconColor') : undefined}
          aria-expanded={colorPopoverOpen}
          onMouseEnter={() => setHoveredKey('palette')}
          onMouseLeave={() => setHoveredKey((prev) => (prev === 'palette' ? null : prev))}
          onClick={() => {
            setColorPopoverOpen((prev) => !prev);
          }}
          className={`group relative flex cursor-pointer items-center rounded-2xl transition outline-none ${
            collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full gap-3 px-3 text-left'
          } ${
            colorPopoverOpen
              ? 'theme-nav-active font-semibold'
              : 'theme-text-secondary hover:bg-[var(--item-hover-bg)] hover:text-[var(--color-text)]'
          }`}
        >
          <span className="sidebar-icon flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <PaletteIcon />
          </span>
          {!collapsed && (
            <span className="truncate text-[12.5px]">{t('settings.sidebarIconColor')}</span>
          )}
          {renderTooltip('palette', t('settings.sidebarIconColor'))}
        </button>

        <button
          type="button"
          aria-label={collapsed ? t('sidebar.settings') : undefined}
          onMouseEnter={() => setHoveredKey('settings')}
          onMouseLeave={() => setHoveredKey((prev) => (prev === 'settings' ? null : prev))}
          onClick={() => {
            setColorPopoverOpen(false);
            onSettingsClick();
          }}
          className={`group relative flex cursor-pointer items-center rounded-2xl theme-text-secondary transition hover:bg-[var(--item-hover-bg)] hover:text-[var(--color-text)] outline-none ${
            collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full gap-3 px-3 text-left'
          }`}
        >
          <span className="sidebar-icon flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:rotate-45">
            <SettingsIcon />
          </span>
          {!collapsed && <span className="truncate text-[12.5px]">{t('sidebar.settings')}</span>}
          {renderTooltip('settings', t('sidebar.settings'))}
        </button>
      </div>

      {/* High-Opacity Floating Flyout: Sidebar Icon Color Picker */}
      {colorPopoverOpen && (
        <div className="floating-popover theme-text absolute bottom-2 left-[calc(100%+12px)] z-50 w-64 rounded-[22px] p-4">
          <div className="theme-divider mb-3 flex items-center justify-between gap-2 border-b pb-2.5">
            <span className="theme-text text-xs font-semibold">
              {t('settings.sidebarIconColor')}
            </span>
            <label
              className="theme-pill-interactive flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              title="HEX"
            >
              <span
                className="h-2.5 w-2.5 rounded-full border border-black/15"
                style={{ background: sidebarIconColor }}
              />
              <span>HEX</span>
              <input
                type="color"
                value={sidebarIconColor.length === 7 ? sidebarIconColor : '#f8fafc'}
                onChange={(e) => void updateSidebarIconColor(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            {SIDEBAR_ICON_COLORS.map((swatch) => {
              const selected = sidebarIconColor.toLowerCase() === swatch.value.toLowerCase();
              const displayColor =
                isLightActive && swatch.value.toLowerCase() === '#f8fafc'
                  ? '#334155'
                  : swatch.value;
              return (
                <button
                  key={swatch.value}
                  type="button"
                  title={t(swatch.name)}
                  aria-label={t(swatch.name)}
                  onClick={() => void updateSidebarIconColor(swatch.value)}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-black/15 shadow-sm transition hover:scale-110 outline-none"
                  style={{
                    background: displayColor,
                    outline: selected ? `2px solid ${displayColor}` : '2px solid transparent',
                    outlineOffset: 2,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
