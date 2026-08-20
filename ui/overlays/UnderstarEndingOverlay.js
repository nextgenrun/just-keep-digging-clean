import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UNDERSTAR_ENDING_CONFIG } from "../../values/understarEnding.js";
import { SCENE_SUSPENSION_KINDS } from "../../values/sceneRuntime.js";

export class UnderstarEndingOverlay {
  constructor(scene, callbacks = {}, config = UNDERSTAR_ENDING_CONFIG) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.config = config;
    this.isVisible = false;
    this.busy = false;
    this.suspension = null;
    this.objects = [];
    this._onEnter = () => this._returnToMenu();
    this.scene.input.keyboard?.on?.("keydown-ENTER", this._onEnter);
  }

  show(summary = {}) {
    if (this.isVisible) return false;
    this._ensureObjects();
    this._setSummary(summary);
    this.isVisible = true;
    this.busy = false;
    this.suspension ||= this.scene.acquireSceneSuspension(
      SCENE_SUSPENSION_KINDS.HARDCORE_MODAL,
      "understar-ending",
    );
    this.scene.playerController?.setControlsEnabled?.(false);
    this.scene.uiNotifications?.setPaused?.(true);
    for (const object of this.objects) object.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.objects,
      alpha: 1,
      duration: this.config.overlay.fadeInMs,
      ease: "Sine.easeOut",
    });
    return true;
  }

  close() {
    if (!this.isVisible || this.busy) return false;
    this.isVisible = false;
    for (const object of this.objects) object.setVisible(false);
    this.suspension?.release?.();
    this.suspension = null;
    this.scene.playerController?.setControlsEnabled?.(
      this.scene.sceneModeController?.isGameplayActive === true,
    );
    this.scene.uiNotifications?.setPaused?.(false);
    this.callbacks.onContinue?.();
    return true;
  }

  destroy() {
    this.scene.input.keyboard?.off?.("keydown-ENTER", this._onEnter);
    this.scene.tweens?.killTweensOf?.(this.objects);
    this.suspension?.release?.();
    this.suspension = null;
    for (const object of this.objects) object.destroy?.();
    this.objects = [];
    this.isVisible = false;
  }

  _ensureObjects() {
    if (this.objects.length) return;
    const cfg = this.config.overlay;
    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const image = this.scene.add.image(
      centerX,
      camera.height / 2,
      ASSET_KEYS.background.understarEnding.key,
    )
      .setDisplaySize(camera.width, camera.height)
      .setScrollFactor(0)
      .setDepth(cfg.depth);
    const titleStyle = {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      color: cfg.titleColor,
      stroke: cfg.textStrokeColor,
      strokeThickness: cfg.titleStrokeThickness,
      align: "center",
    };
    const bodyStyle = {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      color: cfg.bodyColor,
      stroke: cfg.textStrokeColor,
      strokeThickness: cfg.bodyStrokeThickness,
      align: "center",
    };
    this.eyebrow = this.scene.add.text(centerX, cfg.titleY, this.config.copy.eyebrow, {
      ...bodyStyle,
      color: cfg.subtitleColor,
      fontSize: cfg.subtitleFontSize,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(cfg.depth + 1);
    this.title = this.scene.add.text(centerX, cfg.subtitleY, this.config.copy.title, {
      ...titleStyle,
      fontSize: cfg.titleFontSize,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(cfg.depth + 1);
    this.story = this.scene.add.text(centerX, cfg.storyY, this.config.copy.story, {
      ...bodyStyle,
      fontSize: cfg.storyFontSize,
      lineSpacing: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(cfg.depth + 1);
    this.stats = this.scene.add.text(centerX, cfg.statsY, "", {
      ...bodyStyle,
      fontSize: cfg.statsFontSize,
      lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(cfg.depth + 1);
    this.controls = this.scene.add.text(centerX, cfg.controlsY, this.config.copy.controls, {
      ...bodyStyle,
      color: cfg.controlsColor,
      fontSize: cfg.controlsFontSize,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(cfg.depth + 1);
    this.objects = [image, this.eyebrow, this.title, this.story, this.stats, this.controls];
    for (const object of this.objects) object.setVisible(false);
  }

  _setSummary(summary) {
    const labels = this.config.copy.statsLabels;
    this.stats.setText([
      `${labels.level}  ${summary.level || 1}`,
      `${labels.tiles}  ${Number(summary.tiles || 0).toLocaleString()}`,
      `${labels.portals}  ${summary.portals || 0}`,
      `${labels.stars}  ${summary.stars || 0}`,
    ].join("     •     "));
    this.controls.setText(this.config.copy.controls);
  }

  async _returnToMenu() {
    if (!this.isVisible || this.busy) return;
    this.busy = true;
    this.controls.setText("SAVING THE UNDERSTAR DISCOVERY...");
    let succeeded = false;
    try {
      succeeded = await this.callbacks.onMainMenu?.();
    } catch (error) {
      console.error("[UnderstarEndingOverlay] Main menu transition failed:", error);
    }
    if (succeeded !== true && this.isVisible) {
      this.busy = false;
      this.controls.setText(this.config.copy.controls);
    }
  }
}
