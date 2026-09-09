// Review-only Worldroot collision whitebox. Final art must conform to this geometry.

const point = (x, y) => Object.freeze({ x, y });
const platform = (id, moduleId, stage, leftTile, rightTile, yTile) => Object.freeze({
  id, moduleId, stage, leftTile, rightTile, yTile,
});
const polygon = (id, moduleId, stage, points) => Object.freeze({
  id,
  moduleId,
  stage,
  points: Object.freeze(points.map(([x, y]) => point(x, y))),
});
const connector = (id, moduleId, stage, widthTiles, points) => Object.freeze({
  id,
  moduleId,
  stage,
  widthTiles,
  points: Object.freeze(points.map(([x, y]) => point(x, y))),
});

const MODULES = Object.freeze([
  Object.freeze({ id: "rootways", label: "ROOTWAYS / HEARTH", stage: 0, color: 0x9b72da, labelAt: point(19.1, 57.9) }),
  Object.freeze({ id: "cobalt", label: "COBALT AQUIFER", stage: 1, color: 0x4bc5f4, labelAt: point(29.0, 58.2) }),
  Object.freeze({ id: "amber", label: "AMBER FAULT", stage: 2, color: 0xe5a64a, labelAt: point(40.1, 54.8) }),
  Object.freeze({ id: "mirror", label: "MIRRORSTONE", stage: 3, color: 0xb9d7e8, labelAt: point(50.1, 48.8) }),
  Object.freeze({ id: "starfire", label: "STARFIRE / TITAN OVERLOOK", stage: 4, color: 0xf06d4f, labelAt: point(58.6, 59.0) }),
  Object.freeze({ id: "crown", label: "CROWN CONVERGENCE", stage: 5, color: 0x76e6ff, labelAt: point(52.1, 45.9) }),
]);

// Every collision line is the literal flat top edge of its matching polygon.
const PLATFORMS = Object.freeze([
  platform("root-loft", "rootways", 0, 19.35, 24.75, 59.35),
  platform("root-talent", "rootways", 0, 23.85, 27.05, 62.25),
  platform("cobalt-road", "cobalt", 1, 26.35, 39.60, 57.10),
  platform("cobalt-nook", "cobalt", 1, 29.55, 34.90, 55.55),
  platform("amber-road", "amber", 2, 36.55, 51.20, 53.70),
  platform("amber-temple", "amber", 2, 41.15, 46.80, 51.95),
  platform("mirror-road", "mirror", 3, 47.25, 62.45, 49.85),
  platform("mirror-reflection", "mirror", 3, 50.65, 56.85, 52.35),
  platform("starfire-overlook", "starfire", 4, 57.10, 70.20, 58.00),
  platform("starfire-tip", "starfire", 4, 64.15, 69.65, 55.20),
  platform("crown-approach", "crown", 5, 50.45, 65.95, 46.85),
  platform("crown-perch", "crown", 6, 55.10, 62.35, 44.75),
]);

const SILHOUETTES = Object.freeze([
  polygon("root-mass", "rootways", 0, [[18.60, 65], [18.82, 62.4], [19.35, 59.35], [24.75, 59.35], [25.25, 60.1], [27.05, 62.25], [27.08, 65]]),
  polygon("root-loft", "rootways", 0, [[19.35, 59.35], [24.75, 59.35], [24.1, 60.2], [22.5, 60.65], [20.2, 60.25]]),
  polygon("root-talent", "rootways", 0, [[23.85, 62.25], [27.05, 62.25], [26.72, 63.2], [25.15, 63.65], [24.15, 63.05]]),
  polygon("cobalt-road", "cobalt", 1, [[26.35, 57.10], [39.60, 57.10], [38.95, 58.0], [35.8, 58.45], [31.8, 58.2], [28.1, 58.75], [26.55, 58.05]]),
  polygon("cobalt-nook", "cobalt", 1, [[29.55, 55.55], [34.90, 55.55], [34.2, 56.35], [31.5, 56.55], [29.85, 56.15]]),
  polygon("amber-road", "amber", 2, [[36.55, 53.70], [51.20, 53.70], [50.2, 54.55], [46.2, 54.85], [42.5, 54.5], [38.0, 55.0], [36.8, 54.35]]),
  polygon("amber-temple", "amber", 2, [[41.15, 51.95], [46.80, 51.95], [46.0, 52.75], [43.4, 53.0], [41.45, 52.55]]),
  polygon("mirror-road", "mirror", 3, [[47.25, 49.85], [62.45, 49.85], [61.3, 50.75], [56.8, 51.05], [52.0, 50.65], [48.0, 51.1]]),
  polygon("mirror-reflection", "mirror", 3, [[50.65, 52.35], [56.85, 52.35], [56.1, 53.1], [53.1, 53.3], [50.9, 52.9]]),
  polygon("starfire-overlook", "starfire", 4, [[57.10, 58.00], [70.20, 58.00], [69.0, 58.75], [65.1, 59.10], [61.2, 58.75], [57.45, 59.05]]),
  polygon("starfire-tip", "starfire", 4, [[64.15, 55.20], [69.65, 55.20], [69.0, 56.0], [66.5, 56.25], [64.4, 55.75]]),
  polygon("crown-approach", "crown", 5, [[50.45, 46.85], [65.95, 46.85], [64.7, 47.75], [60.2, 48.1], [55.2, 47.65], [51.0, 48.05]]),
  polygon("crown-perch", "crown", 6, [[55.10, 44.75], [62.35, 44.75], [61.5, 45.55], [58.2, 45.75], [55.4, 45.3]]),
]);

const CONNECTORS = Object.freeze([
  connector("root-spine", "rootways", 0, 1.45, [[21.5, 64.7], [21.8, 61.1], [23.4, 59.6]]),
  connector("root-cobalt-seat", "cobalt", 1, 0.62, [[24.55, 59.35], [25.15, 59.32], [25.8, 59.2]]),
  connector("root-to-cobalt", "cobalt", 1, 0.72, [[25.8, 59.0], [28.2, 57.55], [31.2, 56.95]]),
  connector("cobalt-fork", "cobalt", 1, 0.62, [[31.2, 57.2], [31.8, 56.1], [32.7, 55.7]]),
  connector("cobalt-to-amber", "amber", 2, 0.78, [[34.8, 56.9], [38.7, 54.2], [43.0, 53.7]]),
  connector("amber-fork", "amber", 2, 0.62, [[43.2, 53.8], [43.8, 52.5], [44.2, 52.0]]),
  connector("amber-to-mirror", "mirror", 3, 0.82, [[46.0, 53.6], [49.5, 51.1], [53.4, 49.9]]),
  connector("mirror-drop", "mirror", 3, 0.58, [[53.4, 50.0], [53.6, 51.3], [53.8, 52.4]]),
  connector("mirror-to-starfire", "starfire", 4, 0.78, [[57.0, 50.0], [60.5, 54.2], [64.0, 58.00]]),
  connector("starfire-fork", "starfire", 4, 0.60, [[66.2, 58.00], [66.8, 56.4], [67.0, 55.20]]),
  connector("mirror-to-crown", "crown", 5, 0.88, [[53.0, 49.8], [55.2, 47.8], [58.0, 46.85]]),
  connector("crown-rise", "crown", 6, 0.72, [[58.1, 46.9], [58.5, 45.5], [58.9, 44.75]]),
]);

const SOCKET_ROWS = Object.freeze({
  rootways: Object.freeze([[19.7, 58.95], [20.6, 58.95], [21.5, 58.95], [22.4, 58.95], [23.4, 58.95], [24.3, 58.95], [24.3, 61.85], [25.1, 61.85], [25.9, 61.85], [26.7, 61.85]]),
  cobalt: Object.freeze([[27.2, 56.7], [28.4, 56.7], [30.0, 55.15], [31.0, 55.15], [32.0, 55.15], [33.0, 55.15], [34.0, 55.15], [35.1, 56.7], [36.5, 56.7], [38.1, 56.7]]),
  amber: Object.freeze([[37.5, 53.3], [39.0, 53.3], [41.0, 53.3], [42.0, 51.55], [43.0, 51.55], [44.0, 51.55], [45.0, 51.55], [46.0, 51.55], [48.2, 53.3], [50.0, 53.3]]),
  mirror: Object.freeze([[48.2, 49.45], [49.7, 49.45], [51.2, 49.45], [52.7, 49.45], [54.2, 49.45], [51.4, 51.95], [52.6, 51.95], [53.8, 51.95], [55.0, 51.95], [60.8, 49.45]]),
  starfire: Object.freeze([[58.0, 57.60], [59.5, 57.60], [61.0, 57.60], [62.5, 57.60], [64.0, 57.60], [65.0, 54.80], [66.0, 54.80], [67.0, 54.80], [68.0, 54.80], [69.2, 57.60]]),
});

const STAGE_BY_MODULE = Object.freeze(Object.fromEntries(MODULES.map(entry => [entry.id, entry.stage])));
const STAR_SOCKETS = Object.freeze(Object.entries(SOCKET_ROWS).flatMap(([moduleId, coordinates]) => (
  coordinates.map(([x, y], index) => Object.freeze({
    id: `${moduleId}-star-${String(index + 1).padStart(2, "0")}`,
    moduleId,
    stage: STAGE_BY_MODULE[moduleId],
    x,
    y,
  }))
)));

export const WORLDROOT_WHITEBOX_CONFIG = Object.freeze({
  queryParam: "worldrootWhitebox",
  enableValues: Object.freeze(["1", "true", "on", "review"]),
  bounds: Object.freeze({ leftTile: 18.60, rightTile: 70.20, topTile: 43.20, bottomTile: 65 }),
  modules: MODULES,
  platforms: PLATFORMS,
  silhouettes: SILHOUETTES,
  connectors: CONNECTORS,
  starSockets: STAR_SOCKETS,
  systemSockets: Object.freeze([
    Object.freeze({ id: "campfire-current", label: "CAMPFIRE CURRENT", moduleId: "rootways", stage: 0, x: 21.5, y: 63.85 }),
    Object.freeze({ id: "talent-access", label: "TALENT ACCESS", moduleId: "rootways", stage: 0, x: 25.45, y: 61.70 }),
    Object.freeze({ id: "gp-current", label: "GP CURRENT", moduleId: "cobalt", stage: 1, x: 37.9, y: 56.45 }),
    Object.freeze({ id: "titan-chorus", label: "TITAN CHORUS", moduleId: "starfire", stage: 4, x: 66.3, y: 57.50 }),
    Object.freeze({ id: "crown-star", label: "BLUE CROWN STAR", moduleId: "crown", stage: 6, x: 58.9, y: 43.35 }),
  ]),
  interaction: Object.freeze({
    rootTalent: point(25.45, 61.70),
    crownStar: point(58.9, 43.35),
  }),
  clearance: Object.freeze({
    merchantGapTiles: 0.2,
    titanGroundGapTiles: 0.5,
    titanCanopyAirGapTiles: 1.5,
    titanCorridorStartTile: 27.60,
    lowestCanopyBottomTile: 59.10,
  }),
  presentation: Object.freeze({
    silhouetteDepth: 3.55,
    outlineDepth: 3.56,
    markerDepth: 19.05,
    labelDepth: 19.06,
    activeFill: 0x101a2d,
    sleepingFill: 0x111522,
    activeAlpha: 0.94,
    sleepingAlpha: 0.23,
    outlineAlpha: 0.95,
    sleepingOutlineAlpha: 0.28,
    collisionColor: 0x78f2ff,
    collisionWidthPx: 4,
    socketRadiusTiles: 0.105,
    systemSocketRadiusTiles: 0.22,
    guideColor: 0xff557a,
    guideAlpha: 0.78,
    labelFontSizePx: 15,
    noteFontSizePx: 12,
  }),
  copy: Object.freeze({
    mode: "WORLDROOT GATE A / COLLISION WHITEBOX",
    legend: "SOLID = CURRENT GROWTH   FAINT = FUTURE   CYAN = WALKABLE TOP   HOLLOW = EMPTY SOCKET",
  }),
});

export function isWorldrootWhiteboxEnabled(
  search = globalThis.location?.search || "",
  config = WORLDROOT_WHITEBOX_CONFIG,
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  return config.enableValues.includes(value);
}
