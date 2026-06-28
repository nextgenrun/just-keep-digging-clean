import { TILE_TYPES } from "./tileTypes.js";

// ==================== TILE RENDER CONFIG ====================
export const TILE_RENDER_CONFIG = Object.freeze({
  // HP thresholds for rendering different tile states
  thresholds: {
    dirt: { hp3: 2, hp2: 1 },
    stone: { hp3: 2, hp2: 1 },
    copper: { hp3: 2, hp2: 1 },
    darkDirtNormal: { hpFull: 40 },
    darkDirtStrong: { hpFull: 45 },
  },
});

// DEPRECATED: Use getTileRenderIndex from js/world/tileRenderMap.js instead
// This function is incomplete and doesn't handle special blocks
// Keeping only TILE_RENDER_CONFIG export for compatibility

// DO NOT USE THIS FUNCTION - it's incomplete and causes rendering bugs
// export function getTileRenderIndex(type, hp) {
//   console.warn('[DEPRECATED] Using incomplete getTileRenderIndex from tileRender.js. Import from tileRenderMap.js instead.');
//   return -1; // Force error to catch misuse
// }