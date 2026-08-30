import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export function createHardcoreModalView(scene, config) {
  const ui = config.ui;
  const panelKey = ASSET_KEYS.ui.hardcore.oathPanel;
  if (!scene.textures.exists(panelKey)) {
    throw new Error("[HardcoreModalOverlay] Approved Hardcore panel art is missing.");
  }
  const root = scene.add.container(scene.scale.width / 2, scene.scale.height / 2)
    .setScrollFactor(0).setDepth(ui.depth).setVisible(false);
  const shade = scene.add.rectangle(
    0, 0, scene.scale.width, scene.scale.height, 0x020104, 0.86,
  ).setInteractive();
  const panel = scene.add.image(0, 0, panelKey)
    .setDisplaySize(ui.panelWidth, ui.panelHeight);
  const title = scene.add.text(0, ui.titleY, "", {
    fontFamily: UI_FONTS.display,
    fontSize: `${ui.font.titlePx}px`,
    fontStyle: "bold",
    color: UI_COLORS.title,
    stroke: "#080204",
    strokeThickness: 5,
    align: "center",
  }).setOrigin(0.5);
  const subtitle = scene.add.text(0, ui.subtitleY, "", {
    fontFamily: UI_FONTS.mono,
    fontSize: `${ui.font.subtitlePx}px`,
    fontStyle: "bold",
    color: UI_COLORS.danger,
    align: "center",
  }).setOrigin(0.5);
  const body = scene.add.text(0, ui.bodyY, "", {
    fontFamily: UI_FONTS.body,
    fontSize: `${ui.font.bodyPx}px`,
    color: UI_COLORS.body,
    align: "center",
    lineSpacing: 8,
    wordWrap: { width: ui.bodyWidth, useAdvancedWrap: true },
  }).setOrigin(0.5, 0);
  const instruction = scene.add.text(0, ui.typedPromptY, "", {
    fontFamily: UI_FONTS.mono,
    fontSize: `${ui.font.typedPromptPx}px`,
    fontStyle: "bold",
    color: UI_COLORS.gold,
    align: "center",
  }).setOrigin(0.5);
  const typed = scene.add.text(0, ui.typedValueY, "", {
    fontFamily: UI_FONTS.mono,
    fontSize: `${ui.font.typedValuePx}px`,
    fontStyle: "bold",
    color: UI_COLORS.danger,
    stroke: "#080204",
    strokeThickness: 4,
    align: "center",
  }).setOrigin(0.5);
  const footer = scene.add.text(0, ui.footerY, "", {
    fontFamily: UI_FONTS.mono,
    fontSize: `${ui.font.footerPx}px`,
    color: UI_COLORS.dim,
    align: "center",
  }).setOrigin(0.5);
  const confirmationRoot = scene.add.container(0, 0);
  confirmationRoot.add([title, subtitle, body, instruction, typed, footer]);
  root.add([shade, panel, confirmationRoot]);
  return { root, panel, confirmationRoot, title, subtitle, body, instruction, typed, footer };
}
