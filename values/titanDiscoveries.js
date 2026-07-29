const TITAN_ASSET_ROOT = "sprites/backgrounds/titan-discoveries-v1";
const TITAN_CHAMBER_ASSET_ROOT = "sprites/backgrounds/titan-chambers-v2";
const TITAN_CHAMBER_BLEND_ASSET_ROOT =
  "sprites/backgrounds/titan-chambers-v3";
const TITAN_SURFACE_STANCE_ASSET_ROOT =
  "sprites/backgrounds/titan-surface-stances-v1";
const TITAN_UNDERGROUND_ASSET_ROOT =
  "sprites/backgrounds/titan-underground-v2";
const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled"]);
const TITAN_SURFACE_GALLERY_SCALE_BY_ID = Object.freeze({
  "mossback-wanderer": 1,
  "bellhorn-grazer": 1.08,
  "lantern-jaw": 0.96,
  archwalker: 1.04,
  "shale-mother": 1.1,
  "ribbon-wyrm": 1.06,
  "crowned-mole": 0.92,
  "hammerhead-pilgrim": 0.98,
  "cathedral-stag": 1.08,
  "hollowback-bear": 1.06,
  "silver-strider": 0.94,
  "mirror-ray": 1.02,
  needlecrown: 0.96,
  "moon-shell": 1.08,
  veilwing: 1.1,
  "ember-tusk": 1.04,
  "furnace-drake": 1.06,
  "ash-colossus": 1.14,
  "magma-whale": 1.18,
  "cinder-centipede": 1.08,
  "obsidian-sleeper": 1.12,
  "rift-heron": 1.06,
  "star-eater": 1.16,
  "deep-crown": 1.12,
  "worldroot-titan": 1.18,
});
const TITAN_WALK_PLINTH_ASSET = Object.freeze({
  key: "titan-discovery-walk-plinth-v1",
  path: `${TITAN_ASSET_ROOT}/titan-walk-plinth-v1.png`,
});
const TITAN_UNDERGROUND_DAIS_ASSET = Object.freeze({
  key: "titan-underground-dais-v1",
  path: `${TITAN_UNDERGROUND_ASSET_ROOT}/titan-dais-v1.png`,
});
const TITAN_COVER_RESONANCE_ASSET = Object.freeze({
  key: "titan-cover-resonance-v1",
  path: `${TITAN_UNDERGROUND_ASSET_ROOT}/titan-cover-resonance-v1.png`,
});
const TITAN_GUIDANCE_POINTER_ASSET = Object.freeze({
  key: "ui-titan-resonance-pointer-v1",
  path: "sprites/UI/titan-guidance-v1/titan-resonance-pointer-v1.png",
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
  surfaceGalleryScale: TITAN_SURFACE_GALLERY_SCALE_BY_ID[id],
  asset: Object.freeze({
    key: `titan-discovery-${id}`,
    path: `${TITAN_ASSET_ROOT}/${String(index).padStart(2, "0")}-${id}.png`,
  }),
  surfaceAsset: Object.freeze({
    key: `titan-surface-stance-${id}-v1`,
    path: `${TITAN_SURFACE_STANCE_ASSET_ROOT}/${String(index).padStart(2, "0")}-${id}-surface-stance-v1.webp`,
  }),
  chamberAsset: Object.freeze({
    key: `titan-discovery-chamber-${id}-v2`,
    path: `${TITAN_CHAMBER_ASSET_ROOT}/${String(index).padStart(2, "0")}-${id}-chamber-v2.webp`,
  }),
  chamberBlendAsset: Object.freeze({
    key: `titan-discovery-chamber-${id}-v3`,
    path: `${TITAN_CHAMBER_BLEND_ASSET_ROOT}/${String(index).padStart(2, "0")}-${id}-chamber-v3.webp`,
  }),
});

export const TITAN_DEFINITIONS = Object.freeze([
  titan(1, "mossback-wanderer", "Mossback Wanderer", 90, 32, 0x62f3d2, 18, 10, 1.4),
  titan(2, "bellhorn-grazer", "Bellhorn Grazer", 155, 82, 0x62f3d2, 17, 9, 1.2),
  titan(3, "lantern-jaw", "Lantern Jaw", 235, 158, 0x62f3d2, 22, 12, 2.1),
  titan(4, "archwalker", "Archwalker", 315, 228, 0x62f3d2, 17, 9, 1.5),
  titan(5, "shale-mother", "Shale Mother", 410, 52, 0x62f3d2, 19, 10, 1.1),
  titan(6, "ribbon-wyrm", "Ribbon Wyrm", 510, 120, 0xffbe52, 22, 12, 2.2),
  titan(7, "crowned-mole", "Crowned Mole", 620, 205, 0xffbe52, 17, 9, 1.1),
  titan(8, "hammerhead-pilgrim", "Hammerhead Pilgrim", 735, 246, 0xffbe52, 17, 9, 1.5),
  titan(9, "cathedral-stag", "Cathedral Stag", 850, 65, 0xffbe52, 19, 10, 1.4),
  titan(10, "hollowback-bear", "Hollowback Bear", 980, 175, 0xffbe52, 19, 10, 1.2),
  titan(11, "silver-strider", "Silver Strider", 1120, 250, 0xa7e7ff, 17, 9, 1.7),
  titan(12, "mirror-ray", "Mirror Ray", 1260, 95, 0xa7e7ff, 22, 12, 2.4),
  titan(13, "needlecrown", "Needlecrown", 1400, 210, 0xa7e7ff, 18, 10, 1.2),
  titan(14, "moon-shell", "Moon Shell", 1545, 42, 0xa7e7ff, 19, 10, 1.0),
  titan(15, "veilwing", "Veilwing", 1685, 148, 0xa7e7ff, 21, 12, 1.8),
  titan(16, "ember-tusk", "Ember Tusk", 1825, 235, 0xff6d32, 19, 10, 1.3),
  titan(17, "furnace-drake", "Furnace Drake", 1960, 188, 0xff6d32, 20, 11, 1.8),
  titan(18, "ash-colossus", "Ash Colossus", 2160, 165, 0xff6d32, 18, 10, 1.4),
  titan(19, "magma-whale", "Magma Whale", 2420, 225, 0xff6d32, 22, 12, 2.5),
  titan(20, "cinder-centipede", "Cinder Centipede", 2730, 148, 0xff6d32, 22, 12, 2.3),
  titan(21, "obsidian-sleeper", "Obsidian Sleeper", 3090, 260, 0xc878ff, 19, 10, 1.0),
  titan(22, "rift-heron", "Rift Heron", 3490, 190, 0xc878ff, 17, 9, 1.8),
  titan(23, "star-eater", "Star Eater", 3910, 240, 0xc878ff, 22, 12, 2.4),
  titan(24, "deep-crown", "Deep Crown", 4380, 155, 0xc878ff, 20, 11, 1.5),
  titan(25, "worldroot-titan", "Worldroot Titan", 4860, 215, 0xc878ff, 22, 12, 1.2),
]);
export const TITAN_DISCOVERY_CONFIG = Object.freeze({
  enabledByDefault: true,
  queryParam: "titans",
  disabledValues: DISABLED_QUERY_VALUES,
  definitions: TITAN_DEFINITIONS,
  assets: Object.freeze({
    walkPlinth: TITAN_WALK_PLINTH_ASSET,
    undergroundDais: TITAN_UNDERGROUND_DAIS_ASSET,
    coverResonance: TITAN_COVER_RESONANCE_ASSET,
    guidancePointer: TITAN_GUIDANCE_POINTER_ASSET,
  }),
  health: Object.freeze({
    globalKey: "__jkdTitanDiscoveries",
    readyStage: "titan-discoveries-ready",
    missingAssetCode: "titan-discovery-asset-missing",
    chamberAssetCode: "titan-chamber-stream-failed",
    incompleteRuntimeCode: "titan-discovery-runtime-incomplete",
    severity: "error",
  }),
  zoneSearch: Object.freeze({
    horizontalRadiusTiles: 40,
    verticalRadiusTiles: 20,
    stepTiles: 2,
    worldEdgeMarginTiles: 2,
    overlapPaddingTiles: 5,
    minimumTrackedTiles: 64,
  }),
  backdrop: Object.freeze({
    fitFraction: 0.98,
  }),
  underground: Object.freeze({
    assetVersion: "titan-surface-stances-v1",
    titanFitFraction: 0.96,
    spriteDepth: -5.96,
    glowDepth: -5.95,
    coveredAlpha: 0.9,
    coverageProgressAlpha: 0.095,
    coverageGlowAlpha: 0.16,
    coverageGlowFloor: 0.28,
    discoveredAlpha: 0.995,
    peakAlpha: 1,
    idleDriftPixels: 7,
    idlePeriodMs: 9200,
    phaseStep: 0.73,
    daisDepth: -5.99,
    daisGlowDepth: -5.985,
    daisWidthTiles: 4.6,
    daisHeightTiles: 0.88,
    daisCenterInsetTiles: 0.08,
    daisAlpha: 0.97,
    daisGlowAlpha: 0.075,
  }),
  coverageGlow: Object.freeze({
    activationRangeTiles: 14,
    maxVisibleTiles: 112,
    depth: 898,
    displaySizeTiles: 1.02,
    minimumAlpha: 0.42,
    maximumAlpha: 0.72,
    pulsePeriodMs: 1800,
    phaseStep: 0.63,
    scalePulse: 0.03,
    blendMode: "ADD",
  }),
  chambers: Object.freeze({
    enabledByDefault: true,
    queryParam: "titanChambers",
    disabledValues: DISABLED_QUERY_VALUES,
    blendEnabledByDefault: true,
    blendQueryParam: "titanChamberBlend",
    blendAssetVersion: "titan-chambers-v3",
    rollbackAssetVersion: "titan-chambers-v2",
    preloadRangeTiles: 24,
    releaseRangeTiles: 36,
    maxResidentCards: 2,
    nativeWidthPx: 1536,
    nativeHeightPx: 848,
    cardDepth: -6.02,
    cardGlowDepth: -6.01,
    lockedCardAlpha: 0.05,
    lockedCardProgressAlpha: 0.03,
    discoveredCardAlpha: 0.12,
    ambientGlowAlpha: 0.025,
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
    ringEndScale: 16,
    ringLineWidth: 3,
    ringAlpha: 0.82,
    ringStaggerMs: 130,
    ringDurationMs: 1900,
    dustCount: 30,
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
    assetVersion: "titan-surface-stances-v1",
    footingAssetId: "undergroundDais",
    startTileX: 29.5,
    spacingTiles: 3.4,
    baselineOffsetTiles: -0.03,
    spriteDepth: 19.2,
    plinthDepth: 18.8,
    plinthGlowDepth: 18.9,
    spriteBlendMode: "NORMAL",
    maxWidthTiles: 3.2,
    maxHeightTiles: 4.25,
    minimumScaleMultiplier: 0.92,
    maximumScaleMultiplier: 1.18,
    fallbackScaleMultiplier: 1,
    stanceBottomPaddingPx: 24,
    creatureContactInsetTiles: 0.035,
    discoveredAlpha: 0.985,
    pulseAlpha: 0.015,
    bobPixels: 4,
    bobPeriodMs: 5200,
    phaseStep: 0.61,
    plinthWidthTiles: 2.1,
    plinthHeightTiles: 0.36,
    plinthLockedAlpha: 0.38,
    plinthDiscoveredAlpha: 0.98,
    plinthGlowAlpha: 0.16,
    arrivalMs: 900,
    arrivalStartScale: 0.15,
    inspectionEnabledByDefault: true,
    inspectionQueryParam: "titanStatueLore",
    inspectionRangeTiles: 2.4,
    inspectionPromptDepth: 20.6,
    inspectionPromptOffsetTiles: 0.18,
    inspectionPromptFontSizePx: 13,
    inspectionPromptColor: "#f3dfaa",
    inspectionPromptStrokeColor: "#071018",
    inspectionPromptStrokeThicknessPx: 4,
    inspectionPromptPulseMinAlpha: 0.72,
    inspectionPromptPulseMaxAlpha: 1,
    inspectionPromptPulseMs: 950,
    inspectionPromptCopy: "INSPECT",
    inspectionNotificationTitle: "TITAN INSCRIPTION",
    inspectionNotificationKey: "titan-statue-inspection",
    inspectionNotificationPriority: 1,
    inspectionSeparator: "  •  ",
    inspectionArchiveHint: "ESC > TITANS: FULL ARCHIVE",
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
    portraitMaxHeightFraction: 0.4,
    portraitLockedAlpha: 0.2,
    titleOffsetY: 10,
    epithetOffsetY: 39,
    regionOffsetY: 59,
    loreOffsetY: 83,
    loreSideInset: 26,
    titleFontSize: 22,
    epithetFontSize: 12,
    regionFontSize: 13,
    loreFontSize: 12,
    loreLineSpacingPx: 3,
    inscriptionFontSize: 11,
    inscriptionGapPx: 8,
    inscriptionLabel: "PLINTH INSCRIPTION",
    slotIndexFontSize: 10,
    vignettePulseScale: 1.008,
    vignettePulseMs: 5200,
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

export function resolveTitanChambersEnabled(
  config = TITAN_DISCOVERY_CONFIG,
  search = globalThis.location?.search || ""
) {
  if (!resolveTitanDiscoveriesEnabled(config, search)) return false;
  const chamberConfig = config.chambers;
  const value = new URLSearchParams(search)
    .get(chamberConfig.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && chamberConfig.disabledValues.includes(value)) return false;
  return chamberConfig.enabledByDefault;
}

export function resolveTitanChamberBlendEnabled(
  config = TITAN_DISCOVERY_CONFIG,
  search = globalThis.location?.search || ""
) {
  if (!resolveTitanChambersEnabled(config, search)) return false;
  const chamberConfig = config.chambers;
  const value = new URLSearchParams(search)
    .get(chamberConfig.blendQueryParam)
    ?.trim()
    .toLowerCase();
  if (value && chamberConfig.disabledValues.includes(value)) return false;
  return chamberConfig.blendEnabledByDefault;
}

export function resolveTitanStatueLoreEnabled(
  config = TITAN_DISCOVERY_CONFIG,
  search = globalThis.location?.search || ""
) {
  if (!resolveTitanDiscoveriesEnabled(config, search)) return false;
  const gallery = config.surfaceGallery;
  const value = new URLSearchParams(search)
    .get(gallery.inspectionQueryParam)
    ?.trim()
    .toLowerCase();
  if (value && config.disabledValues.includes(value)) return false;
  return gallery.inspectionEnabledByDefault;
}

export function resolveTitanChamberAsset(
  definition,
  config = TITAN_DISCOVERY_CONFIG,
  search = globalThis.location?.search || ""
) {
  return resolveTitanChamberBlendEnabled(config, search)
    && definition.chamberBlendAsset
    ? definition.chamberBlendAsset
    : definition.chamberAsset;
}

export function getTitanDiscoveryPreloadAssets(
  config = TITAN_DISCOVERY_CONFIG,
  search
) {
  if (!resolveTitanDiscoveriesEnabled(config, search)) return [];
  return [
    ...config.definitions.flatMap(definition => [
      definition.asset,
      definition.surfaceAsset,
    ]),
    config.assets.walkPlinth,
    config.assets.undergroundDais,
    config.assets.coverResonance,
    config.assets.guidancePointer,
  ];
}
export function getTitanChamberAssets(
  config = TITAN_DISCOVERY_CONFIG,
  search
) {
  if (!resolveTitanChambersEnabled(config, search)) return [];
  return config.definitions.map(definition => (
    resolveTitanChamberAsset(definition, config, search)
  ));
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
