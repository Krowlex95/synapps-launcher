import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ColorPicker from './ColorPicker';
import PathSelector from './PathSelector';
import ThemeManager from './ThemeManager';
import { useSettingsStore } from '../../stores/settingsStore';
import type { AppLanguage } from '../../lib/types';
import { checkLauncherUpdate } from '../../lib/tauri';
import { notify } from '../../lib/notifications';

interface SettingsPanelProps { open: boolean; onClose: () => void; }
export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const updateLanguage = useSettingsStore((state) => state.updateLanguage);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const checkUpdates = async () => {
    try {
      const release = await checkLauncherUpdate();
      notify({ variant: 'info', message: release ? `${t('app.updateAvailable')}: ${release.tagName}` : t('settings.noUpdate') });
    } catch (error) { notify({ variant: 'error', message: String(error) }); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="settings-heading" className="glass custom-scrollbar h-full w-full max-w-[460px] overflow-y-auto border-l p-6 shadow-2xl surface-border animate-in slide-in-from-right duration-200">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h2 id="settings-heading" className="text-xl font-bold">{t('settings.title')}</h2>
            <p className="mt-1 text-xs muted-text">{t('settings.launcherDescription')}</p>
          </div>
          <button type="button" aria-label={t('settings.close')} onClick={onClose} className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border text-lg surface-border">×</button>
        </div>

        <div className="space-y-7">
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold">{t('settings.themes.sectionTitle')}</h3>
              <p className="mt-0.5 text-xs muted-text">{t('settings.themes.sectionSubtitle')}</p>
            </div>
            <ThemeManager />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">{t('settings.accentColor')}</h3>
            <ColorPicker inputId="custom-accent-color" />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">{t('settings.installDir')}</h3>
            <PathSelector />
          </section>

          <section>
            <label htmlFor="settings-language" className="mb-3 block text-sm font-semibold">{t('settings.language')}</label>
            <select 
              id="settings-language" 
              value={language} 
              onChange={(event) => void updateLanguage(event.target.value as AppLanguage)} 
              className="w-full rounded-xl border px-3 py-3 text-sm surface-border" 
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              <option value="pt-BR">{t('settings.languagePortuguese')}</option>
              <option value="en">{t('settings.languageEnglish')}</option>
            </select>
          </section>

          <section className="border-t pt-5 surface-border">
            <h3 className="mb-2 text-sm font-semibold">{t('settings.about')}</h3>
            <p className="text-xs leading-relaxed muted-text">{t('settings.launcherDescription')}</p>
            <div className="mt-3 flex items-center justify-between text-xs muted-text">
              <span>Synapps Launcher</span>
              <span>{t('settings.version')} 0.1.0</span>
            </div>
            <button type="button" onClick={() => void checkUpdates()} className="mt-4 w-full rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:border-[var(--color-primary)] surface-border">
              {t('settings.checkUpdate')}
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}
