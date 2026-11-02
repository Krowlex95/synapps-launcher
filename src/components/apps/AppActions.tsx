import { useTranslation } from 'react-i18next';
import { openAppFolder } from '../../lib/tauri';
import { notify } from '../../lib/notifications';
import { AppStatus, type AppState } from '../../lib/types';
import { useAppStore } from '../../stores/appStore';
import { FolderIcon } from '../common/SidebarIcons';

interface AppActionsProps {
  state: AppState;
}

const btnBase =
  'inline-flex h-8 items-center justify-center text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer select-none active:scale-[0.97]';

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
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

export default function AppActions({ state }: AppActionsProps) {
  const { t } = useTranslation();
  const install = useAppStore((store) => store.installApp);
  const uninstall = useAppStore((store) => store.uninstallApp);
  const launch = useAppStore((store) => store.launchApp);
  const openDetails = useAppStore((store) => store.openAppDetails);

  const handleOpenFolder = async () => {
    try {
      await openAppFolder(state.app.id);
    } catch (err) {
      notify({ variant: 'error', message: String(err) });
    }
  };

  if (state.status === AppStatus.ComingSoon) {
    return (
      <button
        type="button"
        disabled
        className={`${btnBase} theme-pill rounded-xl px-4`}
      >
        {t('app.comingSoon')}
      </button>
    );
  }

  if (state.status === AppStatus.UpdateAvailable) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={`${btnBase} rounded-xl bg-[#4ade80] px-4 font-bold text-[#052010] shadow-sm hover:bg-[#22c55e]`}
          onClick={() => void launch(state.app.id)}
        >
          {t('home.startApp')}
        </button>
        <button
          type="button"
          className={`${btnBase} rounded-xl bg-amber-500/20 px-3 text-amber-500 ring-1 ring-inset ring-amber-500/35 hover:bg-amber-500/30`}
          onClick={() => void install(state.app.id)}
        >
          {t('app.update')}
        </button>
        <button
          type="button"
          title={t('app.openFolder')}
          aria-label={t('app.openFolder')}
          className={`${btnBase} theme-pill-interactive w-8 rounded-full`}
          onClick={() => void handleOpenFolder()}
        >
          <FolderIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={t('app.uninstall')}
          aria-label={t('app.uninstall')}
          className={`${btnBase} w-8 rounded-full bg-[#ef4444] text-white shadow-sm hover:bg-[#dc2626]`}
          onClick={() => void uninstall(state.app.id)}
        >
          <TrashIcon />
        </button>
      </div>
    );
  }

  if (state.status === AppStatus.Installed) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={`${btnBase} rounded-xl bg-[#4ade80] px-4 font-bold text-[#052010] shadow-sm hover:bg-[#22c55e]`}
          onClick={() => void launch(state.app.id)}
        >
          {t('home.startApp')}
        </button>
        <button
          type="button"
          title={t('app.openFolder')}
          aria-label={t('app.openFolder')}
          className={`${btnBase} theme-pill-interactive w-8 rounded-full`}
          onClick={() => void handleOpenFolder()}
        >
          <FolderIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={t('app.uninstall')}
          aria-label={t('app.uninstall')}
          className={`${btnBase} w-8 rounded-full bg-[#ef4444] text-white shadow-sm hover:bg-[#dc2626]`}
          onClick={() => void uninstall(state.app.id)}
        >
          <TrashIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={`${btnBase} theme-pill-interactive rounded-xl px-4`}
        onClick={() => void install(state.app.id)}
      >
        {t('app.install')}
      </button>
      <button
        type="button"
        title={t('app.viewDetails')}
        aria-label={t('app.viewDetails')}
        className={`${btnBase} theme-pill-interactive w-8 rounded-xl text-xs font-bold`}
        onClick={() => openDetails(state.app.id)}
      >
        ⋯
      </button>
    </div>
  );
}
