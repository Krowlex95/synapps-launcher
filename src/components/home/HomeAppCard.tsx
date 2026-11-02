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

interface HomeAppCardProps {
  state: AppState;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
}

const CARD_WIDTH = 138;
const TRAY_HEIGHT = 66;
const CORNER_RADIUS = 22;

const CRADLE_CLIP_PATH = [
  'M 0 0',
  `A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 0 ${CORNER_RADIUS} ${CORNER_RADIUS}`,
  `L ${CARD_WIDTH - CORNER_RADIUS} ${CORNER_RADIUS}`,
  `A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 0 ${CARD_WIDTH} 0`,
  `L ${CARD_WIDTH} ${TRAY_HEIGHT - CORNER_RADIUS}`,
  `A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 1 ${CARD_WIDTH - CORNER_RADIUS} ${TRAY_HEIGHT}`,
  `L ${CORNER_RADIUS} ${TRAY_HEIGHT}`,
  `A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 1 0 ${TRAY_HEIGHT - CORNER_RADIUS}`,
  'Z',
].join(' ');

const CRADLE_RIM_PATH = [
  'M 0.5 0',
  `L 0.5 ${TRAY_HEIGHT - CORNER_RADIUS}`,
  `A ${CORNER_RADIUS - 0.5} ${CORNER_RADIUS - 0.5} 0 0 0 ${CORNER_RADIUS} ${TRAY_HEIGHT - 0.5}`,
  `L ${CARD_WIDTH - CORNER_RADIUS} ${TRAY_HEIGHT - 0.5}`,
  `A ${CORNER_RADIUS - 0.5} ${CORNER_RADIUS - 0.5} 0 0 0 ${CARD_WIDTH - 0.5} ${TRAY_HEIGHT - CORNER_RADIUS}`,
  `L ${CARD_WIDTH - 0.5} 0`,
].join(' ');

function TrashMicroIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 4v2" />
      <path d="M19 6l-1 13.5a2 2 0 0 1-2 1.85H8a2 2 0 0 1-2-1.85L5 6" />
      <path d="M10 11v5.5" />
      <path d="M14 11v5.5" />
    </svg>
  );
}

function UpdateMicroIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

export default function HomeAppCard({
  state,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
}: HomeAppCardProps) {
  const { t } = useTranslation();
  const launchApp = useAppStore((store) => store.launchApp);
  const installApp = useAppStore((store) => store.installApp);
  const cancelAppInstall = useAppStore((store) => store.cancelAppInstall);
  const uninstallApp = useAppStore((store) => store.uninstallApp);
  const openAppDetails = useAppStore((store) => store.openAppDetails);
  const pinnedAppIds = useAppStore((store) => store.pinnedAppIds);
  const togglePinApp = useAppStore((store) => store.togglePinApp);
  const [failed, setFailed] = useState(false);

  const isPinned = pinnedAppIds.includes(state.app.id);

  const imgSrc = state.app.iconUrl || `/icons/apps/${state.app.id}.png`;
  const iconColor = APP_ICON_COLORS[state.app.id] ?? 'var(--color-primary)';

  const activeProgress =
    state.status === AppStatus.Downloading ||
    state.status === AppStatus.Installing ||
    state.status === AppStatus.Fallback;

  const isUpdateAvailable = state.status === AppStatus.UpdateAvailable;
  const isFullBleed = FULL_BLEED_SQUARE_IDS.has(state.app.id);
  const isPaddedSquircle = PADDED_SQUIRCLE_IDS.has(state.app.id);
  const isPixelArt = state.app.id === 'pixelorama';
  const tileBackground = resolveAppTileBackground(state.app.id, iconColor);

  return (
    <div
      data-home-app-card
      className={`relative w-[138px] select-none ${menuOpen ? 'z-30' : 'z-10'}`}
    >
      {/* Upper Square Frosted Glass App Tile */}
      <div
        role="button"
        tabIndex={0}
        data-open={menuOpen ? 'true' : 'false'}
        aria-expanded={!activeProgress ? menuOpen : undefined}
        onClick={() => {
          if (!activeProgress) {
            onToggleMenu();
          }
        }}
        onKeyDown={(e) => {
          if (!activeProgress && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggleMenu();
          }
        }}
        className="home-app-tile theme-text group relative z-20 flex h-[132px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[22px] p-3.5 outline-none"
      >
        {/* Pin / Favorite Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePinApp(state.app.id);
          }}
          title={isPinned ? t('home.unpinApp') : t('home.pinApp')}
          aria-label={isPinned ? t('home.unpinApp') : t('home.pinApp')}
          className={`absolute left-2.5 top-2.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[11px] transition ${
            isPinned
              ? 'text-amber-400 opacity-100'
              : 'theme-text-muted opacity-0 group-hover:opacity-80 hover:!opacity-100'
          }`}
        >
          ★
        </button>

        {isUpdateAvailable && (
          <span
            title={t('status.updateAvailable')}
            className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)]"
          />
        )}

        {/* Official App Icon Squircle */}
        <div
          className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
          style={tileBackground ? { background: tileBackground } : undefined}
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
                    : 'object-contain p-2.5 group-hover:scale-[1.08]'
              } ${isPixelArt ? '[image-rendering:pixelated]' : ''}`}
              onError={() => setFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-lg font-black text-white"
              style={{ background: iconColor }}
            >
              {getAppInitials(state.app.name)}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-black/10 dark:ring-white/14" />
        </div>

        {/* App Name or Active Download Progress */}
        {activeProgress ? (
          <div className="w-full px-0.5">
            <ProgressBar
              progress={state.downloadProgress ?? 0}
              label={t(`status.${state.status}`)}
              onCancel={
                state.status === AppStatus.Downloading
                  ? () => void cancelAppInstall(state.app.id)
                  : undefined
              }
              cancelTitle={t('app.cancelDownload')}
            />
          </div>
        ) : (
          <span className="theme-text w-full truncate text-center text-[12.5px] font-semibold tracking-tight">
            {state.app.name}
          </span>
        )}
      </div>

      {/* Darker Coupled Dropdown Menu (Appears Only When Clicking the App Card) */}
      {!activeProgress && (
        <div
          aria-hidden={!menuOpen}
          style={{
            clipPath: `path('${CRADLE_CLIP_PATH}')`,
            background: 'var(--dropdown-tray-bg)',
          }}
          className={`absolute left-0 right-0 top-[calc(100%-22px)] z-10 h-[66px] px-2.5 pb-2.5 pt-[29px] shadow-[0_16px_32px_rgba(0,0,0,0.32)] transition-all duration-200 origin-top ${
            menuOpen
              ? 'pointer-events-auto translate-y-0 scale-y-100 opacity-100'
              : 'pointer-events-none -translate-y-2 scale-y-95 opacity-0'
          }`}
        >
          {/* Outer Specular Glass Rim Along the Coupled Dropdown */}
          <svg
            width={CARD_WIDTH}
            height={TRAY_HEIGHT}
            viewBox={`0 0 ${CARD_WIDTH} ${TRAY_HEIGHT}`}
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <path d={CRADLE_RIM_PATH} fill="none" stroke="var(--dropdown-tray-rim)" />
          </svg>

          <div className="relative z-10 flex h-full items-center justify-between gap-1.5">
            {/* Green Start / Open Button */}
            <button
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              onClick={(event) => {
                event.stopPropagation();
                onCloseMenu();
                void launchApp(state.app.id);
              }}
              className="flex h-7 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[8px] bg-[#4ade80] px-2 text-[11px] font-bold text-[#052010] shadow-sm transition hover:bg-[#22c55e] active:scale-[0.97]"
            >
              <span className="truncate">{t('home.startApp')}</span>
            </button>

            {isUpdateAvailable && (
              <button
                type="button"
                tabIndex={menuOpen ? 0 : -1}
                title={t('app.update')}
                aria-label={t('app.update')}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseMenu();
                  void installApp(state.app.id);
                }}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-amber-500/20 text-amber-500 ring-1 ring-inset ring-amber-500/35 transition hover:bg-amber-500/30 active:scale-95"
              >
                <UpdateMicroIcon />
              </button>
            )}

            {/* Details / Options Button */}
            <button
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              title={t('app.viewDetails')}
              aria-label={t('app.viewDetails')}
              onClick={(event) => {
                event.stopPropagation();
                onCloseMenu();
                openAppDetails(state.app.id);
              }}
              className="theme-pill-interactive flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold active:scale-95"
            >
              ⋯
            </button>

            {/* Red Circular Uninstall Button */}
            <button
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              title={t('app.uninstall')}
              aria-label={t('app.uninstall')}
              onClick={(event) => {
                event.stopPropagation();
                onCloseMenu();
                void uninstallApp(state.app.id);
              }}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#ef4444] text-white shadow-sm transition hover:bg-[#dc2626] active:scale-95"
            >
              <TrashMicroIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
