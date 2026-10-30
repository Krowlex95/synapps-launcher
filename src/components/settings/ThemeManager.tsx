import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openThemesFolder } from '../../lib/tauri';
import { notify } from '../../lib/notifications';
import type { CustomTheme } from '../../lib/types';
import { useSettingsStore } from '../../stores/settingsStore';

const EMPTY_DRAFT: CustomTheme = {
  id: '',
  name: '',
  author: '',
  version: '1.0.0',
  description: '',
  baseMode: 'dark',
  bgColor: '#111625',
  surfaceColor: '#1b2338',
  popoverColor: '#151c2e',
  accentColor: '#8b5cf6',
  iconColor: '#f8fafc',
  textColor: '#f1f5f9',
  textSecondaryColor: '#94a3b8',
  borderColor: '#334155',
  variables: {},
  customCss: '',
};

export default function ThemeManager() {
  const { t } = useTranslation();
  const activeThemeId = useSettingsStore((state) => state.activeThemeId);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const sidebarIconColor = useSettingsStore((state) => state.sidebarIconColor);
  const updateActiveThemeId = useSettingsStore((state) => state.updateActiveThemeId);
  const upsertCustomTheme = useSettingsStore((state) => state.upsertCustomTheme);
  const removeCustomTheme = useSettingsStore((state) => state.removeCustomTheme);
  const importThemeFromFile = useSettingsStore((state) => state.importThemeFromFile);
  const exportThemeToFile = useSettingsStore((state) => state.exportThemeToFile);
  const refreshCustomThemes = useSettingsStore((state) => state.refreshCustomThemes);

  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [showAdvancedCss, setShowAdvancedCss] = useState(false);

  const startNewTheme = () => {
    const activeCustom = customThemes.find((item) => item.id === activeThemeId);
    setEditingTheme({
      ...EMPTY_DRAFT,
      id: '',
      name: '',
      author: '',
      baseMode: activeCustom?.baseMode ?? 'dark',
      bgColor: activeCustom?.bgColor ?? '#111625',
      surfaceColor: activeCustom?.surfaceColor ?? '#1b2338',
      popoverColor: activeCustom?.popoverColor ?? '#151c2e',
      accentColor: activeCustom?.accentColor ?? accentColor ?? '#8b5cf6',
      iconColor: activeCustom?.iconColor ?? sidebarIconColor ?? '#f8fafc',
      textColor: activeCustom?.textColor ?? '#f1f5f9',
      textSecondaryColor: activeCustom?.textSecondaryColor ?? '#94a3b8',
      borderColor: activeCustom?.borderColor ?? '#334155',
      customCss: '',
    });
    setShowAdvancedCss(false);
  };

  const startEditTheme = (theme: CustomTheme) => {
    setEditingTheme({
      ...EMPTY_DRAFT,
      ...theme,
      bgColor: theme.bgColor || (theme.baseMode === 'light' ? '#eef2f9' : '#0b101b'),
      surfaceColor: theme.surfaceColor || (theme.baseMode === 'light' ? '#f7f9fd' : '#0f1626'),
      popoverColor: theme.popoverColor || (theme.baseMode === 'light' ? '#f8faff' : '#0d1321'),
      accentColor: theme.accentColor || accentColor || '#8b5cf6',
      iconColor: theme.iconColor || sidebarIconColor || '#f8fafc',
      textColor: theme.textColor || (theme.baseMode === 'light' ? '#0f172a' : '#f1f5f9'),
      borderColor: theme.borderColor || (theme.baseMode === 'light' ? '#cbd5e1' : '#334155'),
    });
    setShowAdvancedCss(Boolean(theme.customCss?.trim()));
  };

  const handleSaveDraft = async () => {
    if (!editingTheme) return;
    const finalName = editingTheme.name.trim() || t('settings.themes.untitledTheme');
    const saved = await upsertCustomTheme(
      {
        ...editingTheme,
        name: finalName,
        author: editingTheme.author?.trim() || undefined,
        description: editingTheme.description?.trim() || undefined,
        customCss: editingTheme.customCss?.trim() || undefined,
      },
      true,
    );
    if (saved) {
      notify({ variant: 'success', message: t('settings.themes.savedSuccess', { name: saved.name }) });
      setEditingTheme(null);
    }
  };

  const handleImport = async () => {
    const imported = await importThemeFromFile();
    if (imported) {
      notify({
        variant: 'success',
        message: t('settings.themes.importedSuccess', { name: imported.name }),
      });
    }
  };

  const handleExport = async (theme: CustomTheme) => {
    const ok = await exportThemeToFile(theme);
    if (ok) {
      notify({
        variant: 'success',
        message: t('settings.themes.exportedSuccess', { name: theme.name }),
      });
    }
  };

  const handleOpenFolder = async () => {
    try {
      await openThemesFolder();
      setTimeout(() => {
        void refreshCustomThemes();
      }, 1000);
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
    }
  };

  const updateColorField = (field: keyof CustomTheme, value: string) => {
    if (!editingTheme) return;
    setEditingTheme({ ...editingTheme, [field]: value });
  };

  const colorFields: Array<{ key: keyof CustomTheme; label: string }> = [
    { key: 'bgColor', label: t('settings.themes.fields.bgColor') },
    { key: 'surfaceColor', label: t('settings.themes.fields.surfaceColor') },
    { key: 'popoverColor', label: t('settings.themes.fields.popoverColor') },
    { key: 'accentColor', label: t('settings.themes.fields.accentColor') },
    { key: 'iconColor', label: t('settings.themes.fields.iconColor') },
    { key: 'textColor', label: t('settings.themes.fields.textColor') },
    { key: 'borderColor', label: t('settings.themes.fields.borderColor') },
  ];

  return (
    <div className="space-y-3.5">
      {/* Action Bar: Create, Import (.json), Open Folder */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startNewTheme}
          className="theme-pill-interactive cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold"
        >
          + {t('settings.themes.createNew')}
        </button>
        <button
          type="button"
          onClick={() => void handleImport()}
          className="theme-pill-interactive cursor-pointer rounded-xl px-3 py-2 text-xs font-medium"
        >
          {t('settings.themes.importJson')}
        </button>
        <button
          type="button"
          onClick={() => void handleOpenFolder()}
          className="theme-pill-interactive cursor-pointer rounded-xl px-3 py-2 text-xs font-medium"
          title={t('settings.themes.openFolderHint')}
        >
          {t('settings.themes.openFolder')}
        </button>
      </div>

      {/* Visual Theme Creator / Editor Drawer */}
      {editingTheme && (
        <div
          className="rounded-2xl border p-4 space-y-3.5 surface-border"
          style={{ background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)' }}
        >
          <div className="flex items-center justify-between border-b pb-2.5 surface-border">
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {editingTheme.id ? t('settings.themes.editTitle') : t('settings.themes.createTitle')}
            </h4>
            <button
              type="button"
              onClick={() => setEditingTheme(null)}
              className="text-xs muted-text hover:text-[var(--color-text)] cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium muted-text">
                {t('settings.themes.themeName')}
              </span>
              <input
                type="text"
                value={editingTheme.name}
                onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                placeholder={t('settings.themes.themeNamePlaceholder')}
                className="w-full rounded-xl border px-2.5 py-1.5 text-xs outline-none surface-border"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium muted-text">
                {t('settings.themes.author')}
              </span>
              <input
                type="text"
                value={editingTheme.author ?? ''}
                onChange={(e) => setEditingTheme({ ...editingTheme, author: e.target.value })}
                placeholder={t('settings.themes.authorPlaceholder')}
                className="w-full rounded-xl border px-2.5 py-1.5 text-xs outline-none surface-border"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
              />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-medium muted-text">
              {t('settings.themes.baseMode')}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light'] as const).map((mode) => {
                const selected = editingTheme.baseMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEditingTheme({ ...editingTheme, baseMode: mode })}
                    className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition surface-border ${
                      selected ? 'theme-nav-active font-semibold' : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    {mode === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {colorFields.map(({ key, label }) => {
              const val = String(editingTheme[key] || '#000000');
              return (
                <label
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 surface-border"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <span className="truncate text-[11px] font-medium">{label}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <input
                      type="color"
                      value={val.startsWith('#') && val.length === 7 ? val : '#8b5cf6'}
                      onChange={(e) => updateColorField(key, e.target.value)}
                      className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </div>
                </label>
              );
            })}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedCss((prev) => !prev)}
              className="cursor-pointer text-[11px] font-semibold underline opacity-80 hover:opacity-100"
              style={{ color: 'var(--color-primary)' }}
            >
              {showAdvancedCss
                ? t('settings.themes.hideCustomCss')
                : t('settings.themes.showCustomCss')}
            </button>

            {showAdvancedCss && (
              <textarea
                rows={3}
                value={editingTheme.customCss ?? ''}
                onChange={(e) => setEditingTheme({ ...editingTheme, customCss: e.target.value })}
                placeholder="/* Ex: .app-card { border-radius: 24px; } */"
                className="mt-2 w-full rounded-xl border p-2.5 font-mono text-[11px] outline-none surface-border"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingTheme(null)}
              className="cursor-pointer rounded-xl border px-3 py-1.5 text-xs surface-border"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              className="cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
              style={{ background: 'var(--color-primary)' }}
            >
              {t('settings.themes.saveAndApply')}
            </button>
          </div>
        </div>
      )}

      {/* Installed Themes List (Built-in Default + Custom Themes) */}
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
        {/* Built-in Default Theme Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => void updateActiveThemeId('default')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') void updateActiveThemeId('default');
          }}
          className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition surface-border ${
            activeThemeId === 'default'
              ? 'ring-2 ring-[var(--color-primary)]'
              : 'hover:bg-[var(--item-hover-bg)]'
          }`}
          style={{ background: 'color-mix(in srgb, var(--color-surface) 75%, transparent)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-[#0b101b] via-[#192338] to-[#3b82f6] shadow-inner">
              <span className="h-2.5 w-2.5 rounded-full bg-white shadow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-bold">
                  {t('settings.themes.defaultThemeName')}
                </span>
                <span className="theme-pill rounded-full px-2 py-0.5 text-[10px] font-medium">
                  {t('settings.themes.builtInBadge')}
                </span>
              </div>
              <p className="truncate text-[11px] muted-text">
                {t('settings.themes.defaultThemeDesc')}
              </p>
            </div>
          </div>

          {activeThemeId === 'default' && (
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              {t('settings.themes.active')}
            </span>
          )}
        </div>

        {/* User & Community Custom Themes */}
        {customThemes.map((item) => {
          const isSelected = activeThemeId === item.id;
          const swatchBg = item.bgColor || '#0b101b';
          const swatchSurface = item.surfaceColor || '#1e293b';
          const swatchAccent = item.accentColor || '#8b5cf6';
          const swatchIcon = item.iconColor || '#f8fafc';

          return (
            <div
              key={item.id}
              onClick={() => void updateActiveThemeId(item.id)}
              className={`group flex cursor-pointer items-center justify-between gap-2 rounded-2xl border p-3 transition surface-border ${
                isSelected
                  ? 'ring-2 ring-[var(--color-primary)]'
                  : 'hover:bg-[var(--item-hover-bg)]'
              }`}
              style={{ background: 'color-mix(in srgb, var(--color-surface) 75%, transparent)' }}
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* Mini Palette Preview */}
                <div
                  className="grid h-8 w-8 shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-white/15 shadow-sm"
                  style={{ background: swatchBg }}
                >
                  <span style={{ background: swatchBg }} />
                  <span style={{ background: swatchSurface }} />
                  <span style={{ background: swatchAccent }} />
                  <span style={{ background: swatchIcon }} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold">{item.name}</span>
                    <span className="theme-pill rounded-full px-1.5 py-0.2 text-[9px] uppercase">
                      {item.baseMode === 'light'
                        ? t('settings.themeLight')
                        : t('settings.themeDark')}
                    </span>
                  </div>
                  <p className="truncate text-[11px] muted-text">
                    {item.author
                      ? `${t('settings.themes.byAuthor', { author: item.author })}`
                      : item.description || t('settings.themes.customThemeLabel')}
                  </p>
                </div>
              </div>

              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => startEditTheme(item)}
                  className="theme-pill-interactive cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium"
                  title={t('settings.themes.edit')}
                >
                  {t('settings.themes.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleExport(item)}
                  className="theme-pill-interactive cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium"
                  title={t('settings.themes.export')}
                >
                  {t('settings.themes.export')}
                </button>
                <button
                  type="button"
                  onClick={() => void removeCustomTheme(item.id)}
                  className="theme-pill-interactive cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium text-red-400 hover:text-red-300"
                  title={t('settings.themes.delete')}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
