const SOURCE_TMX = "exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx";

function freezeSlots(levelId, leftTiles) {
  return Object.freeze(leftTiles.map((leftTile, slotIndex) => Object.freeze({
    id: `v11-level-${levelId}-portal-${slotIndex + 1}`,
    levelId,
    slotIndex,
    leftTile,
    bottomTile: 18,
    widthTiles: 2,
    heightTiles: 2,
  })));
}

function freezeGroundPortal(levelId, leftTile, skyArrivalTx) {
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
    skyArrivalTile: Object.freeze({ tx: skyArrivalTx, ty: 17 }),
    promptLabel: `Teleport to Level ${levelId} Sky Island`,
    arrivalLabel: `Level ${levelId} Sky Island`,
  });
}

export const V11_SKY_ISLAND_LAYOUT = Object.freeze({
  enabled: true,
  source: SOURCE_TMX,
  tileSize: 94,
  dividerTileX: 119,
  groundRow: 65,
  platformDepth: -0.5,
  portalDepth: 2,
  levels: Object.freeze([
    Object.freeze({
      levelId: 1,
      platformKey: "v11-sky-island-level-1-platform",
      portalKey: "v11-sky-island-level-1-portal",
      leftTile: 80,
      bottomTile: 23.25531914893617,
      widthTiles: 16,
      heightTiles: 6,
      floorRow: 18,
      pillarTileX: 88,
      pillarTileY: 17,
      groundPortal: freezeGroundPortal(1, 0, 83),
      portalSlots: freezeSlots(1, [81, 85, 89, 93]),
    }),
    Object.freeze({
      levelId: 2,
      platformKey: "v11-sky-island-level-2-platform",
      portalKey: "v11-sky-island-level-2-portal",
      leftTile: 142,
      bottomTile: 23.25531914893617,
      widthTiles: 16,
      heightTiles: 6,
      floorRow: 18,
      pillarTileX: 150,
      pillarTileY: 17,
      groundPortal: freezeGroundPortal(2, 187, 145),
      portalSlots: freezeSlots(2, [143, 147, 151, 155]),
    }),
  ]),
});
