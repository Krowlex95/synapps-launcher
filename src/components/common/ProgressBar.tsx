interface ProgressBarProps {
  progress: number;
  showPercentage?: boolean;
  label?: string;
}

export default function ProgressBar({
  progress,
  showPercentage = true,
  label,
}: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0));

  return (
    <div className="w-full" aria-label={label}>
      <div className="theme-text-secondary mb-1 flex items-center justify-between gap-2 text-[10.5px] font-medium">
        {label && <span className="truncate">{label}</span>}
        {showPercentage && <span className="shrink-0 tabular-nums">{Math.round(value)}%</span>}
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
    </div>
  );
}
