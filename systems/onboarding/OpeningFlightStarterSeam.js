import { TILE_TYPES } from "../../values/tileTypes.js";
import { isSurfaceTraversalReservedTileY } from "../../values/worldDepthConfig.js";

function isReservedSurfaceTraversalRow(scene, tileY) {
  return isSurfaceTraversalReservedTileY(
    tileY,
    scene.config.topAirRows,
    scene.config,
  );
}

export function prepareOpeningFlightStarterSeam(scene, config) {
  const world = scene.worldModel;
  const renderer = scene.worldRenderer;
  if (!world || !renderer) return;

  const seam = config.starterSeam;
  const tileX = scene.config.spawnTileX + seam.tileXOffsetFromLegacySpawn;
  const surfaceRow = scene.config.topAirRows + seam.surfaceRowOffset;
  const setTile = (ty, type, hp) => {
    if (isReservedSurfaceTraversalRow(scene, ty)) return;
    const key = `${tileX},${ty}`;
    if (world.dugTiles?.has?.(key)) return;
    world.setTile(tileX, ty, type, hp);
    renderer.applyTileUpdate(tileX, ty);
  };

  setTile(surfaceRow, TILE_TYPES.AIR, 0);
  seam.tileTypeNames.forEach((typeName, index) => {
    const type = TILE_TYPES[typeName] ?? TILE_TYPES.DIRT;
    setTile(surfaceRow + index + 1, type, seam.tileHp);
  });
  const bottomType = TILE_TYPES[seam.bottomTileTypeName] ?? TILE_TYPES.BEDROCK;
  setTile(surfaceRow + seam.bottomDepthTiles, bottomType, 0);
}

function mutateTile(scene, tx, ty, type, hp, preserveDug = true) {
  const world = scene.worldModel;
  if (!world?.inBounds?.(tx, ty)) return false;
  if (isReservedSurfaceTraversalRow(scene, ty)) return false;
  if (preserveDug && world.dugTiles?.has?.(`${tx},${ty}`)) return false;
  world.setTile(tx, ty, type, hp);
  scene.worldRenderer?.applyTileUpdate?.(tx, ty);
  return true;
}

export function getOpeningFlightGoldenFiveAnchors(scene, goldenConfig) {
  const layout = goldenConfig.layout;
  const tileX = scene.config.spawnTileX + layout.tileXOffsetFromTownAnchor;
  const surfaceRow = scene.config.topAirRows + layout.surfaceRowOffset;
  const cacheX = tileX + goldenConfig.cache.tileXOffset;
  const platformRow = surfaceRow + goldenConfig.cache.platformRowOffset;
  return {
    tileX,
    surfaceRow,
    artifactTileY: surfaceRow + layout.artifactDepthTiles,
    bottomTileY: surfaceRow + layout.bottomDepthTiles,
    cacheX,
    platformRow,
  };
}

export function prepareOpeningFlightGoldenFiveDescent(scene, goldenConfig) {
  const layout = goldenConfig.layout;
  const anchors = getOpeningFlightGoldenFiveAnchors(scene, goldenConfig);
  const sideType = TILE_TYPES[layout.sideWallTypeName] ?? TILE_TYPES.DIRT;

  for (const entry of layout.path) {
    const ty = anchors.surfaceRow + entry.depth;
    mutateTile(
      scene,
      anchors.tileX,
      ty,
      TILE_TYPES[entry.typeName] ?? TILE_TYPES.DIRT,
      entry.hp,
    );
    if (entry.depth <= 0) continue;
    for (let dx = -layout.sideHalfWidthTiles; dx <= layout.sideHalfWidthTiles; dx += 1) {
      if (dx === 0) continue;
      mutateTile(scene, anchors.tileX + dx, ty, sideType, layout.sideWallHp);
    }
  }

  const bottomType = TILE_TYPES[layout.bottomTypeName] ?? TILE_TYPES.BEDROCK;
  for (let dx = -layout.sideHalfWidthTiles; dx <= layout.sideHalfWidthTiles; dx += 1) {
    mutateTile(scene, anchors.tileX + dx, anchors.bottomTileY, bottomType, 0, false);
  }
  return anchors;
}

export function openOpeningFlightGoldenFiveEscape(scene, goldenConfig) {
  const layout = goldenConfig.layout;
  const anchors = getOpeningFlightGoldenFiveAnchors(scene, goldenConfig);
  for (let ty = anchors.surfaceRow; ty <= anchors.artifactTileY; ty += 1) {
    mutateTile(scene, anchors.tileX, ty, TILE_TYPES.AIR, 0, false);
    if (ty === anchors.surfaceRow) continue;
    for (let dx = -layout.sideHalfWidthTiles; dx <= layout.sideHalfWidthTiles; dx += 1) {
      if (dx === 0) continue;
      mutateTile(scene, anchors.tileX + dx, ty, TILE_TYPES.AIR, 0, false);
    }
  }
  return anchors;
}

export function prepareOpeningFlightGoldenFiveRewardLedge(scene, goldenConfig) {
  const anchors = getOpeningFlightGoldenFiveAnchors(scene, goldenConfig);
  const halfWidth = goldenConfig.cache.platformHalfWidthTiles;
  for (let dx = -halfWidth; dx <= halfWidth; dx += 1) {
    mutateTile(
      scene,
      anchors.cacheX + dx,
      anchors.platformRow,
      TILE_TYPES.BEDROCK,
      0,
      false,
    );
  }
  return anchors;
}
