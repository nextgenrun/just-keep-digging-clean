import { celestialTileContact } from "./CelestialContactVfx.js";
import { CelestialStarVfx } from "./CelestialStarVfx.js";

function normalized(direction, fallback = { x: 1, y: 0 }) {
  const x = Number(direction?.x) || 0;
  const y = Number(direction?.y) || 0;
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : fallback;
}

/** Permanent low-power ricochet unlocked by the Wayward apex node. */
export class WaywardStarCompanion {
  constructor(options) {
    Object.assign(this, options);
    const anchor = this.getAnchor();
    this.x = anchor.x;
    this.y = anchor.y - this.tileSize * 0.8;
    this.preferredDirection = { x: 1, y: -0.35 };
    this.vx = 0;
    this.vy = 0;
    this.returning = true;
    this.bounces = 0;
    this.impacts = 0;
    this.launches = 0;
    this.returns = 0;
    this.lastImpactAt = -Infinity;
    this.active = true;
    this._createVisual();
  }

  _createVisual() {
    this.visual = new CelestialStarVfx({ scene: this.scene, x: this.x, y: this.y,
      assetKey: this.assetKey, size: this.definition.companionDisplaySizePx,
      kind: "wayward", passive: true, tileSize: this.tileSize });
    this.sprite = this.visual.sprite;
    this.glow = this.visual.halo;
  }

  steer(direction) {
    this.preferredDirection = normalized(direction, this.preferredDirection);
    return true;
  }

  update(nowMs, deltaMs) {
    if (!this.active) return;
    const dt = Math.min(0.05, Math.max(0, Number(deltaMs) || 0) / 1000);
    const anchor = this.getAnchor();
    if (this.returning) this._returnTo(anchor, dt);
    else this._ricochet(nowMs, dt, anchor);
    this.visual.update(nowMs, deltaMs, this.x, this.y);
  }

  _returnTo(anchor, dt) {
    const dx = anchor.x - this.x;
    const dy = anchor.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= this.tileSize * 0.52) {
      if (this.launches > 0) this.returns += 1;
      this.launches += 1;
      this.visual.setPalette(this.launches - 1);
      const direction = normalized(this.preferredDirection);
      const speed = this.definition.companionSpeedTilesPerSecond * this.tileSize;
      this.vx = direction.x * speed;
      this.vy = direction.y * speed;
      this.returning = false;
      this.bounces = 0;
      return;
    }
    const speed = this.definition.companionReturnSpeedTilesPerSecond * this.tileSize;
    const travel = Math.min(distance, speed * dt);
    this.x += dx / distance * travel;
    this.y += dy / distance * travel;
  }

  _ricochet(nowMs, dt, anchor) {
    const leash = this.definition.companionLeashTiles * this.tileSize;
    if (
      Math.hypot(this.x - anchor.x, this.y - anchor.y) > leash
      || this.bounces >= this.definition.companionBouncesBeforeReturn
    ) {
      this.returning = true;
      return;
    }
    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;
    const xTile = this.toTile(nextX, this.y);
    const yTile = this.toTile(this.x, nextY);
    const diagonal = this.toTile(nextX, nextY);
    const blockedX = this.probeTile(xTile.tx, xTile.ty).solid;
    const blockedY = this.probeTile(yTile.tx, yTile.ty).solid;
    const blockedDiagonal = this.probeTile(diagonal.tx, diagonal.ty).solid;
    if (!blockedX && !blockedY && !blockedDiagonal) {
      this.x = nextX;
      this.y = nextY;
      return;
    }
    const target = blockedX ? xTile : blockedY ? yTile : diagonal;
    this._tryImpact(target, nowMs);
    if (blockedX || (!blockedY && blockedDiagonal)) this.vx *= -1;
    if (blockedY || (!blockedX && blockedDiagonal)) this.vy *= -1;
    this.bounces += 1;
  }

  _tryImpact(tile, nowMs) {
    const cooldown = Math.max(250, this.definition.companionImpactCooldownMs);
    if (nowMs - this.lastImpactAt < cooldown) return;
    if (!this.probeTile(tile.tx, tile.ty).diggable) return;
    this.lastImpactAt = nowMs;
    this.impacts += 1;
    this.onImpact?.(
      tile.tx,
      tile.ty,
      `companion-star:${this.impacts}:${tile.tx},${tile.ty}`,
      nowMs,
      this.definition.companionDamageScale,
    );
    const direction = { x: this.vx, y: this.vy };
    this.visual.impact(celestialTileContact(this, direction, tile, this.tileSize), direction);
  }

  getSnapshot() {
    return {
      active: this.active,
      presentation: this.visual.getSnapshot(),
      returning: this.returning,
      bounces: this.bounces,
      impacts: this.impacts,
      launches: this.launches,
      returns: this.returns,
      leashTiles: this.definition.companionLeashTiles,
      damageScale: this.definition.companionDamageScale,
    };
  }

  destroy() {
    this.active = false;
    this.visual?.destroy();
  }
}
