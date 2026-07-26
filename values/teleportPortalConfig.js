export const TELEPORT_PORTAL_CONFIG = Object.freeze({
  gateFilename: "prop_048_eclipse_gate.webp",
  authoredSourcePath: "sprites/background-props/generated-runtime-v1/prop_048_eclipse_gate.webp",
  canonicalAssetPath: "exports/dig_game_runtime_bg_props_v1/sprites/background-props/generated-runtime-v1/prop_048_eclipse_gate.webp",
  authoredTextureKey: "authored-bg-prop-048-eclipse-gate-webp",
  maxActiveSkyPortals: 8,
  maxActiveSkyPortalsPerLevel: 4,
  fallbackTilePx: 94,
  apertureOffsetX: 0.5,
  apertureOffsetY: 0.46,
  glowRadiusScale: 0.27,
  glowColor: 0x7bdcff,
  glowAlphaMin: 0.2,
  glowAlphaMax: 0.62,
  glowScaleMin: 0.92,
  glowScaleMax: 1.12,
  glowDurationMs: 900,
  glowDepth: 2.5,
  glowTextureKey: "sky-portal-aperture-glow",
  glowTextureSize: 128,
  safeReturnRadius: 2,
  activation: Object.freeze({
    pulseRadiusPx: 132,
    durationMs: 760,
    color: 0x7bdcff,
    statusDurationMs: 3000,
  }),
  depthBands: Object.freeze({
    1: Object.freeze([
      Object.freeze({ maxDepth: 249, region: "Upper Earth", material: "Dirt / Stone" }),
      Object.freeze({ maxDepth: 699, region: "Iron Strata", material: "Copper / Iron" }),
      Object.freeze({ maxDepth: 1299, region: "Gilded Fault", material: "Silver / Gold" }),
      Object.freeze({ maxDepth: Infinity, region: "Ancient Deep", material: "Relic Caches" }),
    ]),
    2: Object.freeze([
      Object.freeze({ maxDepth: 899, region: "Ember Shelf", material: "Lava Dirt" }),
      Object.freeze({ maxDepth: 1899, region: "Obsidian Reach", material: "Obsidian" }),
      Object.freeze({ maxDepth: 3299, region: "Magma Veins", material: "Ember Ore" }),
      Object.freeze({ maxDepth: Infinity, region: "Core Expanse", material: "Magma Crystal" }),
    ]),
  }),
});

export function getTeleportPortalLabel(levelId, depth) {
  const safeLevelId = Number(levelId) === 2 ? 2 : 1;
  const safeDepth = Math.max(0, Math.floor(Number(depth) || 0));
  const band = TELEPORT_PORTAL_CONFIG.depthBands[safeLevelId]
    .find(entry => safeDepth <= entry.maxDepth)
    || TELEPORT_PORTAL_CONFIG.depthBands[safeLevelId][0];
  return `L${safeLevelId} ${band.region}  •  ${safeDepth}m  •  ${band.material}`;
}
