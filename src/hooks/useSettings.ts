import { useSettingsStore } from '../stores/settingsStore';

/** Convenience wrapper that keeps settings selectors close to components. */
export function useSettings() {
  return useSettingsStore();
}

export { useSettingsStore };
