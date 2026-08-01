import {
  WORLD_VISUAL_SURFACE_PACKS,
  resolveWorldVisualSurfacePack,
} from "../../../values/worldVisualSurfacePacks.js";
import {
  resolveSurfacePackBeautyGeometry,
} from "./WorldVisualSurfacePackView.js?rev=20260729-native-density-v14";
import {
  resolveTownFloorGeometry,
} from "./WorldVisualTownFloorView.js";

export function resolveTownFloorOcclusionBounds(
  scene,
  search = globalThis.location?.search || "",
) {
  const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, search);
  if (!pack?.floor) return null;
  const tileSize = scene.config.tileSize;
  const beautyGeometry = resolveSurfacePackBeautyGeometry(pack, tileSize);
  const floorGeometry = resolveTownFloorGeometry(
    pack,
    beautyGeometry,
    tileSize,
    scene.config.topAirRows,
  );
  const coreWidth = pack.floor.approvedCoreSourceWidthPx
    / floorGeometry.sourcePixelsPerWorldPixel;
  return Object.freeze({
    left: floorGeometry.x,
    right: floorGeometry.x + coreWidth,
    top: floorGeometry.y,
    bottom: floorGeometry.y + floorGeometry.height,
  });
}

export function cellIntersectsTownFloorOcclusion(bounds, tx, ty, tileSize) {
  if (!bounds) return false;
  const left = tx * tileSize;
  const right = left + tileSize;
  const top = ty * tileSize;
  const bottom = top + tileSize;
  return (
    right > bounds.left
    && left < bounds.right
    && bottom > bounds.top
    && top < bounds.bottom
  );
}
