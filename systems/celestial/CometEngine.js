import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { getPerpendicularDirections } from "./CelestialActivationBudget.js";

export class CometEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = CELESTIAL_ENGINE_CONFIG.engines[this.budget.engineId];
    this.startTile = this.toTile(this.startX, this.startY);
    this.lastProcessedStep = 0;
    this.lastTrailAt = -Infinity;
    this.active = true;
    this.finishing = false;
    this._createVisual();
  }

  _createVisual() {
    this.sprite = this.scene.add.image(this.startX, this.startY, this.assetKey)
      .setDisplaySize(this.definition.displaySizePx, this.definition.displaySizePx)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth);
    this.spriteBaseScaleX = this.sprite.scaleX;
    this.spriteBaseScaleY = this.sprite.scaleY;
    this.sprite.rotation = Math.atan2(this.direction.y, this.direction.x);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.spriteBaseScaleX * CELESTIAL_ENGINE_CONFIG.fx.cometPulseScale,
      scaleY: this.spriteBaseScaleY * CELESTIAL_ENGINE_CONFIG.fx.cometPulseScale,
      duration: CELESTIAL_ENGINE_CONFIG.fx.launchPulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  update(nowMs) {
    if (!this.active || this.finishing) return;
    const ageSeconds = Math.max(0, Number(nowMs) - this.budget.startedAtMs) / 1000;
    const travelTiles = Math.min(
      this.definition.maxTravelTiles,
      ageSeconds * this.definition.speedTilesPerSecond,
    );
    const step = Math.floor(travelTiles);

    for (let index = this.lastProcessedStep + 1; index <= step; index += 1) {
      if (!this._processStep(index, nowMs)) return;
      this.lastProcessedStep = index;
    }

    const distancePx = travelTiles * this.tileSize;
    const x = this.startX + this.direction.x * distancePx;
    const y = this.startY + this.direction.y * distancePx;
    this.sprite.setPosition(x, y);
    if (nowMs - this.lastTrailAt >= this.definition.trailIntervalMs) {
      this.lastTrailAt = nowMs;
      this._spawnTrail(x, y);
    }

    if (
      travelTiles >= this.definition.maxTravelTiles
      || this.budget.isExpired(nowMs)
      || this.budget.isImpactCapReached()
    ) {
      this._finishWithBurst("travel-cap");
    }
  }

  _processStep(step, nowMs) {
    const tx = this.startTile.tx + this.direction.x * step;
    const ty = this.startTile.ty + this.direction.y * step;
    const probe = this.probeTile(tx, ty);
    if (!probe.inBounds || (probe.solid && !probe.diggable)) {
      this.onBlocked?.(tx, ty, probe);
      this._finishWithBurst("protected-tile");
      return false;
    }

    this._tryImpact(tx, ty, nowMs);
    if (step % this.definition.sideBurstEveryTiles === 0) {
      for (const side of getPerpendicularDirections(this.direction)) {
        this._tryImpact(tx + side.x, ty + side.y, nowMs);
      }
    }
    if (this.budget.isImpactCapReached()) {
      this._finishWithBurst("impact-cap");
      return false;
    }
    return true;
  }

  _tryImpact(tx, ty, nowMs) {
    const probe = this.probeTile(tx, ty);
    if (!probe.diggable) return false;
    const hitId = this.budget.tryImpact(tx, ty);
    if (!hitId) return false;
    this.onImpact?.(tx, ty, hitId, nowMs);
    return true;
  }

  _spawnTrail(x, y) {
    const trail = this.scene.add.circle(x, y, this.tileSize * 0.24, 0x48dfff, 0.52)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth - 2);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.15,
      duration: CELESTIAL_ENGINE_CONFIG.fx.trailLifeMs,
      onComplete: () => trail.destroy(),
    });
  }

  _finishWithBurst(reason) {
    if (this.finishing || !this.active) return;
    this.finishing = true;
    const burst = this.scene.add.circle(
      this.sprite.x,
      this.sprite.y,
      this.tileSize * 0.5,
      this.definition.accent,
      0.45,
    ).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + 1);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 2.8,
      duration: CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
      ease: "Power2.out",
      onComplete: () => burst.destroy(),
    });
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: this.spriteBaseScaleX * 2.8,
      scaleY: this.spriteBaseScaleY * 2.8,
      duration: CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
      ease: "Power2.out",
      onComplete: () => {
        this._finish(reason);
      },
    });
  }

  _finish(reason) {
    if (!this.active) return;
    this.active = false;
    this.sprite?.destroy();
    this.onComplete?.(reason, this.budget.getSnapshot(this.scene.time?.now || 0));
  }

  destroy() {
    this.active = false;
    this.sprite?.destroy();
  }
}
