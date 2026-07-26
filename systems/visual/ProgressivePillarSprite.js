/**
 * Bottom-anchored approved pillar sprite with natural five-stage growth.
 * All presentation values are supplied by values/pillarVisuals.js.
 */
export class ProgressivePillarSprite {
  constructor(scene, x, baseY, stageKeys, visualConfig) {
    this.scene = scene;
    this.x = x;
    this.baseY = baseY;
    this.stageKeys = stageKeys;
    this.config = visualConfig;
    this.image = null;
    this.glow = null;
    this.stageIndex = -1;
    this.displayScale = 1;
  }

  create(initialStageIndex = 0) {
    const maxTexture = this.scene.textures.get(this.stageKeys.at(-1));
    const source = maxTexture?.getSourceImage?.();
    const maxSourceHeight = Math.max(1, source?.height || this.config.maxHeightPx);
    this.displayScale = this.config.maxHeightPx / maxSourceHeight;

    this.glow = this.scene.add.ellipse(
      this.x,
      this.baseY - this.config.glowHeightPx * 0.35,
      this.config.glowWidthPx,
      this.config.glowHeightPx,
      this.config.glowColor,
      this.config.glowAlpha,
    ).setDepth(this.config.depth - 1);

    if (typeof Phaser !== "undefined" && Phaser.BlendModes?.ADD !== undefined) {
      this.glow.setBlendMode(Phaser.BlendModes.ADD);
    }

    this.scene.tweens.add({
      targets: this.glow,
      scaleX: this.config.glowPulseScale,
      alpha: { from: this.config.glowAlpha, to: this.config.glowAlpha * 0.55 },
      duration: this.config.glowPulseDurationMs,
      ease: "Sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    this.setStage(initialStageIndex, false);
    return this;
  }

  setStage(stageIndex, animate = true) {
    const nextIndex = Phaser.Math.Clamp(
      Number(stageIndex) || 0,
      0,
      this.stageKeys.length - 1,
    );
    const changed = nextIndex !== this.stageIndex;
    if (!changed && this.image?.active) return false;

    if (!this.image?.active) {
      this.image = this.scene.add.image(this.x, this.baseY, this.stageKeys[nextIndex])
        .setOrigin(0.5, 1)
        .setDepth(this.config.depth)
        .setScale(this.displayScale);
    } else {
      this.scene.tweens.killTweensOf(this.image);
      this.image.setTexture(this.stageKeys[nextIndex]);
      this.image.setPosition(this.x, this.baseY);
      this.image.setOrigin(0.5, 1);
    }

    this.stageIndex = nextIndex;
    if (!animate) {
      this.image.setScale(this.displayScale).setAlpha(1);
      return true;
    }

    const startScale = this.displayScale * this.config.transitionStartScale;
    this.image.setScale(startScale).setAlpha(this.config.transitionStartAlpha);
    this.scene.tweens.add({
      targets: this.image,
      scaleX: this.displayScale,
      scaleY: this.displayScale,
      alpha: 1,
      duration: this.config.transitionDurationMs,
      ease: "Back.out",
    });
    this.flash();
    return true;
  }

  flash() {
    if (!this.image?.active) return;
    const burst = this.scene.add.ellipse(
      this.x,
      this.baseY - this.image.displayHeight * 0.42,
      this.image.displayWidth * 0.75,
      this.image.displayHeight * 0.34,
      this.config.glowColor,
      this.config.glowAlpha * 2.4,
    ).setDepth(this.config.depth + 1);
    if (typeof Phaser !== "undefined" && Phaser.BlendModes?.ADD !== undefined) {
      burst.setBlendMode(Phaser.BlendModes.ADD);
    }
    this.scene.tweens.add({
      targets: burst,
      scaleX: 2.2,
      scaleY: 1.7,
      alpha: 0,
      duration: this.config.transitionDurationMs * 1.4,
      ease: "Power2.out",
      onComplete: () => burst.destroy(),
    });
  }

  getTopY() {
    return this.image?.active
      ? this.baseY - this.image.height * this.displayScale
      : this.baseY;
  }

  getImage() {
    return this.image;
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.image);
    this.scene.tweens.killTweensOf(this.glow);
    this.image?.destroy();
    this.glow?.destroy();
    this.image = null;
    this.glow = null;
  }
}
