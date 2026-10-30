import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import type { CustomTheme, ThemeMode } from '../lib/types';

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '').trim();
  let r = 255;
  let g = 255;
  let b = 255;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) || 255;
    g = parseInt(hex[1] + hex[1], 16) || 255;
    b = parseInt(hex[2] + hex[2], 16) || 255;
  } else if (hex.length >= 6) {
    r = parseInt(hex.substring(0, 2), 16) || 255;
    g = parseInt(hex.substring(2, 4), 16) || 16;
    b = parseInt(hex.substring(4, 6), 16) || 255;
  }
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#07090e' : '#ffffff';
}

const MANAGED_CSS_VARS = [
  '--color-primary',
  '--sidebar-icon-color',
  '--sidebar-icon-contrast',
  '--color-bg',
  '--color-surface',
  '--color-surface-hover',
  '--color-text',
  '--color-text-secondary',
  '--color-text-muted',
  '--color-border',
  '--divider-line',
  '--pill-bg',
  '--pill-bg-hover',
  '--pill-ring',
  '--item-hover-bg',
  '--nav-active-bg',
  '--dropdown-tray-bg',
  '--dropdown-tray-rim',
  '--glow-color',
  '--app-shell-bg',
  '--card-bg',
  '--card-hover-bg',
  '--card-open-bg',
  '--card-shadow',
  '--card-hover-shadow',
  '--card-open-shadow',
  '--panel-bg',
  '--panel-shadow',
  '--popover-bg',
  '--popover-shadow',
];

let previouslyInjectedVars: string[] = [];

function clearCustomThemeStyles(root: HTMLElement) {
  for (const prop of MANAGED_CSS_VARS) {
    root.style.removeProperty(prop);
  }
  for (const prop of previouslyInjectedVars) {
    root.style.removeProperty(prop);
  }
  previouslyInjectedVars = [];

  const styleEl = document.getElementById('synapps-custom-theme-css');
  if (styleEl) {
    styleEl.remove();
  }
}

function applyCustomTheme(
  root: HTMLElement,
  customTheme: CustomTheme,
  fallbackAccent: string,
  fallbackIcon: string,
) {
  clearCustomThemeStyles(root);

  const baseMode = customTheme.baseMode === 'light' ? 'light' : 'dark';
  root.setAttribute('data-theme', baseMode);

  const bg = customTheme.bgColor || (baseMode === 'light' ? '#eef2f9' : '#0b101b');
  const surface = customTheme.surfaceColor || (baseMode === 'light' ? '#f7f9fd' : '#0f1626');
  const popover = customTheme.popoverColor || surface;
  const accent = customTheme.accentColor || fallbackAccent || '#8b5cf6';
  const icon = customTheme.iconColor || fallbackIcon || (baseMode === 'light' ? '#334155' : '#f8fafc');
  const text = customTheme.textColor || (baseMode === 'light' ? '#0f172a' : '#f1f5f9');
  const textSecondary =
    customTheme.textSecondaryColor || `color-mix(in srgb, ${text} 72%, transparent)`;
  const border =
    customTheme.borderColor || (baseMode === 'light' ? '#cbd5e1' : '#334155');

  const computedVars: Record<string, string> = {
    '--color-primary': accent,
    '--sidebar-icon-color': icon,
    '--sidebar-icon-contrast': getContrastColor(icon),
    '--color-bg': bg,
    '--color-surface': surface,
    '--color-surface-hover': `color-mix(in srgb, ${surface} 85%, ${accent} 15%)`,
    '--color-text': text,
    '--color-text-secondary': textSecondary,
    '--color-text-muted': `color-mix(in srgb, ${text} 50%, transparent)`,
    '--color-border': `color-mix(in srgb, ${border} 52%, transparent)`,
    '--divider-line': `color-mix(in srgb, ${border} 42%, transparent)`,
    '--pill-bg': `color-mix(in srgb, ${surface} 68%, transparent)`,
    '--pill-bg-hover': `color-mix(in srgb, ${surface} 84%, ${accent} 16%)`,
    '--pill-ring': `color-mix(in srgb, ${border} 55%, transparent)`,
    '--item-hover-bg': `color-mix(in srgb, ${text} 8%, transparent)`,
    '--nav-active-bg': `color-mix(in srgb, ${accent} 22%, ${surface})`,
    '--dropdown-tray-bg': `color-mix(in srgb, ${popover} 95%, transparent)`,
    '--dropdown-tray-rim': `color-mix(in srgb, ${border} 55%, transparent)`,
    '--glow-color': `color-mix(in srgb, ${accent} 32%, transparent)`,
    '--app-shell-bg': `radial-gradient(circle at 14% 16%, color-mix(in srgb, ${accent} 18%, transparent) 0%, transparent 46%), radial-gradient(circle at 86% 84%, color-mix(in srgb, ${icon} 16%, transparent) 0%, transparent 48%), color-mix(in srgb, ${bg} 82%, transparent)`,
    '--card-bg': `linear-gradient(160deg, color-mix(in srgb, ${surface} 78%, rgba(255, 255, 255, 0.08)) 0%, color-mix(in srgb, ${surface} 56%, transparent) 100%)`,
    '--card-hover-bg': `linear-gradient(160deg, color-mix(in srgb, ${surface} 88%, ${accent} 12%) 0%, color-mix(in srgb, ${surface} 68%, transparent) 100%)`,
    '--card-open-bg': `linear-gradient(160deg, color-mix(in srgb, ${surface} 92%, ${accent} 16%) 0%, color-mix(in srgb, ${surface} 74%, transparent) 100%)`,
    '--panel-bg': `linear-gradient(165deg, color-mix(in srgb, ${surface} 76%, transparent) 0%, color-mix(in srgb, ${bg} 64%, transparent) 100%)`,
    '--popover-bg': `color-mix(in srgb, ${popover} 95%, transparent)`,
  };

  for (const [key, val] of Object.entries(computedVars)) {
    root.style.setProperty(key, val);
  }

  if (customTheme.variables && typeof customTheme.variables === 'object') {
    for (const [rawKey, val] of Object.entries(customTheme.variables)) {
      if (!val) continue;
      const cssVar = rawKey.startsWith('--') ? rawKey : `--${rawKey}`;
      root.style.setProperty(cssVar, String(val));
      previouslyInjectedVars.push(cssVar);
    }
  }

  if (customTheme.customCss && customTheme.customCss.trim()) {
    let styleEl = document.getElementById('synapps-custom-theme-css') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'synapps-custom-theme-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = customTheme.customCss;
  }
}

export function useTheme(): void {
  const theme = useSettingsStore((state) => state.theme);
  const activeThemeId = useSettingsStore((state) => state.activeThemeId);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const sidebarIconColor = useSettingsStore((state) => state.sidebarIconColor);

  useEffect(() => {
    const root = document.documentElement;
    const activeCustom =
      activeThemeId && activeThemeId !== 'default'
        ? customThemes.find((t) => t.id === activeThemeId)
        : undefined;

    if (activeCustom) {
      applyCustomTheme(root, activeCustom, accentColor, sidebarIconColor);
      return;
    }

    // Default Built-In Theme ("Padrão") - works 100% as originally designed
    clearCustomThemeStyles(root);

    const applyDefault = () => {
      const resolved = resolveTheme(theme);
      root.setAttribute('data-theme', resolved);

      const rawIcon = (sidebarIconColor || '#f8fafc').trim();
      const lower = rawIcon.toLowerCase();
      const effectiveIconColor =
        resolved === 'light' && (lower === '#f8fafc' || lower === '#ffffff')
          ? '#334155'
          : rawIcon;
      root.style.setProperty('--sidebar-icon-color', effectiveIconColor);
      root.style.setProperty('--sidebar-icon-contrast', getContrastColor(effectiveIconColor));
    };

    applyDefault();
    root.style.setProperty('--color-primary', accentColor);

    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyDefault();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme, activeThemeId, customThemes, accentColor, sidebarIconColor]);
}
