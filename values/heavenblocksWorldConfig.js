import { TILE_TYPES } from "./tileTypes.js";

function freezeRect(left, top, width, height) {
  return Object.freeze({ left, top, width, height });
}

function freezePortalSlot(levelId, slotIndex, leftTile, bottomTile, regionId) {
  return Object.freeze({
    id: `v11-level-${levelId}-portal-${slotIndex + 1}`,
    levelId,
    slotIndex,
    regionId,
    leftTile,
    bottomTile,
    widthTiles: 2,
    heightTiles: 2,
  });
}

function freezeGroundPortal(levelId, leftTile, skyArrivalTile, arrivalLabel) {
  const interactionTy = 64;
  return Object.freeze({
    id: `heavenblocks-level-${levelId}-ground-portal`,
    leftTile,
    bottomTile: 65,
    widthTiles: 2,
    heightTiles: 2,
    interactionTiles: Object.freeze([
      Object.freeze({ tx: leftTile, ty: interactionTy }),
      Object.freeze({ tx: leftTile + 1, ty: interactionTy }),
    ]),
    skyArrivalTile: Object.freeze(skyArrivalTile),
    promptLabel: `Enter ${arrivalLabel}`,
    arrivalLabel,
  });
}

const CLOUD_REEF = Object.freeze({
  id: "lower-sky-cloud-reef",
  displayName: "Cloud Reef",
  levelId: 1,
  order: 0,
  bounds: Object.freeze({ left: 4, right: 57, top: 3, bottom: 43 }),
  centerTileX: 30,
  surface: Object.freeze({ baseRow: 14, waveAmplitude: 2, frequency: 0.34, phase: 0.8 }),
  body: Object.freeze({ maxThickness: 28, minThickness: 7, taperPower: 1.55 }),
  baseTileType: TILE_TYPES.CLOUDSTONE,
  oreTileType: TILE_TYPES.STORMGLASS,
  ore: Object.freeze({ chance: 0.115, clusterChance: 0.34, salt: 1117 }),
  rooms: Object.freeze([
    freezeRect(10, 17, 13, 5),
    freezeRect(20, 20, 16, 5),
    freezeRect(33, 23, 14, 6),
    freezeRect(42, 27, 11, 6),
  ]),
  corridors: Object.freeze([
    freezeRect(18, 18, 5, 3),
    freezeRect(31, 22, 6, 3),
    freezeRect(42, 24, 4, 5),
  ]),
  arrivalTile: Object.freeze({ tx: 11, ty: 12 }),
  lockedFallbackTile: Object.freeze({ tx: 95, ty: 64 }),
  shrine: Object.freeze({ tx: 48, floorTy: 33, interactionRadiusTiles: 3 }),
  relicCache: Object.freeze({ tx: 40, ty: 26 }),
  barrier: null,
  minimumSolidTiles: 650,
  propAnchors: Object.freeze([
    Object.freeze({ kind: "flora", tx: 9, ty: 13, scale: 1.3 }),
    Object.freeze({ kind: "flora", tx: 25, ty: 12, scale: 1.1 }),
    Object.freeze({ kind: "crystal", tx: 36, ty: 22, scale: 1.2 }),
    Object.freeze({ kind: "capstone", tx: 52, ty: 16, scale: 0.95 }),
  ]),
});

const HALO_BASTION = Object.freeze({
  id: "angel-heavenblock",
  displayName: "Halo Bastion",
  levelId: 1,
  order: 1,
  bounds: Object.freeze({ left: 63, right: 117, top: 2, bottom: 50 }),
  centerTileX: 90,
  surface: Object.freeze({ baseRow: 18, waveAmplitude: 2, frequency: 0.29, phase: 1.7 }),
  body: Object.freeze({ maxThickness: 34, minThickness: 8, taperPower: 1.4 }),
  baseTileType: TILE_TYPES.HALOSTONE,
  oreTileType: TILE_TYPES.LUMENITE,
  ore: Object.freeze({ chance: 0.12, clusterChance: 0.31, salt: 2203 }),
  rooms: Object.freeze([
    freezeRect(68, 21, 13, 6),
    freezeRect(78, 24, 16, 6),
    freezeRect(91, 27, 14, 6),
    freezeRect(101, 31, 12, 7),
  ]),
  corridors: Object.freeze([
    freezeRect(76, 23, 5, 3),
    freezeRect(89, 26, 6, 3),
    freezeRect(100, 29, 5, 4),
  ]),
  arrivalTile: Object.freeze({ tx: 68, ty: 16 }),
  lockedFallbackTile: Object.freeze({ tx: 55, ty: 12 }),
  shrine: Object.freeze({ tx: 107, floorTy: 38, interactionRadiusTiles: 3 }),
  relicCache: Object.freeze({ tx: 98, ty: 30 }),
  barrier: Object.freeze({ tx: 65, topTy: 14, height: 5 }),
  minimumSolidTiles: 850,
  propAnchors: Object.freeze([
    Object.freeze({ kind: "flora", tx: 69, ty: 17, scale: 1.15 }),
    Object.freeze({ kind: "crystal", tx: 82, ty: 23, scale: 1.15 }),
    Object.freeze({ kind: "flora", tx: 101, ty: 16, scale: 1.2 }),
    Object.freeze({ kind: "capstone", tx: 114, ty: 20, scale: 1.05 }),
  ]),
});

const ECLIPSE_SCAR = Object.freeze({
  id: "devil-eclipse-scar",
  displayName: "Eclipse Scar",
  levelId: 2,
  order: 2,
  bounds: Object.freeze({ left: 136, right: 219, top: 1, bottom: 56 }),
  centerTileX: 177,
  surface: Object.freeze({ baseRow: 12, waveAmplitude: 3, frequency: 0.24, phase: 2.4 }),
  body: Object.freeze({ maxThickness: 45, minThickness: 10, taperPower: 1.32 }),
  baseTileType: TILE_TYPES.CINDERSTONE,
  oreTileType: TILE_TYPES.HELLGLASS,
  ore: Object.freeze({ chance: 0.135, clusterChance: 0.38, salt: 3301 }),
  rooms: Object.freeze([
    freezeRect(142, 16, 16, 6),
    freezeRect(155, 20, 18, 6),
    freezeRect(169, 24, 19, 7),
    freezeRect(185, 29, 18, 7),
    freezeRect(200, 34, 14, 8),
  ]),
  corridors: Object.freeze([
    freezeRect(153, 18, 6, 4),
    freezeRect(167, 22, 7, 4),
    freezeRect(183, 27, 7, 4),
    freezeRect(198, 32, 7, 4),
  ]),
  arrivalTile: Object.freeze({ tx: 142, ty: 9 }),
  lockedFallbackTile: Object.freeze({ tx: 198, ty: 64 }),
  shrine: Object.freeze({ tx: 207, floorTy: 42, interactionRadiusTiles: 3 }),
  relicCache: Object.freeze({ tx: 192, ty: 32 }),
  barrier: Object.freeze({ tx: 138, topTy: 7, height: 5 }),
  minimumSolidTiles: 1500,
  propAnchors: Object.freeze([
    Object.freeze({ kind: "flora", tx: 144, ty: 11, scale: 1.25 }),
    Object.freeze({ kind: "crystal", tx: 166, ty: 22, scale: 1.25 }),
    Object.freeze({ kind: "flora", tx: 191, ty: 12, scale: 1.1 }),
    Object.freeze({ kind: "capstone", tx: 215, ty: 18, scale: 1.15 }),
  ]),
});

const REGIONS = Object.freeze([CLOUD_REEF, HALO_BASTION, ECLIPSE_SCAR]);

export const HEAVENBLOCKS_WORLD_CONFIG = Object.freeze({
  version: 2,
  enabled: true,
  tileSize: 94,
  dividerTileX: 132,
  topAirRows: 65,
  barrierTileType: TILE_TYPES.HEAVEN_BARRIER,
  safetyFloorHalfWidthTiles: 3,
  regions: REGIONS,
  levels: Object.freeze([
    Object.freeze({
      levelId: 1,
      regionIds: Object.freeze(["lower-sky-cloud-reef", "angel-heavenblock"]),
      floorRow: 14,
      pillarTileX: 88,
      pillarTileY: 17,
      groundPortal: freezeGroundPortal(1, 0, CLOUD_REEF.arrivalTile, "Cloud Reef"),
      portalSlots: Object.freeze([
        freezePortalSlot(1, 0, 11, 14, "lower-sky-cloud-reef"),
        freezePortalSlot(1, 1, 45, 16, "lower-sky-cloud-reef"),
        freezePortalSlot(1, 2, 68, 18, "angel-heavenblock"),
        freezePortalSlot(1, 3, 108, 20, "angel-heavenblock"),
      ]),
    }),
    Object.freeze({
      levelId: 2,
      regionIds: Object.freeze(["devil-eclipse-scar"]),
      floorRow: 12,
      pillarTileX: 177,
      pillarTileY: 10,
      groundPortal: freezeGroundPortal(2, 187, ECLIPSE_SCAR.arrivalTile, "Eclipse Scar"),
      portalSlots: Object.freeze([
        freezePortalSlot(2, 0, 142, 12, "devil-eclipse-scar"),
        freezePortalSlot(2, 1, 162, 13, "devil-eclipse-scar"),
        freezePortalSlot(2, 2, 187, 13, "devil-eclipse-scar"),
        freezePortalSlot(2, 3, 211, 15, "devil-eclipse-scar"),
      ]),
    }),
  ]),
});

export const HEAVENBLOCKS_MATERIAL_TILE_TYPES = Object.freeze([
  TILE_TYPES.CLOUDSTONE,
  TILE_TYPES.STORMGLASS,
  TILE_TYPES.HALOSTONE,
  TILE_TYPES.LUMENITE,
  TILE_TYPES.CINDERSTONE,
  TILE_TYPES.HELLGLASS,
]);

const MATERIAL_TYPE_SET = new Set(HEAVENBLOCKS_MATERIAL_TILE_TYPES);

export function getHeavenblocksRegionById(regionId) {
  return REGIONS.find((region) => region.id === regionId) || null;
}

export function getHeavenblocksRegionAt(tx, ty) {
  return REGIONS.find((region) => (
    tx >= region.bounds.left && tx <= region.bounds.right
    && ty >= region.bounds.top && ty <= region.bounds.bottom
  )) || null;
}

export function isHeavenblocksMaterialTileType(tileType) {
  return MATERIAL_TYPE_SET.has(tileType);
}

export function isHeavenblocksSafetyFloor(tx, ty) {
  const halfWidth = HEAVENBLOCKS_WORLD_CONFIG.safetyFloorHalfWidthTiles;
  return REGIONS.some((region) => (
    (
      ty === region.arrivalTile.ty + 1
      && Math.abs(tx - region.arrivalTile.tx) <= halfWidth
    )
    || (
      ty === region.shrine.floorTy
      && Math.abs(tx - region.shrine.tx) <= halfWidth
    )
  ));
}
