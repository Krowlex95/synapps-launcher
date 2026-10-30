import {
  AppStatus,
  Category,
  type AppInfo,
  type AppState,
  type CategoryItem,
  type DeveloperCategoryItem,
  type UserSettings,
} from './types';

export const GITHUB_ORG = 'storytold';

// Official Craft App Suite + Curated Open-Source Creative, 3D, Dev & Productivity Catalog
export const APP_CATALOG: AppInfo[] = [
  // --- Design ---
  { id: 'photocraft', name: 'PhotoCraft', description: 'apps.photocraft.description', repo: 'photocraft', category: Category.Design, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/photocraft.png' },
  { id: 'vectorcraft', name: 'VectorCraft', description: 'apps.vectorcraft.description', repo: 'vectorcraft', category: Category.Design, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/vectorcraft.png' },
  { id: 'designcraft', name: 'DesignCraft', description: 'apps.designcraft.description', repo: 'designcraft', category: Category.Design, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/designcraft.png' },
  { id: 'figcraft', name: 'FigCraft', description: 'apps.figcraft.description', repo: 'figcraft', category: Category.Design, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/figcraft.png' },
  { id: 'gimp', name: 'GIMP', description: 'apps.gimp.description', repo: 'GNOME/gimp', category: Category.Design, developerId: 'gimp', developer: 'GIMP Team', iconUrl: '/icons/apps/gimp.png' },
  { id: 'krita', name: 'Krita', description: 'apps.krita.description', repo: 'KDE/krita', category: Category.Design, developerId: 'kde', developer: 'KDE', iconUrl: '/icons/apps/krita.png' },
  { id: 'graphite', name: 'Graphite', description: 'apps.graphite.description', repo: 'GraphiteEditor/Graphite', category: Category.Design, developerId: 'graphite', developer: 'Graphite', iconUrl: '/icons/apps/graphite.png' },
  { id: 'pixelorama', name: 'Pixelorama', description: 'apps.pixelorama.description', repo: 'Orama-Interactive/Pixelorama', category: Category.Design, developerId: 'orama', developer: 'Orama Interactive', iconUrl: '/icons/apps/pixelorama.png' },
  { id: 'pencil2d', name: 'Pencil2D', description: 'apps.pencil2d.description', repo: 'pencil2d/pencil', category: Category.Design, developerId: 'pencil2d', developer: 'Pencil2D', iconUrl: '/icons/apps/pencil2d.png' },
  { id: 'upscayl', name: 'Upscayl', description: 'apps.upscayl.description', repo: 'upscayl/upscayl', category: Category.Design, developerId: 'upscayl', developer: 'Upscayl', iconUrl: '/icons/apps/upscayl.png' },
  { id: 'fontforge', name: 'FontForge', description: 'apps.fontforge.description', repo: 'fontforge/fontforge', category: Category.Design, developerId: 'fontforge', developer: 'FontForge', iconUrl: '/icons/apps/fontforge.png' },
  { id: 'imageglass', name: 'ImageGlass', description: 'apps.imageglass.description', repo: 'd2phap/ImageGlass', category: Category.Design, developerId: 'imageglass', developer: 'ImageGlass', iconUrl: '/icons/apps/imageglass.png' },
  { id: 'librecad', name: 'LibreCAD', description: 'apps.librecad.description', repo: 'LibreCAD/LibreCAD', category: Category.Design, developerId: 'librecad', developer: 'LibreCAD', iconUrl: '/icons/apps/librecad.png' },

  // --- Media ---
  { id: 'lightcraft', name: 'LightCraft', description: 'apps.lightcraft.description', repo: 'lightcraft', category: Category.Media, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/lightcraft.png' },
  { id: 'filmcraft', name: 'FilmCraft', description: 'apps.filmcraft.description', repo: 'filmcraft', category: Category.Media, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/filmcraft.png' },
  { id: 'effectcraft', name: 'EffectCraft', description: 'apps.effectcraft.description', repo: 'effectcraft', category: Category.Media, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/effectcraft.png' },
  { id: 'soundcraft', name: 'SoundCraft', description: 'apps.soundcraft.description', repo: 'soundcraft', category: Category.Media, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/soundcraft.png' },
  { id: 'obs', name: 'OBS Studio', description: 'apps.obs.description', repo: 'obsproject/obs-studio', category: Category.Media, developerId: 'obs', developer: 'OBS Project', iconUrl: '/icons/apps/obs.png' },
  { id: 'shotcut', name: 'Shotcut', description: 'apps.shotcut.description', repo: 'mltframework/shotcut', category: Category.Media, developerId: 'meltytech', developer: 'Meltytech', iconUrl: '/icons/apps/shotcut.png' },
  { id: 'losslesscut', name: 'LosslessCut', description: 'apps.losslesscut.description', repo: 'mifi/lossless-cut', category: Category.Media, developerId: 'mifi', developer: 'Mifi', iconUrl: '/icons/apps/losslesscut.png' },
  { id: 'audacity', name: 'Audacity', description: 'apps.audacity.description', repo: 'audacity/audacity', category: Category.Media, developerId: 'muse', developer: 'Muse Group', iconUrl: '/icons/apps/audacity.png' },
  { id: 'lmms', name: 'LMMS', description: 'apps.lmms.description', repo: 'LMMS/lmms', category: Category.Media, developerId: 'lmms', developer: 'LMMS', iconUrl: '/icons/apps/lmms.png' },
  { id: 'sharex', name: 'ShareX', description: 'apps.sharex.description', repo: 'ShareX/ShareX', category: Category.Media, developerId: 'sharex', developer: 'ShareX Team', iconUrl: '/icons/apps/sharex.png' },

  // --- Office ---
  { id: 'wordcraft', name: 'WordCraft', description: 'apps.wordcraft.description', repo: 'wordcraft', category: Category.Office, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/wordcraft.png' },
  { id: 'deckcraft', name: 'DeckCraft', description: 'apps.deckcraft.description', repo: 'deckcraft', category: Category.Office, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/deckcraft.png' },
  { id: 'gridcraft', name: 'GridCraft', description: 'apps.gridcraft.description', repo: 'gridcraft', category: Category.Office, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/gridcraft.png' },
  { id: 'pdfcraft', name: 'PdfCraft', description: 'apps.pdfcraft.description', repo: 'pdfcraft', category: Category.Office, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/pdfcraft.png' },
  { id: 'appflowy', name: 'AppFlowy', description: 'apps.appflowy.description', repo: 'AppFlowy-IO/AppFlowy', category: Category.Office, developerId: 'appflowy', developer: 'AppFlowy', iconUrl: '/icons/apps/appflowy.png' },
  { id: 'affine', name: 'AFFiNE', description: 'apps.affine.description', repo: 'toeverything/AFFiNE', category: Category.Office, developerId: 'toeverything', developer: 'ToEverything', iconUrl: '/icons/apps/affine.png' },
  { id: 'onlyoffice', name: 'ONLYOFFICE', description: 'apps.onlyoffice.description', repo: 'ONLYOFFICE/DesktopEditors', category: Category.Office, developerId: 'onlyoffice', developer: 'ONLYOFFICE', iconUrl: '/icons/apps/onlyoffice.png' },

  // --- 3D ---
  { id: 'cadcraft', name: 'CADCraft', description: 'apps.cadcraft.description', repo: 'cadcraft', category: Category.ThreeD, developerId: 'artcraft', developer: 'ArtCraft', iconUrl: '/icons/apps/cadcraft.png' },
  { id: 'blender', name: 'Blender', description: 'apps.blender.description', repo: 'blender/blender', category: Category.ThreeD, developerId: 'blender', developer: 'Blender Foundation', iconUrl: '/icons/apps/blender.png' },
  { id: 'blockbench', name: 'Blockbench', description: 'apps.blockbench.description', repo: 'JannisX11/blockbench', category: Category.ThreeD, developerId: 'blockbench', developer: 'JannisX11', iconUrl: '/icons/apps/blockbench.png' },
  { id: 'freecad', name: 'FreeCAD', description: 'apps.freecad.description', repo: 'FreeCAD/FreeCAD', category: Category.ThreeD, developerId: 'freecad', developer: 'FreeCAD', iconUrl: '/icons/apps/freecad.png' },
  { id: 'orcaslicer', name: 'OrcaSlicer', description: 'apps.orcaslicer.description', repo: 'SoftFever/OrcaSlicer', category: Category.ThreeD, developerId: 'softfever', developer: 'SoftFever', iconUrl: '/icons/apps/orcaslicer.png' },
  { id: 'prusaslicer', name: 'PrusaSlicer', description: 'apps.prusaslicer.description', repo: 'prusa3d/PrusaSlicer', category: Category.ThreeD, developerId: 'prusa', developer: 'Prusa Research', iconUrl: '/icons/apps/prusaslicer.png' },
  { id: 'dust3d', name: 'Dust3D', description: 'apps.dust3d.description', repo: 'huxingyi/dust3d', category: Category.ThreeD, developerId: 'dust3d', developer: 'Dust3D', iconUrl: '/icons/apps/dust3d.png' },

  // --- Dev ---
  { id: 'godot', name: 'Godot Engine', description: 'apps.godot.description', repo: 'godotengine/godot', category: Category.Dev, developerId: 'godot', developer: 'Godot Foundation', iconUrl: '/icons/apps/godot.png' },
  { id: 'superproductivity', name: 'Super Productivity', description: 'apps.superproductivity.description', repo: 'johannesjo/super-productivity', category: Category.Dev, developerId: 'superproductivity', developer: 'Johannes Millan', iconUrl: '/icons/apps/superproductivity.png' },
];

export const SIDEBAR_CATEGORIES: CategoryItem[] = [
  { id: Category.Home, labelKey: 'sidebar.home' },
  { id: Category.All, labelKey: 'sidebar.all' },
  { id: Category.News, labelKey: 'sidebar.news' },
];

export const FILTER_CATEGORIES: CategoryItem[] = [
  { id: Category.Design, labelKey: 'sidebar.design' },
  { id: Category.Media, labelKey: 'sidebar.media' },
  { id: Category.Office, labelKey: 'sidebar.office' },
  { id: Category.ThreeD, labelKey: 'sidebar.threeD' },
  { id: Category.Dev, labelKey: 'sidebar.dev' },
];

export const CATEGORIES: CategoryItem[] = [
  ...SIDEBAR_CATEGORIES,
  ...FILTER_CATEGORIES,
];

export const MAX_RECENT_FILES = 5;

export const APP_COMPATIBLE_EXTENSIONS: Record<string, readonly string[]> = {
  // Design (editors first, viewers last so creator apps take priority)
  photocraft: ['psd', 'psb', 'xcf', 'ora', 'kra', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff', 'tga', 'avif'],
  gimp: ['xcf', 'psd', 'psb', 'ora', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff', 'tga', 'avif', 'gif'],
  krita: ['kra', 'ora', 'psd', 'psb', 'xcf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff', 'exr', 'gif'],
  vectorcraft: ['svg', 'svgz', 'ai', 'eps', 'pdf'],
  designcraft: ['idml', 'indd', 'sla', 'svg', 'eps', 'pdf'],
  figcraft: ['fig', 'svg', 'png', 'jpg', 'jpeg', 'webp'],
  graphite: ['graphite', 'svg', 'png', 'jpg', 'jpeg'],
  pixelorama: ['pxo', 'png', 'gif', 'webp', 'bmp'],
  pencil2d: ['pclx', 'pcl', 'gif', 'mp4', 'avi', 'png'],
  fontforge: ['sfd', 'otf', 'ttf', 'woff', 'woff2', 'ufo', 'bdf', 'svg'],
  librecad: ['dxf', 'dwg', 'jww', 'lff'],
  upscayl: ['png', 'jpg', 'jpeg', 'webp'],

  // Media
  lightcraft: ['raw', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'pef', 'tif', 'tiff', 'jpg', 'jpeg', 'heic'],
  filmcraft: ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'mts', 'm2ts'],
  effectcraft: ['aep', 'mp4', 'mov', 'webm', 'exr', 'png'],
  shotcut: ['mlt', 'mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'mpg', 'mpeg'],
  losslesscut: ['llc', 'mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'ts', 'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'],
  soundcraft: ['wav', 'flac', 'mp3', 'ogg', 'm4a', 'aac', 'aiff', 'mid', 'midi'],
  audacity: ['aup3', 'aup', 'wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac', 'aiff', 'opus'],
  lmms: ['mmpz', 'mmp', 'mid', 'midi', 'wav', 'ogg', 'flac', 'mp3'],
  obs: ['mkv', 'mp4', 'flv', 'mov', 'ts'],

  // Office
  wordcraft: ['docx', 'doc', 'odt', 'rtf', 'txt', 'md'],
  deckcraft: ['pptx', 'ppt', 'odp'],
  gridcraft: ['xlsx', 'xls', 'ods', 'csv', 'tsv'],
  pdfcraft: ['pdf'],
  affine: ['affine', 'md', 'markdown', 'html'],
  appflowy: ['md', 'markdown', 'csv', 'txt'],
  onlyoffice: ['docx', 'doc', 'odt', 'rtf', 'txt', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp', 'pdf', 'epub'],

  // 3D
  blender: ['blend', 'fbx', 'obj', 'glb', 'gltf', 'stl', 'dae', 'abc', 'usd', 'usdc', 'usda', 'ply'],
  freecad: ['fcstd', 'step', 'stp', 'iges', 'igs', 'brep', 'stl', 'obj', '3mf', 'ifc', 'dae', 'dxf', 'dwg'],
  cadcraft: ['step', 'stp', 'iges', 'igs', 'dxf', 'dwg', 'stl', 'obj'],
  orcaslicer: ['3mf', 'stl', 'step', 'stp', 'obj', 'amf', 'gcode', 'bgcode'],
  prusaslicer: ['3mf', 'stl', 'step', 'stp', 'obj', 'amf', 'gcode', 'bgcode'],
  blockbench: ['bbmodel', 'gltf', 'glb', 'obj', 'fbx', 'dae'],
  dust3d: ['ds3', 'obj', 'fbx', 'glb'],

  // Dev
  godot: ['godot', 'tscn', 'scn', 'tres', 'res', 'gd', 'gdshader', 'glb', 'gltf'],
  superproductivity: ['md'],

  // General viewers / capture utilities placed last as fallback handlers
  imageglass: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'svg', 'psd', 'tif', 'tiff', 'heic', 'heif', 'avif', 'raw', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'tga', 'exr'],
  sharex: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm'],
};

export const EXTENSION_APP_CANDIDATES: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [appId, extensions] of Object.entries(APP_COMPATIBLE_EXTENSIONS)) {
    for (const ext of extensions) {
      if (!map[ext]) {
        map[ext] = [];
      }
      if (!map[ext].includes(appId)) {
        map[ext].push(appId);
      }
    }
  }
  return map;
})();

// Build developer categories with ArtCraft pinned first, followed alphabetically by company/studio
const devMap = new Map<string, DeveloperCategoryItem>();
for (const app of APP_CATALOG) {
  const existing = devMap.get(app.developerId);
  if (existing) {
    existing.count += 1;
  } else {
    devMap.set(app.developerId, {
      id: `dev:${app.developerId}`,
      developerId: app.developerId,
      name: app.developer,
      count: 1,
    });
  }
}

export const DEVELOPER_CATEGORIES: DeveloperCategoryItem[] = [...devMap.values()].sort((a, b) => {
  if (a.developerId === 'artcraft') return -1;
  if (b.developerId === 'artcraft') return 1;
  return a.name.localeCompare(b.name);
});

export const DEFAULT_SETTINGS: UserSettings = {
  installDir: '',
  theme: 'system',
  activeThemeId: 'default',
  accentColor: '#3b82f6',
  sidebarIconColor: '#f8fafc',
  language: 'pt-BR',
  firstRun: true,
};

export const INITIAL_APP_STATES = new Map<string, AppState>(
  APP_CATALOG.map((app) => [
    app.id,
    {
      app,
      status: AppStatus.NotInstalled,
    },
  ]),
);

export const ACCENT_COLORS = [
  { name: 'settings.colors.blue', value: '#3b82f6' },
  { name: 'settings.colors.purple', value: '#8b5cf6' },
  { name: 'settings.colors.pink', value: '#ec4899' },
  { name: 'settings.colors.red', value: '#ef4444' },
  { name: 'settings.colors.orange', value: '#f97316' },
  { name: 'settings.colors.amber', value: '#f59e0b' },
  { name: 'settings.colors.green', value: '#22c55e' },
  { name: 'settings.colors.teal', value: '#14b8a6' },
] as const;

export const SIDEBAR_ICON_COLORS = [
  { name: 'settings.colors.slate', value: '#64748b' },
  { name: 'settings.colors.white', value: '#f8fafc' },
  ...ACCENT_COLORS,
] as const;
