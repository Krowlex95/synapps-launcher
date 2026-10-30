import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAvailableDiskSpace, selectInstallDirectory } from '../../lib/tauri';
import { useSettingsStore } from '../../stores/settingsStore';
import { notify } from '../../lib/notifications';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes; let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[unit]}`;
}

interface SetupDialogProps { open: boolean; }
export default function SetupDialog({ open }: SetupDialogProps) {
  const { t } = useTranslation();
  const installDir = useSettingsStore((state) => state.installDir);
  const updateInstallDir = useSettingsStore((state) => state.updateInstallDir);
  const completeFirstRun = useSettingsStore((state) => state.completeFirstRun);
  const defaultPath = typeof navigator !== 'undefined' && navigator.userAgent.includes('Win')
    ? 'C:\\Synapps\\apps'
    : '~/Synapps/apps';
  const [selectedDir, setSelectedDir] = useState(installDir || defaultPath);
  const [diskSpace, setDiskSpace] = useState<number | null>(null);
  const [checkingSpace, setCheckingSpace] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (installDir) {
      setSelectedDir(installDir);
    }
  }, [installDir]);
  useEffect(() => {
    if (!open || !selectedDir) { setDiskSpace(null); return; }
    let cancelled = false;
    setCheckingSpace(true);
    void getAvailableDiskSpace(selectedDir).then((value) => { if (!cancelled) setDiskSpace(value); }).catch(() => { if (!cancelled) setDiskSpace(null); }).finally(() => { if (!cancelled) setCheckingSpace(false); });
    return () => { cancelled = true; };
  }, [open, selectedDir]);

  if (!open) return null;
  const chooseDirectory = async () => {
    try {
      const path = await selectInstallDirectory();
      if (path) setSelectedDir(path);
    } catch (error) { notify({ variant: 'error', message: String(error) }); }
  };
  const finish = async () => {
    if (!selectedDir.trim()) return;
    setBusy(true);
    try { await updateInstallDir(selectedDir); await completeFirstRun(); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 backdrop-blur-sm p-5">
    <section role="dialog" aria-modal="true" aria-labelledby="welcome-heading" className="glass-card w-full max-w-[520px] rounded-3xl p-7 shadow-2xl sm:p-9" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
      <div className="mb-6 flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl text-lg font-black text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)' }}>AC</div><div><h1 id="welcome-heading" className="text-2xl font-bold tracking-tight">{t('onboarding.title')}</h1><p className="mt-1 text-sm muted-text">{t('onboarding.subtitle')}</p></div></div>
      <div className="rounded-2xl border p-4 surface-border" style={{ background: 'color-mix(in srgb, var(--color-bg) 72%, transparent)' }}><h2 className="text-sm font-semibold">{t('onboarding.selectDir')}</h2><p className="mt-1 text-xs leading-relaxed muted-text">{t('settings.directoryHelp')}</p><div className="mt-3 break-all rounded-lg px-3 py-2.5 text-xs" style={{ background: 'var(--color-surface)', color: selectedDir ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{selectedDir || t('onboarding.required')}</div><button type="button" onClick={() => void chooseDirectory()} className="mt-3 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:border-[var(--color-primary)] surface-border">{t('onboarding.choose')}</button></div>
      <div className="mt-4 flex items-center justify-between rounded-xl px-1 py-3"><span className="text-xs muted-text">{t('onboarding.diskSpace')}</span><span className="text-xs font-semibold">{checkingSpace ? t('onboarding.checkingSpace') : diskSpace === null ? t('onboarding.spaceUnavailable') : formatBytes(diskSpace)}</span></div>
      <button type="button" disabled={!selectedDir.trim() || busy} onClick={() => void finish()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45" style={{ background: 'var(--color-primary)' }}>{busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}{t('onboarding.continue')} <span aria-hidden="true">→</span></button>
    </section>
  </div>;
}
