import { UI_FONTS } from "../../values/uiLayout.js";

export function clampPauseLoadingProgress(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function addPauseLoadingCrop(
  scene,
  x,
  y,
  key,
  crop,
  width,
  height,
) {
  return scene.add.image(x, y, key)
    .setCrop(crop.x, crop.y, crop.width, crop.height)
    .setScale(width / crop.width, height / crop.height);
}

export function addPauseLoadingText(
  scene,
  config,
  x,
  y,
  value,
  fontSize,
  color,
  family = "body",
  bold = false,
) {
  const fontFamily = family === "display"
    ? UI_FONTS.display
    : family === "mono"
      ? UI_FONTS.mono
      : UI_FONTS.body;
  return scene.add.text(x, y, value, {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontStyle: bold ? "bold" : undefined,
    color,
    align: "center",
    stroke: config.presentation.textStrokeColor,
    strokeThickness: config.presentation.textStrokeThicknessPx,
  }).setOrigin(0.5);
}
