import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export function addStarAtlasText(scene, parent, x, y, value, style = {}) {
  const text = scene.add.text(x, y, value, {
    fontFamily: style.fontFamily || UI_FONTS.body,
    fontSize: `${style.fontSizePx || 12}px`,
    fontStyle: style.fontStyle,
    color: style.color || UI_COLORS.body,
    align: style.align || "center",
    wordWrap: style.wordWrapWidth
      ? { width: style.wordWrapWidth, useAdvancedWrap: true }
      : undefined,
    lineSpacing: style.lineSpacing,
    stroke: style.stroke ?? "#02060A",
    strokeThickness: style.strokeThickness ?? 2,
  }).setOrigin(style.originX ?? 0.5, style.originY ?? 0.5);
  parent.add(text);
  return text;
}

export function addStarAtlasHitZone(
  scene,
  parent,
  x,
  y,
  width,
  height,
  onClick,
) {
  const zone = scene.add.zone(x, y, width, height)
    .setInteractive({ useHandCursor: true });
  // The full-screen modal backdrop is interactive. Consume both phases so a
  // Codex selector can never also count as an outside-the-modal dismissal.
  zone.on("pointerdown", (_pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
  });
  zone.on("pointerup", (_pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
    onClick();
  });
  parent.add(zone);
  const modalDepth = Number(parent?.parentContainer?.depth ?? parent?.depth ?? 0);
  zone.setDepth?.(modalDepth + 1);
  zone.setScrollFactor?.(0);
  return zone;
}
