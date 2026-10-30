export interface AppInfo {
  id: string;
  name: string;
  description: string;
  repo: string;
  category: Category;
  developerId: string;
  developer: string;
  iconUrl?: string;
}

export enum AppStatus {
  NotInstalled = 'notInstalled',
  Installed = 'installed',
  UpdateAvailable = 'updateAvailable',
  Installing = 'installing',
  Downloading = 'downloading',
  Fallback = 'fallback',
  ComingSoon = 'comingSoon',
}

export enum Category {
  Home = 'home',
  All = 'all',
  News = 'news',
  Design = 'design',
  Media = 'media',
  Office = 'office',
  ThreeD = '3d',
  Dev = 'dev',
}

export type CategoryFilter = Category | `dev:${string}`;

export type ThemeMode = 'light' | 'dark' | 'system';
export type AppLanguage = 'pt-BR' | 'en';

export interface AppState {
  app: AppInfo;
  status: AppStatus;
  installedVersion?: string;
  latestVersion?: string;
  downloadProgress?: number;
}

export interface Release {
  id: number | string;
  tagName: string;
  name?: string;
  body?: string;
  publishedAt?: string;
  prerelease?: boolean;
  assets: Asset[];
}

export interface Asset {
  name: string;
  downloadUrl: string;
  size: number;
  contentType?: string;
  checksum?: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  author?: string;
  version: string;
  description?: string;
  baseMode: 'dark' | 'light';
  bgColor?: string;
  surfaceColor?: string;
  popoverColor?: string;
  accentColor?: string;
  iconColor?: string;
  textColor?: string;
  textSecondaryColor?: string;
  borderColor?: string;
  variables?: Record<string, string>;
  customCss?: string;
}

export interface UserSettings {
  installDir: string;
  theme: ThemeMode;
  activeThemeId: string;
  accentColor: string;
  sidebarIconColor: string;
  language: AppLanguage;
  firstRun: boolean;
  githubToken?: string;
}

export interface CategoryItem {
  id: Category;
  labelKey: string;
}

export interface DeveloperCategoryItem {
  id: `dev:${string}`;
  developerId: string;
  name: string;
  count: number;
}

export interface DownloadProgressEvent {
  appId: string;
  progress: number;
  downloadedBytes?: number;
  totalBytes?: number;
  phase?: 'downloading' | 'installing' | 'fallback';
}

export interface InstallCompleteEvent {
  appId: string;
  installedVersion?: string;
  latestVersion?: string;
}

export interface InstallErrorEvent {
  appId: string;
  error: string;
}

export interface RecentFileItem {
  path: string;
  name: string;
  extension: string;
  directory: string;
  modifiedAt: number;
  sizeBytes: number;
  pinned: boolean;
}
