// ==================== ANCIENT RELICS ====================
// Deep-world treasure caches, discovery guidance, and constellation requirements.

const GUARANTEED_EARLY_DEPTH_BANDS = Object.freeze([
  Object.freeze({ minDepthTiles: 380, maxDepthTiles: 560 }),
  Object.freeze({ minDepthTiles: 620, maxDepthTiles: 800 }),
  Object.freeze({ minDepthTiles: 840, maxDepthTiles: 980 }),
]);

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
      depthBands: GUARANTEED_EARLY_DEPTH_BANDS,
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
  guidance: Object.freeze({
    enabled: true,
    queryParam: "relicGuidance",
    signalRadiusTiles: 120,
    worldRevealRadiusTiles: 18,
    targetRefreshMs: 240,
    markerDisplayTiles: 1.08,
    markerGlowDisplayTiles: 1.52,
    markerAlpha: 0.96,
    markerGlowAlpha: 0.32,
    markerPulseScale: 1.12,
    markerPulseDurationMs: 920,
    // Render above the depth-900 darkness compositor so the close-range relic
    // signal remains readable in the hard-black mine.
    worldMarkerDepth: 901,
    hudDepth: 1006,
    hudIconX: 392,
    hudIconY: 112,
    hudIconSizePx: 36,
    hudTextX: 420,
    hudTextY: 112,
    hudFontFamily: "Arial, sans-serif",
    hudFontSizePx: 16,
    hudTextColor: "#f3c969",
    hudStrokeColor: "#07111b",
    hudStrokeThicknessPx: 6,
    altarTokenDisplayTiles: 0.46,
    altarTokenSpacingTiles: 0.58,
    altarTokenOffsetTilesY: 1.72,
    altarLabelOffsetTilesY: 2.18,
    altarLockedAlpha: 0.24,
    altarReadyAlpha: 1,
    firstTraceDepthMeters: GUARANTEED_EARLY_DEPTH_BANDS[0].minDepthTiles,
    copy: Object.freeze({
      progress: "SKY ALTAR  {count}/{required}  •  FIRST RELIC TRACE BELOW {depth}m",
      signal: "RELIC SIGNAL  •  {distance}m {direction}  •  ALTAR {count}/{required}",
      altarReady: "SKY ALTAR READY  •  Return to the Cloud gate",
      extraSignal: "ANCIENT RELIC  •  {distance}m {direction}",
      altarLabel: "SKY ALTAR  •  {count}/{required} RELICS",
      altarLabelReady: "SKY ALTAR  •  READY",
      directionLeft: "LEFT",
      directionRight: "RIGHT",
      directionUp: "UP",
      directionDown: "DOWN",
    }),
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

export function resolveAncientRelicGuidanceEnabled(
  config = ANCIENT_RELIC_CONFIG.guidance,
  search = globalThis.location?.search || "",
) {
  const raw = new URLSearchParams(search).get(config.queryParam);
  if (raw === null) return config.enabled;
  const normalized = raw.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  return config.enabled;
}
