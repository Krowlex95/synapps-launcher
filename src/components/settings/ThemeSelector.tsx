import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ThemeMode } from '../../lib/types';

const options: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'settings.themeLight', icon: '☀' },
  { value: 'dark', label: 'settings.themeDark', icon: '☾' },
  { value: 'system', label: 'settings.themeSystem', icon: '◐' },
];
export default function ThemeSelector() {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const updateTheme = useSettingsStore((state) => state.updateTheme);
  return <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('settings.theme')}>
    {options.map((option) => <button type="button" key={option.value} onClick={() => void updateTheme(option.value)} aria-pressed={theme === option.value} className="flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs transition" style={theme === option.value ? { borderColor: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' } : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}><span className="text-lg" aria-hidden="true">{option.icon}</span><span>{t(option.label)}</span></button>)}
  </div>;
}
