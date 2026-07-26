import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { enumerateDiscTiles } from "./CelestialActivationBudget.js";

export class WaywardStarEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = CELESTIAL_ENGINE_CONFIG.engines[this.budget.engineId];
    this.x = this.startX;
    this.y = this.startY;
    this.vx = this.direction.x * this.definition.speedTilesPerSecond * this.tileSize;
    this.vy = this.direction.y * this.definition.speedTilesPerSecond * this.tileSize;
    this.lastTrailAt = -Infinity;
    this.lastRedirectAt = -Infinity;
    this.active = true;
    this.finishing = false;
    this._createVisual();
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

  redirect(direction, nowMs) {
    if (!this.active || this.finishing) return false;
    if (nowMs - this.lastRedirectAt < this.definition.redirectCooldownMs) return false;
    if (!this.budget.tryRedirect()) return false;
    this.lastRedirectAt = nowMs;
    const speed = this.definition.speedTilesPerSecond * this.tileSize;
    this.vx = direction.x * speed;
    this.vy = direction.y * speed;
    this.onRedirect?.(this.x, this.y, this.budget.redirects);
    this._spawnImpactRing(0xffd36b);
    return true;
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
    for (const tile of enumerateDiscTiles(center, this.definition.supernovaRadiusTiles)) {
      if (!this.probeTile(tile.tx, tile.ty).diggable) continue;
      const hitId = this.budget.tryImpact(tile.tx, tile.ty);
      if (!hitId) continue;
      this.onImpact?.(tile.tx, tile.ty, hitId, nowMs);
    }
    this._spawnImpactRing(0xffffff, 4.8);
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
    this.sprite?.destroy();
    this.glow?.destroy();
    this.onComplete?.(reason, this.budget.getSnapshot(this.scene.time?.now || 0));
  }

  destroy() {
    this.active = false;
    this.sprite?.destroy();
    this.glow?.destroy();
  }
}
