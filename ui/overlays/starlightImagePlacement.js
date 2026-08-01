import { STARLIGHT_TALENT_SIGN_ART } from "../../values/starlightTalentSignArt.js";

function sourceSize(image) {
  return {
    width: Math.max(1, image.width || image.displayWidth || 1),
    height: Math.max(1, image.height || image.displayHeight || 1),
  };
}

export function fitStarlightImage(image, maxWidth, maxHeight) {
  const source = sourceSize(image);
  image.setScale(Math.min(maxWidth / source.width, maxHeight / source.height));
  return image;
}

export function resolveVisibleArtPlacement(
  sourceWidth,
  sourceHeight,
  visibleBounds,
  maxWidth,
  maxHeight,
) {
  const width = Math.max(1, visibleBounds?.width || sourceWidth || 1);
  const height = Math.max(1, visibleBounds?.height || sourceHeight || 1);
  const scale = Math.min(maxWidth / width, maxHeight / height);
  const visibleCenterX = (visibleBounds?.x || 0) + width / 2;
  const visibleCenterY = (visibleBounds?.y || 0) + height / 2;
  return {
    scale,
    offsetX: (sourceWidth / 2 - visibleCenterX) * scale,
    offsetY: (sourceHeight / 2 - visibleCenterY) * scale,
  };
}

export function fitStarlightSign(
  image,
  resourceType,
  maxWidth,
  maxHeight,
) {
  const source = sourceSize(image);
  const placement = resolveVisibleArtPlacement(
    source.width,
    source.height,
    STARLIGHT_TALENT_SIGN_ART[resourceType],
    maxWidth,
    maxHeight,
  );
  image
    .setScale(placement.scale)
    .setPosition(
      image.x + placement.offsetX,
      image.y + placement.offsetY,
    );
  return image;
}
