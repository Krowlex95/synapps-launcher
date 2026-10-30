import { useTranslation } from 'react-i18next';
import type { AppState, CategoryFilter } from '../../lib/types';
import AppCard from './AppCard';

interface AppGridProps {
  apps: AppState[];
  isLoading: boolean;
  category: CategoryFilter;
}

export default function AppGrid({ apps, isLoading }: AppGridProps) {
  const { t } = useTranslation();

  if (isLoading && apps.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="app-card flex h-[84px] w-full animate-pulse items-center gap-4 rounded-[22px] px-4"
          >
            <div
              className="h-[56px] w-[56px] shrink-0 rounded-[16px]"
              style={{ background: 'var(--skeleton-bg)' }}
            />
            <div className="min-w-0 flex-1">
              <div
                className="h-4 w-32 rounded-md"
                style={{ background: 'var(--skeleton-bg)' }}
              />
              <div
                className="mt-2 h-2.5 w-3/4 rounded"
                style={{ background: 'var(--skeleton-subtle-bg)' }}
              />
            </div>
            <div
              className="h-8 w-24 shrink-0 rounded-xl"
              style={{ background: 'var(--skeleton-bg)' }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="frosted-panel theme-text flex min-h-56 flex-col items-center justify-center rounded-[26px] px-6 py-14 text-center">
        <span className="theme-text-muted text-3xl" aria-hidden="true">
          ⌕
        </span>
        <h2 className="theme-text mt-3 text-sm font-semibold">{t('app.empty')}</h2>
        <p className="theme-text-secondary mt-1 max-w-sm text-xs">{t('app.searchPlaceholder')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {apps.map((state: AppState) => (
        <AppCard key={state.app.id} state={state} />
      ))}
    </div>
  );
}
