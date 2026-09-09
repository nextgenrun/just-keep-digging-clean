import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { LEVEL_UP_PRESENTATION } from "../../values/levelUpPresentation.js";
import { prepareArt, fitBakedUiImage, fitLiveUiText } from "./bakedUiArt.js";

export class LevelUpRewardPresentation {
  constructor(scene) {
    this.scene = scene;
    this.config = LEVEL_UP_PRESENTATION;
    this.hideTimer = null;
    this.lastReward = null;
    this.active = scene.textures?.exists?.(ASSET_KEYS.ui.approvedHud.levelUpShell) === true;
    if (!this.active) return;

    this.root = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.config.depth)
      .setVisible(false);
    const art = prepareArt(scene, {
      key: ASSET_KEYS.ui.approvedHud.levelUpShell,
      ...APPROVED_HUD_SKIN.frames.levelUpShell,
    });
    this.background = fitBakedUiImage(scene.add.image(0, 0, art.key, art.frame),
      this.config.width, this.config.height);
    this.title = this._createText(this.config.titleY, this.config.titleFontSize, this.config.colors.title);
    this.panic = this._createText(
      this.config.panicY,
      this.config.panicFontSize,
      this.config.colors.panic,
    );
    this.reward = this._createText(
      this.config.rewardY,
      this.config.rewardFontSize,
      this.config.colors.reward,
    );
    this.root.add([this.background, this.title, this.panic, this.reward]);
    this.resize();
  }

  _createText(y, fontSize, color) {
    return this.scene.add.text(this.config.textOffsetX, y, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color,
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
      align: "center",
    }).setOrigin(0.5);
  }

  show(reward = {}) {
    if (!this.active || !this.root?.active) return false;
    this.lastReward = { ...reward };
    this.hideTimer?.remove?.();
    this.scene.tweens?.killTweensOf?.([this.root, this.background]);

    const cfg = this.config;
    const copy = cfg.copy;
    const level = Math.max(1, Math.floor(Number(reward.level) || 1));
    const levelsGained = Math.max(1, Math.floor(Number(reward.levelsGained) || 1));
    const talentPoints = Math.max(0, Math.floor(Number(reward.talentPointsGain) || 0));
    this.title.setText(talentPoints > 0
      ? `${copy.level} ${level}${copy.separator}+${talentPoints} ${talentPoints === 1 ? copy.talentPoint : copy.talentPoints}`
      : levelsGained > 1
        ? `${copy.level} ${level}${copy.separator}+${levelsGained} ${copy.levels}`
        : `${copy.level} ${level} ${copy.reached}`);
    this.panic.setText(
      `${copy.panicResistance} +${Math.max(0, Math.round(reward.panicResistanceGainMeters || 0))}m`
      + `${copy.separator}${copy.total} ${Math.max(0, Math.round(reward.panicResistanceMeters || 0))}m`,
    );
    this.reward.setText(
      `${copy.miningPower} +${Math.max(0, Math.round(reward.miningPowerGainPercent || 0))}%`
      + `${copy.separator}${copy.maxGemPower} +${Math.max(0, Math.round(reward.gemPowerMaxGain || 0))}`
      + `${copy.separator}${copy.gemPowerRefilled}`,
    );
    for (const text of [this.title, this.panic, this.reward]) {
      fitLiveUiText(text, cfg.textWidth);
    }

    this.root
      .setVisible(true)
      .setAlpha(0)
      .setPosition(this.centerX, this.centerY + cfg.entryOffsetYPx)
      .setScale(this.baseScale * cfg.entryScale);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      y: this.centerY,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
      duration: cfg.enterMs,
      ease: "Back.out",
      onComplete: () => this._emphasizeAndHold(),
    });
    return true;
  }

  _emphasizeAndHold() {
    if (!this.root?.active) return;
    this.scene.tweens.add({
      targets: this.root,
      scaleX: this.baseScale * this.config.emphasisScale,
      scaleY: this.baseScale * this.config.emphasisScale,
      duration: this.config.emphasisMs,
      ease: "Sine.inOut",
      yoyo: true,
    });
    this.hideTimer = this.scene.time.delayedCall(
      this.config.holdMs,
      () => this.hide(),
    );
  }

  hide() {
    this.hideTimer?.remove?.();
    this.hideTimer = null;
    if (!this.root?.visible) return false;
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      y: this.centerY - this.config.exitOffsetYPx,
      duration: this.config.exitMs,
      ease: "Quad.in",
      onComplete: () => this.root?.setVisible(false),
    });
    return true;
  }

  resize() {
    if (!this.active || !this.root) return;
    const reference = this.config.referenceViewport;
    const viewportWidth = this.scene.scale?.width || reference.width;
    const viewportHeight = this.scene.scale?.height || reference.height;
    this.baseScale = Math.max(
      this.config.minimumScale,
      Math.min(
        this.config.maximumScale,
        viewportWidth / reference.width,
        viewportHeight / reference.height,
      ),
    );
    this.centerX = viewportWidth / 2;
    this.centerY = viewportHeight * this.config.centerYRatio;
    this.root.setPosition(this.centerX, this.centerY).setScale(this.baseScale);
  }

  getHealthSnapshot() {
    return {
      active: this.active,
      visible: this.root?.visible === true,
      level: this.lastReward?.level || null,
      talentPointsGain: this.lastReward?.talentPointsGain || 0,
      panicResistanceMeters: this.lastReward?.panicResistanceMeters || 0,
      textureKey: this.background?.texture?.key || null,
      bakedIcon: true,
    };
  }

  destroy() {
    this.hideTimer?.remove?.();
    this.scene?.tweens?.killTweensOf?.([this.root, this.background]);
    this.root?.destroy(true);
    this.hideTimer = null;
    this.root = null;
    this.background = null;
    this.icon = null;
    this.title = null;
    this.panic = null;
    this.reward = null;
    this.scene = null;
    this.active = false;
  }
}
