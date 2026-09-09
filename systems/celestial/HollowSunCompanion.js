import { CelestialStarVfx } from "./CelestialStarVfx.js";
import { enumerateDiscTiles } from "./CelestialActivationBudget.js";

function cardinal(direction, fallback = { x: 1, y: 0 }) {
  const x = Number(direction?.x) || 0;
  const y = Number(direction?.y) || 0;
  if (Math.abs(y) > Math.abs(x)) return { x: 0, y: Math.sign(y) };
  if (x !== 0) return { x: Math.sign(x), y: 0 };
  return fallback;
}

/** Permanent low-power follower unlocked by the Hollow Sun apex node. */
export class HollowSunCompanion {
  constructor(options) {
    Object.assign(this, options);
    const anchor = this.getAnchor();
    this.direction = { x: 1, y: 0 };
    this.x = anchor.x + this.definition.passiveHollowFollowDistanceTiles * this.tileSize;
    this.y = anchor.y;
    this.digs = 0;
    this.pulses = 0;
    this.impacts = 0;
    this.active = true;
    this._createVisual();
  }

  _createVisual() {
    this.visual = new CelestialStarVfx({ scene: this.scene, x: this.x, y: this.y,
      assetKey: this.assetKey, size: this.definition.passiveHollowDisplaySizePx,
      kind: "hollow", passive: true });
    this.sprite = this.visual.sprite;
    this.core = this.visual.core;
    this.orbit = this.visual.halo;
  }

  update(nowMs, deltaMs) {
    if (!this.active) return;
    const dt = Math.min(0.05, Math.max(0, Number(deltaMs) || 0) / 1000);
    const anchor = this.getAnchor();
    const lead = this.definition.passiveHollowFollowDistanceTiles * this.tileSize;
    const desiredX = anchor.x + this.direction.x * lead;
    const desiredY = anchor.y + this.direction.y * lead;
    const dx = desiredX - this.x;
    const dy = desiredY - this.y;
    const distance = Math.hypot(dx, dy);
    const speed = this.definition.passiveHollowFollowSpeedTilesPerSecond * this.tileSize;
    if (distance > 0 && speed > 0) {
      const travel = Math.min(distance, speed * dt);
      this.x += dx / distance * travel;
      this.y += dy / distance * travel;
    }
    this.visual.update(nowMs, deltaMs, this.x, this.y);
  }

  onPlayerDig(direction, nowMs) {
    if (!this.active) return false;
    this.direction = cardinal(direction, this.direction);
    this.digs += 1;
    const every = Math.max(1, Math.floor(this.definition.passiveHollowPulseEveryDigs));
    if (this.digs % every !== 0) return false;
    this._pulse(nowMs);
    return true;
  }

  _pulse(nowMs) {
    this.pulses += 1;
    const center = this.toTile(this.x, this.y);
    const radius = this.definition.passiveHollowPulseRadiusTiles;
    const cap = Math.max(1, Math.floor(this.definition.passiveHollowPulseImpactCap));
    let pulseImpacts = 0;
    for (const tile of enumerateDiscTiles(center, radius)) {
      if (pulseImpacts >= cap) break;
      if (!this.probeTile(tile.tx, tile.ty).diggable) continue;
      pulseImpacts += 1;
      this.impacts += 1;
      this.onImpact?.(
        tile.tx,
        tile.ty,
        `companion-hollow:${this.pulses}:${this.impacts}:${tile.tx},${tile.ty}`,
        nowMs,
        this.definition.passiveHollowDamageScale,
      );
    }
    this.visual.pulse(Math.max(this.tileSize, radius * this.tileSize), this.pulses);
  }

  getSnapshot() {
    return {
      active: this.active,
      digs: this.digs,
      pulses: this.pulses,
      impacts: this.impacts,
      pulseEveryDigs: this.definition.passiveHollowPulseEveryDigs,
      damageScale: this.definition.passiveHollowDamageScale,
    };
  }

  destroy() {
    this.active = false;
    this.visual?.destroy();
  }
}
