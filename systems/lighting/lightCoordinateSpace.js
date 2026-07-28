const finite = (value, fallback = 0) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
);

/**
 * Resolves the two coordinate spaces used by the player light.
 *
 * A darkness RenderTexture is a Game Object rendered by the main camera, so
 * positions written into it must remain in pre-camera texture space. The
 * shader, however, needs the final logical screen position. Keeping both
 * values together prevents the camera transform from being applied twice.
 */
export function resolveLightCoordinateSpaces(
  camera,
  worldX,
  worldY,
  output = {}
) {
  const textureX = finite(worldX) - finite(camera?.scrollX);
  const textureY = finite(worldY) - finite(camera?.scrollY);

  output.textureX = textureX;
  output.textureY = textureY;

  if (typeof camera?.matrix?.transformPoint === "function") {
    camera.matrix.transformPoint(textureX, textureY, output);
  } else {
    const width = Math.max(1, finite(camera?.width, 1));
    const height = Math.max(1, finite(camera?.height, 1));
    const originX = width * finite(camera?.originX, 0.5);
    const originY = height * finite(camera?.originY, 0.5);
    const zoomX = finite(camera?.zoomX, finite(camera?.zoom, 1));
    const zoomY = finite(camera?.zoomY, finite(camera?.zoom, 1));

    output.x = finite(camera?.x) + originX + (textureX - originX) * zoomX;
    output.y = finite(camera?.y) + originY + (textureY - originY) * zoomY;
  }

  return output;
}
