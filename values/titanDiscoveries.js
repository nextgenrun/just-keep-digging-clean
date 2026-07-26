const TITAN_ASSET_ROOT = "sprites/backgrounds/titan-discoveries-v1";
const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled"]);

const titan = (
  index,
  id,
  name,
  preferredDepthTiles,
  preferredXTile,
  glowTint,
  zoneWidthTiles,
  zoneHeightTiles,
  travelTiles
) => Object.freeze({
  index,
  id,
  name,
  preferredDepthTiles,
  preferredXTile,
  glowTint,
  zoneWidthTiles,
  zoneHeightTiles,
  travelTiles,
  travelDirection: index % 2 === 0 ? -1 : 1,
  asset: Object.freeze({
    key: `titan-discovery-${id}`,
    path: `${TITAN_ASSET_ROOT}/${String(index).padStart(2, "0")}-${id}.png`,
  }),
});

export const TITAN_DEFINITIONS = Object.freeze([
  titan(1, "mossback-wanderer", "Mossback Wanderer", 90, 32, 0x62f3d2, 7, 5, 1.4),
  titan(2, "bellhorn-grazer", "Bellhorn Grazer", 155, 82, 0x62f3d2, 7, 5, 1.2),
  titan(3, "lantern-jaw", "Lantern Jaw", 235, 158, 0x62f3d2, 8, 4, 2.1),
  titan(4, "archwalker", "Archwalker", 315, 228, 0x62f3d2, 7, 5, 1.5),
  titan(5, "shale-mother", "Shale Mother", 410, 52, 0x62f3d2, 8, 5, 1.1),

  titan(6, "ribbon-wyrm", "Ribbon Wyrm", 510, 120, 0xffbe52, 7, 5, 2.2),
  titan(7, "crowned-mole", "Crowned Mole", 620, 205, 0xffbe52, 7, 4, 1.1),
  titan(8, "hammerhead-pilgrim", "Hammerhead Pilgrim", 735, 246, 0xffbe52, 7, 5, 1.5),
  titan(9, "cathedral-stag", "Cathedral Stag", 850, 65, 0xffbe52, 7, 5, 1.4),
  titan(10, "hollowback-bear", "Hollowback Bear", 980, 175, 0xffbe52, 8, 5, 1.2),

  titan(11, "silver-strider", "Silver Strider", 1120, 250, 0xa7e7ff, 7, 5, 1.7),
  titan(12, "mirror-ray", "Mirror Ray", 1260, 95, 0xa7e7ff, 8, 4, 2.4),
  titan(13, "needlecrown", "Needlecrown", 1400, 210, 0xa7e7ff, 7, 5, 1.2),
  titan(14, "moon-shell", "Moon Shell", 1545, 42, 0xa7e7ff, 7, 5, 1.0),
  titan(15, "veilwing", "Veilwing", 1685, 148, 0xa7e7ff, 8, 5, 1.8),

  titan(16, "ember-tusk", "Ember Tusk", 1825, 235, 0xff6d32, 8, 5, 1.3),
  titan(17, "furnace-drake", "Furnace Drake", 1960, 188, 0xff6d32, 8, 5, 1.8),
  titan(18, "ash-colossus", "Ash Colossus", 2160, 165, 0xff6d32, 7, 5, 1.4),
  titan(19, "magma-whale", "Magma Whale", 2420, 225, 0xff6d32, 8, 4, 2.5),
  titan(20, "cinder-centipede", "Cinder Centipede", 2730, 148, 0xff6d32, 8, 4, 2.3),

  titan(21, "obsidian-sleeper", "Obsidian Sleeper", 3090, 260, 0xc878ff, 8, 5, 1.0),
  titan(22, "rift-heron", "Rift Heron", 3490, 190, 0xc878ff, 7, 5, 1.8),
  titan(23, "star-eater", "Star Eater", 3910, 240, 0xc878ff, 8, 5, 2.4),
  titan(24, "deep-crown", "Deep Crown", 4380, 155, 0xc878ff, 8, 5, 1.5),
  titan(25, "worldroot-titan", "Worldroot Titan", 4860, 215, 0xc878ff, 8, 5, 1.2),
]);

export const TITAN_DISCOVERY_CONFIG = Object.freeze({
  enabledByDefault: true,
  queryParam: "titans",
  disabledValues: DISABLED_QUERY_VALUES,
  definitions: TITAN_DEFINITIONS,
  zoneSearch: Object.freeze({
    horizontalRadiusTiles: 24,
    verticalRadiusTiles: 14,
    stepTiles: 2,
    worldEdgeMarginTiles: 2,
    overlapPaddingTiles: 3,
    minimumTrackedTiles: 14,
    triggerRangeTiles: 12,
  }),
  backdrop: Object.freeze({
    spriteDepth: -5.98,
    glowDepth: -5.96,
    fitFraction: 0.9,
    hiddenAlpha: 0.08,
    progressAlpha: 0.28,
    discoveredAlpha: 0.16,
    peakAlpha: 0.92,
    idleDriftPixels: 7,
    idlePeriodMs: 9200,
    phaseStep: 0.73,
  }),
  unlockFx: Object.freeze({
    ringDepth: -5.94,
    frontFxDepth: 2.36,
    echoDepth: 2.34,
    glowInMs: 620,
    crossingMs: 3600,
    glowScale: 1.16,
    peakScale: 1.06,
    ringCount: 3,
    ringStartRadiusTiles: 0.42,
    ringEndScale: 4.8,
    ringLineWidth: 3,
    ringAlpha: 0.82,
    ringStaggerMs: 130,
    ringDurationMs: 1450,
    dustCount: 18,
    dustRadiusMinPx: 2,
    dustRadiusStepPx: 1,
    dustFallMinTiles: 0.8,
    dustFallRangeTiles: 1.7,
    dustDurationMinMs: 900,
    dustDurationStepMs: 85,
    echoHeightTiles: 1.4,
    echoDurationMs: 1700,
    echoStartScale: 0.52,
    echoEndScale: 0.18,
  }),
  surfaceGallery: Object.freeze({
    startTileX: 24,
    spacingTiles: 1.2,
    baselineOffsetTiles: -0.03,
    spriteDepth: -3.92,
    runeDepth: -3.94,
    maxWidthTiles: 0.86,
    maxHeightTiles: 0.92,
    baseAlpha: 0.72,
    pulseAlpha: 0.22,
    bobPixels: 4,
    bobPeriodMs: 5200,
    phaseStep: 0.61,
    runeWidthTiles: 0.66,
    runeHeightTiles: 0.14,
    runeAlpha: 0.22,
    arrivalMs: 900,
    arrivalStartScale: 0.15,
  }),
});

export function resolveTitanDiscoveriesEnabled(
  config = TITAN_DISCOVERY_CONFIG,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.disabledValues.includes(value)) return false;
  return config.enabledByDefault;
}

export function getTitanDiscoveryPreloadAssets(
  config = TITAN_DISCOVERY_CONFIG,
  search
) {
  if (!resolveTitanDiscoveriesEnabled(config, search)) return [];
  return config.definitions.map(definition => definition.asset);
}
