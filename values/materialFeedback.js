/**
 * Material feedback identity — per-tile-type break "weight".
 * One data table drives audio pitch, particle burst scale, shake scale,
 * and precious-metal glint so every material feels distinct.
 * Consumed by PlaySceneGameplay dig feedback dispatch.
 */
import { TILE_TYPES } from "./tileTypes.js";

// Default profile — neutral feedback for anything not listed below.
const DEFAULT_PROFILE = Object.freeze({
  digRate: 1.0,        // playback rate for the dig/hit sound
  breakRate: 1.0,      // playback rate for the tile-break sound
  breakVolume: 1.0,    // volume multiplier for the break sound
  particleScale: 1.0,  // multiplies destroy particle count
  particleSizeScale: 1.0,
  shakeScale: 1.0,     // multiplies camera shake intensity
  glint: false,        // sparkle burst for precious materials
  glintColor: 0xffffff,
});

const PROFILES = Object.freeze({
  // ── Soft earth: quick, light, slightly higher pitch ──
  [TILE_TYPES.DIRT]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 1.06, breakRate: 1.08, breakVolume: 0.9, shakeScale: 0.9,
  }),
  [TILE_TYPES.DARK_DIRT_NORMAL]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 1.02, breakRate: 1.03, breakVolume: 0.95, shakeScale: 0.95,
  }),
  [TILE_TYPES.DARK_DIRT_STRONG]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 0.97, breakRate: 0.98,
  }),
  // ── Rock: neutral weight, slightly lower pitch ──
  [TILE_TYPES.STONE]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 0.95, breakRate: 0.94, particleSizeScale: 1.1,
  }),
  // ── Common metals: heavy, low, chunkier bursts ──
  [TILE_TYPES.COPPER]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 0.92, breakRate: 0.9, breakVolume: 1.1, particleScale: 1.15, shakeScale: 1.1,
  }),
  [TILE_TYPES.BRONZE]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 0.9, breakRate: 0.88, breakVolume: 1.1, particleScale: 1.15, shakeScale: 1.1,
  }),
  [TILE_TYPES.IRON]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 0.88, breakRate: 0.86, breakVolume: 1.15, particleScale: 1.2, shakeScale: 1.15,
  }),
  [TILE_TYPES.STEEL]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 0.85, breakRate: 0.84, breakVolume: 1.2, particleScale: 1.2, particleSizeScale: 1.15, shakeScale: 1.2,
  }),
  // ── Precious: bright, ringing, sparkle glint ──
  [TILE_TYPES.SILVER]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 1.05, breakRate: 1.12, breakVolume: 1.1,
    particleScale: 1.35, shakeScale: 1.2, glint: true, glintColor: 0xdde8f0,
  }),
  [TILE_TYPES.GOLD]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 1.08, breakRate: 1.16, breakVolume: 1.2,
    particleScale: 1.5, particleSizeScale: 1.15, shakeScale: 1.3, glint: true, glintColor: 0xffe28a,
  }),
  // ── Sky tiles: airy and chimey ──
  [TILE_TYPES.SKY_TILE]: Object.freeze({
    ...DEFAULT_PROFILE, digRate: 1.12, breakRate: 1.15, particleScale: 1.2, glint: true, glintColor: 0xaef2ff,
  }),
});

// Glint burst tunables (precious-material sparkle)
export const GLINT_CONFIG = Object.freeze({
  count: 7,
  sizeMin: 1.5,
  sizeMax: 3.5,
  distMin: 8,
  distMax: 34,
  riseMin: 26,
  riseMax: 60,
  durationMin: 380,
  durationMax: 640,
  depth: 37, // above destroy particles (36)
});

export function getMaterialFeedback(tileType) {
  return PROFILES[tileType] || DEFAULT_PROFILE;
}