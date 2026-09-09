// Query-gated native-density art modules fitted to the Worldroot Gate A geometry.

const ENABLE_VALUES = Object.freeze(["1", "true", "on", "review"]);
const BUILD = Object.freeze({
  checkerMinimum: 232,
  checkerChromaMaximum: 20,
  checkerFringeRadiusPx: 1,
  fringeMinimum: 205,
  fringeChromaMaximum: 26,
  fringeAlpha: 64,
  visibleAlpha: 128,
  pngCompression: 9,
});

const BASE = Object.freeze({
  enableValues: ENABLE_VALUES,
  sourceTileSizePx: 94,
  runtimeScale: 1,
  paddingPx: 28,
  contactRepairDepthPx: 6,
  maximumSourceOffsetPx: 128,
  maximumStage: 6,
  carrier: Object.freeze({ widthPx: 1536, heightPx: 1024 }),
  build: BUILD,
  presentation: Object.freeze({
    depth: 3.555,
    dormantAlpha: 0.28,
    activeAlpha: 1,
  }),
  alignment: Object.freeze({
    contactSampleRadiusPx: 2,
    connectorSampleRadiusPx: 2,
    contactEndpointTolerancePx: 4,
    joinEpsilonTiles: 0.02,
  }),
});

const gateModule = ({
  id,
  moduleId = id,
  stage,
  key,
  path,
  guidePath,
  maskPath,
  guideFill,
  guideOutline,
  promptId = id,
  sourcePath = null,
  minimumAssetBytes = 100000,
  sourceOffsetYPx = 0,
  geometry = null,
}) => Object.freeze({
  id,
  moduleId,
  stage,
  key,
  path,
  guidePath,
  maskPath,
  guideFill,
  guideOutline,
  promptId,
  sourcePath,
  minimumAssetBytes,
  sourceOffsetYPx,
  geometry: geometry ? Object.freeze({
    silhouettes: Object.freeze(geometry.silhouettes || []),
    connectors: Object.freeze(geometry.connectors || []),
    platforms: Object.freeze(geometry.platforms || []),
  }) : null,
});

export const WORLDROOT_GATE_B_CONFIG = Object.freeze({
  ...BASE,
  gateLabel: "B",
  reviewStatus: "accepted",
  queryParam: "worldrootGateB",
  assetRoot: "sprites/environment/worldroot-gate-b-v1",
  manifestFilename: "2026-08-30-worldroot-gate-b-manifest.json",
  promptFilename: "2026-08-30-imagegen-prompts.json",
  modules: Object.freeze([
    gateModule({
      id: "rootways",
      stage: 0,
      key: "environment-worldroot-gate-b-rootways-v1",
      path: "sprites/environment/worldroot-gate-b-v1/living/rootways-living-v1.png?rev=20260830-gate-b-v2",
      guidePath: "sprites/environment/worldroot-gate-b-v1/guides/rootways-carrier-v1.png",
      maskPath: "sprites/environment/worldroot-gate-b-v1/guides/rootways-mask-v1.png",
      guideFill: "#30213d",
      guideOutline: "#b58af1",
      geometry: {
        silhouettes: ["root-mass", "root-loft", "root-talent"],
        connectors: ["root-spine"],
        platforms: ["root-loft", "root-talent"],
      },
    }),
    gateModule({
      id: "cobalt",
      stage: 1,
      key: "environment-worldroot-gate-b-cobalt-v1",
      path: "sprites/environment/worldroot-gate-b-v1/living/cobalt-living-v1.png?rev=20260830-gate-b-v2",
      guidePath: "sprites/environment/worldroot-gate-b-v1/guides/cobalt-carrier-v1.png",
      maskPath: "sprites/environment/worldroot-gate-b-v1/guides/cobalt-mask-v1.png",
      guideFill: "#16384e",
      guideOutline: "#6edcff",
      geometry: {
        silhouettes: ["cobalt-road", "cobalt-nook"],
        connectors: ["root-to-cobalt", "cobalt-fork"],
        platforms: ["cobalt-road", "cobalt-nook"],
      },
    }),
    gateModule({
      id: "root-cobalt-seat",
      moduleId: "cobalt",
      stage: 1,
      key: "environment-worldroot-gate-b-root-cobalt-seat-v1",
      path: "sprites/environment/worldroot-gate-b-v1/living/root-cobalt-seat-living-v1.png?rev=20260830-alignment-v1",
      guidePath: "sprites/environment/worldroot-gate-b-v1/guides/root-cobalt-seat-carrier-v1.png",
      maskPath: "sprites/environment/worldroot-gate-b-v1/guides/root-cobalt-seat-mask-v1.png",
      guideFill: "#19344b",
      guideOutline: "#82dcff",
      minimumAssetBytes: 12000,
      geometry: {
        silhouettes: [],
        connectors: ["root-cobalt-seat"],
        platforms: [],
      },
    }),
  ]),
});

export const WORLDROOT_GATE_C_CONFIG = Object.freeze({
  ...BASE,
  contactRepairDepthPx: 12,
  gateLabel: "C",
  reviewStatus: "candidate",
  queryParam: "worldrootGateC",
  requiredQueryParam: "worldrootGateB",
  assetRoot: "sprites/environment/worldroot-gate-c-v1",
  manifestFilename: "2026-08-30-worldroot-gate-c-manifest.json",
  promptFilename: "2026-08-30-imagegen-prompts.json",
  modules: Object.freeze([
    gateModule({
      id: "amber",
      stage: 2,
      key: "environment-worldroot-gate-c-amber-v1",
      path: "sprites/environment/worldroot-gate-c-v1/living/amber-living-v1.png?rev=20260830-gate-c-v1",
      guidePath: "sprites/environment/worldroot-gate-c-v1/guides/amber-carrier-v1.png",
      maskPath: "sprites/environment/worldroot-gate-c-v1/guides/amber-mask-v1.png",
      guideFill: "#4a2c16",
      guideOutline: "#ffc15c",
      sourceOffsetYPx: -10,
      geometry: {
        silhouettes: ["amber-road", "amber-temple"],
        connectors: ["amber-fork"],
        platforms: ["amber-road", "amber-temple"],
      },
    }),
    gateModule({
      id: "amber-temple-cap",
      moduleId: "amber",
      stage: 2,
      key: "environment-worldroot-gate-c-amber-temple-cap-v1",
      path: "sprites/environment/worldroot-gate-c-v1/living/amber-temple-cap-living-v1.png?rev=20260830-alignment-v1",
      guidePath: "sprites/environment/worldroot-gate-c-v1/guides/amber-temple-cap-carrier-v1.png",
      maskPath: "sprites/environment/worldroot-gate-c-v1/guides/amber-temple-cap-mask-v1.png",
      guideFill: "#4a2c16",
      guideOutline: "#ffc15c",
      sourceOffsetYPx: 39,
      geometry: {
        silhouettes: ["amber-temple"],
        connectors: [],
        platforms: ["amber-temple"],
      },
    }),
    gateModule({
      id: "mirror",
      stage: 3,
      key: "environment-worldroot-gate-c-mirror-v1",
      path: "sprites/environment/worldroot-gate-c-v1/living/mirror-living-v1.png?rev=20260830-alignment-v1",
      guidePath: "sprites/environment/worldroot-gate-c-v1/guides/mirror-carrier-v1.png",
      maskPath: "sprites/environment/worldroot-gate-c-v1/guides/mirror-mask-v1.png",
      guideFill: "#263842",
      guideOutline: "#d7efff",
      sourceOffsetYPx: 110,
      geometry: {
        silhouettes: ["mirror-road"],
        connectors: [],
        platforms: ["mirror-road"],
      },
    }),
    gateModule({
      id: "mirror-reflection",
      moduleId: "mirror",
      stage: 3,
      key: "environment-worldroot-gate-c-mirror-reflection-v1",
      path: "sprites/environment/worldroot-gate-c-v1/living/mirror-reflection-living-v1.png?rev=20260830-gate-c-v1",
      guidePath: "sprites/environment/worldroot-gate-c-v1/guides/mirror-reflection-carrier-v1.png",
      maskPath: "sprites/environment/worldroot-gate-c-v1/guides/mirror-reflection-mask-v1.png",
      guideFill: "#263842",
      guideOutline: "#d7efff",
      sourceOffsetYPx: -45,
      geometry: {
        silhouettes: ["mirror-reflection"],
        connectors: ["mirror-drop"],
        platforms: ["mirror-reflection"],
      },
    }),
  ]),
});

export function isWorldrootModuleGateEnabled(
  search = globalThis.location?.search || "",
  config,
) {
  const params = new URLSearchParams(search);
  const enabled = value => config.enableValues.includes(value?.trim().toLowerCase());
  if (!enabled(params.get(config.queryParam))) return false;
  return !config.requiredQueryParam || enabled(params.get(config.requiredQueryParam));
}

export const isWorldrootGateBEnabled = search => (
  isWorldrootModuleGateEnabled(search, WORLDROOT_GATE_B_CONFIG)
);
export const isWorldrootGateCEnabled = search => (
  isWorldrootModuleGateEnabled(search, WORLDROOT_GATE_C_CONFIG)
);

export function getWorldrootModuleGatePreloadAssets(
  search = globalThis.location?.search || "",
  config,
) {
  return isWorldrootModuleGateEnabled(search, config)
    ? config.modules.map(({ key, path }) => ({ key, path }))
    : [];
}

export function resolveWorldrootNativeModuleGeometry(whiteboxConfig, module) {
  const select = (entries, ids) => Array.isArray(ids)
    ? entries.filter(entry => ids.includes(entry.id))
    : entries.filter(entry => entry.moduleId === module.moduleId);
  return Object.freeze({
    polygons: Object.freeze(select(whiteboxConfig.silhouettes, module.geometry?.silhouettes)),
    connectors: Object.freeze(select(whiteboxConfig.connectors, module.geometry?.connectors)),
    platforms: Object.freeze(select(whiteboxConfig.platforms, module.geometry?.platforms)),
  });
}

export function resolveWorldrootNativeModuleBounds(whiteboxConfig, module, config) {
  const { polygons, connectors } = resolveWorldrootNativeModuleGeometry(whiteboxConfig, module);
  if (!polygons.length && !connectors.length) return null;
  const xValues = polygons.flatMap(entry => entry.points.map(point => point.x));
  const yValues = polygons.flatMap(entry => entry.points.map(point => point.y));
  connectors.forEach(connector => connector.points.forEach(point => {
    const radius = connector.widthTiles / 2;
    xValues.push(point.x - radius, point.x + radius);
    yValues.push(point.y - radius, point.y + radius);
  }));
  const tileSize = config.sourceTileSizePx;
  const worldLeftPx = Math.floor(Math.min(...xValues) * tileSize - config.paddingPx);
  const worldTopPx = Math.floor(Math.min(...yValues) * tileSize - config.paddingPx);
  const worldRightPx = Math.ceil(Math.max(...xValues) * tileSize + config.paddingPx);
  const worldBottomPx = Math.ceil(Math.max(...yValues) * tileSize + config.paddingPx);
  const widthPx = worldRightPx - worldLeftPx;
  const heightPx = worldBottomPx - worldTopPx;
  const carrierLeftPx = Math.floor((config.carrier.widthPx - widthPx) / 2);
  const carrierTopPx = Math.floor((config.carrier.heightPx - heightPx) / 2);
  if (carrierLeftPx < 0 || carrierTopPx < 0) {
    throw new Error(`${module.id} does not fit the native Gate ${config.gateLabel} carrier.`);
  }
  return Object.freeze({
    moduleId: module.id,
    worldLeftPx,
    worldTopPx,
    worldRightPx,
    worldBottomPx,
    widthPx,
    heightPx,
    carrierLeftPx,
    carrierTopPx,
  });
}
