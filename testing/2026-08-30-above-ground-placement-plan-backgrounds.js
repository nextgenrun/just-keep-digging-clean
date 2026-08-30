import { V11_POLISHED_SURFACE_RUNTIME_MANIFEST as V11 } from
  "../values/v11PolishedSurfaceRuntimeManifest.js";
import { WORLD_VISUAL_ABOVE_GROUND_COMPLETE_MAP_REVIEW as REVIEW } from
  "../values/worldVisualAboveGroundCompleteMapReview.js";
import { WORLD_VISUAL_ABOVE_GROUND_PIECEMEAL_MERGE_PLAN as PLAN } from
  "../values/worldVisualAboveGroundPiecemealMergePlan.js";
import { WORLD_VISUAL_SKY_COHESION } from "../values/worldVisualSkyCohesion.js";
import { resolveWorldVisualSkyFeatureCells } from
  "../values/worldVisualSkyTransitionOrder.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import {
  resolveWorldVisualSurfaceMotion,
  resolveWorldVisualSurfacePack,
  WORLD_VISUAL_SURFACE_PACKS,
} from "../values/worldVisualSurfacePacks.js";
import { V11_SKY_ISLAND_LAYOUT } from "../values/v11SkyIslandLayout.js";
import { resolveSurfacePackBeautyGeometry } from
  "../world/rendering/scenic-world/WorldVisualSurfacePackView.js";

const phaseAt = tileX => PLAN.slices.find(slice => (
  tileX >= slice.leftTile && tileX < slice.rightTileExclusive
))?.id || "stream-buffer";
const item = base => Object.freeze({
  status: "active",
  phaseId: phaseAt(Number.isFinite(base.anchorX) ? base.anchorX : base.x + base.width / 2),
  ...base,
});

function buildSkyBackgrounds() {
  const foundation = WORLD_VISUAL_SKY_COHESION.foundation.asset;
  const cells = resolveWorldVisualSkyFeatureCells(
    280, REVIEW.surfaceTileY, REVIEW.tileSize, WORLD_VISUAL_SKY_COHESION,
  );
  return [
    item({
      id: "background:sky-foundation",
      kind: "background",
      family: "sky-foundation",
      label: "Sky atmosphere foundation",
      assetId: foundation.id,
      path: foundation.path,
      x: PLAN.bufferSpan.leftTile,
      y: REVIEW.map.topTile,
      width: PLAN.bufferSpan.rightTileExclusive - PLAN.bufferSpan.leftTile,
      height: REVIEW.surfaceTileY - REVIEW.map.topTile,
      phaseId: "background-foundation",
    }),
    ...cells.map(cell => item({
      id: `background:${cell.id}`,
      kind: "background",
      family: "sky-cohesion-card",
      label: `${cell.slotId} / ${cell.bandId}`,
      assetId: cell.asset.id,
      path: cell.asset.path,
      x: cell.leftTile,
      y: cell.topTile,
      width: cell.rightTileExclusive - cell.leftTile,
      height: cell.bottomTileExclusive - cell.topTile,
      anchorX: cell.horizontalCenterTile,
      anchorY: cell.altitudeCenterTile,
      band: cell.bandId,
      region: cell.columnId,
    })),
  ];
}

function buildV11Backgrounds() {
  return V11.objects.map(entry => {
    const x = (entry.xPx + V11.xOffsetPx) / REVIEW.tileSize;
    const y = (entry.yPx + V11.yOffsetPx) / REVIEW.tileSize;
    const excluded = entry.name.startsWith(REVIEW.background.replacedSkyObjectPrefix);
    return item({
      id: `background:v11:${entry.name}`,
      kind: "background",
      family: excluded ? "v11-obsolete-sky" : "v11-terrain-card",
      label: entry.name,
      assetId: entry.textureKey,
      path: entry.path,
      x,
      y,
      width: entry.widthPx / REVIEW.tileSize,
      height: entry.heightPx / REVIEW.tileSize,
      status: excluded ? "excluded" : "active",
      note: excluded
        ? "Replaced by ordered sky cohesion in the complete-map composition."
        : "Runtime-offset V11 terrain card.",
    });
  });
}

function repeatedRects(config) {
  return Array.from({ length: config.count }, (_, offset) => {
    const index = config.startIndex + offset;
    return item({
      id: `background:${config.prefix}:${index}`,
      kind: "background",
      family: config.prefix,
      label: `${config.prefix} ${index}`,
      assetId: WORLD_VISUAL_RUNTIME.assets.far.key,
      path: config.path,
      x: index * config.stridePx / REVIEW.tileSize,
      y: config.bottomTile - config.heightPx / REVIEW.tileSize,
      width: config.widthPx / REVIEW.tileSize,
      height: config.heightPx / REVIEW.tileSize,
      status: config.status,
    });
  });
}

function buildScenicRepeats() {
  const cfg = WORLD_VISUAL_RUNTIME.surface;
  const worldWidthPx = 280 * REVIEW.tileSize;
  const farDisplayWidth = Math.min(
    cfg.farSegmentWidthTiles * REVIEW.tileSize + cfg.farSegmentOverlapPx,
    1672 * cfg.farMaxSourceScale,
  );
  const farStride = farDisplayWidth - cfg.farSegmentOverlapPx;
  const farHeight = farDisplayWidth * 941 / 1672;
  const farInstances = Math.ceil(worldWidthPx / farStride) + 3;
  const commonFar = {
    count: farInstances,
    startIndex: -1,
    stridePx: farStride,
    widthPx: farDisplayWidth,
    heightPx: farHeight,
    path: WORLD_VISUAL_RUNTIME.assets.far.path,
  };
  const surfaceFar = repeatedRects({
    ...commonFar,
    bottomTile: REVIEW.surfaceTileY + 0.42,
    prefix: "surface-far-repeat",
    status: "active",
  });
  const islandFar = repeatedRects({
    ...commonFar,
    bottomTile: Math.max(...V11_SKY_ISLAND_LAYOUT.levels.map(level => level.bottomTile)),
    prefix: "sky-island-far-repeat",
    status: "suppressed",
  });

  const edgeDisplayWidth = Math.min(
    cfg.edgeSegmentWidthTiles * REVIEW.tileSize + cfg.edgeOverlapPx,
    1672 * cfg.edgeMaxSourceScale,
  );
  const edgeStride = edgeDisplayWidth - cfg.edgeOverlapPx;
  const edgeCount = Math.ceil(worldWidthPx / edgeStride) + 1;
  const edgeHeight = 48 * edgeDisplayWidth / 1672;
  const edges = Array.from({ length: edgeCount }, (_, index) => item({
    id: `background:surface-edge:${index}`,
    kind: "background",
    family: "surface-edge-repeat",
    label: `Surface edge ${index}`,
    assetId: WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key,
    path: WORLD_VISUAL_RUNTIME.assets.surfaceEdge.path,
    x: index * edgeStride / REVIEW.tileSize,
    y: REVIEW.surfaceTileY - cfg.edgeTopFraction * edgeHeight / REVIEW.tileSize,
    width: edgeDisplayWidth / REVIEW.tileSize,
    height: edgeHeight / REVIEW.tileSize,
  }));

  const variation = cfg.surfaceGroundVariation;
  const variationCount = Math.ceil(worldWidthPx / variation.stridePx) + 3;
  const variations = Array.from({ length: variationCount }, (_, offset) => {
    const index = offset - 1;
    const assetIndex = ((index + 1) % variation.assets.length + variation.assets.length)
      % variation.assets.length;
    const asset = variation.assets[assetIndex];
    return item({
      id: `background:ground-variation:${index}`,
      kind: "background",
      family: "ground-variation-repeat",
      label: asset.key.replace("world-visual-surface-ground-variation-v5-", ""),
      assetId: asset.key,
      path: asset.path,
      x: index * variation.stridePx / REVIEW.tileSize,
      y: REVIEW.surfaceTileY,
      width: variation.expectedSourceWidthPx / REVIEW.tileSize,
      height: variation.expectedSourceHeightPx / REVIEW.tileSize,
    });
  });
  return [...surfaceFar, ...islandFar, ...edges, ...variations];
}

function buildTownPack() {
  const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "?surfaceMotion=town-air");
  const motion = resolveWorldVisualSurfaceMotion(pack, "?surfaceMotion=town-air");
  const beauty = resolveSurfacePackBeautyGeometry(pack, REVIEW.tileSize);
  const common = {
    kind: "background",
    family: "town-pack",
    x: 0,
    width: beauty.widthTiles,
  };
  return [
    item({
      ...common,
      id: "background:town-static-beauty",
      label: "Town static beauty fallback",
      assetId: pack.beauty.asset.key,
      path: pack.beauty.asset.path,
      y: REVIEW.surfaceTileY - beauty.height / REVIEW.tileSize,
      height: beauty.height / REVIEW.tileSize,
      status: "fallback",
    }),
    item({
      ...common,
      id: "background:town-air-video",
      label: "Town Square video — locked",
      assetId: motion.asset.key,
      path: motion.asset.path,
      y: REVIEW.surfaceTileY - beauty.height / REVIEW.tileSize,
      height: beauty.height / REVIEW.tileSize,
      status: "locked",
      note: `SHA-256 ${PLAN.townVideo.sha256}`,
    }),
    item({
      ...common,
      id: "background:town-floor",
      label: "Town slate floor",
      assetId: pack.floor.asset.key,
      path: pack.floor.asset.path,
      y: REVIEW.surfaceTileY - pack.floor.surfaceOffsetSourcePx / REVIEW.tileSize,
      height: pack.floor.sourceRect.height / REVIEW.tileSize,
    }),
    item({
      ...common,
      id: "background:town-ground",
      label: "Town ground facade",
      assetId: pack.ground.asset.key,
      path: pack.ground.asset.path,
      y: REVIEW.surfaceTileY,
      width: pack.ground.columns,
      height: pack.ground.rows,
    }),
  ];
}

export function buildBackgroundPlacementRecords() {
  return Object.freeze([
    ...buildSkyBackgrounds(),
    ...buildV11Backgrounds(),
    ...buildScenicRepeats(),
    ...buildTownPack(),
  ]);
}
