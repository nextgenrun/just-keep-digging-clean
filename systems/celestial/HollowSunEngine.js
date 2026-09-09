import { CelestialStarVfx } from "./CelestialStarVfx.js";
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
    this.visual = new CelestialStarVfx({ scene: this.scene, x: this.x, y: this.y,
      assetKey: this.assetKey, size: this.definition.displaySizePx, kind: "hollow",
      coreRadius: this.definition.coreRadiusPx, delay: Math.max(0, Number(this.visualDelayMs) || 0) });
    this.sprite = this.visual.sprite;
    this.core = this.visual.core;
    this.orbit = this.visual.halo;
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

    this.visual.update(nowMs, deltaMs);

    if (this.budget.isExpired(nowMs)) {
      this._implode(nowMs);
    }
  }

  setPosition(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    this.x = x;
    this.y = y;
    this.visual.setPosition(x, y);
    return true;
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
    this.onPulse?.(this.x, this.y, index + 1, nowMs);
  }

  triggerControlPulse(nowMs, radiusTiles, impactCap) {
    if (!this.active || this.finishing) return 0;
    const radius = Math.max(0.5, Number(radiusTiles) || 0.5);
    const cap = Math.max(1, Math.floor(Number(impactCap) || 1));
    const center = this.toTile(this.x, this.y);
    let impacts = 0;
    for (const tile of enumerateDiscTiles(center, radius)) {
      if (impacts >= cap || this.budget.isImpactCapReached()) break;
      const probe = this.probeTile(tile.tx, tile.ty);
      if (!probe.diggable) continue;
      const hitId = this.budget.tryImpact(tile.tx, tile.ty);
      if (!hitId) continue;
      impacts += 1;
      this.onImpact?.(tile.tx, tile.ty, hitId, nowMs);
      this._spawnPulledFragment(tile, probe, this.nextPulseIndex, impacts - 1);
    }
    this._spawnGravityRing(radius, this.nextPulseIndex);
    return impacts;
  }

  _spawnGravityRing(radiusTiles, index) {
    this.visual.pulse(Math.max(this.tileSize, radiusTiles * this.tileSize), index);
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
    this.visual.finish(() => this._finish("imploded"));
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
    this.visual?.destroy();
  }

  destroy() {
    this.active = false;
    this._destroyVisual();
    this._clearPulledFragments();
  }
}
