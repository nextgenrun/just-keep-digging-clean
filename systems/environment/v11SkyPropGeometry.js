import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from
  "../../values/ualNativePlayerAssetProfile.js";

export function skyPropRectanglesIntersect(left, right) {
  return (
    left.right > right.left
    && left.left < right.right
    && left.bottom > right.top
    && left.top < right.bottom
  );
}

export function resolveSkyPropScaleMultiplier(item, config) {
  const sizeScale = config.scale.sizeVariants[item.sizeVariant];
  const laneScale = config.scale.lanePerspective[item.lane];
  if (!Number.isFinite(sizeScale) || !Number.isFinite(laneScale)) {
    throw new Error(`[V11SkyPropSystem] Invalid authored scale for ${item.id}`);
  }
  return sizeScale * laneScale;
}

export function resolveSkyPropGeometry(asset, tileSize, scale) {
  const playerPixelsPerMeter = (
    UAL_NATIVE_PLAYER_ASSET_PROFILE.targetVisibleHeightTiles * tileSize
    / UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters
  );
  const height = asset.heightMeters * playerPixelsPerMeter * scale;
  const width = height * asset.expectedSource.width / asset.expectedSource.height;
  return Object.freeze({
    width,
    height,
    widthTiles: width / tileSize,
    heightTiles: height / tileSize,
    sourcePixelsPerWorldPixel: asset.expectedSource.height / height,
  });
}

export function getSkyPropFrameDimensions(textureManager, key, frameName) {
  const frame = textureManager.getFrame?.(key, frameName)
    || textureManager.get?.(key)?.get?.(frameName);
  if (!frame) return null;
  return {
    width: frame.realWidth || frame.width || frame.cutWidth,
    height: frame.realHeight || frame.height || frame.cutHeight,
  };
}
