import { ASSET_KEYS } from "../../values/assetKeys.js";

export class OpeningFlightGoldenFiveHudView {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.phase = null;
    this.title = null;
    this.body = null;
    this.progressFill = null;
    this.progressGlow = null;
    this.signature = "";
  }

  show({
    phase = "",
    title = "",
    body = "",
    progress = 0,
    accent = "cyan",
  }) {
    this._ensure();
    const ratio = Math.max(0, Math.min(1, Number(progress) || 0));
    const signature = `${phase}|${title}|${body}|${ratio.toFixed(3)}|${accent}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.phase.setText(phase);
    this.title.setText(title);
    this.body.setText(body);
    this.progressFill.setScale(ratio, 1);
    this.progressGlow.setScale(ratio, 1);
    const color = this.config.palette[accent] || this.config.palette.cyan;
    this.progressFill.setFillStyle(color, 1);
    this.progressGlow.setFillStyle(
      color,
      this.config.presentation.hudProgressGlowAlpha,
    );
    this.root.setVisible(true);
  }

  hide() {
    this.root?.setVisible(false);
    this.signature = "";
  }

  _ensure() {
    if (this.root?.active) {
      this._position();
      return;
    }
    const scene = this.scene;
    const view = this.config.presentation;
    const type = this.config.typography;
    const frame = scene.add.image(
      0,
      0,
      ASSET_KEYS.onboarding.openingFlightV2.objectiveHudFrame,
    ).setDisplaySize(view.hudWidthPx, view.hudHeightPx);
    const textX = -view.hudWidthPx / 2 + view.hudTextLeftPx;
    this.phase = scene.add.text(textX, view.hudPhaseYPx, "", {
      fontFamily: type.bodyFamily,
      fontSize: type.phaseSize,
      fontStyle: "bold",
      color: this.config.palette.cyanText,
    }).setOrigin(0, 0);
    this.title = scene.add.text(textX, view.hudTitleYPx, "", {
      fontFamily: type.titleFamily,
      fontSize: type.titleSize,
      fontStyle: "bold",
      color: this.config.palette.goldText,
    }).setOrigin(0, 0);
    this.body = scene.add.text(textX, view.hudBodyYPx, "", {
      fontFamily: type.bodyFamily,
      fontSize: type.bodySize,
      color: this.config.palette.bodyText,
    }).setOrigin(0, 0);
    const barWidth = view.hudWidthPx
      - view.hudTextLeftPx
      - view.hudTextRightPx;
    const barX = textX;
    this.progressGlow = scene.add.rectangle(
      barX,
      view.hudProgressYPx,
      barWidth,
      view.hudProgressGlowHeightPx,
      this.config.palette.cyan,
      view.hudProgressGlowAlpha,
    ).setOrigin(0, 0.5);
    this.progressFill = scene.add.rectangle(
      barX,
      view.hudProgressYPx,
      barWidth,
      view.hudProgressHeightPx,
      this.config.palette.cyan,
      1,
    ).setOrigin(0, 0.5);
    this.root = scene.add.container(0, 0, [
      frame,
      this.phase,
      this.title,
      this.body,
      this.progressGlow,
      this.progressFill,
    ]).setScrollFactor(0).setDepth(view.hudDepth);
    this._position();
  }

  _position() {
    const width = this.scene.scale?.width || this.scene.config.viewportWidth;
    const height = this.scene.scale?.height || this.scene.config.viewportHeight;
    this.root.setPosition(
      width / 2,
      height - this.config.presentation.hudYFromBottomPx,
    );
  }

  destroy() {
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
