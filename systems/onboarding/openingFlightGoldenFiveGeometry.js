import { getOpeningFlightGoldenFiveAnchors } from "./OpeningFlightStarterSeam.js";

export function getOpeningFlightAnchors(scene, config) {
  return getOpeningFlightGoldenFiveAnchors(scene, config);
}

export function getOpeningFlightTileSize(scene) {
  return scene.config.tileSize;
}

export function getOpeningFlightRingWorlds(scene, config) {
  const anchors = getOpeningFlightAnchors(scene, config);
  return config.escape.rings.map(ring => scene.worldModel.tileToWorld(
    anchors.tileX + ring.tileXOffset,
    anchors.surfaceRow + ring.depthTiles,
  ));
}

export function getOpeningFlightArtifactCenterWorld(scene, config) {
  const anchors = getOpeningFlightAnchors(scene, config);
  return scene.worldModel.tileToWorld(anchors.tileX, anchors.artifactTileY);
}

export function getOpeningFlightArtifactBottomWorld(scene, config) {
  const anchors = getOpeningFlightAnchors(scene, config);
  const tileSize = getOpeningFlightTileSize(scene);
  return {
    x: (anchors.tileX + 0.5) * tileSize,
    y: anchors.bottomTileY * tileSize,
  };
}

export function getOpeningFlightEntranceBottomWorld(scene, config) {
  const anchors = getOpeningFlightAnchors(scene, config);
  const tileSize = getOpeningFlightTileSize(scene);
  return {
    x: (anchors.tileX + 0.5) * tileSize,
    y: anchors.surfaceRow * tileSize
      + config.presentation.entranceBottomOffsetYPx,
  };
}

export function getOpeningFlightCacheBottomWorld(scene, config) {
  const anchors = getOpeningFlightAnchors(scene, config);
  const tileSize = getOpeningFlightTileSize(scene);
  return {
    x: (anchors.cacheX + 0.5) * tileSize,
    y: anchors.platformRow * tileSize,
  };
}

export function getOpeningFlightCacheCenterWorld(scene, config) {
  const bottom = getOpeningFlightCacheBottomWorld(scene, config);
  return {
    x: bottom.x,
    y: bottom.y
      - config.presentation.cacheWidthPx * config.cache.pickupCenterOffsetRatio,
  };
}

export function getOpeningFlightPlayerWorld(scene) {
  const body = scene.playerController?.physicsBody;
  if (body) {
    return {
      x: body.x + body.w / 2,
      y: body.y + body.h / 2,
    };
  }
  return scene.playerController?.getPlayerPosition?.() || null;
}

export function countBrokenOpeningFlightPathTiles(scene, config) {
  const anchors = getOpeningFlightAnchors(scene, config);
  return config.layout.path.reduce((count, entry) => (
    scene.worldModel?.isSolid?.(
      anchors.tileX,
      anchors.surfaceRow + entry.depth,
    ) === false
      ? count + 1
      : count
  ), 0);
}
