import { CELESTIAL_PRESENTATION as P } from "../../values/celestialPresentation.js";
import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { TILE_DESTRUCTION_FX_CONFIG as ATLAS } from "../../values/tileDestructionFx.js";
import { DIG_IMPACT_FX_CONFIG as DIG } from "../../values/digImpactFx.js";
import { installTileDestructionFxAtlasFrames } from "../visual/tileDestructionFxAtlasFrames.js";

const sequences = new WeakMap();

/** A short, fixed flash and approved fragments pinned to a Celestial contact. */
export class CelestialContactVfx {
  constructor(scene, tileSize, strength = 1) {
    Object.assign(this, { scene, tileSize, strength });
    this.effects = new Set();
    this.contacts = 0;
    this.lastContact = null;
  }

  play(point, direction) {
    if (this.destroyed || !installTileDestructionFxAtlasFrames(this.scene, ATLAS)) return false;
    const cfg = P.contact;
    const sequence = sequences.get(this.scene) || 0;
    sequences.set(this.scene, sequence + 1);
    const colour = P.effectColours[sequence % P.effectColours.length];
    const length = Math.hypot(direction.x, direction.y) || 1;
    const normal = { x: -direction.x / length, y: -direction.y / length };
    const angle = Math.atan2(normal.y, normal.x) * P.degreesPerRadian + cfg.authoredNormalOffsetDeg;
    const image = (key, frame, size, alpha, aspect = 1) => {
      while (this.effects.size >= cfg.maxLive) this._release(this.effects.values().next().value);
      const sprite = this.scene.add.image(point.x, point.y, key, frame)
        .setDisplaySize(size, size * aspect).setTint(colour.tint)
        .setAlpha(alpha * this.strength).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + cfg.depthOffset);
      sprite.angle = angle;
      this.effects.add(sprite);
      return sprite;
    };
    const aspect = ATLAS.assets.core.frameHeight / ATLAS.assets.core.frameWidth;
    const core = image(ATLAS.assets.core.key, cfg.flashFrame,
      this.tileSize * cfg.flashSizeTiles, cfg.flashAlpha, aspect);
    core.setOrigin(DIG.flash.originX, DIG.flash.originY);
    this.scene.tweens.add({ targets: core, alpha: 0, duration: cfg.flashFadeMs,
      ease: "Linear", onComplete: () => this._release(core) });
    for (let index = 0; index < cfg.chipCount; index += 1) {
      const chip = image(ATLAS.assets.shards.key, cfg.chipFrames[index % cfg.chipFrames.length],
        this.tileSize * cfg.chipSizeTiles, cfg.chipAlpha);
      const spread = (index - (cfg.chipCount - 1) / 2) * cfg.chipSpreadTiles * this.tileSize;
      const travel = this.tileSize * cfg.chipTravelTiles;
      this.scene.tweens.add({ targets: chip, alpha: 0,
        x: point.x + normal.x * travel - normal.y * spread,
        y: point.y + normal.y * travel + normal.x * spread,
        scaleX: chip.scaleX * cfg.chipEndScale, scaleY: chip.scaleY * cfg.chipEndScale,
        duration: cfg.chipMs, ease: "Cubic.out", onComplete: () => this._release(chip) });
    }
    this.contacts += 1;
    this.lastContact = { x: point.x, y: point.y, colour: colour.id };
    return true;
  }

  _release(image) {
    this.effects.delete(image);
    this.scene.tweens?.killTweensOf?.(image);
    image.destroy?.();
  }

  getSnapshot() {
    return { contacts: this.contacts, liveContactEffects: this.effects.size,
      lastContact: this.lastContact && { ...this.lastContact } };
  }

  destroy() {
    this.destroyed = true;
    for (const image of [...this.effects]) this._release(image);
  }
}

/** Intersect the incoming ray with the contacted tile face, including corners. */
export function celestialTileContact(origin, direction, tile, tileSize) {
  const bounds = { x: [tile.tx * tileSize, (tile.tx + 1) * tileSize],
    y: [tile.ty * tileSize, (tile.ty + 1) * tileSize] };
  let near = 0, far = Infinity;
  for (const axis of ["x", "y"]) {
    if (!direction[axis]) continue;
    const a = (bounds[axis][0] - origin[axis]) / direction[axis];
    const b = (bounds[axis][1] - origin[axis]) / direction[axis];
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
  }
  const t = near <= far ? near : 0;
  return { x: Math.max(bounds.x[0], Math.min(bounds.x[1], origin.x + direction.x * t)),
    y: Math.max(bounds.y[0], Math.min(bounds.y[1], origin.y + direction.y * t)) };
}
