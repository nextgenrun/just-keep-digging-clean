/**
 * Cave Level Config — expanded cave geometry, camera travel, and authored art routing.
 */
const EXPANDED_CAVE_DISABLED_VALUES = Object.freeze([
  "0",
  "false",
  "off",
  "disabled",
  "legacy",
  "compact",
]);

const rewardNodeLayout = Object.freeze([
  Object.freeze({ tx: 10, ty: 16 }),
  Object.freeze({ tx: 11, ty: 16 }),
  Object.freeze({ tx: 16, ty: 16 }),
  Object.freeze({ tx: 17, ty: 16 }),
  Object.freeze({ tx: 24, ty: 16 }),
  Object.freeze({ tx: 29, ty: 16 }),
  Object.freeze({ tx: 30, ty: 16 }),
  Object.freeze({ tx: 35, ty: 16 }),
  Object.freeze({ tx: 41, ty: 16 }),
  Object.freeze({ tx: 42, ty: 16 }),
  Object.freeze({ tx: 46, ty: 16 }),
  Object.freeze({ tx: 47, ty: 16 }),
  Object.freeze({ tx: 52, ty: 16 }),
  Object.freeze({ tx: 54, ty: 16 }),
  Object.freeze({ tx: 56, ty: 16 }),
]);

export const CAVE_LEVEL_CONFIG = Object.freeze({
  enabledByDefault: true,
  queryParam: "caveLevel",
  disabledValues: EXPANDED_CAVE_DISABLED_VALUES,
  grid: Object.freeze({
    widthTiles: 60,
    heightTiles: 20,
    floorRow: 16,
    floorThicknessTiles: 4,
    boundaryThicknessTiles: 0,
    mineableOnly: true,
    floorResourceKeys: Object.freeze(["dirt", "stone"]),
    floorMaterialRunTiles: 5,
    spawnTileX: 2,
    spawnTileY: 15,
    signatureNode: Object.freeze({ tx: 56, ty: 16 }),
  }),
  camera: Object.freeze({
    zoom: 0.82,
    lerpX: 0.12,
    lerpY: 0.09,
    followOffsetXTiles: 0,
    followOffsetYTiles: 2.35,
    roundPixels: true,
  }),
  rewards: Object.freeze({
    nodeLayout: rewardNodeLayout,
  }),
  presentation: Object.freeze({
    backgroundDepth: -20,

    titleTileX: 5.1,
    titleTileY: 10.85,
    hintTileX: 5.1,
    hintTileY: 11.35,
    titleFontSizePx: 29,
    hintFontSizePx: 16,
    hudDepth: 1000,
    hudTextDepth: 1001,
    hudInsetPx: 28,
    hudTopPx: 22,
    gpHud: Object.freeze({
      frameWidthPx: 171,
      frameHeightPx: 39,
      fontSizePx: 14,
      textOffsetYPx: -1,
    }),
    entranceDepth: 2.15,
  }),
  visualPacks: Object.freeze({
    echoPrism: Object.freeze({
      textureKey: "cave-level-echo-prism-v1",
      assetPath: "sprites/backgrounds/caves/expanded-v1/2026-07-29-echo-prism-cave-level-v1.png",
    }),
    rootbound: Object.freeze({
      textureKey: "cave-level-rootbound-v1",
      assetPath: "sprites/backgrounds/caves/expanded-v1/2026-07-29-rootbound-cave-level-v1.png",
    }),
    emberGilded: Object.freeze({
      textureKey: "cave-level-ember-gilded-v1",
      assetPath: "sprites/backgrounds/caves/expanded-v1/2026-07-29-ember-gilded-cave-level-v1.png",
    }),
  }),
  archetypeVisualPack: Object.freeze({
    "echo-gallery": "echoPrism",
    "prism-nursery": "echoPrism",
    "storm-scar": "echoPrism",
    "rootbound-hollow": "rootbound",
    "gilded-burrow": "emberGilded",
    "ember-fault": "emberGilded",
  }),
});

export function resolveExpandedCaveLevelEnabled(
  config = CAVE_LEVEL_CONFIG,
  search = globalThis.location?.search || "",
) {
  const raw = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (raw && config.disabledValues.includes(raw)) return false;
  return config.enabledByDefault;
}

export function getCaveLevelVisualPack(archetypeId, config = CAVE_LEVEL_CONFIG) {
  const packKey = config.archetypeVisualPack[archetypeId] || "echoPrism";
  return config.visualPacks[packKey] || config.visualPacks.echoPrism;
}
