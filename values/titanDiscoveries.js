const TITAN_ASSET_ROOT = "sprites/backgrounds/titan-discoveries-v1";
const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled"]);
const TITAN_WALK_PLINTH_ASSET = Object.freeze({
  key: "titan-discovery-walk-plinth-v1",
  path: `${TITAN_ASSET_ROOT}/titan-walk-plinth-v1.png`,
});
const TITAN_REGION_LABELS = Object.freeze([
  "Weathered Roots",
  "Blue Caverns",
  "Blue Caverns",
  "Blue Caverns",
  "Blue Caverns",
  "Amber Depths",
  "Amber Depths",
  "Amber Depths",
  "Amber Depths",
  "Silver Core",
  "Silver Core",
  "Silver Core",
  "Silver Core",
  "Silver Core",
  "Core Magma",
  "Core Magma",
  "Core Magma",
  "Slagworks",
  "Slagworks",
  "Obsidian Catacombs",
  "Obsidian Catacombs",
  "Pressure Foundry",
  "Blackglass Abyss",
  "Blackglass Abyss",
  "Starfire Rift",
]);
const TITAN_LORE = Object.freeze({
  "mossback-wanderer": "Older than the first tunnel, it carries a sleeping forest through the roots.",
  "bellhorn-grazer": "Its buried horns ring softly whenever forgotten stone begins to move.",
  "lantern-jaw": "Cold lights drift between its teeth, guiding nothing that still needs a road.",
  archwalker: "Each measured step presses a new arch into the blue cavern walls.",
  "shale-mother": "Loose strata gather against her shell as if stone remembers where it began.",
  "ribbon-wyrm": "It knots amber dust into long currents and vanishes before they settle.",
  "crowned-mole": "A crystal crown marks every sealed chamber it has opened from below.",
  "hammerhead-pilgrim": "The pilgrim follows old forge tones through galleries no map records.",
  "cathedral-stag": "Its antlers hold the warm glow of a sanctuary swallowed by the mine.",
  "hollowback-bear": "The dark within its back is deeper than the silver halls around it.",
  "silver-strider": "Needle legs cross mirror seams without leaving a fracture behind.",
  "mirror-ray": "It swims through polished stone and returns every light as a colder star.",
  needlecrown: "Its crown hums when pressure aligns the buried metal veins.",
  "moon-shell": "A slow lunar pulse turns its ancient shell into a moving tide clock.",
  veilwing: "One wingbeat lifts silver dust into a veil that hangs for hours.",
  "ember-tusk": "Molten seams cool against its tusks and wake again when it exhales.",
  "furnace-drake": "It sleeps beside dead furnaces and keeps their final heat alive.",
  "ash-colossus": "Every footfall releases the ash of structures the deep world forgot.",
  "magma-whale": "A low song rolls through slag channels before its vast shadow appears.",
  "cinder-centipede": "Its many steps stitch cooling plates across broken obsidian.",
  "obsidian-sleeper": "Violet sparks mark the places where its glass armor dreams.",
  "rift-heron": "It waits motionless beside pressure rifts until the stone breathes.",
  "star-eater": "Fragments of false constellations circle the hunger inside its wake.",
  "deep-crown": "No throne remains below, but the crown still patrols its buried borders.",
  "worldroot-titan": "At the final root, stone and starlight grow from the same ancient body.",
});

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
  regionLabel: TITAN_REGION_LABELS[index - 1],
  lore: TITAN_LORE[id],
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
  assets: Object.freeze({
    walkPlinth: TITAN_WALK_PLINTH_ASSET,
  }),
  health: Object.freeze({
    globalKey: "__jkdTitanDiscoveries",
    readyStage: "titan-discoveries-ready",
    missingAssetCode: "titan-discovery-asset-missing",
    incompleteRuntimeCode: "titan-discovery-runtime-incomplete",
    severity: "error",
  }),
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
    plinthDepth: -3.96,
    plinthGlowDepth: -3.95,
    maxWidthTiles: 0.86,
    maxHeightTiles: 0.78,
    creatureBaselineOffsetTiles: 0.43,
    discoveredAlpha: 0.92,
    pulseAlpha: 0.12,
    bobPixels: 4,
    bobPeriodMs: 5200,
    phaseStep: 0.61,
    plinthWidthTiles: 1.08,
    plinthHeightTiles: 0.66,
    plinthLockedAlpha: 0.5,
    plinthDiscoveredAlpha: 0.94,
    plinthGlowAlpha: 0.2,
    arrivalMs: 900,
    arrivalStartScale: 0.15,
  }),
  archive: Object.freeze({
    columns: 5,
    rows: 5,
    panelGap: 14,
    panelInset: 16,
    panelHeaderHeight: 36,
    gridWidthFraction: 0.54,
    slotGap: 6,
    slotMaxSize: 72,
    thumbnailInset: 8,
    lockedThumbnailAlpha: 0.3,
    discoveredThumbnailAlpha: 0.94,
    portraitInset: 22,
    portraitMaxWidthFraction: 0.82,
    portraitMaxHeightFraction: 0.52,
    portraitLockedAlpha: 0.2,
    titleOffsetY: 22,
    regionOffsetY: 55,
    loreOffsetY: 87,
    loreSideInset: 26,
    titleFontSize: 22,
    regionFontSize: 13,
    loreFontSize: 14,
    slotIndexFontSize: 10,
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
  return [
    ...config.definitions.map(definition => definition.asset),
    config.assets.walkPlinth,
  ];
}

export function getTitanDefinition(id, config = TITAN_DISCOVERY_CONFIG) {
  return config.definitions.find(definition => definition.id === id) || null;
}

export function sanitizeTitanDiscoveryIds(value, config = TITAN_DISCOVERY_CONFIG) {
  if (!Array.isArray(value)) return [];
  const provided = new Set(value.filter(id => typeof id === "string"));
  return config.definitions
    .filter(definition => provided.has(definition.id))
    .map(definition => definition.id);
}
