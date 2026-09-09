/**
 * Cave Scene Config — fixed-size cave destination, entry behavior, and reward tuning.
 */
const SCENIC_CAVE_MOUTH_DISABLED_VALUES = Object.freeze([
  "0",
  "false",
  "off",
  "disabled",
  "legacy",
]);

const COMPACT_CAVE_ENABLED_VALUES = Object.freeze([
  "1",
  "true",
  "on",
  "enabled",
  "compact",
]);

const INTEGRATED_CAVE_ENTRY_DISABLED_VALUES = Object.freeze([
  "0",
  "false",
  "off",
  "disabled",
  "legacy",
]);

export const CAVE_SCENE_CONFIG = Object.freeze({
  enabled: true,
  sceneKey: "CaveScene",
  originSceneKey: "PlayScene",
  compactSceneQueryParam: "compactCaves",
  compactSceneEnabledValues: COMPACT_CAVE_ENABLED_VALUES,
  fadeMs: 280,
  reviewQueryParam: "cave-review",
  reviewEntranceMode: "entrance",
  reviewLaunchDelayMs: 800,
  interactionRangeTiles: 2,
  integratedEntrances: Object.freeze({
    enabledByDefault: true,
    queryParam: "caveEntrances",
    disabledValues: INTEGRATED_CAVE_ENTRY_DISABLED_VALUES,
    eligibleSources: Object.freeze([
      "authored-gap",
      "level-one-procedural",
    ]),
    healthLabel: "production cave entrances",
  }),
  overworldEntrance: Object.freeze({
    scenicEnabledByDefault: true,
    scenicQueryParam: "scenicCaveMouths",
    scenicDisabledValues: SCENIC_CAVE_MOUTH_DISABLED_VALUES,
    landmarkOwnership: Object.freeze({
      skipShallowestWhenActive: true,
      scenicRuntimeMode: "scenic-v2",
    }),
    scenic: Object.freeze({
      textureKey: "cave-scene-overworld-mouth-scenic-v1",
      assetPath: "sprites/backgrounds/world-visual-v2/landmarks/underground-cave-mouth-v1.png",
      displayWidthTiles: 2.85,
      displayHeightTiles: 2.5,
      sourceSizePx: 1254,
      alphaBounds: Object.freeze({ left: 39, top: 79, right: 1217, bottom: 1136 }),
      originX: 628 / 1254,
      originY: 1136 / 1254,
      floorOffsetTiles: 0,
      depth: 2.32,
      alpha: 1,
      tint: 0xffffff,
      pulse: Object.freeze({
        enabled: true,
        alphaDelta: 0.035,
        durationMs: 3400,
        ease: "Sine.InOut",
        staggerMs: 170,
      }),
    }),
    legacy: Object.freeze({
      textureKey: "tile-approved-cave-wall",
      assetPath: "sprites/tiles/approved-world/cave-wall.webp",
      displayWidthTiles: 2,
      displayHeightTiles: 1.7,
      originX: 0.5,
      originY: 0.5,
      floorOffsetTiles: -0.5,
      depth: 2,
      alpha: 1,
      tint: 0xffffff,
      pulse: Object.freeze({
        enabled: false,
        alphaDelta: 0,
        durationMs: 3400,
        ease: "Sine.InOut",
        staggerMs: 0,
      }),
    }),
  }),
  background: Object.freeze({
    fallbackColor: 0x070814,
    fallbackFloorColor: 0x16192b,
    fallbackLightColor: 0x2a4f79,
    fallbackLightAlpha: 0.34,
  }),
  presets: Object.freeze({
    treasure: Object.freeze({
      textureKey: "cave-scene-treasure-room-v1",
      assetPath: "sprites/backgrounds/caves/treasure-room-v1.png",
      entryLabel: "Enter treasure room",
      rewardMultiplier: 2,
    }),
    caveAmber: Object.freeze({
      textureKey: "cave-scene-amber-v1",
      assetPath: "sprites/backgrounds/caves/cave-amber-v1.png",
      entryLabel: "Enter cave",
      rewardMultiplier: 1,
    }),
    caveViolet: Object.freeze({
      textureKey: "cave-scene-violet-v1",
      assetPath: "sprites/backgrounds/caves/cave-violet-v1.png",
      entryLabel: "Enter cave",
      rewardMultiplier: 1,
    }),
  }),
  selection: Object.freeze({
    treasureEveryNthCave: 9,
    treasurePresetKey: "treasure",
    normalPresetKeys: Object.freeze(["caveAmber", "caveViolet"]),
  }),
  interiors: Object.freeze({
    "echo-gallery": Object.freeze({
      presetKey: "caveViolet",
      signatureTileTypeKey: "COMBO_BLOCK",
      resourceBias: Object.freeze(["stone", "copper", "iron"]),
    }),
    "rootbound-hollow": Object.freeze({
      presetKey: "caveAmber",
      signatureTileTypeKey: "GEM_POWER_BLOCK",
      resourceBias: Object.freeze(["copper", "iron", "bronze"]),
    }),
    "prism-nursery": Object.freeze({
      presetKey: "caveViolet",
      signatureTileTypeKey: "XP_BLOCK",
      resourceBias: Object.freeze(["silver", "gold", "magmaCrystal"]),
    }),
    "storm-scar": Object.freeze({
      presetKey: "caveViolet",
      signatureTileTypeKey: "SPEED_BLOCK",
      resourceBias: Object.freeze(["iron", "steel", "silver"]),
    }),
    "gilded-burrow": Object.freeze({
      presetKey: "treasure",
      signatureTileTypeKey: "LEGEND_BLOCK",
      resourceBias: Object.freeze(["silver", "gold"]),
    }),
    "ember-fault": Object.freeze({
      presetKey: "caveAmber",
      signatureTileTypeKey: "BERSERK_BLOCK",
      resourceBias: Object.freeze(["gold", "obsidian", "emberOre", "magmaCrystal"]),
    }),
  }),
  player: Object.freeze({
    spriteDepth: 4,
  }),
  grid: Object.freeze({
    widthTiles: 18,
    heightTiles: 10,
    floorRow: 8,
    boundaryThicknessTiles: 1,
    spawnTileX: 2,
    spawnTileY: 7,
    cameraZoom: 0.74,
    safeFloorTileXs: Object.freeze([1, 2, 3]),
    floorResourceKeys: Object.freeze(["dirt", "stone"]),
    signatureNode: Object.freeze({ tx: 14, ty: 7 }),
  }),
  exit: Object.freeze({
    tileX: 1,
    rangeTiles: 1.25,
    labelOffsetTiles: 0.9,
    labelColor: "#c9dcff",
  }),
  feedback: Object.freeze({
    statusTileY: 0.98,
    gpTileY: 0.72,
    sideInsetTiles: 0.8,
    statusDurationMs: 1100,
    actionHoldMs: 240,
    mineShakeScale: 0.82,
    thunderStrikeHoldMs: 350,
    statusColor: "#f6d36c",
    gpColor: "#bca7ff",
  }),
  presentation: Object.freeze({
    titleTileY: 0.34,
    hintTileY: 0.69,
    titleFontSizePx: 25,
    hintFontSizePx: 15,
    titleColor: "#f7f2df",
    hintColor: "#d5d9e8",
    textStrokeColor: "#060710",
    titleStrokeThickness: 5,
    hintStrokeThickness: 3,
    exitMouth: Object.freeze({
      displayWidthTiles: 2.15,
      displayHeightTiles: 2.05,
      originX: 628 / 1254,
      originY: 1136 / 1254,
      floorOffsetTiles: 0,
      depth: 2.15,
      alpha: 0.96,
    }),
  }),
  rewards: Object.freeze({
    baseYield: 2,
    archetypeBiasCopies: 2,
    collectRangeRatio: 0.09,
    collectedTextColor: "#f6d36c",
    nodeRadius: 23,
    nodeStrokeWidth: 4,
    minDepthByResource: Object.freeze({
      silver: 800,
      gold: 1200,
      obsidian: 1200,
      emberOre: 1400,
      magmaCrystal: 1600,
    }),
    depthPools: Object.freeze([
      Object.freeze({ minDepthTiles: 0, resources: Object.freeze(["copper", "iron", "bronze"]) }),
      Object.freeze({ minDepthTiles: 300, resources: Object.freeze(["iron", "bronze", "steel"]) }),
      Object.freeze({ minDepthTiles: 800, resources: Object.freeze(["bronze", "steel", "silver"]) }),
      Object.freeze({ minDepthTiles: 1200, resources: Object.freeze(["steel", "silver", "gold", "obsidian"]) }),
      Object.freeze({ minDepthTiles: 1400, resources: Object.freeze(["silver", "gold", "obsidian", "emberOre"]) }),
      Object.freeze({ minDepthTiles: 1600, resources: Object.freeze(["gold", "obsidian", "emberOre", "magmaCrystal"]) }),
    ]),
    nodeLayout: Object.freeze([
      Object.freeze({ tx: 5, ty: 8 }),
      Object.freeze({ tx: 8, ty: 8 }),
      Object.freeze({ tx: 11, ty: 8 }),
      Object.freeze({ tx: 14, ty: 8 }),
      Object.freeze({ tx: 16, ty: 6 }),
      Object.freeze({ tx: 16, ty: 5 }),
      Object.freeze({ tx: 7, ty: 1 }),
      Object.freeze({ tx: 12, ty: 1 }),
    ]),
  }),
});

export function resolveScenicCaveMouthsEnabled(
  config = CAVE_SCENE_CONFIG,
  search = globalThis.location?.search || ""
) {
  const entrance = config.overworldEntrance;
  const value = new URLSearchParams(search)
    .get(entrance.scenicQueryParam)
    ?.trim()
    .toLowerCase();
  if (value && entrance.scenicDisabledValues.includes(value)) return false;
  return entrance.scenicEnabledByDefault;
}

export function resolveCompactCaveScenesEnabled(
  defaultEnabled = false,
  search = globalThis.location?.search || ""
) {
  const params = new URLSearchParams(search);
  const raw = params
    .get(CAVE_SCENE_CONFIG.compactSceneQueryParam)
    ?.trim()
    .toLowerCase();
  if (raw) return CAVE_SCENE_CONFIG.compactSceneEnabledValues.includes(raw);
  if (params.has(CAVE_SCENE_CONFIG.reviewQueryParam)) return true;
  return Boolean(defaultEnabled);
}

export function resolveIntegratedCaveEntrancesEnabled(
  config = CAVE_SCENE_CONFIG,
  search = globalThis.location?.search || ""
) {
  const entrances = config.integratedEntrances;
  const value = new URLSearchParams(search)
    .get(entrances.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && entrances.disabledValues.includes(value)) return false;
  return entrances.enabledByDefault;
}
