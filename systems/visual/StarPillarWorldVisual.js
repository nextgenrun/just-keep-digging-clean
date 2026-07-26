import {
  resolvePillarStageIndex,
  resolveStarSocketProgress,
} from "../../values/pillarVisuals.js";
import { ProgressivePillarSprite } from "./ProgressivePillarSprite.js";

/**
 * Approved Sky Island Star Pillar plus constellation-driven socket stars.
 * It only visualizes saved constellation state; it does not create world collectibles.
 */
export class StarPillarWorldVisual {
  constructor(scene, x, baseY, stageKeys, starTextureKey, visualConfig) {
    this.scene = scene;
    this.x = x;
    this.baseY = baseY;
    this.stageKeys = stageKeys;
    this.starTextureKey = starTextureKey;
    this.config = visualConfig;
    this.pillar = new ProgressivePillarSprite(
      scene,
      x,
      baseY,
      stageKeys,
      visualConfig,
    );
    this.socketStars = [];
    this.unlockedCount = -1;
  }

  create(unlockedCount = 0) {
    const stageIndex = this._resolveStage(unlockedCount);
    this.pillar.create(stageIndex);
    this.unlockedCount = Math.max(0, Number(unlockedCount) || 0);
    this._syncSocketStars(false, -1);
    return this;
  }

  syncUnlocked(unlockedCount, animate = true) {
    const nextCount = Math.max(0, Number(unlockedCount) || 0);
    if (nextCount === this.unlockedCount) return false;

    const previousCount = this.unlockedCount;
    const nextStage = this._resolveStage(nextCount);
    const stageChanged = this.pillar.setStage(nextStage, animate);
    this.unlockedCount = nextCount;
    this._syncSocketStars(animate, previousCount);

    if (animate && nextCount > previousCount) {
      this._playUnlockBeam();
    } else if (stageChanged) {
      this._layoutExistingStars();
    }
    return true;
  }

  getTopY() {
    return this.pillar.getTopY();
  }

  _resolveStage(unlockedCount) {
    return resolvePillarStageIndex(
      unlockedCount,
      this.config.stageUnlockThresholds,
    );
  }

  _syncSocketStars(animate, previousCount) {
    const progress = resolveStarSocketProgress(this.unlockedCount);
    const anchors = this.config.socketStages[this.pillar.stageIndex] || [];

    while (this.socketStars.length > Math.min(progress.filledSockets, anchors.length)) {
      this._destroySocketStar(this.socketStars.pop());
    }

    for (let index = 0; index < progress.filledSockets && index < anchors.length; index += 1) {
      const strength = Math.min(2, Math.max(1, this.unlockedCount - index * 2));
      let socket = this.socketStars[index];
      if (!socket) {
        socket = this._createSocketStar(index, strength);
        this.socketStars[index] = socket;
      }
      socket.strength = strength;
      this._layoutSocketStar(socket, anchors[index]);
      this._setSocketStrength(socket, strength);
    }

    if (animate && this.unlockedCount > previousCount) {
      const newest = this.socketStars[progress.newestSocketIndex];
      if (newest) this._popSocketStar(newest, progress.newestSocketStrength);
    }
  }

  _createSocketStar(index, strength) {
    const depth = this.config.depth + this.config.starDepthOffset;
    const halo = this.scene.add.image(this.x, this.baseY, this.starTextureKey)
      .setOrigin(0.5)
      .setDepth(depth)
      .setAlpha(this.config.starHaloAlpha);
    const core = this.scene.add.image(this.x, this.baseY, this.starTextureKey)
      .setOrigin(0.5)
      .setDepth(depth + 1);

    if (typeof Phaser !== "undefined") {
      if (Phaser.BlendModes?.ADD !== undefined) halo.setBlendMode(Phaser.BlendModes.ADD);
      if (Phaser.BlendModes?.SCREEN !== undefined) core.setBlendMode(Phaser.BlendModes.SCREEN);
    }

    const socket = { index, strength, halo, core, pulseTween: null };
    this._startPulse(socket);
    return socket;
  }

  _layoutExistingStars() {
    const anchors = this.config.socketStages[this.pillar.stageIndex] || [];
    this.socketStars.forEach((socket, index) => {
      if (anchors[index]) this._layoutSocketStar(socket, anchors[index]);
    });
  }

  _layoutSocketStar(socket, anchor) {
    const image = this.pillar.getImage();
    if (!image?.active) return;
    const left = image.x - image.displayWidth * 0.5;
    const top = image.y - image.displayHeight;
    const x = left + image.displayWidth * anchor.x;
    const y = top + image.displayHeight * anchor.y;
    const diameter = image.displayWidth * anchor.diameter;
    const coreSize = diameter * this.config.starCoreScale;
    const haloSize = diameter * this.config.starHaloScale;

    socket.core.setPosition(x, y).setDisplaySize(coreSize, coreSize);
    socket.halo.setPosition(x, y).setDisplaySize(haloSize, haloSize);
    socket.baseCoreScaleX = socket.core.scaleX;
    socket.baseCoreScaleY = socket.core.scaleY;
    socket.baseHaloScaleX = socket.halo.scaleX;
    socket.baseHaloScaleY = socket.halo.scaleY;
  }

  _setSocketStrength(socket, strength) {
    socket.core.setAlpha(
      strength >= 2 ? this.config.starPairAlpha : this.config.starSingleAlpha,
    );
    socket.halo.setAlpha(
      this.config.starHaloAlpha * (strength >= 2 ? 1.45 : 1),
    );
  }

  _startPulse(socket) {
    socket.pulseTween?.stop();
    socket.pulseTween = this.scene.tweens.add({
      targets: [socket.core, socket.halo],
      scaleX: `*=${this.config.starPulseScale}`,
      scaleY: `*=${this.config.starPulseScale}`,
      alpha: `+=${this.config.starHaloAlpha * 0.24}`,
      duration: this.config.starPulseDurationMs,
      delay: socket.index * this.config.starPulseStaggerMs,
      ease: "Sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }

  _popSocketStar(socket, strength) {
    this.scene.tweens.killTweensOf([socket.core, socket.halo]);
    const targetCoreX = socket.baseCoreScaleX;
    const targetCoreY = socket.baseCoreScaleY;
    const targetHaloX = socket.baseHaloScaleX;
    const targetHaloY = socket.baseHaloScaleY;
    socket.core.setScale(
      targetCoreX * this.config.starPopStartScale,
      targetCoreY * this.config.starPopStartScale,
    );
    socket.halo.setScale(
      targetHaloX * this.config.starPopStartScale,
      targetHaloY * this.config.starPopStartScale,
    );

    this.scene.tweens.add({
      targets: socket.core,
      scaleX: targetCoreX * this.config.starPopPeakScale,
      scaleY: targetCoreY * this.config.starPopPeakScale,
      duration: this.config.starPopDurationMs * 0.58,
      ease: "Back.out",
      yoyo: true,
      onComplete: () => {
        socket.core.setScale(targetCoreX, targetCoreY);
        socket.halo.setScale(targetHaloX, targetHaloY);
        this._startPulse(socket);
      },
    });
    this.scene.tweens.add({
      targets: socket.halo,
      scaleX: targetHaloX * this.config.starBurstScale,
      scaleY: targetHaloY * this.config.starBurstScale,
      alpha: { from: this.config.starBurstAlpha, to: 0 },
      duration: this.config.starBurstDurationMs,
      ease: "Power2.out",
      onComplete: () => this._setSocketStrength(socket, strength),
    });
  }

  _playUnlockBeam() {
    const topY = this.getTopY();
    const beam = this.scene.add.rectangle(
      this.x,
      topY - this.config.unlockBeamHeightPx * 0.5,
      this.config.unlockBeamWidthPx,
      this.config.unlockBeamHeightPx,
      this.config.glowColor,
      this.config.unlockBeamAlpha,
    ).setDepth(this.config.depth - 1);
    if (typeof Phaser !== "undefined" && Phaser.BlendModes?.ADD !== undefined) {
      beam.setBlendMode(Phaser.BlendModes.ADD);
    }
    this.scene.tweens.add({
      targets: beam,
      scaleX: this.config.unlockBeamExpandScale,
      alpha: 0,
      duration: this.config.unlockBeamDurationMs,
      ease: "Power2.out",
      onComplete: () => beam.destroy(),
    });
  }

  _destroySocketStar(socket) {
    if (!socket) return;
    socket.pulseTween?.stop();
    this.scene.tweens.killTweensOf([socket.core, socket.halo]);
    socket.core?.destroy();
    socket.halo?.destroy();
  }

  destroy() {
    this.socketStars.forEach((socket) => this._destroySocketStar(socket));
    this.socketStars = [];
    this.pillar.destroy();
  }
}
