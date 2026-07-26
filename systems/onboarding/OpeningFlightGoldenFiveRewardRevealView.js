import { ASSET_KEYS } from "../../values/assetKeys.js";

export class OpeningFlightGoldenFiveRewardRevealView {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.title = null;
    this.primary = null;
    this.resources = null;
    this.footer = null;
  }

  show({
    title = "",
    primary = "",
    resources = "",
    footer = "",
  }) {
    this._ensure();
    const reveal = this.config.presentation.rewardReveal;
    this.title.setText(title);
    this.primary.setText(primary);
    this.resources.setText(resources);
    this.footer.setText(footer);
    this.scene.tweens?.killTweensOf?.(this.root);
    this._position();
    this.root
      .setVisible(true)
      .setAlpha(0)
      .setScale(reveal.enterScale);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: reveal.enterDurationMs,
      ease: this.config.presentation.revealEase,
    });
  }

  hide({ instant = false } = {}) {
    if (!this.root?.active || !this.root.visible) return;
    this.scene.tweens?.killTweensOf?.(this.root);
    if (instant) {
      this.root.setVisible(false);
      return;
    }
    const reveal = this.config.presentation.rewardReveal;
    this.scene.tweens.add({
      targets: this.root,
      y: this.root.y - reveal.exitLiftPx,
      alpha: 0,
      scaleX: reveal.exitScale,
      scaleY: reveal.exitScale,
      duration: reveal.exitDurationMs,
      ease: this.config.presentation.exitEase,
      onComplete: () => this.root?.setVisible(false),
    });
  }

  _ensure() {
    if (this.root?.active) return;
    const scene = this.scene;
    const reveal = this.config.presentation.rewardReveal;
    const type = this.config.typography;
    const palette = this.config.palette;
    const frame = scene.add.image(
      0,
      0,
      ASSET_KEYS.onboarding.openingFlightV2.objectiveHudFrame,
    ).setDisplaySize(reveal.widthPx, reveal.heightPx);
    const textX = -reveal.widthPx / 2 + reveal.textLeftPx;
    const smallStyle = {
      fontFamily: type.bodyFamily,
      fontStyle: "bold",
      stroke: type.cacheLabelStroke,
      strokeThickness: type.rewardSmallTextStrokeThickness,
    };
    this.title = scene.add.text(textX, reveal.titleYPx, "", {
      fontFamily: type.titleFamily,
      fontSize: type.rewardTitleSize,
      fontStyle: "bold",
      color: palette.goldText,
      stroke: type.cacheLabelStroke,
      strokeThickness: type.rewardTextStrokeThickness,
    }).setOrigin(0, 0);
    this.primary = scene.add.text(textX, reveal.primaryYPx, "", {
      fontFamily: type.titleFamily,
      fontSize: type.rewardPrimarySize,
      fontStyle: "bold",
      color: palette.whiteText,
      stroke: type.cacheLabelStroke,
      strokeThickness: type.rewardTextStrokeThickness,
    }).setOrigin(0, 0);
    this.resources = scene.add.text(textX, reveal.resourcesYPx, "", {
      ...smallStyle,
      fontSize: type.rewardResourcesSize,
      color: palette.goldText,
    }).setOrigin(0, 0);
    this.footer = scene.add.text(textX, reveal.footerYPx, "", {
      ...smallStyle,
      fontSize: type.rewardFooterSize,
      color: palette.cyanText,
    }).setOrigin(0, 0);
    this.root = scene.add.container(0, 0, [
      frame,
      this.title,
      this.primary,
      this.resources,
      this.footer,
    ]).setScrollFactor(0).setDepth(reveal.depth).setVisible(false);
  }

  _position() {
    const width = this.scene.scale?.width || this.scene.config.viewportWidth;
    const height = this.scene.scale?.height || this.scene.config.viewportHeight;
    this.root.setPosition(
      width / 2,
      height * this.config.presentation.rewardReveal.viewportYRatio,
    );
  }

  destroy() {
    this.scene?.tweens?.killTweensOf?.(this.root);
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
