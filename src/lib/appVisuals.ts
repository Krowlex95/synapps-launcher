export const getAppInitials = (name: string): string =>
  name.replace(/Craft$/i, '').slice(0, 2).toUpperCase();

export const APP_ICON_COLORS: Record<string, string> = {
  photocraft: '#2b7fff',
  lightcraft: '#e9a23b',
  filmcraft: '#8b5cf6',
  designcraft: '#ec4899',
  vectorcraft: '#3b82f6',
  pdfcraft: '#ef4444',
  effectcraft: '#7c3aed',
  wordcraft: '#2563eb',
  deckcraft: '#f97316',
  gridcraft: '#16a34a',
  cadcraft: '#0d9488',
  soundcraft: '#6366f1',
  figcraft: '#db2777',
  graphite: '#334155',
  pixelorama: '#a855f7',
  blockbench: '#0ea5e9',
  pencil2d: '#f59e0b',
  upscayl: '#3b82f6',
  fontforge: '#f97316',
  imageglass: '#06b6d4',
  obs: '#334155',
  shotcut: '#0284c7',
  losslesscut: '#10b981',
  audacity: '#2563eb',
  lmms: '#22c55e',
  sharex: '#1d4ed8',
  appflowy: '#9333ea',
  affine: '#4f46e5',
  onlyoffice: '#ea580c',
  superproductivity: '#2563eb',
  freecad: '#dc2626',
  librecad: '#65a30d',
  godot: '#3b82f6',
  orcaslicer: '#0d9488',
  prusaslicer: '#f97316',
  dust3d: '#18181b',
  gimp: '#856c57',
  krita: '#3babff',
  blender: '#ea7600',
};

export const FULL_BLEED_SQUARE_IDS = new Set([
  'photocraft',
  'vectorcraft',
  'designcraft',
  'lightcraft',
  'figcraft',
  'filmcraft',
  'effectcraft',
  'soundcraft',
  'wordcraft',
  'deckcraft',
  'gridcraft',
  'pdfcraft',
  'cadcraft',
  'lmms',
  'dust3d',
  'upscayl',
  'imageglass',
]);

export const PADDED_SQUIRCLE_IDS = new Set(['affine', 'orcaslicer', 'prusaslicer']);
export const LIGHT_TILE_CUTOUT_IDS = new Set(['fontforge', 'graphite']);

export function resolveAppTileBackground(appId: string, iconColor: string): string | undefined {
  if (FULL_BLEED_SQUARE_IDS.has(appId) || PADDED_SQUIRCLE_IDS.has(appId)) {
    return undefined;
  }
  if (LIGHT_TILE_CUTOUT_IDS.has(appId)) {
    return 'linear-gradient(145deg, #f8fafc 0%, #dbe4f0 100%)';
  }
  return `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${iconColor} 42%, #1e2536) 0%, color-mix(in srgb, ${iconColor} 16%, #131824) 100%)`;
}
