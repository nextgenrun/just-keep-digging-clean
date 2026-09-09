import { celestialTileContact } from "./CelestialContactVfx.js";
import { CelestialStarVfx } from "./CelestialStarVfx.js";
import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";

export class WaywardStarEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = this.definitionOverride
      || CELESTIAL_ENGINE_CONFIG.engines[this.budget.engineId];
    this.x = this.startX;
    this.y = this.startY;
    this.vx = this.direction.x * this.definition.speedTilesPerSecond * this.tileSize;
    this.vy = this.direction.y * this.definition.speedTilesPerSecond * this.tileSize;
    this.supernovaImpacts = 0;
    this.supernovaTargetKeys = new Set();
    this.returning = false;
    this.lastReturnImpactAt = -Infinity;
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
    this.visual = new CelestialStarVfx({ scene: this.scene, x: this.x, y: this.y,
      assetKey: this.assetKey, size: this.definition.displaySizePx, kind: "wayward", tileSize: this.tileSize });
    this.sprite = this.visual.sprite;
    this.glow = this.visual.halo;
  }

  update(nowMs, deltaMs) {
    if (!this.active) return;
    if (this.returning) {
      this._updateReturn(nowMs, deltaMs);
      return;
    }
    if (this.finishing) return;
    if (this.budget.isExpired(nowMs) || this.budget.isImpactCapReached()) {
      this._finishRoute(nowMs);
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
        this._finishRoute(nowMs);
        return;
      }
      const momentum = Math.max(1, Number(this.definition.bounceSpeedMultiplier) || 1);
      this.vx *= momentum;
      this.vy *= momentum;
      this._seekFreshTarget();
      this.onBounce?.(this.x, this.y, this.budget.bounces);
    } else {
      this.x = nextX;
      this.y = nextY;
    }

    this.visual.update(nowMs, deltaMs, this.x, this.y);
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
      const direction = { x: this.vx, y: this.vy };
      this.visual.impact(celestialTileContact(this, direction, tile, this.tileSize), direction);
    }
  }

  _finishRoute(nowMs) {
    if (this.finishing || !this.active) return;
    if (this.definition.returnToPlayer === true && this.getAnchor) {
      this.finishing = true;
      this.returning = true;
      this._spawnImpactRing();
      return;
    }
    this._fadeOut("route-complete");
  }

  _fadeOut(reason) {
    if (this.finishing && !this.returning) return;
    this.finishing = true;
    this.returning = false;
    this.visual.finish(() => this._finish(reason));
  }

  _updateReturn(nowMs, deltaMs) {
    const anchor = this.getAnchor?.();
    if (!anchor) {
      this._fadeOut("route-complete");
      return;
    }
    const dx = anchor.x - this.x;
    const dy = anchor.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= this.tileSize * 0.42) {
      this._fadeOut("returned");
      return;
    }
    const dt = Math.min(0.05, Math.max(0, Number(deltaMs) || 0) / 1000);
    const speed = Math.max(1, Number(this.definition.returnSpeedTilesPerSecond) || 1)
      * this.tileSize;
    const travel = Math.min(distance, speed * dt);
    this.x += dx / distance * travel;
    this.y += dy / distance * travel;
    this.visual.update(nowMs, deltaMs, this.x, this.y);
    if (this.definition.returnCanImpact === true) this._impactReturnTile(nowMs);
  }

  _impactReturnTile(nowMs) {
    const cooldown = Math.max(0, Number(this.definition.returnImpactCooldownMs) || 0);
    if (nowMs - this.lastReturnImpactAt < cooldown) return;
    const tile = this.toTile(this.x, this.y);
    if (!this.probeTile(tile.tx, tile.ty).diggable) return;
    const hitId = this.budget.tryImpact(tile.tx, tile.ty);
    if (!hitId) return;
    this.lastReturnImpactAt = nowMs;
    this.onImpact?.(tile.tx, tile.ty, hitId, nowMs);
    const anchor = this.getAnchor();
    const direction = { x: anchor.x - this.x, y: anchor.y - this.y };
    this.visual.impact(celestialTileContact(this, direction, tile, this.tileSize), direction);
  }

  _seekFreshTarget() {
    if (this.definition.seekFreshTargets !== true) return;
    const radius = Math.max(1, Math.floor(Number(this.definition.seekRadiusTiles) || 1));
    const center = this.toTile(this.x, this.y);
    let best = null;
    for (let oy = -radius; oy <= radius; oy += 1) {
      for (let ox = -radius; ox <= radius; ox += 1) {
        const distance = Math.hypot(ox, oy);
        if (distance <= 0 || distance > radius) continue;
        const tx = center.tx + ox;
        const ty = center.ty + oy;
        if (this.budget._targetKeys.has(`${tx},${ty}`)) continue;
        if (!this.probeTile(tx, ty).diggable) continue;
        if (!best || distance < best.distance) best = { tx, ty, distance };
      }
    }
    if (!best) return;
    const targetX = best.tx * this.tileSize + this.tileSize / 2;
    const targetY = best.ty * this.tileSize + this.tileSize / 2;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = Math.hypot(this.vx, this.vy);
    this.vx = dx / length * speed;
    this.vy = dy / length * speed;
  }

  _spawnImpactRing() {
    this.visual.pulse();
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
      presentation: this.visual?.getSnapshot(),
      speedPxPerSecond: Math.hypot(this.vx, this.vy),
      active: this.active,
      finishing: this.finishing,
      returning: this.returning,
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
    this.visual?.destroy();
  }

  destroy() {
    this.active = false;
    this._destroyVisual();
  }
}
