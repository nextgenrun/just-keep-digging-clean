import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { enumerateDiscTiles } from "./CelestialActivationBudget.js";

export class HollowSunEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = this.definitionOverride
      || CELESTIAL_ENGINE_CONFIG.engines[this.budget.engineId];
    this.active = true;
    this.finishing = false;
    this.nextPulseIndex = 0;
    this.masteryImpacts = 0;
    this._createVisual();
  }

  _createVisual() {
    const depth = CELESTIAL_ENGINE_CONFIG.fx.worldDepth;
    this.core = this.scene.add.circle(
      this.x,
      this.y,
      this.definition.coreRadiusPx,
      0x000000,
      1,
    ).setDepth(depth - 1);
    this.sprite = this.scene.add.image(this.x, this.y, this.assetKey)
      .setDisplaySize(this.definition.displaySizePx, this.definition.displaySizePx)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth);
    this.spriteBaseScaleX = this.sprite.scaleX;
    this.spriteBaseScaleY = this.sprite.scaleY;
    this.orbit = this.scene.add.circle(this.x, this.y, this.definition.displaySizePx * 0.34, 0x000000, 0)
      .setStrokeStyle(2, this.definition.accent, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth - 2);
    this.sprite.setScale(this.spriteBaseScaleX * 0.2, this.spriteBaseScaleY * 0.2);
    this.sprite.setAlpha(0);
    this.orbit.setScale(0.2).setAlpha(0);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.spriteBaseScaleX,
      scaleY: this.spriteBaseScaleY,
      alpha: { from: 0, to: 1 },
      duration: CELESTIAL_ENGINE_CONFIG.fx.launchPulseMs,
      ease: "Back.out",
    });
    this.scene.tweens.add({
      targets: this.orbit,
      scale: 1,
      alpha: { from: 0, to: 1 },
      duration: CELESTIAL_ENGINE_CONFIG.fx.launchPulseMs,
      ease: "Back.out",
      onComplete: () => {
        if (!this.active || this.finishing) return;
        this.scene.tweens.add({
          targets: this.orbit,
          scale: 1.42,
          alpha: 0.12,
          duration: CELESTIAL_ENGINE_CONFIG.fx.hollowOrbitCycleMs,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      },
    });
  }

  update(nowMs, deltaMs) {
    if (!this.active || this.finishing) return;
    const age = Number(nowMs) - this.budget.startedAtMs;
    while (
      this.nextPulseIndex < this.definition.pulseTimesMs.length
      && age >= this.definition.pulseTimesMs[this.nextPulseIndex]
    ) {
      this._pulse(this.nextPulseIndex, nowMs);
      this.nextPulseIndex += 1;
    }

    const dt = Math.max(0, Number(deltaMs) || 0) / 1000;
    this.sprite.angle += CELESTIAL_ENGINE_CONFIG.fx.hollowRotationDegPerSecond * dt;
    this.core.setScale(1 + Math.sin(age / CELESTIAL_ENGINE_CONFIG.fx.hollowCorePulseMs) * 0.05);

    if (this.budget.isExpired(nowMs)) {
      this._implode(nowMs);
    }
  }

  _pulse(index, nowMs) {
    const radius = this.definition.pulseRadiiTiles[index];
    const center = this.toTile(this.x, this.y);
    for (const tile of enumerateDiscTiles(center, radius)) {
      const probe = this.probeTile(tile.tx, tile.ty);
      if (!probe.diggable) continue;
      const hitId = this.budget.tryImpact(tile.tx, tile.ty);
      if (!hitId) {
        if (this.budget.isImpactCapReached()) break;
        continue;
      }
      this.onImpact?.(tile.tx, tile.ty, hitId, nowMs);
    }
    this._spawnGravityRing(radius, index);
    this.onPulse?.(this.x, this.y, index + 1);
  }

  _spawnGravityRing(radiusTiles, index) {
    const radiusPx = Math.max(this.tileSize, radiusTiles * this.tileSize);
    const ring = this.scene.add.circle(this.x, this.y, radiusPx, 0x000000, 0)
      .setStrokeStyle(4, index % 2 === 0 ? 0x72eaff : 0xb979ff, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth - 2)
      .setScale(1.18);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 0.12,
      duration: CELESTIAL_ENGINE_CONFIG.fx.impactPulseMs * 2,
      ease: "Power2.in",
      onComplete: () => ring.destroy(),
    });
  }

  _implode(nowMs) {
    if (this.finishing || !this.active) return;
    this.finishing = true;
    this._applyMasteryImplosion(nowMs);
    const flash = this.scene.add.circle(this.x, this.y, this.tileSize * 0.5, 0xffffff, 0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + 1);
    this.scene.tweens.add({
      targets: [this.orbit, this.core],
      scale: 0.05,
      alpha: 0,
      duration: CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
      ease: "Power3.in",
    });
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.spriteBaseScaleX * 0.05,
      scaleY: this.spriteBaseScaleY * 0.05,
      alpha: 0,
      duration: CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
      ease: "Power3.in",
      onComplete: () => this._finish("imploded"),
    });
    this.scene.tweens.add({
      targets: flash,
      scale: 4,
      alpha: 0,
      duration: CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
      onComplete: () => flash.destroy(),
    });
  }

  _applyMasteryImplosion(nowMs) {
    const radius = Math.max(0, Math.floor(this.definition.implosionRadiusTiles || 0));
    const maxImpacts = Math.max(0, Math.floor(this.definition.implosionMaxImpacts || 0));
    if (radius <= 0 || maxImpacts <= 0) return;
    const center = this.toTile(this.x, this.y);
    for (const tile of enumerateDiscTiles(center, radius)) {
      if (this.masteryImpacts >= maxImpacts) break;
      if (!this.probeTile(tile.tx, tile.ty).diggable) continue;
      this.masteryImpacts += 1;
      const hitId = [
        this.budget.activationId,
        "implosion",
        this.masteryImpacts,
        tile.tx + "," + tile.ty,
      ].join(":");
      this.onImpact?.(tile.tx, tile.ty, hitId, nowMs);
    }
  }

  _finish(reason) {
    if (!this.active) return;
    this.active = false;
    this.sprite?.destroy();
    this.orbit?.destroy();
    this.core?.destroy();
    this.onComplete?.(reason, this.budget.getSnapshot(this.scene.time?.now || 0));
  }

  destroy() {
    this.active = false;
    this.sprite?.destroy();
    this.orbit?.destroy();
    this.core?.destroy();
  }
}
