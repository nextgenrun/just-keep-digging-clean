import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_IDS,
} from "../../values/celestialEngines.js";
import { UI_FONTS } from "../../values/uiLayout.js";

const ENGINE_ASSETS = Object.freeze({
  [CELESTIAL_ENGINE_IDS.WAYWARD_STAR]: ASSET_KEYS.celestialEngines.waywardStar,
  [CELESTIAL_ENGINE_IDS.HOLLOW_SUN]: ASSET_KEYS.celestialEngines.hollowSun,
  [CELESTIAL_ENGINE_IDS.COMET_ENGINE]: ASSET_KEYS.celestialEngines.cometEngine,
});

export function createStarHeartEngineCard({
  scene,
  parent,
  engineId,
  index,
  x,
  y,
  width,
  height,
  onFocus,
  onPress,
}) {
  const definition = CELESTIAL_ENGINE_CONFIG.engines[engineId];
  const root = scene.add.container(x, y)
    .setScrollFactor(0)
    .setSize(width, height)
    .setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
  root.input.cursor = "pointer";
  root.on("pointerover", () => onFocus?.(index));
  root.on("pointerdown", () => onPress?.(index));
  const bg = scene.add.graphics();
  const coreSize = Math.min(
    CELESTIAL_ENGINE_CONFIG.overlay.coreSizePx,
    width * 0.58,
    height * 0.38,
  );
  const spriteBaseY = -height / 2 + coreSize * 0.57 + 18;
  const sprite = scene.add.image(0, spriteBaseY, ENGINE_ASSETS[engineId])
    .setDisplaySize(coreSize, coreSize)
    .setBlendMode(Phaser.BlendModes.ADD);
  const spriteScaleX = sprite.scaleX;
  const spriteScaleY = sprite.scaleY;
  const role = scene.add.text(0, -height / 2 + coreSize + 25, definition.role, {
    fontFamily: UI_FONTS.mono,
    fontSize: "11px",
    color: definition.cssAccent,
    letterSpacing: 1,
  }).setOrigin(0.5);
  const title = scene.add.text(0, role.y + 24, definition.name, {
    fontFamily: UI_FONTS.display,
    fontSize: width < 250 ? "15px" : "18px",
    fontStyle: "bold",
    color: "#F3FBFF",
    align: "center",
  }).setOrigin(0.5);
  const description = scene.add.text(0, title.y + 29, definition.description, {
    fontFamily: UI_FONTS.body,
    fontSize: width < 250 ? "11px" : "12px",
    color: "#AFC6D3",
    align: "center",
    lineSpacing: 4,
    wordWrap: { width: width - 30, useAdvancedWrap: true },
  }).setOrigin(0.5, 0);
  const cap = scene.add.text(0, height / 2 - 23, definition.capLabel, {
    fontFamily: UI_FONTS.mono,
    fontSize: "10px",
    color: definition.cssAccent,
    align: "center",
  }).setOrigin(0.5);
  root.add([bg, sprite, role, title, description, cap]);
  parent.add(root);
  return {
    engineId,
    root,
    bg,
    sprite,
    spriteBaseY,
    spriteScaleX,
    spriteScaleY,
    width,
    height,
  };
}
