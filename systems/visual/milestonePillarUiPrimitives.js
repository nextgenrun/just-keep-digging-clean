import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export function addMilestoneText(scene, parent, x, y, text, style = {}, origin = [0, 0]) {
  const object = scene.add.text(x, y, text, {
    fontFamily: style.fontFamily || UI_FONTS.mono,
    fontSize: style.fontSize || "12px",
    fontStyle: style.fontStyle,
    color: style.color || UI_COLORS.body,
    align: style.align,
    lineSpacing: style.lineSpacing || 0,
    wordWrap: style.wordWrap,
    letterSpacing: style.letterSpacing,
  }).setOrigin(origin[0], origin[1]);
  parent.add(object);
  return object;
}

export function addMilestonePanel(scene, parent, rect, selected = false) {
  const panel = scene.add.rectangle(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
    rect.width,
    rect.height,
    selected ? UI_COLORS.cardSel : UI_COLORS.cardBase,
    0.96,
  ).setStrokeStyle(
    selected ? 2 : 1,
    selected ? UI_COLORS.borderSel : UI_COLORS.borderDim,
  );
  parent.add(panel);
  return panel;
}

export function addMilestoneProgressBar(scene, parent, rect, ratio, color = UI_COLORS.borderSel) {
  const clamped = Phaser.Math.Clamp(ratio, 0, 1);
  const graphics = scene.add.graphics();
  graphics.fillStyle(UI_COLORS.bg, 1);
  graphics.fillRoundedRect(rect.left, rect.top, rect.width, rect.height, rect.height / 2);
  if (clamped > 0) {
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(
      rect.left,
      rect.top,
      Math.max(rect.height, rect.width * clamped),
      rect.height,
      rect.height / 2,
    );
  }
  graphics.lineStyle(1, UI_COLORS.borderDim, 0.9);
  graphics.strokeRoundedRect(rect.left, rect.top, rect.width, rect.height, rect.height / 2);
  parent.add(graphics);
  return graphics;
}
