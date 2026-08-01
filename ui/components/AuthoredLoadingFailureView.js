import { UI_FONTS } from "../../values/uiLayout.js";

function addText(scene, root, x, y, value, style) {
  const text = scene.add.text(x, y, value, style).setOrigin(0.5);
  root.add(text);
  return text;
}

export class AuthoredLoadingFailureView {
  constructor(scene, parentRoot, config) {
    this.scene = scene;
    this.config = config;
    this.active = false;
    this.retryHandler = null;
    this._build(parentRoot);
  }

  _build(parentRoot) {
    const { layout, typography, copy, assets } = this.config;
    const failure = layout.failure;
    const colors = typography.colors;
    const baseStyle = {
      fontFamily: UI_FONTS.mono,
      stroke: colors.shadow,
      strokeThickness: typography.strokeThickness,
    };
    this.root = this.scene.add.container(0, 0).setVisible(false);
    this.message = addText(
      this.scene,
      this.root,
      failure.x,
      failure.messageY,
      "",
      {
        ...baseStyle,
        fontSize: typography.failureSize,
        color: colors.failure,
        align: "center",
        wordWrap: { width: failure.messageMaxWidth },
      },
    );
    this.plate = this.scene.add.image(
      failure.x,
      failure.retryY,
      assets.retryPlate.key,
    )
      .setDisplaySize(failure.retryWidth, failure.retryHeight)
      .setInteractive({ useHandCursor: true });
    this.label = addText(
      this.scene,
      this.root,
      failure.x,
      failure.retryY,
      copy.retry,
      {
        ...baseStyle,
        fontSize: typography.retrySize,
        fontStyle: "bold",
        color: colors.title,
      },
    );
    this.hint = addText(
      this.scene,
      this.root,
      failure.x,
      failure.retryHintY,
      copy.retryHint,
      {
        ...baseStyle,
        fontSize: typography.detailSize,
        color: colors.muted,
      },
    );
    this.root.addAt(this.plate, 1);
    parentRoot.add(this.root);
    this.plate
      .on("pointerover", () => this.plate.setScale(1.02))
      .on("pointerout", () => this.plate.setScale(1))
      .on("pointerdown", () => this._retry());
  }

  _retry() {
    if (!this.active || !this.retryHandler) return;
    const handler = this.retryHandler;
    this.retryHandler = null;
    this.label.setText("RETRYING...");
    handler();
  }

  setRetryHandler(handler) {
    this.retryHandler = typeof handler === "function" ? handler : null;
  }

  show(message) {
    this.active = true;
    this.message.setText(String(message ?? "Loading failed."));
    this.root.setVisible(true);
  }

  hide() {
    this.active = false;
    this.root.setVisible(false);
    this.label.setText(this.config.copy.retry);
  }
}
