// Worldroot layout and convergence rules. Existing gameplay systems remain authoritative.

const point = (x, y) => Object.freeze({ x, y });
const rect = (x, y, width, height) => Object.freeze({ x, y, width, height });
const terrace = (id, stage, left, right, y, dropGroup = null) => Object.freeze({
  id,
  stage,
  left,
  right,
  y,
  ...(dropGroup ? { dropGroup } : {}),
});

const REGION_LAYOUTS = Object.freeze([
  Object.freeze({
    id: "surface-entry",
    label: "ROOTWAYS",
    color: 0x8e62d8,
    mask: rect(0.00, 0.28, 0.28, 0.69),
    path: Object.freeze([
      point(0.125, 0.94), point(0.15, 0.75), point(0.14, 0.52),
      point(0.18, 0.35), point(0.28, 0.38),
    ]),
  }),
  Object.freeze({
    id: "level1-blue",
    label: "COBALT AQUIFER",
    color: 0x49bfff,
    mask: rect(0.11, 0.18, 0.35, 0.52),
    path: Object.freeze([
      point(0.22, 0.64), point(0.28, 0.56), point(0.20, 0.37),
      point(0.34, 0.32), point(0.40, 0.47),
    ]),
  }),
  Object.freeze({
    id: "level1-amber",
    label: "AMBER FAULT",
    color: 0xe3a13a,
    mask: rect(0.28, 0.18, 0.34, 0.42),
    path: Object.freeze([
      point(0.35, 0.55), point(0.42, 0.47), point(0.40, 0.30),
      point(0.48, 0.25), point(0.55, 0.38),
    ]),
  }),
  Object.freeze({
    id: "level1-silver",
    label: "MIRRORSTONE",
    color: 0xb8d0e4,
    mask: rect(0.52, 0.24, 0.27, 0.35),
    path: Object.freeze([
      point(0.54, 0.48), point(0.60, 0.38), point(0.68, 0.38),
      point(0.73, 0.28), point(0.76, 0.42),
    ]),
  }),
  Object.freeze({
    id: "level1-magma",
    label: "STARFIRE RIFT",
    color: 0xff673d,
    mask: rect(0.72, 0.28, 0.28, 0.32),
    path: Object.freeze([
      point(0.74, 0.48), point(0.82, 0.40), point(0.90, 0.36),
      point(0.94, 0.46), point(0.88, 0.55),
    ]),
  }),
]);

const CURRENT_ROUTES = Object.freeze([
  Object.freeze({
    id: "root-hearth",
    point: point(0.125, 0.94),
    color: 0xff7f45,
    seed: 0,
  }),
  Object.freeze({
    id: "world-memory",
    point: point(0.48, 0.25),
    color: 0x76d88c,
    seed: 1.31,
  }),
  Object.freeze({
    id: "star-memory",
    point: point(0.35, 0.47),
    color: 0x83ecff,
    seed: 2.62,
  }),
  Object.freeze({
    id: "celestial-mastery",
    point: point(0.23, 0.90),
    color: 0xdd66ff,
    seed: 3.93,
  }),
  Object.freeze({
    id: "titan-chorus",
    point: point(0.91, 0.48),
    color: 0xc878ff,
    seed: 5.24,
  }),
]);

// These contact lines are authored against worldroot-living-v3.png. Each line
// sits on a thick visible branch top; none are free-floating helper platforms.
const TERRACES = Object.freeze([
  terrace("root-balcony", 1, 0.075, 0.300, 0.647),
  terrace("cobalt-lower", 1, 0.260, 0.440, 0.558, "lower-road"),
  terrace("amber-lower", 2, 0.420, 0.630, 0.565, "lower-road"),
  terrace("memory-road-west", 2, 0.240, 0.520, 0.462, "memory-road"),
  terrace("memory-road-east", 2, 0.520, 0.780, 0.468, "memory-road"),
  terrace("titan-overlook", 3, 0.720, 0.960, 0.535),
  terrace("fungal-canopy", 3, 0.120, 0.300, 0.352),
  terrace("aquifer-canopy", 3, 0.270, 0.470, 0.325),
  terrace("amber-temple", 4, 0.320, 0.580, 0.268),
  terrace("silver-spine", 4, 0.540, 0.720, 0.365),
  terrace("crown-approach", 5, 0.600, 0.860, 0.255),
  terrace("upper-crown-bough", 6, 0.500, 0.660, 0.185),
  terrace("red-high-road", 5, 0.780, 0.920, 0.345),
]);

export const WORLDROOT_CONFIG = Object.freeze({
  enabledByDefault: true,
  queryParam: "worldrootPillar",
  disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  assets: Object.freeze({
    living: Object.freeze({
      key: "environment-worldroot-living-v3",
      path: "sprites/environment/worldroot-v3/worldroot-living-v3.png?rev=20260830-elevated-v2",
    }),
    consumed: Object.freeze({
      key: "environment-worldroot-consumed-v3",
      path: "sprites/environment/worldroot-v3/worldroot-consumed-v3.png?rev=20260830-elevated-v2",
    }),
  }),
  source: Object.freeze({ width: 1536, height: 1024 }),
  placement: Object.freeze({
    displayWidthTiles: 28,
    maximumSourceScale: 1.75,
    hearthTileX: 21.5,
    hearthSourceX: 0.125,
    surfaceSourceY: 0.96,
    depth: 3.5,
    overlayDepth: 4.5,
    promptDepth: 22,
  }),
  reveal: Object.freeze({
    hardCropEnabled: false,
    bodyLeft: 0.025,
    bodyTop: 0.4,
    bodyBottom: 0.99,
    root: rect(0.00, 0.28, 0.30, 0.70),
    crown: rect(0.58, 0.00, 0.42, 0.32),
    rightByStage: Object.freeze([0.34, 0.43, 0.54, 0.72, 0.88, 0.96, 1]),
  }),
  consumedMask: Object.freeze({
    strokeWidthRatio: 0.32,
    nodeRadiusRatio: 0.18,
  }),
  currents: Object.freeze({
    crownPoint: point(0.75, 0.15),
    routes: CURRENT_ROUTES,
    lineAlpha: 0.12,
    lineWidthPx: 1.4,
  }),
  regions: REGION_LAYOUTS,
  terraces: TERRACES,
  traversal: Object.freeze({
    enabled: true,
    availableAcrossGrowth: true,
  }),
  clearance: Object.freeze({
    visibleLeftSourceX: 0.02,
    groundedFootprintRightSourceX: 0.315,
    titanCorridorStartSourceX: 0.28,
    lowestElevatedDetailSourceY: 0.665,
    minimumTitanAirGapTiles: 1,
  }),
  interaction: Object.freeze({
    proximityTiles: 1.75,
    verticalTiles: 1.4,
    rootHearth: point(0.125, 0.94),
    // The talent shrine is a separate authored alcove three tiles east of the
    // Campfire socket, so both E interactions remain readable and reachable.
    rootTalent: point(0.23, 0.92),
    rootProximityTiles: 1.8,
    rootVerticalTiles: 2,
    crownStar: point(0.75, 0.20),
    crownProximityTiles: 4,
  }),
  markers: Object.freeze({
    starRadiusPx: 5,
    consumedRadiusPx: 6.5,
    biomeRadiusPx: 10,
    titanRadiusPx: 8,
    talentRadiusPx: 7,
    idlePulsePeriodMs: 1700,
    activeTitanPulsePeriodMs: 760,
    maximumArrivalQueue: 12,
    arrivalDurationMs: 1150,
    arrivalStaggerMs: 220,
  }),
  motion: Object.freeze({
    revealDurationMs: 1350,
    crownPulsePeriodMs: 1380,
    gpPulsePeriodMs: 1850,
    gpRoute: Object.freeze([
      point(0.125, 0.94),
      point(0.24, 0.55),
      point(0.48, 0.38),
      point(0.70, 0.26),
    ]),
  }),
  feedback: Object.freeze({
    starMemoryDurationMs: 2200,
    titanMemoryDurationMs: 2600,
    crownDormantDurationMs: 5200,
    crownReadyDurationMs: 4200,
  }),
  syncIntervalMs: 350,
  endgame: Object.freeze({
    requiredKnownStars: 50,
    requiredRegions: 5,
    requiredCompletedTalentBranches: 3,
    talentBranchIds: Object.freeze([
      "wayward-star",
      "hollow-sun",
      "comet-engine",
    ]),
    requiredCampfireLevel: 10,
    requiredTitans: 25,
    worldrootTitanId: "worldroot-titan",
  }),
  colors: Object.freeze({
    sleeping: 0x263443,
    intact: 0x83ecff,
    consumed: 0x160910,
    scar: 0xd35b78,
    mixed: 0x9f738c,
    crownDormant: 0x70bce8,
    crownReady: 0xc7fbff,
    warmth: 0xff7f45,
    inspiration: 0x69baff,
    focus: 0xdd66ff,
    talentBranches: Object.freeze({
      "wayward-star": 0x75d8ff,
      "hollow-sun": 0xca72ff,
      "comet-engine": 0xffad5c,
    }),
  }),
  copy: Object.freeze({
    rootPrompt: "Open Celestial Talents",
    biomePrompt: "Inspect this World Memory",
    starPrompt: "Open this Star territory on the M map",
    titanPrompt: "Open this Titan Memory",
    crownDormantPrompt: "Inspect the unreachable Crown Star",
    crownReadyPrompt: "Touch the Crown Star • Begin Endgame",
    crownDormantTitle: "THE CROWN STAR IS STILL BEYOND REACH",
    crownReadyTitle: "THE WORLDROOT HAS REACHED THE CROWN STAR",
    unknownStarLabel: "Unknown Star Signal",
  }),
});

export function isWorldrootEnabled(
  search = globalThis.location?.search || "",
  config = WORLDROOT_CONFIG,
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.disabledValues.includes(value)) return false;
  return config.enabledByDefault !== false;
}

export function sampleWorldrootPath(path, progress) {
  if (!Array.isArray(path) || path.length === 0) return point(0.5, 0.5);
  if (path.length === 1) return path[0];
  const numericProgress = Number(progress);
  const safeProgress = Number.isFinite(numericProgress)
    ? Math.max(0, Math.min(1, numericProgress))
    : 0;
  const scaled = safeProgress * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const first = path[index];
  const second = path[index + 1];
  return point(
    first.x + (second.x - first.x) * local,
    first.y + (second.y - first.y) * local,
  );
}

export function resolveWorldrootGrowthStage(snapshot) {
  if (!snapshot || snapshot.knownStarCount <= 0) return 0;
  if (snapshot.endgameReady === true) return 6;
  if (snapshot.awakeRegionCount < 2) return 1;
  if (snapshot.awakeRegionCount < 3 || snapshot.knownStarCount < 10) return 2;
  if (snapshot.awakeRegionCount < 5) return 3;
  if (
    snapshot.titanCount < 5
    || snapshot.talentRootCount < 1
    || snapshot.campfireLevel < 3
  ) return 4;
  return 5;
}
