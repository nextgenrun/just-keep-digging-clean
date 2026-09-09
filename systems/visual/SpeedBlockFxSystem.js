import { SPEED_BLOCK_FX_CONFIG, isSpeedBlockFxEnabled } from "../../values/speedBlockFx.js";
import { TILE_DESTRUCTION_FX_CONFIG } from "../../values/tileDestructionFx.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Presents the live speed buff with bounded authored yellow sparks, never gameplay mutations. */
export class SpeedBlockFxSystem {
  constructor(scene, player, controller, effects, options = {}) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.effects = effects;
    this.config = SPEED_BLOCK_FX_CONFIG;
    this.enabled = isSpeedBlockFxEnabled(options.search);
    this.reducedMotion = options.reducedMotion
      ?? globalThis.matchMedia?.(this.config.reducedMotionMediaQuery)?.matches === true;
    this.random = options.random || Math.random;
    this.live = new Set();
    this.elapsedMs = 0;
    this.wasActive = false;
    this.atlasReady = false;
    this.spawnCount = 0;
    this.destroyed = false;
  }

  isActive() {
    return !this.destroyed && this.enabled
      && Boolean(this.player && this.controller?.physicsBody)
      && this.effects?.getMiningSpeedMultiplier?.() > 1
      && this.player?.active !== false && this.player?.visible !== false
      && (!this.scene.gameState || this.scene.gameState === "playing");
  }

  update(deltaMs) {
    if (!this.isActive()) {
      this.wasActive = false;
      this.elapsedMs = 0;
      return;
    }
    const motion = this.reducedMotion ? this.config.reducedMotion : this.config;
    if (!this.wasActive) {
      this._emit(motion.activationCount, null, true);
      this.wasActive = true;
    }
    this.elapsedMs += clamp(Number(deltaMs) || 0, 0, this.config.maxDeltaMs);
    let bursts = 0;
    while (this.elapsedMs >= motion.intervalMs
      && bursts < this.config.maxBurstsPerUpdate) {
      this.elapsedMs -= motion.intervalMs;
      this._emit(motion.ambientCount);
      bursts += 1;
    }
  }

  onMineImpact(targetTile = null, contactPoint = null) {
    if (!this.isActive()) return;
    const body = this.controller?.physicsBody;
    const tileSize = this.scene.config?.tileSize;
    let anchor = Number.isFinite(contactPoint?.x) && Number.isFinite(contactPoint?.y)
      ? { x: contactPoint.x, y: contactPoint.y } : null;
    if (!anchor && body && tileSize && Number.isFinite(targetTile?.tx)
      && Number.isFinite(targetTile?.ty)) {
      // Spark at the contacted face, not the centre of the intact tile.
      anchor = {
        x: clamp(body.x + body.w / 2,
          targetTile.tx * tileSize, (targetTile.tx + 1) * tileSize),
        y: clamp(body.y + body.h / 2,
          targetTile.ty * tileSize, (targetTile.ty + 1) * tileSize),
      };
    }
    const motion = this.reducedMotion ? this.config.reducedMotion : this.config;
    this._emit(motion.impactCount, anchor, true);
  }

  _between(range) {
    return range.min + this.random() * (range.max - range.min);
  }

  _bodyAnchor() {
    const body = this.controller?.physicsBody;
    if (!body) return null;
    return {
      x: body.x + body.w / 2
        + (this.random() * 2 - 1) * body.w * this.config.bodySpreadX,
      y: body.y + body.h * (this.config.bodyTopRatio
        + this.random() * (this.config.bodyBottomRatio - this.config.bodyTopRatio)),
    };
  }

  _emit(count, fixedAnchor = null, burst = false) {
    if (!this.atlasReady) {
      const key = TILE_DESTRUCTION_FX_CONFIG.assets.core.key;
      const texture = this.scene.textures?.exists?.(key) && this.scene.textures.get(key);
      if (!texture?.add) return;
      for (const frame of this.config.frames) {
        if (!texture.has?.(frame.name)) {
          texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
        }
      }
      this.atlasReady = true;
    }
    if (!this.atlasReady || !this.scene.add?.image) return;
    const cfg = this.config;
    const asset = TILE_DESTRUCTION_FX_CONFIG.assets.core;
    const motion = this.reducedMotion ? cfg.reducedMotion : cfg;
    const travel = this.reducedMotion ? motion.travelMultiplier : 1;
    for (let index = 0; index < count && this.live.size < cfg.maxParticles; index += 1) {
      const anchor = fixedAnchor || this._bodyAnchor();
      if (!anchor) break;
      const frame = cfg.frames[this.spawnCount % cfg.frames.length];
      const size = this._between(cfg.sizePx) * (burst ? cfg.burstSizeMultiplier : 1);
      const particle = this.scene.add.image(anchor.x, anchor.y, asset.key, frame.name)
        .setOrigin(0.5, cfg.originY)
        .setDisplaySize(size, size * frame.height / frame.width)
        .setDepth((this.player.depth || 0) + cfg.depthOffset)
        .setBlendMode(cfg.blendMode)
        .setTint(cfg.colors[this.spawnCount % cfg.colors.length])
        .setAlpha(motion.alpha)
        .setRotation((this.random() * 2 - 1) * cfg.rotationRadians);
      this.live.add(particle);
      this.spawnCount += 1;
      this.scene.tweens.add({
        targets: particle,
        x: anchor.x + this._between(cfg.driftPx) * travel,
        y: anchor.y - this._between(cfg.risePx) * travel,
        alpha: 0,
        scaleX: particle.scaleX * cfg.endScaleMultiplier,
        scaleY: particle.scaleY * cfg.endScaleMultiplier,
        duration: this._between(cfg.lifetimeMs),
        ease: cfg.ease,
        onComplete: () => {
          this.live.delete(particle);
          particle.destroy();
        },
      });
    }
  }

  getSnapshot() {
    return {
      active: this.isActive(), liveParticles: this.live.size,
      spawnCount: this.spawnCount, maxParticles: this.config.maxParticles,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const particle of this.live) {
      this.scene.tweens?.killTweensOf?.(particle);
      particle.destroy();
    }
    this.live.clear();
    this.elapsedMs = 0;
    this.wasActive = false;
  }
}
