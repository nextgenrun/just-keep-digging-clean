import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  resolveTileDestructionFamily,
  resolveTileDestructionTint,
} from "../../values/tileDestructionFx.js";
import {
  enumerateDiscTiles,
  enumerateExpandingPulseTiles,
} from "./CelestialActivationBudget.js";

export class HollowSunEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = this.definitionOverride
      || CELESTIAL_ENGINE_CONFIG.engines[this.budget.engineId];
    this.active = true;
    this.finishing = false;
    this.nextPulseIndex = 0;
    this.pulseImpacts = [];
    this.masteryImpacts = 0;
    this.masteryTargetKeys = new Set();
    this.pulledFragments = new Set();
    this.pulledFragmentCount = 0;
    try {
      this._createVisual();
    } catch (error) {
      this.active = false;
      this._destroyVisual();
      throw error;
    }
  }

  _createVisual() {
    const depth = CELESTIAL_ENGINE_CONFIG.fx.worldDepth;
    const visualDelayMs = Math.max(0, Number(this.visualDelayMs) || 0);
    this.core = this.scene.add.circle(
      this.x,
      this.y,
      this.definition.coreRadiusPx,
      0x000000,
      1,
    ).setDepth(depth - 1)
      .setScale(0.2)
      .setAlpha(0);
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
      delay: visualDelayMs,
      duration: CELESTIAL_ENGINE_CONFIG.fx.launchPulseMs,
      ease: "Back.out",
    });
    this.scene.tweens.add({
      targets: this.core,
      scale: 1,
      alpha: { from: 0, to: 1 },
      delay: visualDelayMs,
      duration: CELESTIAL_ENGINE_CONFIG.fx.launchPulseMs,
      ease: "Back.out",
    });
    this.scene.tweens.add({
      targets: this.orbit,
      scale: 1,
      alpha: { from: 0, to: 1 },
      delay: visualDelayMs,
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

    const dt = Math.min(0.05, Math.max(0, Number(deltaMs) || 0) / 1000);
    this.sprite.angle += CELESTIAL_ENGINE_CONFIG.fx.hollowRotationDegPerSecond * dt;
    this.core.setScale(1 + Math.sin(age / CELESTIAL_ENGINE_CONFIG.fx.hollowCorePulseMs) * 0.05);

    if (this.budget.isExpired(nowMs)) {
      this._implode(nowMs);
    }
  }

  _pulse(index, nowMs) {
    const radius = this.definition.pulseRadiiTiles[index];
    const previousRadius = index > 0 ? this.definition.pulseRadiiTiles[index - 1] : 0;
    const pulseImpactCap = Math.max(
      0,
      Math.floor(Number(this.definition.pulseImpactCaps?.[index]) || 0),
    );
    let pulseImpacts = 0;
    const center = this.toTile(this.x, this.y);
    for (const tile of enumerateExpandingPulseTiles(center, radius, previousRadius)) {
      if (pulseImpacts >= pulseImpactCap) break;
      const probe = this.probeTile(tile.tx, tile.ty);
      if (!probe.diggable) continue;
      const hitId = this.budget.tryImpact(tile.tx, tile.ty);
      if (!hitId) {
        if (this.budget.isImpactCapReached()) break;
        continue;
      }
      pulseImpacts += 1;
      this.onImpact?.(tile.tx, tile.ty, hitId, nowMs);
      this._spawnPulledFragment(tile, probe, index, pulseImpacts - 1);
    }
    this.pulseImpacts[index] = pulseImpacts;
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

  _spawnPulledFragment(tile, probe, pulseIndex, fragmentIndex) {
    const fx = CELESTIAL_ENGINE_CONFIG.fx.hollowPull;
    if (
      fragmentIndex >= fx.maxShardsPerPulse
      || !this.scene?.textures?.exists?.(TILE_DESTRUCTION_FX_CONFIG.assets.shards.key)
    ) return;
    const family = resolveTileDestructionFamily(probe.type);
    const tint = resolveTileDestructionTint(probe.type);
    const shardCount = TILE_DESTRUCTION_FX_CONFIG.shards.count;
    const frameNumber = (pulseIndex + fragmentIndex) % shardCount + 1;
    const frame = `${family}-s${String(frameNumber).padStart(2, "0")}`;
    const worldX = tile.tx * this.tileSize + this.tileSize / 2;
    const worldY = tile.ty * this.tileSize + this.tileSize / 2;
    const shard = this.scene.add.image(
      worldX,
      worldY,
      TILE_DESTRUCTION_FX_CONFIG.assets.shards.key,
      frame,
    ).setDisplaySize(
      this.tileSize * fx.displaySizeTiles,
      this.tileSize * fx.displaySizeTiles,
    ).setTint(tint)
      .setAlpha(fx.startAlpha)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + fx.depthOffset);
    const distanceTiles = Math.hypot(worldX - this.x, worldY - this.y) / this.tileSize;
    const duration = Math.min(
      fx.maximumDurationMs,
      fx.minimumDurationMs + distanceTiles * fx.durationPerTileMs,
    );
    const baseScaleX = shard.scaleX;
    const baseScaleY = shard.scaleY;
    this.pulledFragments.add(shard);
    this.pulledFragmentCount += 1;
    this.scene.tweens.add({
      targets: shard,
      x: this.x,
      y: this.y,
      rotation: shard.rotation + fx.rotationRadians,
      scaleX: baseScaleX * fx.endScale,
      scaleY: baseScaleY * fx.endScale,
      alpha: 0,
      duration,
      ease: "Power3.in",
      onComplete: () => this._releasePulledFragment(shard),
    });
  }

  _releasePulledFragment(shard) {
    this.pulledFragments?.delete?.(shard);
    shard?.destroy?.();
  }

  _clearPulledFragments() {
    for (const shard of this.pulledFragments || []) {
      this.scene.tweens?.killTweensOf?.(shard);
      shard.destroy?.();
    }
    this.pulledFragments?.clear?.();
  }

  _implode(nowMs) {
    if (this.finishing || !this.active) return;
    this.finishing = true;
    this._applyMasteryImplosion(nowMs);
    this.scene.tweens?.killTweensOf?.(this.sprite);
    this.scene.tweens?.killTweensOf?.(this.orbit);
    this.scene.tweens?.killTweensOf?.(this.core);
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
      this.masteryTargetKeys.add(`${tile.tx},${tile.ty}`);
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
    const health = this.getSnapshot(this.scene.time?.now || 0);
    this._destroyVisual();
    this._clearPulledFragments();
    this.onComplete?.(reason, health);
  }

  getSnapshot(nowMs) {
    const pulse = this.budget.getSnapshot(nowMs);
    const maxImplosionImpacts = Math.max(
      0,
      Math.floor(Number(this.definition.implosionMaxImpacts) || 0),
    );
    const uniqueTargets = new Set([
      ...this.budget._targetKeys,
      ...this.masteryTargetKeys,
    ]).size;
    return {
      ...pulse,
      active: this.active,
      finishing: this.finishing,
      remainingMs: Math.max(0, pulse.lifetimeMs - pulse.ageMs),
      pulseImpacts: [...this.pulseImpacts],
      completedPulses: this.nextPulseIndex,
      totalPulses: this.definition.pulseTimesMs.length,
      maxPulseImpacts: pulse.maxImpacts,
      implosionImpacts: this.masteryImpacts,
      maxImplosionImpacts,
      impacts: pulse.impacts + this.masteryImpacts,
      maxImpacts: pulse.maxImpacts + maxImplosionImpacts,
      uniqueTargets,
      pulledFragments: this.pulledFragmentCount,
    };
  }

  _destroyVisual() {
    this.scene.tweens?.killTweensOf?.(this.sprite);
    this.scene.tweens?.killTweensOf?.(this.orbit);
    this.scene.tweens?.killTweensOf?.(this.core);
    this.sprite?.destroy();
    this.orbit?.destroy();
    this.core?.destroy();
  }

  destroy() {
    this.active = false;
    this._destroyVisual();
    this._clearPulledFragments();
  }
}
