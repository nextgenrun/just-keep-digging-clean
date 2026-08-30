import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { enumerateDiscTiles } from "./CelestialActivationBudget.js";

export class WaywardStarEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = this.definitionOverride
      || CELESTIAL_ENGINE_CONFIG.engines[this.budget.engineId];
    this.x = this.startX;
    this.y = this.startY;
    this.vx = this.direction.x * this.definition.speedTilesPerSecond * this.tileSize;
    this.vy = this.direction.y * this.definition.speedTilesPerSecond * this.tileSize;
    this.lastTrailAt = -Infinity;
    this.supernovaImpacts = 0;
    this.supernovaTargetKeys = new Set();
    this.active = true;
    this.finishing = false;
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
    this.glow = this.scene.add.circle(this.x, this.y, this.definition.displaySizePx * 0.42, 0x5de9ff, 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth - 1);
    this.sprite = this.scene.add.image(this.x, this.y, this.assetKey)
      .setDisplaySize(this.definition.displaySizePx, this.definition.displaySizePx)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth);
    this.spriteBaseScaleX = this.sprite.scaleX;
    this.spriteBaseScaleY = this.sprite.scaleY;
    this.scene.tweens.add({
      targets: this.glow,
      scale: 1.32,
      alpha: 0.08,
      duration: CELESTIAL_ENGINE_CONFIG.fx.launchPulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  update(nowMs, deltaMs) {
    if (!this.active || this.finishing) return;
    if (this.budget.isExpired(nowMs) || this.budget.isImpactCapReached()) {
      this._detonate(nowMs);
      return;
    }

    const dt = Math.min(0.05, Math.max(0, Number(deltaMs) || 0) / 1000);
    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;
    const xTile = this.toTile(nextX, this.y);
    const yTile = this.toTile(this.x, nextY);
    const diagonalTile = this.toTile(nextX, nextY);
    const blockedX = this.probeTile(xTile.tx, xTile.ty).solid;
    const blockedY = this.probeTile(yTile.tx, yTile.ty).solid;
    const blockedDiagonal = this.probeTile(diagonalTile.tx, diagonalTile.ty).solid;

    if (blockedX || blockedY || blockedDiagonal) {
      const targets = [];
      if (blockedX) targets.push(xTile);
      if (blockedY) targets.push(yTile);
      if (!blockedX && !blockedY && blockedDiagonal) targets.push(diagonalTile);
      this._impactTargets(targets, nowMs);

      if (blockedX || (!blockedY && blockedDiagonal)) this.vx *= -1;
      if (blockedY || (!blockedX && blockedDiagonal)) this.vy *= -1;
      if (!this.budget.tryBounce() || this.budget.bounces >= this.definition.maxBounces) {
        this._detonate(nowMs);
        return;
      }
      this.onBounce?.(this.x, this.y, this.budget.bounces);
    } else {
      this.x = nextX;
      this.y = nextY;
    }

    this.sprite.setPosition(this.x, this.y);
    this.glow.setPosition(this.x, this.y);
    this.sprite.angle += CELESTIAL_ENGINE_CONFIG.fx.waywardRotationDegPerSecond * dt;
    if (nowMs - this.lastTrailAt >= this.definition.trailIntervalMs) {
      this.lastTrailAt = nowMs;
      this._spawnTrail();
    }
  }

  _impactTargets(targets, nowMs) {
    const seen = new Set();
    for (const tile of targets) {
      const key = `${tile.tx},${tile.ty}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const hitId = this.budget.tryImpact(tile.tx, tile.ty);
      if (!hitId) continue;
      this.onImpact?.(tile.tx, tile.ty, hitId, nowMs);
    }
    this._spawnImpactRing(this.definition.accent);
  }

  _detonate(nowMs) {
    if (this.finishing || !this.active) return;
    this.finishing = true;
    const center = this.toTile(this.x, this.y);
    const maxSupernovaImpacts = Math.max(
      0,
      Math.floor(Number(this.definition.supernovaMaxImpacts) || 0),
    );
    for (const tile of enumerateDiscTiles(center, this.definition.supernovaRadiusTiles)) {
      if (this.supernovaImpacts >= maxSupernovaImpacts) break;
      if (!this.probeTile(tile.tx, tile.ty).diggable) continue;
      this.supernovaImpacts += 1;
      this.supernovaTargetKeys.add(`${tile.tx},${tile.ty}`);
      const hitId = [
        this.budget.activationId,
        "supernova",
        this.supernovaImpacts,
        tile.tx + "," + tile.ty,
      ].join(":");
      this.onImpact?.(tile.tx, tile.ty, hitId, nowMs);
    }
    this._spawnImpactRing(0xffffff, 4.8);
    this.scene.tweens?.killTweensOf?.(this.glow);
    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0,
      scale: 2.4,
      duration: CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
      ease: "Power2.out",
    });
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: this.spriteBaseScaleX * 2.4,
      scaleY: this.spriteBaseScaleY * 2.4,
      duration: CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
      ease: "Power2.out",
      onComplete: () => this._finish("detonated"),
    });
  }

  _spawnTrail() {
    const trail = this.scene.add.circle(this.x, this.y, this.definition.displaySizePx * 0.16, 0x55dfff, 0.46)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth - 2);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.2,
      duration: CELESTIAL_ENGINE_CONFIG.fx.trailLifeMs,
      onComplete: () => trail.destroy(),
    });
  }

  _spawnImpactRing(color, scale = 2.6) {
    const ring = this.scene.add.circle(this.x, this.y, this.tileSize * 0.38, color, 0.08)
      .setStrokeStyle(3, color, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth - 1);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale,
      duration: CELESTIAL_ENGINE_CONFIG.fx.impactPulseMs,
      onComplete: () => ring.destroy(),
    });
  }

  _finish(reason) {
    if (!this.active) return;
    this.active = false;
    this.onComplete?.(reason, {
      ...this.getSnapshot(this.scene.time?.now || 0),
    });
    this._destroyVisual();
  }

  getSnapshot(nowMs) {
    const route = this.budget.getSnapshot(nowMs);
    const maxSupernovaImpacts = Math.max(
      0,
      Math.floor(Number(this.definition.supernovaMaxImpacts) || 0),
    );
    const uniqueTargets = new Set([
      ...this.budget._targetKeys,
      ...this.supernovaTargetKeys,
    ]).size;
    return {
      ...route,
      active: this.active,
      finishing: this.finishing,
      remainingMs: Math.max(0, route.lifetimeMs - route.ageMs),
      routeImpacts: route.impacts,
      maxRouteImpacts: route.maxImpacts,
      supernovaImpacts: this.supernovaImpacts,
      maxSupernovaImpacts,
      impacts: route.impacts + this.supernovaImpacts,
      maxImpacts: route.maxImpacts + maxSupernovaImpacts,
      uniqueTargets,
    };
  }

  _destroyVisual() {
    this.scene.tweens?.killTweensOf?.(this.sprite);
    this.scene.tweens?.killTweensOf?.(this.glow);
    this.sprite?.destroy();
    this.glow?.destroy();
  }

  destroy() {
    this.active = false;
    this._destroyVisual();
  }
}
