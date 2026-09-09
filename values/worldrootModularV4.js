// Production Worldroot V4 art registry and rollback. Gameplay/save state stays elsewhere.

const WORLDROOT_MODULAR_V4_ASSET_REVISION = "20260901-worldroot-v4-clean-matte-v2";
const WORLDROOT_MODULAR_V4_CHROMA_MATTE = Object.freeze({
  greenFloor: 0,
  greenRange: 16,
  dominanceRatioFloor: 0.25,
  dominanceRatioRange: 0.3,
  fullKeyStrength: 0.985,
  alphaCutoff: 10,
});

const walkable = (id, leftPx, rightPx, yPx, dropGroup = null) => Object.freeze({
  id,
  leftPx,
  rightPx,
  yPx,
  ...(dropGroup ? { dropGroup } : {}),
});

const moduleSpec = ({
  id,
  moduleId,
  regionId,
  stage,
  maxWidthPx,
  rot,
  offsetXPx = 0,
  offsetYPx = 0,
  despillGreen = false,
  sourceCrop = null,
  chromaMatte = null,
  platforms = [],
}) => Object.freeze({
  id,
  moduleId,
  regionId,
  stage,
  maxWidthPx,
  offsetXPx,
  offsetYPx,
  despillGreen,
  sourceCrop: sourceCrop ? Object.freeze({ ...sourceCrop }) : null,
  chromaMatte: chromaMatte ? Object.freeze({ ...chromaMatte }) : null,
  platforms: Object.freeze(platforms),
  rot: Object.freeze(rot),
  living: Object.freeze({
    key: `environment-worldroot-modular-v4-${id}-living`,
    path: `sprites/environment/worldroot-modular-v4/living/${id}-living.png?rev=${WORLDROOT_MODULAR_V4_ASSET_REVISION}`,
  }),
  consumed: Object.freeze({
    key: `environment-worldroot-modular-v4-${id}-consumed`,
    path: `sprites/environment/worldroot-modular-v4/consumed/${id}-consumed.png?rev=${WORLDROOT_MODULAR_V4_ASSET_REVISION}`,
  }),
});

const MODULES = Object.freeze([
  moduleSpec({
    id: "rootways-sanctuary",
    moduleId: "rootways",
    regionId: "surface-entry",
    stage: 0,
    maxWidthPx: 980,
    despillGreen: true,
    sourceCrop: { left: 15, top: 15, width: 1493, height: 987 },
    chromaMatte: WORLDROOT_MODULAR_V4_CHROMA_MATTE,
    rot: [104, 39, 132],
    platforms: [
      walkable("root-loft", 120, 455, 332),
      walkable("root-talent", 516, 662, 276),
    ],
  }),
  moduleSpec({
    id: "cobalt-aquifer",
    moduleId: "cobalt",
    regionId: "level1-blue",
    stage: 1,
    maxWidthPx: 1320,
    offsetYPx: 123,
    despillGreen: true,
    sourceCrop: { left: 38, top: 169, width: 1459, height: 724 },
    chromaMatte: WORLDROOT_MODULAR_V4_CHROMA_MATTE,
    rot: [45, 92, 112],
    platforms: [
      walkable("cobalt-road-west", 409, 487, 298),
      walkable("cobalt-road-mid", 624, 688, 314),
      walkable("cobalt-road", 748, 1052, 295),
      walkable("cobalt-road-east", 1080, 1312, 293),
      walkable("cobalt-nook", 438, 815, 146),
      walkable("cobalt-nook-east", 862, 927, 168),
    ],
  }),
  moduleSpec({
    id: "amber-fault",
    moduleId: "amber",
    regionId: "level1-amber",
    stage: 2,
    maxWidthPx: 1320,
    offsetYPx: 250,
    despillGreen: true,
    sourceCrop: { left: 38, top: 55, width: 1461, height: 913 },
    chromaMatte: WORLDROOT_MODULAR_V4_CHROMA_MATTE,
    rot: [128, 61, 28],
    platforms: [
      walkable("amber-road", 523, 1103, 238),
      walkable("amber-temple", 978, 1035, 73),
    ],
  }),
  moduleSpec({
    id: "mirrorstone-spine",
    moduleId: "mirror",
    regionId: "level1-silver",
    stage: 3,
    maxWidthPx: 1320,
    offsetYPx: 75,
    despillGreen: true,
    sourceCrop: { left: 26, top: 94, width: 1478, height: 837 },
    chromaMatte: WORLDROOT_MODULAR_V4_CHROMA_MATTE,
    rot: [89, 73, 116],
    platforms: [
      walkable("mirror-road-west", 346, 405, 285),
      walkable("mirror-road-mid-west", 424, 546, 282),
      walkable("mirror-road", 549, 850, 283),
      walkable("mirror-road-east", 917, 1128, 280),
      walkable("mirror-road-far-east", 1137, 1217, 279),
      walkable("mirror-reflection", 344, 925, 517),
    ],
  }),
  moduleSpec({
    id: "starfire-rift",
    moduleId: "starfire",
    regionId: "level1-magma",
    stage: 4,
    maxWidthPx: 1320,
    offsetYPx: 100,
    despillGreen: true,
    sourceCrop: { left: 10, top: 7, width: 1491, height: 961 },
    chromaMatte: WORLDROOT_MODULAR_V4_CHROMA_MATTE,
    rot: [124, 31, 46],
    platforms: [
      walkable("starfire-overlook-west", 402, 574, 648),
      walkable("starfire-overlook", 744, 1023, 648),
      walkable("starfire-overlook-east", 1041, 1090, 649),
      walkable("starfire-tip", 731, 1096, 385),
    ],
  }),
  moduleSpec({
    id: "crown-nexus",
    moduleId: "crown",
    regionId: null,
    stage: 5,
    maxWidthPx: 1450,
    despillGreen: true,
    sourceCrop: { left: 19, top: 9, width: 1421, height: 979 },
    chromaMatte: WORLDROOT_MODULAR_V4_CHROMA_MATTE,
    rot: [58, 56, 122],
    platforms: [
      walkable("crown-approach-west", 324, 407, 660),
      walkable("crown-approach-mid", 572, 708, 660),
      walkable("crown-approach-inner", 720, 910, 660),
      walkable("crown-approach", 941, 1391, 660),
      walkable("crown-perch", 420, 1100, 463),
    ],
  }),
]);

export const WORLDROOT_MODULAR_V4_CONFIG = Object.freeze({
  enabledByDefault: false,
  enableValues: Object.freeze(["v4", "modular"]),
  queryParam: "worldrootArt",
  rollbackValues: Object.freeze(["0", "false", "off", "legacy", "v3"]),
  whiteboxQueryParam: "worldrootWhitebox",
  whiteboxEnableValues: Object.freeze(["1", "true", "on", "review"]),
  sourceTileSizePx: 94,
  runtimeScale: 1,
  quality: Object.freeze({
    minimumWidthPx: 900,
    visibleAlpha: 48,
    platformContactRadiusPx: 8,
    maximumConsumedLuminanceRatio: 0.4,
    minimumMeanStateRgbDistance: 50,
    maximumVisibleChromaLeakPixels: 0,
  }),
  presentation: Object.freeze({
    depth: 3.555,
    dormantAlpha: 0.24,
    activeAlpha: 1,
    layerStep: 0.002,
  }),
  modules: MODULES,
});

export function isWorldrootModularV4Enabled(
  search = globalThis.location?.search || "",
  config = WORLDROOT_MODULAR_V4_CONFIG,
) {
  const params = new URLSearchParams(search);
  const normalized = name => params.get(name)?.trim().toLowerCase() || "";
  if (config.whiteboxEnableValues.includes(normalized(config.whiteboxQueryParam))) return false;
  if (config.rollbackValues.includes(normalized(config.queryParam))) return false;
  return config.enableValues.includes(normalized(config.queryParam)) || config.enabledByDefault !== false;
}

export function getWorldrootModularV4PreloadAssets(
  search = globalThis.location?.search || "",
  config = WORLDROOT_MODULAR_V4_CONFIG,
) {
  if (!isWorldrootModularV4Enabled(search, config)) return [];
  return config.modules.flatMap(module => [module.living, module.consumed]);
}
