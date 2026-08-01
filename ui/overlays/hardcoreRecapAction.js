import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export function createHardcoreRecapAction({
  scene,
  config,
  x,
  y,
  label,
  color,
  activate,
}) {
  const layout = config.recap;
  const imageKey = ASSET_KEYS.ui.hardcore.deathActionButton;
  if (!scene.textures.exists(imageKey)) {
    throw new Error(
      "[HardcoreRecapAction] Approved Hardcore action art is missing.",
    );
  }

  const root = scene.add.container(x, y).setVisible(false);
  const image = scene.add.image(0, 0, imageKey)
    .setDisplaySize(layout.actionWidth, layout.actionHeight)
    .setInteractive({ useHandCursor: true });
  const actionLabel = scene.add.text(0, 0, label, {
    fontFamily: UI_FONTS.display,
    fontSize: `${layout.font.actionPx}px`,
    fontStyle: "bold",
    color,
    stroke: "#080204",
    strokeThickness: 4,
    align: "center",
  }).setOrigin(0.5);
  root.add([image, actionLabel]);
  root.actionLabel = actionLabel;

  image.on("pointerover", () => {
    scene.tweens.add({
      targets: root,
      scale: layout.actionHoverScale,
      duration: layout.actionTweenMs,
      ease: "Power2.out",
    });
  });
  image.on("pointerout", () => {
    scene.tweens.add({
      targets: root,
      scale: 1,
      duration: layout.actionTweenMs,
      ease: "Power2.out",
    });
  });
  image.on("pointerdown", () => {
    scene.tweens.add({
      targets: root,
      scale: layout.actionPressScale,
      duration: layout.actionTweenMs,
      yoyo: true,
      ease: "Power2.out",
    });
  });
  image.on("pointerup", activate);

  return {
    root,
    image,
    destroy() {
      image.removeAllListeners?.();
      image.disableInteractive?.();
    },
  };
}
