const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off"]);

const RESOURCE_ROOT = "sprites/tiles/resource-tiles-imagegen-v3";
const SOIL_ROOT = "sprites/tiles/dynamic-soil/bases";
const PICKAXE_ROOT = "sprites/UI/pickaxe-icons-v1";

const image = (key, path) => Object.freeze({ key, path });
const material = (id, label, textureKey, path, hp, weight) =>
  Object.freeze({
    id,
    label,
    textureKey,
    path,
    hp,
    weight,
  });

const PICKAXE_TIERS = Object.freeze([
  Object.freeze({ minBestChain: 0, label: "BRONZE", ...image("ui-pickaxe-bronze-v1", `${PICKAXE_ROOT}/bronze-pickaxe-v1.png`) }),
  Object.freeze({ minBestChain: 3, label: "IRON", ...image("ui-pickaxe-iron-v1", `${PICKAXE_ROOT}/iron-pickaxe-v1.png`) }),
  Object.freeze({ minBestChain: 6, label: "STEEL", ...image("ui-pickaxe-steel-v1", `${PICKAXE_ROOT}/steel-pickaxe-v1.png`) }),
  Object.freeze({ minBestChain: 10, label: "MITHRIL", ...image("ui-pickaxe-mithril-v1", `${PICKAXE_ROOT}/mithril-pickaxe-v1.png`) }),
  Object.freeze({ minBestChain: 15, label: "ADAMANT", ...image("ui-pickaxe-adamant-v1", `${PICKAXE_ROOT}/adamant-pickaxe-v1.png`) }),
  Object.freeze({ minBestChain: 21, label: "RUNE", ...image("ui-pickaxe-rune-v1", `${PICKAXE_ROOT}/rune-pickaxe-v1.png`) }),
  Object.freeze({ minBestChain: 30, label: "DRAGON", ...image("ui-pickaxe-dragon-v1", `${PICKAXE_ROOT}/dragon-pickaxe-v1.png`) }),
]);

const MATERIALS = Object.freeze([
  material("soil-shallow", "SHALLOW SOIL", "loading-mine-soil-shallow-v1", `${SOIL_ROOT}/soil-000-200-v3.webp`, 1, 12),
  material("soil-mid", "PACKED SOIL", "loading-mine-soil-mid-v1", `${SOIL_ROOT}/soil-400-600-v3.webp`, 1, 8),
  material("soil-deep", "DEEP SOIL", "loading-mine-soil-deep-v1", `${SOIL_ROOT}/soil-800-1000-v3.webp`, 2, 6),
  material("stone", "STONE", "loading-mine-resource-stone-v3", `${RESOURCE_ROOT}/stone.webp`, 2, 8),
  material("copper", "COPPER", "loading-mine-resource-copper-v3", `${RESOURCE_ROOT}/copper.webp`, 2, 8),
  material("iron", "IRON", "loading-mine-resource-iron-v3", `${RESOURCE_ROOT}/iron.webp`, 2, 7),
  material("bronze", "BRONZE", "loading-mine-resource-bronze-v3", `${RESOURCE_ROOT}/bronze.webp`, 2, 6),
  material("steel", "STEEL", "loading-mine-resource-steel-v3", `${RESOURCE_ROOT}/steel.webp`, 3, 5),
  material("silver", "SILVER", "loading-mine-resource-silver-v3", `${RESOURCE_ROOT}/silver.webp`, 3, 4),
  material("gold", "GOLD", "loading-mine-resource-gold-v3", `${RESOURCE_ROOT}/gold.webp`, 3, 3),
  material("obsidian", "OBSIDIAN", "loading-mine-resource-obsidian-v3", `${RESOURCE_ROOT}/obsidian.webp`, 3, 3),
  material("ember-ore", "EMBER ORE", "loading-mine-resource-ember-v3", `${RESOURCE_ROOT}/ember-ore.webp`, 3, 2.5),
  material("magma-crystal", "MAGMA CRYSTAL", "loading-mine-resource-magma-v3", `${RESOURCE_ROOT}/magma-crystal.webp`, 4, 2),
]);

export const LOADING_MINING_MINIGAME_CONFIG = Object.freeze({
  enabled: true,
  revision: "loading-mining-authored-console-v6-20260731",
  rollback: Object.freeze({
    queryParam: "loadingMine",
  }),
  diagnostics: Object.freeze({
    globalKey: "__jkdLoadingMiningMinigame",
  }),
  assets: Object.freeze({
    boardFrame: image(
      "ui-thunderstrike-chain-frame-v1",
      "sprites/UI/thunderstrike-chain-v1/thunderstrike-chain-frame-v1.webp",
    ),
    counterFrame: image(
      "ui-hud-approved-combo",
      "sprites/UI/hud-approved-v1/combo-frame.png",
    ),
    target: image(
      "fx-mining-target-corners-v1",
      "sprites/UI/mining-target-v1/mining-target-corners-v1.webp",
    ),
    hitFracture: image(
      "fx-earthquake-tile-fracture-v1",
      "sprites/UI/earthquake-feedback-v2/seismic-tile-fracture-v1.png",
    ),
    breakDebris: image(
      "fx-earthquake-impact-debris-v1",
      "sprites/UI/earthquake-feedback-v2/seismic-impact-debris-v1.png",
    ),
    breakBurst: image(
      "fx-earthquake-tile-collapse-v1",
      "sprites/UI/earthquake-feedback-v2/seismic-tile-collapse-v1.png",
    ),
    pickaxeTiers: PICKAXE_TIERS,
    materials: MATERIALS,
  }),
  layout: Object.freeze({
    referenceWidth: 1280,
    referenceHeight: 720,
    screen: Object.freeze({
      leftColumnX: 260,
      logoY: 122,
      logoMaxWidth: 360,
      logoMaxHeight: 68,
      subtitleY: 184,
      progressLabelY: 474,
      progressPanelY: 510,
      progressBarY: 506,
      progressBarWidth: 310,
      progressBarHeight: 8,
      progressBarOffsetX: -18,
      progressFrameWidth: 400,
      progressFrameHeight: 47,
      progressFrameCrop: Object.freeze({
        x: 126,
        y: 455,
        width: 1528,
        height: 180,
      }),
      progressInstructionY: 542,
      progressOptionalY: 558,
      progressPercentOffsetX: 170,
      progressPercentOffsetY: 4,
      progressLabelFontSize: "10px",
      progressInstructionFontSize: "9px",
      progressOptionalFontSize: "8px",
      progressPercentFontSize: "10px",
      failureY: 588,
      retryY: 620,
      retryHintY: 650,
    }),
    board: Object.freeze({
      centerX: 845,
      centerY: 300,
      presentationScale: 1,
      width: 720,
      height: 360,
      frameCrop: Object.freeze({
        x: 116,
        y: 121,
        width: 1546,
        height: 623,
        sourceWidth: 1774,
        sourceHeight: 887,
      }),
      counterY: -185,
      counterX: 155,
      counterWidth: 220,
      counterHeight: 48,
      gridTopY: -132,
      columns: 8,
      rows: 4,
      cellSize: 58,
      cellGap: 7,
      targetScale: 1.12,
      toolSlotOffsetsX: Object.freeze([
        -280, -178, -76, 26, 128, 230, 332,
      ]),
      toolRailY: 330,
      toolIconSize: 54,
      toolTierLabelY: 369,
      toolInactiveAlpha: 0.46,
      toolActiveAlpha: 1,
      toolInactiveScale: 0.9,
      toolActiveScale: 1.06,
      pickaxeSize: 70,
      pickaxeOffsetX: 35,
      pickaxeOffsetY: 39,
      pickaxeOriginX: 0.82,
      pickaxeOriginY: 0.82,
      pickaxeFlipX: true,
      pickaxeRestVisible: false,
      fractureScale: 1.2,
      hitChipSize: 70,
      hitChipPoolSize: 5,
      debrisSize: 108,
      debrisPoolSize: 6,
      breakBurstSize: 122,
      breakBurstPoolSize: 3,
      dropStaggerMs: 13,
    }),
    text: Object.freeze({
      counterFontSize: "14px",
      materialFontSize: "11px",
      counterColor: "#f0dfc2",
      instructionColor: "#c8dae8",
      tierColor: "#f2c56b",
      materialColor: "#d6a84a",
      strokeColor: "#02060a",
      strokeThickness: 3,
    }),
  }),
  timing: Object.freeze({
    holdIntervalMs: 145,
    chainWindowMs: 1150,
    hitCompressMs: 34,
    hitReboundMs: 48,
    hitSettleMs: 62,
    breakMs: 190,
    dropMs: 145,
    dropSquashMs: 32,
    dropSettleMs: 54,
    debrisMs: 330,
    breakBurstMs: 360,
    hitChipMs: 170,
    targetPulseMs: 620,
    pickaxeWindupMs: 34,
    pickaxeStrikeMs: 46,
    pickaxeRecoilMs: 36,
    pickaxeSettleMs: 58,
    pickaxeContactDelayMs: 76,
    pickaxeRestAngleDeg: 18,
    pickaxeWindupAngleDeg: 46,
    pickaxeStrikeAngleDeg: -10,
    pickaxeRecoilAngleDeg: 25,
    pickaxeGhostAlpha: 0.34,
    targetMinAlpha: 0.82,
    targetMaxAlpha: 1,
    targetMinScale: 0.98,
    targetMaxScale: 1.04,
    fractureMinAlpha: 0.34,
    fractureMaxAlpha: 0.86,
    hitChipStartAlpha: 0.88,
    hitChipEndAlpha: 0,
    hitChipStartScale: 0.32,
    hitChipEndScale: 0.92,
    debrisStartAlpha: 0.94,
    debrisEndAlpha: 0,
    debrisStartScale: 0.38,
    debrisEndScale: 1.12,
    debrisStartAngleDeg: -8,
    debrisEndAngleDeg: 12,
    breakBurstStartAlpha: 0.96,
    breakBurstEndAlpha: 0,
    breakBurstStartScale: 0.34,
    breakBurstEndScale: 1.04,
  }),
  copy: Object.freeze({
    blocksMined: "BLOCKS MINED",
    bestChain: "BEST CHAIN",
    instruction: "CLICK OR HOLD TO MINE",
    keyboardInstruction: "ARROWS + SPACE",
    optional: "OPTIONAL · LOAD CONTINUES AUTOMATICALLY · NO SAVE REWARDS",
  }),
  assetBudgetBytes: 1600000,
});

export function resolveLoadingMiningMinigameEnabled(
  search = globalThis.location?.search || "",
  config = LOADING_MINING_MINIGAME_CONFIG,
) {
  if (config.enabled !== true) return false;
  const value = new URLSearchParams(search)
    .get(config.rollback.queryParam)
    ?.trim()
    .toLowerCase();
  return !DISABLED_QUERY_VALUES.includes(value);
}

export function getPauseFeatureLoadingPreloadAssets(
  config = LOADING_MINING_MINIGAME_CONFIG,
) {
  return Object.freeze([
    config.assets.boardFrame,
    config.assets.counterFrame,
    config.assets.target,
  ].map(({ key, path }) => Object.freeze({ key, path })));
}

export function getLoadingMiningMinigamePreloadAssets(
  config = LOADING_MINING_MINIGAME_CONFIG,
  search = globalThis.location?.search || "",
) {
  if (!resolveLoadingMiningMinigameEnabled(search, config)) return [];
  const candidates = [
    ...getPauseFeatureLoadingPreloadAssets(config),
    config.assets.hitFracture,
    config.assets.breakDebris,
    config.assets.breakBurst,
    ...config.assets.pickaxeTiers,
    ...config.assets.materials.map(({ textureKey: key, path }) => ({ key, path })),
  ];
  return [...new Map(candidates.map(asset => [asset.key, asset])).values()]
    .map(({ key, path }) => Object.freeze({ key, path }));
}
