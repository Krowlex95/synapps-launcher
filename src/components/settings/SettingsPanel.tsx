import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ColorPicker from './ColorPicker';
import PathSelector from './PathSelector';
import ThemeManager from './ThemeManager';
import { useSettingsStore } from '../../stores/settingsStore';
import type { AppLanguage } from '../../lib/types';
import {
  checkLauncherUpdate,
  installLauncherUpdate,
  listenLauncherUpdateProgress,
  type LauncherUpdateInfo,
  type LauncherUpdateProgress,
} from '../../lib/tauri';
import { notify } from '../../lib/notifications';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const updateLanguage = useSettingsStore((state) => state.updateLanguage);

  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<LauncherUpdateInfo | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<LauncherUpdateProgress | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const checkUpdates = async () => {
    if (checking || installingUpdate) return;
    setChecking(true);
    try {
      const info = await checkLauncherUpdate();
      setUpdateInfo(info);
      setCheckedOnce(true);
      if (info?.update_available) {
        notify({
          variant: 'info',
          message: t('common.updateAvailable', { version: info.latest_version }),
        });
      } else {
        notify({
          variant: 'success',
          message: t('settings.upToDate', {
            version: info?.current_version ?? '0.2.0',
          }),
        });
      }
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
    } finally {
      setChecking(false);
    }
  };

  const handleInstallLauncherUpdate = async () => {
    if (installingUpdate) return;
    setInstallingUpdate(true);
    setUpdateProgress({ downloaded: 0, total: 0, progress: 0, speedBps: 0 });
    const unlisten = await listenLauncherUpdateProgress((payload) => {
      setUpdateProgress(payload);
    });
    try {
      await installLauncherUpdate(updateInfo?.download_url);
    } catch (error) {
      setInstallingUpdate(false);
      setUpdateProgress(null);
      unlisten();
      notify({ variant: 'error', message: String(error) });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/35"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-heading"
        className="glass custom-scrollbar h-full w-full max-w-[460px] overflow-y-auto border-l p-6 shadow-2xl surface-border animate-in slide-in-from-right duration-200"
      >
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h2 id="settings-heading" className="text-xl font-bold">
              {t('settings.title')}
            </h2>
            <p className="mt-1 text-xs muted-text">{t('settings.launcherDescription')}</p>
          </div>
          <button
            type="button"
            aria-label={t('settings.close')}
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border text-lg surface-border"
          >
            ×
          </button>
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
            <label htmlFor="settings-language" className="mb-3 block text-sm font-semibold">
              {t('settings.language')}
            </label>
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
            <p className="text-xs leading-relaxed muted-text">
              {t('settings.launcherDescription')}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs muted-text">
              <span>Synapps Launcher</span>
              <span className="font-mono font-semibold">
                {t('settings.version')} {updateInfo?.current_version ?? '0.2.0'}
              </span>
            </div>

            {checkedOnce && !updateInfo?.update_available && !checking && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                <span>✓</span>
                <span>
                  {t('settings.upToDate', {
                    version: updateInfo?.current_version ?? '0.2.0',
                  })}
                </span>
              </div>
            )}

            {updateInfo?.update_available && (
              <div
                className="mt-4 rounded-2xl border p-4 surface-border"
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">
                    {t('common.updateAvailable', { version: updateInfo.latest_version })}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {updateInfo.latest_version}
                  </span>
                </div>

                {updateInfo.release_notes && (
                  <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-line text-[11px] leading-relaxed opacity-85 custom-scrollbar">
                    {updateInfo.release_notes}
                  </p>
                )}

                {installingUpdate ? (
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium">
                      <span>{t('settings.downloadingUpdate')}</span>
                      <span className="tabular-nums">
                        {updateProgress?.progress ?? 0}%
                        {updateProgress && updateProgress.speedBps > 0
                          ? ` • ${formatMb(updateProgress.speedBps)}/s`
                          : ''}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${Math.min(100, Math.max(4, updateProgress?.progress ?? 5))}%`,
                          background: 'var(--color-primary)',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleInstallLauncherUpdate()}
                    className="mt-3 w-full cursor-pointer rounded-xl px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition hover:brightness-110"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {t('settings.installUpdateNow', { version: updateInfo.latest_version })}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={checking || installingUpdate}
              onClick={() => void checkUpdates()}
              className="mt-4 w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:border-[var(--color-primary)] disabled:opacity-50 surface-border"
            >
              {checking ? t('settings.checkingUpdate') : t('settings.checkUpdate')}
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}
