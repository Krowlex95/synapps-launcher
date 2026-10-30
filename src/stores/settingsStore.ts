import { create } from 'zustand';
import i18n from '../lib/i18n';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { notify } from '../lib/notifications';
import {
  deleteCustomTheme,
  exportCustomTheme,
  getSettings,
  importCustomTheme,
  listCustomThemes,
  saveCustomTheme,
  saveSettings,
} from '../lib/tauri';
import type { AppLanguage, CustomTheme, ThemeMode, UserSettings } from '../lib/types';

interface SettingsStore extends UserSettings {
  isLoaded: boolean;
  customThemes: CustomTheme[];
  loadSettings: () => Promise<void>;
  refreshCustomThemes: () => Promise<void>;
  updateTheme: (theme: ThemeMode) => Promise<void>;
  updateActiveThemeId: (activeThemeId: string) => Promise<void>;
  upsertCustomTheme: (theme: CustomTheme, activate?: boolean) => Promise<CustomTheme | null>;
  removeCustomTheme: (themeId: string) => Promise<void>;
  importThemeFromFile: () => Promise<CustomTheme | null>;
  exportThemeToFile: (theme: CustomTheme) => Promise<boolean>;
  updateAccentColor: (accentColor: string) => Promise<void>;
  updateSidebarIconColor: (sidebarIconColor: string) => Promise<void>;
  updateInstallDir: (installDir: string) => Promise<void>;
  updateLanguage: (language: AppLanguage) => Promise<void>;
  updateGithubToken: (token: string) => Promise<void>;
  completeFirstRun: () => Promise<void>;
  setFirstRun: (firstRun: boolean) => void;
}

async function persist(settings: UserSettings): Promise<void> {
  try {
    await saveSettings(settings);
  } catch (error) {
    console.error('[Synapps] Could not persist settings:', error);
    notify({ variant: 'error', message: String(error) });
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,
  customThemes: [],

  loadSettings: async () => {
    try {
      const [loaded, themes] = await Promise.all([
        getSettings(),
        listCustomThemes().catch(() => [] as CustomTheme[]),
      ]);
      const next = {
        ...DEFAULT_SETTINGS,
        ...Object.fromEntries(Object.entries(loaded).filter(([, v]) => v !== undefined)),
      } as UserSettings;
      set({ ...next, customThemes: themes, isLoaded: true });
      if (next.language !== i18n.language) await i18n.changeLanguage(next.language);
    } catch (error) {
      console.warn('[Synapps] Settings backend unavailable; using defaults.', error);
      set({ ...DEFAULT_SETTINGS, isLoaded: true });
    }
  },

  refreshCustomThemes: async () => {
    try {
      const themes = await listCustomThemes();
      set({ customThemes: themes });
    } catch (error) {
      console.warn('[Synapps] Failed to list custom themes:', error);
    }
  },

  updateTheme: async (theme) => {
    const next = { ...get(), theme };
    set({ theme });
    await persist(toUserSettings(next));
  },

  updateActiveThemeId: async (activeThemeId) => {
    const state = get();
    const matched = state.customThemes.find((t) => t.id === activeThemeId);
    const nextAccent = matched?.accentColor || state.accentColor;
    const nextIcon = matched?.iconColor || state.sidebarIconColor;
    const next = {
      ...state,
      activeThemeId,
      accentColor: nextAccent,
      sidebarIconColor: nextIcon,
    };
    set({
      activeThemeId,
      accentColor: nextAccent,
      sidebarIconColor: nextIcon,
    });
    await persist(toUserSettings(next));
  },

  upsertCustomTheme: async (theme, activate = true) => {
    try {
      const saved = await saveCustomTheme(theme);
      const themes = await listCustomThemes();
      const state = get();
      const nextActiveId = activate ? saved.id : state.activeThemeId;
      const nextAccent =
        activate && saved.accentColor ? saved.accentColor : state.accentColor;
      const nextIcon =
        activate && saved.iconColor ? saved.iconColor : state.sidebarIconColor;
      const next = {
        ...state,
        activeThemeId: nextActiveId,
        accentColor: nextAccent,
        sidebarIconColor: nextIcon,
      };
      set({
        customThemes: themes,
        activeThemeId: nextActiveId,
        accentColor: nextAccent,
        sidebarIconColor: nextIcon,
      });
      if (activate) {
        await persist(toUserSettings(next));
      }
      return saved;
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
      return null;
    }
  },

  removeCustomTheme: async (themeId) => {
    try {
      await deleteCustomTheme(themeId);
      const themes = await listCustomThemes();
      const state = get();
      const nextActiveId = state.activeThemeId === themeId ? 'default' : state.activeThemeId;
      const next = { ...state, activeThemeId: nextActiveId };
      set({ customThemes: themes, activeThemeId: nextActiveId });
      await persist(toUserSettings(next));
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
    }
  },

  importThemeFromFile: async () => {
    try {
      const imported = await importCustomTheme();
      if (!imported) return null;
      const themes = await listCustomThemes();
      const state = get();
      const nextAccent = imported.accentColor || state.accentColor;
      const nextIcon = imported.iconColor || state.sidebarIconColor;
      const next = {
        ...state,
        activeThemeId: imported.id,
        accentColor: nextAccent,
        sidebarIconColor: nextIcon,
      };
      set({
        customThemes: themes,
        activeThemeId: imported.id,
        accentColor: nextAccent,
        sidebarIconColor: nextIcon,
      });
      await persist(toUserSettings(next));
      return imported;
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
      return null;
    }
  },

  exportThemeToFile: async (theme) => {
    try {
      return await exportCustomTheme(theme);
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
      return false;
    }
  },

  updateAccentColor: async (accentColor) => {
    const state = get();
    const next = { ...state, accentColor };
    set({ accentColor });
    await persist(toUserSettings(next));

    if (state.activeThemeId !== 'default') {
      const activeCustom = state.customThemes.find((t) => t.id === state.activeThemeId);
      if (activeCustom) {
        const updatedTheme: CustomTheme = { ...activeCustom, accentColor };
        try {
          const saved = await saveCustomTheme(updatedTheme);
          set({
            customThemes: state.customThemes.map((t) => (t.id === saved.id ? saved : t)),
          });
        } catch {
          // ignore
        }
      }
    }
  },

  updateSidebarIconColor: async (sidebarIconColor) => {
    const state = get();
    const next = { ...state, sidebarIconColor };
    set({ sidebarIconColor });
    await persist(toUserSettings(next));

    if (state.activeThemeId !== 'default') {
      const activeCustom = state.customThemes.find((t) => t.id === state.activeThemeId);
      if (activeCustom) {
        const updatedTheme: CustomTheme = { ...activeCustom, iconColor: sidebarIconColor };
        try {
          const saved = await saveCustomTheme(updatedTheme);
          set({
            customThemes: state.customThemes.map((t) => (t.id === saved.id ? saved : t)),
          });
        } catch {
          // ignore
        }
      }
    }
  },

  updateInstallDir: async (installDir) => {
    const next = { ...get(), installDir };
    set({ installDir });
    await persist(toUserSettings(next));
  },

  updateLanguage: async (language) => {
    const next = { ...get(), language };
    set({ language });
    await i18n.changeLanguage(language);
    await persist(toUserSettings(next));
  },

  updateGithubToken: async (githubToken) => {
    const next = { ...get(), githubToken };
    set({ githubToken });
    await persist(toUserSettings(next));
  },

  completeFirstRun: async () => {
    const next = { ...get(), firstRun: false };
    set({ firstRun: false });
    await persist(toUserSettings(next));
  },

  setFirstRun: (firstRun) => set({ firstRun }),
}));

function toUserSettings(settings: Partial<SettingsStore>): UserSettings {
  return {
    installDir: settings.installDir ?? DEFAULT_SETTINGS.installDir,
    theme: settings.theme ?? DEFAULT_SETTINGS.theme,
    activeThemeId: settings.activeThemeId ?? DEFAULT_SETTINGS.activeThemeId,
    accentColor: settings.accentColor ?? DEFAULT_SETTINGS.accentColor,
    sidebarIconColor: settings.sidebarIconColor ?? DEFAULT_SETTINGS.sidebarIconColor,
    language: settings.language ?? DEFAULT_SETTINGS.language,
    firstRun: settings.firstRun ?? DEFAULT_SETTINGS.firstRun,
    githubToken: settings.githubToken ?? DEFAULT_SETTINGS.githubToken,
  };
}
