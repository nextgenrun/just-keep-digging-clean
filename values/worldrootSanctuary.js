// Root Sanctuary presentation only. The existing resolver owns all progression.
const assetRoot = "sprites/environment/worldroot-sanctuary-v3/";
const detailRoot = "sprites/environment/worldroot-sanctuary-v2/";
const detail = name => Object.freeze({ key: `worldroot-sanctuary-${name}-v2`,
  path: `${detailRoot}${name}.png?rev=20260903-growth-v2` });
const asset = name => Object.freeze({
  key: `worldroot-sanctuary-${name}-v3`,
  path: `${assetRoot}${name}.png?rev=20260903-tall-tree-v3`,
});
const region = (id, name, x, y, size, flip = false) => Object.freeze({
  id, name, x, y, size, flip,
  living: asset("foliage-living"),
  consumed: asset("foliage-consumed"),
});

export const WORLDROOT_SANCTUARY_CONFIG = Object.freeze({
  enabledByDefault: true,
  queryParam: "worldrootArt",
  rollbackValues: Object.freeze(["v3", "v4", "modular", "0", "false", "off", "legacy"]),
  whiteboxQueryParam: "worldrootWhitebox",
  whiteboxEnableValues: Object.freeze(["1", "true", "on", "review"]),
  assetRoot,
  base: asset("trunk"),
  source: Object.freeze({ width: 1536, height: 1024, hearthX: 776, groundY: 984 }),
  placement: Object.freeze({ widthTiles: 9, depth: 3.555, layerStep: 0.002,
    livingTint: 0xffffff, consumedTint: 0x666b71 }),
  treeGrowth: Object.freeze({ minimumWidth: 0.78, minimumHeight: 0.66,
    fullGrowthKnownCount: 50, discoveryWeight: 0.45, campfireMaximumLevel: 10,
    transitionMs: 1500 }),
  camera: Object.freeze({ groundScreenFraction: 0.79, nearbyTiles: 5,
    fadeOutTiles: 9, aboveGroundTiles: 3, belowGroundTiles: 2,
    easeMs: 420, maximumDeltaMs: 100 }),
  regions: Object.freeze([
    region("surface-entry", "rootways", 235, 490, 520),
    region("level1-blue", "cobalt", 470, 275, 545, true),
    region("level1-amber", "amber", 795, 185, 545),
    region("level1-silver", "silver", 1090, 290, 525, true),
    region("level1-magma", "starfire", 1315, 505, 510),
  ]),
  foliage: Object.freeze({
    minimumAwakeScale: 0.43,
    fullGrowthKnownCount: 10,
    minimumScarAlpha: 0.75,
    transitionMs: 1100,
    copies: Object.freeze([
      Object.freeze({ offsetX: 0, offsetY: 0, scale: 1, mirror: false }),
      Object.freeze({ offsetX: -0.17, offsetY: 0.055, scale: 0.72, mirror: true }),
      Object.freeze({ offsetX: 0.17, offsetY: -0.045, scale: 0.74, mirror: true }),
    ]),
  }),
  objects: Object.freeze({
    talent: Object.freeze({ x: 1128, y: 871, size: 122, ...detail("talent-star") }),
    crown: Object.freeze({ x: 795, y: 75, size: 100, ...detail("crown-star") }),
    crownRoot: Object.freeze({ x: 1358, y: 936, size: 90 }),
    // Keep the Archive below every canopy socket, including sibling offsets.
    archive: Object.freeze({ x: 1258, y: 931, size: 70, key: "celestial-hollow-sun-core-v1" }),
  }),
  interaction: Object.freeze({
    rangeX: 0.68, rangeY: 1.2, promptOffsetPx: 30,
    pointerReachTiles: 6, pointerVerticalTiles: 2,
    rootPrompt: "Celestial Talents  /  M: World Map",
    crownDormantPrompt: "Read the Crown's missing currents",
    crownReadyPrompt: "Awaken the Crown Star",
    archivePrompt: "Recall the Titan Chorus",
  }),
  stars: Object.freeze({
    sizePx: 24, minimumAlpha: 0.96, pulseAlpha: 0.04, pulsePeriodMs: 4200,
    phaseStep: 0.73, scarSizePx: 16,
    anonymousKey: detail("signal-star").key,
    signal: detail("signal-star"),
    // The actual Star artwork already includes its light. No second colour wash.
    lightSizeRatio: 1, lightAlpha: 0, bobPixels: 0.8,
    scar: Object.freeze({ key: "worldroot-sanctuary-star-scar-v1",
      path: "sprites/environment/starless-scar-v3/starless-scar-dead-center-v3.png" }),
    consumer: "worldroot-sanctuary-stars",
    // Deterministic organic spacing includes dead Stars, so consumption never reshuffles it.
    layout: Object.freeze({ angleRadians: 2.399963229728653, radiusX: 0.40,
      radiusY: 0.27, minimumSpread: 0.72, phaseRadians: -0.8 }),
  }),
  motion: Object.freeze({
    crownDormantAlpha: 0.22, crownReadyAlpha: 0.85,
    crownPulseAlpha: 0.12, crownPulsePeriodMs: 3000,
    talentBaseAlpha: 0.70, talentProgressAlpha: 0.20, gpPulseAlpha: 0.08,
    titanBaseAlpha: 0.42, titanProgressAlpha: 0.45, titanTrackedPulseAlpha: 0.13,
    arrivalDurationMs: 1300, arrivalStaggerMs: 90, maximumArrivals: 16,
    arrivalArcPixels: 65,
  }),
  growth: Object.freeze({
    vine: detail("hanging-vine"), fern: detail("root-fern"), leaf: detail("falling-leaf"),
    minimumScale: 0.24, sleepingScale: 0.18, sleepingAlpha: 0.58,
    minimumAlpha: 0.84, campfireScaleBoost: 0.10, campfireMaximumLevel: 10,
    transitionMs: 1450, staggerMs: 85, swayPeriodMs: 6300,
    vineSwayRadians: 0.035, fernSwayRadians: 0.012, phaseStep: 1.31,
    leafSizePx: 8, leafDriftPx: 42, leafFallPx: 88, leafPeriodMs: 8200, leafAlpha: 0.64,
    reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
    vineOrigin: Object.freeze({ x: 0.64, y: 0.035 }),
    fernOrigin: Object.freeze({ x: 0.50, y: 0.845 }),
    // All five footprints stay outside the largest original Campfire.
    placements: Object.freeze([
      { regionId: "surface-entry", vine: { x: 270, y: 535, width: 142, height: 213 },
        fern: { x: 308, y: 980, width: 255, height: 170 }, flip: false },
      { regionId: "level1-blue", vine: { x: 530, y: 365, width: 146, height: 219 },
        fern: { x: 456, y: 983, width: 230, height: 153 }, flip: true },
      { regionId: "level1-amber", vine: { x: 870, y: 320, width: 142, height: 213 },
        fern: { x: 1128, y: 977, width: 214, height: 143 }, flip: false },
      { regionId: "level1-silver", vine: { x: 1090, y: 410, width: 154, height: 231 },
        fern: { x: 1268, y: 983, width: 240, height: 160 }, flip: true },
      { regionId: "level1-magma", vine: { x: 1300, y: 545, width: 136, height: 204 },
        fern: { x: 1398, y: 984, width: 220, height: 147 }, flip: false },
    ].map(entry => Object.freeze(entry))),
  }),
  detailBuild: Object.freeze({
    root: detailRoot,
    sources: Object.freeze({ "hanging-vine": "source/hanging-vine.png", "root-fern": "source/root-fern.png",
      "falling-leaf": "source/falling-leaf.png" }),
    // Exact existing Star atlas pixels, not new/recoloured/generated Stars.
    starIdentities: Object.freeze({ "signal-star": "moonwhite", "talent-star": "frost-lilac", "crown-star": "soft-amber" }),
  }),
  build: Object.freeze({
    columns: 5, rows: 2, compressionLevel: 9,
    keyDominanceStart: 120, keyDominanceEnd: 200,
    keyChannelDifference: 70, keyGreenMaximum: 100,
    alphaCutoff: 20,
    sources: Object.freeze({ trunk: "source/trunk-chroma.png", foliage: "source/foliage-chroma.png" }),
  }),
});

export function isWorldrootSanctuaryEnabled(
  search = globalThis.location?.search || "", config = WORLDROOT_SANCTUARY_CONFIG,
) {
  const params = new URLSearchParams(search);
  const value = key => params.get(key)?.trim().toLowerCase() || "";
  return config.enabledByDefault !== false
    && !config.whiteboxEnableValues.includes(value(config.whiteboxQueryParam))
    && !config.rollbackValues.includes(value(config.queryParam));
}

export function getWorldrootSanctuaryPreloadAssets(search = globalThis.location?.search || "") {
  if (!isWorldrootSanctuaryEnabled(search)) return [];
  const config = WORLDROOT_SANCTUARY_CONFIG;
  const assets = [config.base, ...config.regions.flatMap(entry => [entry.living, entry.consumed]),
    config.objects.talent, config.objects.crown, config.stars.signal, config.stars.scar,
    config.growth.vine, config.growth.fern, config.growth.leaf];
  return [...new Map(assets.map(asset => [asset.key, asset])).values()];
}

export function resolveSanctuaryTreeGrowth(snapshot, config = WORLDROOT_SANCTUARY_CONFIG) {
  const settings = config.treeGrowth;
  const discovery = Math.min(1, Math.max(0, Number(snapshot?.knownStarCount) || 0)
    / settings.fullGrowthKnownCount);
  const hearth = Math.min(1, Math.max(0, (Number(snapshot?.campfireLevel) || 1) - 1)
    / (settings.campfireMaximumLevel - 1));
  const progress = discovery * settings.discoveryWeight + hearth * (1 - settings.discoveryWeight);
  return { width: settings.minimumWidth + (1 - settings.minimumWidth) * progress,
    height: settings.minimumHeight + (1 - settings.minimumHeight) * progress };
}

export function resolveSanctuaryRegionPresentation(memory, config = WORLDROOT_SANCTUARY_CONFIG) {
  const known = Math.max(0, Number(memory?.knownCount) || 0);
  const consumed = Math.min(known, Math.max(0, Number(memory?.consumedCount) || 0));
  const ratio = known > 0 ? consumed / known : 0;
  const growth = Math.min(1, known / config.foliage.fullGrowthKnownCount);
  return {
    livingAlpha: known > consumed ? 1 : 0,
    livingScale: (config.foliage.minimumAwakeScale
      + growth * (1 - config.foliage.minimumAwakeScale)) * (1 - ratio),
    scarAlpha: consumed > 0 ? Math.max(config.foliage.minimumScarAlpha, ratio) : 0,
    scarScale: Math.sqrt(ratio),
    consumedRatio: ratio,
  };
}
