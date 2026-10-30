import { Category } from '../../lib/types';

interface IconProps {
  className?: string;
}

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function ArtCraftMarkIcon({ className = 'h-[18px] w-[18px]' }: IconProps) {
  return (
    <svg {...baseProps} strokeWidth={2.1} className={className}>
      <path d="M6.5 18L11.6 6.2a.45.45 0 0 1 .8 0L17.5 18" />
      <line x1="8.6" y1="14" x2="15.4" y2="14" />
      <circle cx="18.2" cy="7" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CategoryIcon({
  category,
  className = 'h-[19px] w-[19px]',
}: {
  category: Category;
  className?: string;
}) {
  switch (category) {
    case Category.Home:
      return (
        <svg {...baseProps} className={className}>
          <path d="M4.6 10.6L10.6 5a2.1 2.1 0 0 1 2.8 0l6 5.6a2.2 2.2 0 0 1 .6 1.5V18a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18v-5.9a2.2 2.2 0 0 1 .6-1.5Z" />
        </svg>
      );
    case Category.All:
      return (
        <svg {...baseProps} className={className}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
        </svg>
      );
    case Category.News:
      return (
        <svg {...baseProps} className={className}>
          <path d="M4 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
          <path d="M19 8h1a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2" />
          <line x1="8" y1="8.5" x2="15" y2="8.5" />
          <line x1="8" y1="12" x2="15" y2="12" />
          <line x1="8" y1="15.5" x2="12" y2="15.5" />
        </svg>
      );
    case Category.Design:
      return (
        <svg {...baseProps} className={className}>
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      );
    case Category.Media:
      return (
        <svg {...baseProps} className={className}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          <polygon points="10 8.8 15.8 12 10 15.2 10 8.8" />
        </svg>
      );
    case Category.Office:
      return (
        <svg {...baseProps} className={className}>
          <path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9L14 3.5Z" />
          <path d="M13.5 3.5V9H19" />
          <line x1="8.5" y1="13" x2="15.5" y2="13" />
          <line x1="8.5" y1="16.5" x2="13" y2="16.5" />
        </svg>
      );
    case Category.ThreeD:
      return (
        <svg {...baseProps} className={className}>
          <path d="M20.5 15.8V8.2a2 2 0 0 0-1-1.73l-6.5-3.75a2 2 0 0 0-2 0L4.5 6.47a2 2 0 0 0-1 1.73v7.6a2 2 0 0 0 1 1.73l6.5 3.75a2 2 0 0 0 2 0l6.5-3.75a2 2 0 0 0 1-1.73z" />
          <polyline points="3.8 7.1 12 11.8 20.2 7.1" />
          <line x1="12" y1="21.5" x2="12" y2="11.8" />
        </svg>
      );
    case Category.Dev:
      return (
        <svg {...baseProps} className={className}>
          <polyline points="16 17.5 21.5 12 16 6.5" />
          <polyline points="8 6.5 2.5 12 8 17.5" />
          <line x1="13.8" y1="4.5" x2="10.2" y2="19.5" />
        </svg>
      );
  }
}

export function DeveloperTrayIcon({ className = 'h-[19px] w-[19px]' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <polygon points="12 3 3 7.5 12 12 21 7.5 12 3" />
      <polyline points="3 16.5 12 21 21 16.5" />
      <polyline points="3 12 12 16.5 21 12" />
    </svg>
  );
}

export function DeveloperItemIcon({
  isSuite = false,
  className = 'h-4 w-4',
}: {
  isSuite?: boolean;
  className?: string;
}) {
  if (isSuite) {
    return (
      <svg {...baseProps} className={className}>
        <path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3z" />
      </svg>
    );
  }
  return (
    <svg {...baseProps} className={className}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function SearchIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.2" y2="16.2" />
    </svg>
  );
}

export function CloseIcon({ className = 'h-3.5 w-3.5' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function PaletteIcon({ className = 'h-[19px] w-[19px]' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M12 3.2l5.3 5.3a7.5 7.5 0 1 1-10.6 0L12 3.2z" />
    </svg>
  );
}

export function SettingsIcon({ className = 'h-[19px] w-[19px]' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function PlusIcon({ className = 'h-3.5 w-3.5' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function FolderIcon({ className = 'h-3.5 w-3.5' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function SidebarToggleIcon({
  collapsed,
  className = 'h-[18px] w-[18px]',
}: {
  collapsed: boolean;
  className?: string;
}) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <line x1="9" y1="4.5" x2="9" y2="19.5" />
      <polyline points={collapsed ? '13 9.5 15.5 12 13 14.5' : '15.5 9.5 13 12 15.5 14.5'} />
    </svg>
  );
}

export function ChevronDownIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function FilterIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function ThemeModeIcon({
  isLight,
  className = 'h-[19px] w-[19px]',
}: {
  isLight: boolean;
  className?: string;
}) {
  if (isLight) {
    return (
      <svg {...baseProps} className={className}>
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2.5" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="21.5" />
        <line x1="4.9" y1="4.9" x2="6.7" y2="6.7" />
        <line x1="17.3" y1="17.3" x2="19.1" y2="19.1" />
        <line x1="2.5" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="21.5" y2="12" />
        <line x1="4.9" y1="19.1" x2="6.7" y2="17.3" />
        <line x1="17.3" y1="6.7" x2="19.1" y2="4.9" />
      </svg>
    );
  }
  return (
    <svg {...baseProps} className={className}>
      <path d="M20.4 14.6A8.5 8.5 0 0 1 9.4 3.6a8.5 8.5 0 1 0 11 11z" />
    </svg>
  );
}
