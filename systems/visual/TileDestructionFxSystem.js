import { getMaterialFeedback } from "../../values/materialFeedback.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  resolveTileDestructionFamily,
  resolveTileDestructionFxEnabled,
  resolveTileDestructionTint,
} from "../../values/tileDestructionFx.js";
import { installTileDestructionFxAtlasFrames } from "./tileDestructionFxAtlasFrames.js";
import { MATERIAL_PARTICLE_POLISH as POLISH, isMaterialParticlePolishEnabled, materialParticleResponse } from "../../values/materialParticlePolish.js";
import { materialParticleFrame, sizeMaterialParticle } from "./materialParticleFrame.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

export class TileDestructionFxSystem {
  constructor(scene, config = TILE_DESTRUCTION_FX_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveTileDestructionFxEnabled(undefined, config);
    this.polished = isMaterialParticlePolishEnabled();
    this.sequence = 0;
    this.reducedMotion = globalThis.matchMedia?.(config.reducedMotionMediaQuery)?.matches === true;
    this.activeObjects = new Set();
    this.activeTimers = new Set();
    this.activeTweens = new Set();
    this.tweenTargets = new Map();
    this.ready = this.enabled && installTileDestructionFxAtlasFrames(this.scene, this.config);
  }

  play({ worldX, worldY, tileType }) {
    if (!this.ready || !this.scene?.add?.image || !Number.isFinite(worldX) || !Number.isFinite(worldY)) return false;
    const family = resolveTileDestructionFamily(tileType, this.config);
    const tint = resolveTileDestructionTint(tileType, this.config);
    const material = getMaterialFeedback(tileType);
    const materialScale = clamp(
      Math.sqrt((material.particleScale || 1) * (material.particleSizeScale || 1)),
      0.92,
      1.22,
    );
    const facing = this._resolvePlayerFacing(worldX, worldY);
    const sequence = this.sequence++;
    const core = this._createCore(worldX, worldY, family, tint, materialScale, facing);
    if (!core) return false;
    this._animateCore(core, family);
    this._schedule(
      this.polished ? (this.reducedMotion ? POLISH.destruction.reducedShardDelayMs : POLISH.destruction.shardDelayMs)
        : this.reducedMotion ? 54 : this.config.core.phaseTimesMs[2],
      () => {
        if (core.active !== false) this._spawnShards(worldX, worldY, family, tint, materialScale, facing, sequence);
      },
    );
    return true;
  }

  _resolvePlayerFacing(worldX, worldY) {
    const player = this.scene?.player;
    let dx = Number.isFinite(player?.x) ? player.x - worldX : -1;
    let dy = Number.isFinite(player?.y) ? player.y - worldY : 0;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) {
      dx = -1;
      dy = 0;
    } else {
      dx /= length;
      dy /= length;
    }
    return Object.freeze({ x: dx, y: dy, perpendicularX: -dy, perpendicularY: dx });
  }

  _createCore(worldX, worldY, family, tint, materialScale, facing) {
    const cfg = this.config.core;
    const tileSize = this.scene.config?.tileSize || 94;
    const core = this.scene.add.image(
      worldX,
      worldY + tileSize * cfg.offsetYTiles,
      this.config.assets.core.key,
      `${family}-${cfg.phases[0]}`,
    );
    if (!core) return null;
    core.setOrigin?.(0.5, 0.5);
    core.setDepth?.(cfg.depth);
    core.setDisplaySize?.(
      tileSize * cfg.displayWidthTiles * materialScale,
      tileSize * cfg.displayHeightTiles * materialScale,
    );
    core.setTint?.(tint);
    core.setFlipX?.(facing.x > 0);
    core.setAlpha?.(cfg.alpha);
    const baseScaleX = core.scaleX ?? 1;
    const baseScaleY = core.scaleY ?? 1;
    core.setScale?.(baseScaleX * cfg.startScale, baseScaleY * cfg.startScale);
    core.__tileBreakBaseScaleX = baseScaleX;
    core.__tileBreakBaseScaleY = baseScaleY;
    this._trackObject(core);
    return core;
  }

  _animateCore(core, family) {
    const cfg = this.config.core;
    const baseScaleX = core.__tileBreakBaseScaleX;
    const baseScaleY = core.__tileBreakBaseScaleY;
    this._tween({
      targets: core,
      scaleX: baseScaleX * cfg.impactScale,
      scaleY: baseScaleY * cfg.impactScale,
      duration: this.polished ? POLISH.destruction.enterMs : cfg.enterMs,
      ease: this.polished ? POLISH.destruction.enterEase : "Back.Out",
    });
    const phaseIndexes = this.reducedMotion ? [2, 3] : [1, 2, 3];
    for (const phaseIndex of phaseIndexes) {
      const delay = this.reducedMotion
        ? (phaseIndex === 2 ? 45 : 105)
        : (this.polished ? POLISH.destruction.phaseTimesMs : cfg.phaseTimesMs)[phaseIndex];
      this._schedule(delay, () => {
        if (core.active === false) return;
        core.setFrame?.(`${family}-${cfg.phases[phaseIndex]}`);
        if (phaseIndex === 3) this._fadeCore(core, baseScaleX, baseScaleY, family);
      });
    }
  }

  _fadeCore(core, baseScaleX, baseScaleY, family) {
    const cfg = this.config.core;
    if (!this.scene?.tweens?.add) {
      this._schedule(cfg.fadeMs, () => this._releaseObject(core));
      return;
    }
    this._tween({
      targets: core,
      alpha: 0,
      scaleX: baseScaleX * cfg.settleScale,
      scaleY: baseScaleY * cfg.settleScale,
      duration: this.reducedMotion ? Math.min(130, cfg.fadeMs)
        : this.polished ? POLISH.destruction.fadeMs * materialParticleResponse(family).fade : cfg.fadeMs,
      ease: "Sine.Out",
      onComplete: () => this._releaseObject(core),
    });
  }

  _spawnShards(worldX, worldY, family, tint, materialScale, facing, sequence) {
    const cfg = this.config.shards;
    const tileSize = this.scene.config?.tileSize || 94;
    const count = this.reducedMotion ? cfg.reducedMotionCount : cfg.count;
    for (let index = 0; index < count; index += 1) {
      const sizeRange = this.polished ? POLISH.destruction.sizeTiles : [cfg.displayMinTiles, cfg.displayMaxTiles];
      const fineScale = this.polished && index % 2 ? POLISH.destruction.fineScale : 1;
      const displayTiles = randomBetween(...sizeRange) * materialScale * fineScale;
      const detail = this.polished && materialParticleFrame(this.scene, family, sequence + index,
        tileSize * displayTiles * Math.max(cfg.midScale, POLISH.destruction.cameraScale));
      const shard = this.scene.add.image(
        worldX + randomBetween(-1, 1) * tileSize * cfg.spawnRadiusTiles,
        worldY + randomBetween(-1, 1) * tileSize * cfg.spawnRadiusTiles,
        this.config.assets.shards.key,
        detail ? detail.name : `${family}-s${String((index % cfg.count) + 1).padStart(2, "0")}`,
      );
      if (!shard) continue;
      shard.setOrigin?.(0.5);
      shard.setDepth?.(cfg.depth + index * 0.01);
      if (detail) sizeMaterialParticle(shard, detail, tileSize * displayTiles);
      else shard.setDisplaySize?.(tileSize * displayTiles, tileSize * displayTiles);
      shard.setTint?.(tint);
      shard.setFlipX?.(facing.x > 0);
      shard.setRotation?.(randomBetween(-0.35, 0.35));
      const baseScaleX = shard.scaleX ?? 1;
      const baseScaleY = shard.scaleY ?? 1;
      shard.setScale?.(baseScaleX * cfg.startScale, baseScaleY * cfg.startScale);
      this._trackObject(shard);
      this._launchShard(shard, tileSize, baseScaleX, baseScaleY, facing, family);
    }
  }

  _launchShard(shard, tileSize, baseScaleX, baseScaleY, facing, family) {
    const cfg = this.config.shards;
    const material = materialParticleResponse(family);
    const travel = this.polished ? material.travel * (this.reducedMotion ? POLISH.foot.reducedTravel : 1) : 1;
    const outward = randomBetween(cfg.launchMinTiles, cfg.launchMaxTiles) * tileSize * travel;
    const spread = randomBetween(-cfg.lateralSpreadTiles, cfg.lateralSpreadTiles) * tileSize * travel;
    const rotation = randomBetween(cfg.rotationMin, cfg.rotationMax) * (Math.random() < 0.5 ? -1 : 1)
      * (this.polished ? material.spin : 1);
    const launchX = shard.x + facing.x * outward + facing.perpendicularX * spread;
    const launchY = shard.y + facing.y * outward + facing.perpendicularY * spread - tileSize * cfg.liftTiles * travel;
    if (!this.scene?.tweens?.add) {
      this._schedule(cfg.launchMaxMs + cfg.settleMaxMs, () => this._releaseObject(shard));
      return;
    }
    this._tween({
      targets: shard,
      x: launchX,
      y: launchY,
      rotation: shard.rotation + rotation * 0.58,
      scaleX: baseScaleX * cfg.midScale,
      scaleY: baseScaleY * cfg.midScale,
      duration: randomBetween(...(this.polished ? POLISH.destruction.launchMs : [cfg.launchMinMs, cfg.launchMaxMs])),
      ease: "Cubic.Out",
      onComplete: () => this._tween({
        targets: shard,
        x: launchX + facing.x * tileSize * 0.1 * travel,
        y: launchY + tileSize * cfg.gravityTiles * (this.polished ? material.gravity : 1) * travel,
        rotation: shard.rotation + rotation,
        scaleX: baseScaleX * (this.polished ? POLISH.destruction.cameraScale : cfg.cameraScale),
        scaleY: baseScaleY * (this.polished ? POLISH.destruction.cameraScale : cfg.cameraScale),
        alpha: 0,
        duration: randomBetween(...(this.polished ? POLISH.destruction.settleMs : [cfg.settleMinMs, cfg.settleMaxMs]))
          * (this.polished ? material.fade : 1),
        ease: "Quad.In",
        onComplete: () => this._releaseObject(shard),
      }),
    });
  }

  _schedule(delay, callback) {
    if (!this.scene?.time?.delayedCall) {
      callback();
      return null;
    }
    let timer = null;
    timer = this.scene.time.delayedCall(delay, () => {
      this.activeTimers.delete(timer);
      callback();
    });
    this.activeTimers.add(timer);
    return timer;
  }

  _tween(config) {
    if (!this.scene?.tweens?.add) return null;
    const complete = config.onComplete;
    let tween = null;
    tween = this.scene.tweens.add({
      ...config,
      onComplete: (...args) => {
        this.activeTweens.delete(tween);
        this.tweenTargets.delete(tween);
        complete?.(...args);
      },
    });
    this.activeTweens.add(tween);
    this.tweenTargets.set(tween, config.targets);
    return tween;
  }

  _trackObject(object) {
    while (this.activeObjects.size >= POLISH.destruction.maxLive) this._releaseObject(this.activeObjects.values().next().value);
    this.activeObjects.add(object);
  }

  _releaseObject(object) {
    if (!object) return;
    for (const tween of [...this.activeTweens]) {
      if (this.tweenTargets.get(tween) !== object) continue;
      tween.stop?.();
      tween.remove?.();
      this.activeTweens.delete(tween);
      this.tweenTargets.delete(tween);
    }
    this.activeObjects.delete(object);
    object.destroy?.();
  }

  destroy() {
    for (const timer of this.activeTimers) timer.remove?.(false);
    for (const tween of this.activeTweens) {
      tween.stop?.();
      tween.remove?.();
    }
    for (const object of this.activeObjects) object.destroy?.();
    this.activeTimers.clear();
    this.activeTweens.clear();
    this.tweenTargets.clear();
    this.activeObjects.clear();
    this.ready = false;
    this.scene = null;
  }
}
