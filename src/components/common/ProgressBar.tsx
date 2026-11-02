interface ProgressBarProps {
  progress: number;
  showPercentage?: boolean;
  label?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  speedBps?: number;
  onCancel?: () => void;
  cancelTitle?: string;
}

function formatBytesShort(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1)} MB`;
}

export default function ProgressBar({
  progress,
  showPercentage = true,
  label,
  downloadedBytes,
  totalBytes,
  speedBps,
  onCancel,
  cancelTitle = 'Cancelar download',
}: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0));

  const sizeInfo =
    downloadedBytes && downloadedBytes > 0
      ? totalBytes && totalBytes > 0
        ? `${formatBytesShort(downloadedBytes)} / ${formatBytesShort(totalBytes)}`
        : formatBytesShort(downloadedBytes)
      : '';

  const speedInfo =
    speedBps && speedBps > 0 ? `${formatBytesShort(speedBps)}/s` : '';

  const subLabel = [sizeInfo, speedInfo].filter(Boolean).join(' • ');

  return (
    <div className="w-full" aria-label={label}>
      <div className="theme-text-secondary mb-1 flex items-center justify-between gap-1.5 text-[10.5px] font-medium">
        {label && <span className="truncate">{label}</span>}
        <div className="flex shrink-0 items-center gap-1.5">
          {showPercentage && <span className="tabular-nums font-semibold">{Math.round(value)}%</span>}
          {onCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              title={cancelTitle}
              aria-label={cancelTitle}
              className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500/15 text-[10px] font-bold text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${value}%`, background: 'var(--color-primary)' }}
        />
      </div>
      {subLabel && (
        <div className="theme-text-muted mt-1 truncate text-[9.5px] tabular-nums">
          {subLabel}
        </div>
      )}
    </div>
  );
}
