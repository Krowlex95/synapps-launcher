import { useTranslation } from 'react-i18next';
import { AppStatus } from '../../lib/types';

interface StatusBadgeProps { status: AppStatus; }
const statusStyles: Record<AppStatus, { label: string; dot: string; text: string; bg: string }> = {
  [AppStatus.NotInstalled]: { label: 'status.notInstalled', dot: '#98a2b3', text: 'var(--color-text-muted)', bg: 'var(--color-border)' },
  [AppStatus.Installed]: { label: 'status.installed', dot: 'var(--color-success)', text: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)' },
  [AppStatus.UpdateAvailable]: { label: 'status.updateAvailable', dot: 'var(--color-warning)', text: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) 11%, transparent)' },
  [AppStatus.Installing]: { label: 'status.installing', dot: 'var(--color-primary)', text: 'var(--color-primary)', bg: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' },
  [AppStatus.Downloading]: { label: 'status.downloading', dot: 'var(--color-primary)', text: 'var(--color-primary)', bg: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' },
  [AppStatus.Fallback]: { label: 'status.fallback', dot: 'var(--color-warning)', text: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) 10%, transparent)' },
  [AppStatus.ComingSoon]: { label: 'status.comingSoon', dot: '#a78bfa', text: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusStyles[status] ?? statusStyles[AppStatus.NotInstalled];
  return <span className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ color: config.text, background: config.bg }}>
    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: config.dot }} />
    <span className="truncate">{t(config.label)}</span>
  </span>;
}
