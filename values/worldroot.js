// Worldroot layout and convergence rules. Existing gameplay systems remain authoritative.

const point = (x, y) => Object.freeze({ x, y });
const rect = (x, y, width, height) => Object.freeze({ x, y, width, height });

const REGION_LAYOUTS = Object.freeze([
  Object.freeze({
    id: "surface-entry",
    label: "ROOTWAYS",
    color: 0x8e62d8,
    mask: rect(0.00, 0.43, 0.34, 0.50),
    path: Object.freeze([
      point(0.19, 0.83), point(0.08, 0.70), point(0.04, 0.58),
      point(0.12, 0.52), point(0.24, 0.58), point(0.31, 0.70),
    ]),
  }),
  Object.freeze({
    id: "level1-blue",
    label: "COBALT AQUIFER",
    color: 0x49bfff,
    mask: rect(0.23, 0.34, 0.30, 0.38),
    path: Object.freeze([
      point(0.28, 0.62), point(0.32, 0.54), point(0.38, 0.47),
      point(0.46, 0.49), point(0.50, 0.57),
    ]),
  }),
  Object.freeze({
    id: "level1-amber",
    label: "AMBER FAULT",
    color: 0xe3a13a,
    mask: rect(0.42, 0.31, 0.31, 0.39),
    path: Object.freeze([
      point(0.45, 0.60), point(0.50, 0.52), point(0.55, 0.42),
      point(0.64, 0.40), point(0.70, 0.48),
    ]),
  }),
  Object.freeze({
    id: "level1-silver",
    label: "MIRRORSTONE",
    color: 0xb8d0e4,
    mask: rect(0.47, 0.52, 0.38, 0.31),
    path: Object.freeze([
      point(0.50, 0.68), point(0.58, 0.70), point(0.66, 0.67),
      point(0.74, 0.70), point(0.82, 0.68),
    ]),
  }),
  Object.freeze({
    id: "level1-magma",
    label: "STARFIRE RIFT",
    color: 0xff673d,
    mask: rect(0.72, 0.45, 0.28, 0.45),
    path: Object.freeze([
      point(0.75, 0.61), point(0.82, 0.63), point(0.88, 0.67),
      point(0.95, 0.64), point(0.98, 0.58),
    ]),
  }),
]);

const TERRACES = Object.freeze([
  Object.freeze({ id: "root-hearth", left: 0.14, right: 0.29, y: 0.872, stage: 0 }),
  Object.freeze({ id: "rootways-road", left: 0.03, right: 0.31, y: 0.625, stage: 1 }),
  Object.freeze({ id: "cobalt-road", left: 0.26, right: 0.49, y: 0.495, stage: 2 }),
  Object.freeze({ id: "amber-road", left: 0.45, right: 0.68, y: 0.425, stage: 3 }),
  Object.freeze({ id: "mirror-road", left: 0.49, right: 0.82, y: 0.700, stage: 3 }),
  Object.freeze({ id: "starfire-road", left: 0.73, right: 0.985, y: 0.650, stage: 4 }),
  Object.freeze({ id: "crown-road", left: 0.68, right: 0.94, y: 0.430, stage: 6 }),
]);

export const WORLDROOT_CONFIG = Object.freeze({
  enabledByDefault: true,
  queryParam: "worldrootPillar",
  disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  assets: Object.freeze({
    living: Object.freeze({
      key: "environment-worldroot-living-v1",
      path: "sprites/environment/worldroot-v1/worldroot-living-v1.png",
    }),
    consumed: Object.freeze({
      key: "environment-worldroot-consumed-v1",
      path: "sprites/environment/worldroot-v1/worldroot-consumed-v1.png",
    }),
  }),
  source: Object.freeze({ width: 1536, height: 1024 }),
  placement: Object.freeze({
    displayWidthTiles: 38,
    hearthTileX: 23.5,
    hearthSourceX: 0.217,
    surfaceSourceY: 0.872,
    depth: 8,
    overlayDepth: 11,
    promptDepth: 22,
  }),
  reveal: Object.freeze({
    bodyLeft: 0.025,
    bodyTop: 0.28,
    bodyBottom: 0.99,
    root: rect(0.06, 0.62, 0.34, 0.37),
    crown: rect(0.64, 0.00, 0.36, 0.44),
    rightByStage: Object.freeze([0.34, 0.43, 0.54, 0.72, 0.88, 0.96, 1]),
  }),
  regions: REGION_LAYOUTS,
  terraces: TERRACES,
  interaction: Object.freeze({
    proximityTiles: 1.75,
    verticalTiles: 1.4,
    rootTalent: point(0.217, 0.858),
    crownStar: point(0.82, 0.31),
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
  syncIntervalMs: 350,
  endgame: Object.freeze({
    requiredKnownStars: 50,
    requiredRegions: 5,
    requiredCompletedTalentBranches: 3,
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
  const scaled = Math.max(0, Math.min(1, progress)) * (path.length - 1);
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
