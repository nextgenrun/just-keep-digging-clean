export function setOpeningFlightImageLongEdge(
  image,
  targetPx,
  dimension = "height",
) {
  const source = dimension === "width" ? image.width : image.height;
  image.setScale(targetPx / Math.max(1, source || 1));
  return image;
}

export function applyOpeningFlightScreenBlend(image) {
  if (
    typeof Phaser !== "undefined"
    && Phaser.BlendModes?.SCREEN !== undefined
    && image?.setBlendMode
  ) {
    image.setBlendMode(Phaser.BlendModes.SCREEN);
  }
}
