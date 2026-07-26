// ==================== ANCIENT RELICS ====================
// Deep-world treasure caches and their constellation requirements.

export const ANCIENT_RELIC_CONFIG = Object.freeze({
  displayName: "Ancient Relic",
  shortName: "RELIC",
  color: "#F3C969",
  worldCaches: Object.freeze({
    count: 14,
    minDepthTiles: 380,
    maxDepthTiles: 1840,
    placementAttemptsPerCache: 220,
    minimumSpacingTiles: 14,
    guaranteedEarly: Object.freeze({
      minTileX: 2,
      maxTileX: 117,
      placementAttemptsPerBand: 320,
      depthBands: Object.freeze([
        Object.freeze({ minDepthTiles: 380, maxDepthTiles: 560 }),
        Object.freeze({ minDepthTiles: 620, maxDepthTiles: 800 }),
        Object.freeze({ minDepthTiles: 840, maxDepthTiles: 980 }),
      ]),
    }),
  }),
  levelTwoWorldCaches: Object.freeze({
    count: 16,
    minDepthTiles: 2050,
    maxDepthTiles: 4750,
    minTileX: 121,
    placementAttemptsPerCache: 240,
    minimumSpacingTiles: 16,
  }),
  cache: Object.freeze({
    relicsPerCache: 1,
    floatingTextDurationMs: 2600,
    floatingTextFontSizePx: 20,
    statusDurationMs: 2600,
  }),
  persistence: Object.freeze({
    maxRelics: 99,
  }),
  constellationRequirements: Object.freeze({
    steel: 1,
    darkDirtStrong: 2,
    silver: 3,
    gold: 4,
  }),
});

export function getConstellationRelicRequirement(resourceType) {
  return ANCIENT_RELIC_CONFIG.constellationRequirements[resourceType] ?? 0;
}
