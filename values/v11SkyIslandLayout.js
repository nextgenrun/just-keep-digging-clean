const SOURCE_TMX =
  "exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx";

function freezeSlots(levelId, specs) {
  return Object.freeze(specs.map((spec, slotIndex) => Object.freeze({
    id: `v11-level-${levelId}-portal-${slotIndex + 1}`,
    levelId,
    slotIndex,
    regionId: spec.regionId,
    leftTile: spec.leftTile,
    bottomTile: spec.bottomTile,
    widthTiles: 2,
    heightTiles: 2,
  })));
}

function freezeGroundPortal(
  levelId,
  leftTile,
  skyArrivalTile,
  arrivalLabel,
) {
  const interactionTy = 64;
  return Object.freeze({
    id: `v11-level-${levelId}-ground-portal`,
    leftTile,
    bottomTile: 65,
    widthTiles: 2,
    heightTiles: 2,
    interactionTiles: Object.freeze([
      Object.freeze({ tx: leftTile, ty: interactionTy }),
      Object.freeze({ tx: leftTile + 1, ty: interactionTy }),
    ]),
    skyArrivalTile: Object.freeze({ ...skyArrivalTile }),
    promptLabel: `Teleport to ${arrivalLabel}`,
    arrivalLabel,
  });
}

export const V11_SKY_ISLAND_LAYOUT = Object.freeze({
  enabled: true,
  source: SOURCE_TMX,
  tileSize: 94,
  dividerTileX: 132,
  groundRow: 65,
  levels: Object.freeze([
    Object.freeze({
      levelId: 1,
      leftTile: 4,
      bottomTile: 51,
      widthTiles: 114,
      heightTiles: 49,
      floorRow: 14,
      pillarTileX: 88,
      pillarTileY: 17,
      groundPortal: freezeGroundPortal(
        1,
        0,
        { tx: 11, ty: 12 },
        "Level 1 Cloud Reef",
      ),
      portalSlots: freezeSlots(1, [
        {
          leftTile: 11,
          bottomTile: 14,
          regionId: "lower-sky-cloud-reef",
        },
        {
          leftTile: 45,
          bottomTile: 16,
          regionId: "lower-sky-cloud-reef",
        },
        {
          leftTile: 68,
          bottomTile: 18,
          regionId: "angel-heavenblock",
        },
        {
          leftTile: 108,
          bottomTile: 20,
          regionId: "angel-heavenblock",
        },
      ]),
    }),
    Object.freeze({
      levelId: 2,
      leftTile: 136,
      bottomTile: 57,
      widthTiles: 84,
      heightTiles: 56,
      floorRow: 12,
      pillarTileX: 177,
      pillarTileY: 10,
      groundPortal: freezeGroundPortal(
        2,
        187,
        { tx: 142, ty: 9 },
        "Level 2 Eclipse Scar",
      ),
      portalSlots: freezeSlots(2, [
        {
          leftTile: 142,
          bottomTile: 12,
          regionId: "devil-eclipse-scar",
        },
        {
          leftTile: 162,
          bottomTile: 13,
          regionId: "devil-eclipse-scar",
        },
        {
          leftTile: 187,
          bottomTile: 13,
          regionId: "devil-eclipse-scar",
        },
        {
          leftTile: 211,
          bottomTile: 15,
          regionId: "devil-eclipse-scar",
        },
      ]),
    }),
  ]),
});
