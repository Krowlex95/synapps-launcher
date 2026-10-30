import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  APP_ICON_COLORS,
  FULL_BLEED_SQUARE_IDS,
  PADDED_SQUIRCLE_IDS,
  getAppInitials,
  resolveAppTileBackground,
} from '../../lib/appVisuals';
import { AppStatus, type AppState } from '../../lib/types';
import { useAppStore } from '../../stores/appStore';
import ProgressBar from '../common/ProgressBar';
import AppActions from './AppActions';

interface AppCardProps {
  state: AppState;
}

function formatVersion(version: string): string {
  const trimmed = version.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('v') || trimmed.startsWith('V') ? trimmed : `v${trimmed}`;
}

export default function AppCard({ state }: AppCardProps) {
  const { t } = useTranslation();
  const launchApp = useAppStore((store) => store.launchApp);
  const [failed, setFailed] = useState(false);

  const imgSrc = state.app.iconUrl || `/icons/apps/${state.app.id}.png`;
  const iconColor = APP_ICON_COLORS[state.app.id] ?? 'var(--color-primary)';

  const activeProgress =
    state.status === AppStatus.Downloading ||
    state.status === AppStatus.Installing ||
    state.status === AppStatus.Fallback;

  const isInstalled =
    state.status === AppStatus.Installed || state.status === AppStatus.UpdateAvailable;

  const isFullBleed = FULL_BLEED_SQUARE_IDS.has(state.app.id);
  const isPaddedSquircle = PADDED_SQUIRCLE_IDS.has(state.app.id);
  const isPixelArt = state.app.id === 'pixelorama';
  const tileBackground = resolveAppTileBackground(state.app.id, iconColor);

  return (
    <article className="app-card theme-text group relative flex w-full items-center gap-4 overflow-hidden rounded-[22px] px-4 py-3.5">
      {/* Left Rounded Squircle App Icon */}
      <div
        className={`relative flex h-[56px] w-[56px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] shadow-[0_6px_16px_rgba(0,0,0,0.22)] ${
          isInstalled ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={tileBackground ? { background: tileBackground } : undefined}
        onClick={() => {
          if (isInstalled) {
            void launchApp(state.app.id);
          }
        }}
        title={isInstalled ? `${t('home.startApp')} ${state.app.name}` : state.app.name}
      >
        {!failed ? (
          <img
            src={imgSrc}
            alt={state.app.name}
            className={`h-full w-full transition-transform duration-300 ${
              isPaddedSquircle
                ? 'scale-[1.18] object-cover group-hover:scale-[1.23]'
                : isFullBleed
                  ? 'object-cover group-hover:scale-[1.06]'
                  : 'object-contain p-2 group-hover:scale-[1.08]'
            } ${isPixelArt ? '[image-rendering:pixelated]' : ''}`}
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-base font-black text-white"
            style={{ background: iconColor }}
          >
            {getAppInitials(state.app.name)}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-inset ring-black/10 dark:ring-white/14" />
      </div>

      {/* Middle: App Name, Developer/Version & Brief Description */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="theme-text truncate text-[14.5px] font-bold leading-snug tracking-tight">
            {state.app.name}
          </h2>
          <span className="theme-text-muted shrink-0 text-[11px] font-medium">
            {state.app.developer}
          </span>
          {state.status === AppStatus.UpdateAvailable ? (
            <span
              title={t('status.updateAvailable')}
              className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)]"
            />
          ) : (
            isInstalled &&
            state.installedVersion && (
              <span className="theme-pill shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
                {formatVersion(state.installedVersion)}
              </span>
            )
          )}
        </div>

        <p className="theme-text-secondary mt-0.5 line-clamp-1 text-[12px] leading-relaxed sm:line-clamp-2">
          {t(state.app.description, { defaultValue: t('app.noDescription') })}
        </p>
      </div>

      {/* Right: Actions or Active Download Progress */}
      <div className="shrink-0 pl-2">
        {activeProgress ? (
          <div className="w-40 sm:w-48">
            <ProgressBar
              progress={state.downloadProgress ?? 0}
              label={t(`status.${state.status}`)}
            />
          </div>
        ) : (
          <AppActions state={state} />
        )}
      </div>
    </article>
  );
}
