import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectInstallDirectory } from '../../lib/tauri';
import { useSettingsStore } from '../../stores/settingsStore';
import { notify } from '../../lib/notifications';

export default function PathSelector() {
  const { t } = useTranslation();
  const installDir = useSettingsStore((state) => state.installDir);
  const updateInstallDir = useSettingsStore((state) => state.updateInstallDir);
  const [choosing, setChoosing] = useState(false);
  const changeDirectory = async () => {
    setChoosing(true);
    try {
      const path = await selectInstallDirectory();
      if (path) await updateInstallDir(path);
    } catch (error) {
      notify({ variant: 'error', message: String(error) });
    } finally { setChoosing(false); }
  };
  return <div className="space-y-2">
    <p className="break-all rounded-xl border px-3 py-3 text-xs muted-text surface-border" style={{ background: 'var(--color-bg)' }}>{installDir || t('common.notAvailable')}</p>
    <button type="button" disabled={choosing} onClick={() => void changeDirectory()} className="rounded-xl border px-3 py-2 text-xs font-semibold transition hover:border-[var(--color-primary)] surface-border">{choosing ? t('common.loading') : t('settings.changeDir')}</button>
    <p className="text-[11px] muted-text">{t('settings.directoryHelp')}</p>
  </div>;
}
