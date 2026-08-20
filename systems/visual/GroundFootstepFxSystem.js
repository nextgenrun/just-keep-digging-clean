import { PLAYER_GROUND_FOOTSTEP_FX_CONFIG, resolvePlayerGroundFootstepFxEnabled } from "../../values/playerGroundFootstepFx.js";
import { PLAYER_RIG_CONTACT_CONFIG } from "../../values/playerRigContact.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  resolveTileDestructionFamily,
  resolveTileDestructionTint,
} from "../../values/tileDestructionFx.js";
import { projectRigMarkerToWorld } from "./playerRigContactGeometry.js";
import { installTileDestructionFxAtlasFrames } from "./tileDestructionFxAtlasFrames.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
const finiteMarker = (marker) => Array.isArray(marker)
  && marker.length >= 2
  && Number.isFinite(Number(marker[0]))
  && Number.isFinite(Number(marker[1]));

/** Presents authored grounded foot contacts as synchronized sound and bitmap fragments. */
export class GroundFootstepFxSystem {
  constructor(scene, player, controller, worldModel, profile, options = {}) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.worldModel = worldModel;
    this.profile = profile;
    this.config = options.config || PLAYER_GROUND_FOOTSTEP_FX_CONFIG;
    this.onFootstep = options.onFootstep || null;
    this.manifest = options.manifest || null;
    this.fxEnabled = resolvePlayerGroundFootstepFxEnabled(
      globalThis.location?.search || "",
      this.config,
    );
    this.reducedMotion = globalThis.matchMedia?.(this.config.reducedMotionMediaQuery)?.matches === true;
    this.activeObjects = new Set();
    this.activeTweens = new Set();
    this.tweenTargets = new Map();
    this.lastContactToken = null;
    this.contactSequence = 0;
    this.created = false;
    this.atlasReady = false;
    this._onAnimationUpdate = (animation, frame) => this._handleAnimationUpdate(animation, frame);
  }

  create() {
    if (this.created) return true;
    const eventName = globalThis.Phaser?.Animations?.Events?.ANIMATION_UPDATE;
    if (!eventName || !this.player?.on) return false;
    this.manifest = this.manifest
      || this.scene?.cache?.json?.get?.(this.profile?.rigManifestKey)
      || null;
    this.atlasReady = this.fxEnabled && installTileDestructionFxAtlasFrames(
      this.scene,
      TILE_DESTRUCTION_FX_CONFIG,
    );
    this.player.on(eventName, this._onAnimationUpdate);
    this.created = true;
    return true;
  }

  _handleAnimationUpdate(animation, frame) {
    const contacts = this.profile?.footstepFrameIndices?.[animation?.key];
    const isFallbackContact = !contacts
      && this.profile?.walkMovingAnims?.includes(animation?.key)
      && (frame?.index === 1 || frame?.index === 5);
    if (!contacts?.includes(frame?.index) && !isFallbackContact) {
      this.lastContactToken = null;
      return false;
    }
    const token = `${animation.key}:${frame.index}:${frame.textureFrame}`;
    if (token === this.lastContactToken) return false;
    this.lastContactToken = token;
    if (!this.controller?.isGrounded?.()) return false;
    const motionState = this.controller?.getMotionState?.();
    if (motionState !== "walk-left" && motionState !== "walk-right") return false;

    this.onFootstep?.({ animationKey: animation.key, frame });
    return this._emitContact(frame);
  }

  _emitContact(frame) {
    if (!this.atlasReady || !this.scene?.add?.image) return false;
    const body = this.controller?.physicsBody;
    const speed = Math.abs(Number(body?.vx) || 0);
    const effectiveMaxSpeed = Math.max(
      speed,
      Number(this.controller?.getEffectiveWalkSpeed?.()) || 0,
    );
    const minimumSpeed = Math.max(
      this.config.speed.minimumPxPerSec,
      effectiveMaxSpeed * this.config.speed.minimumRatio,
    );
    if (speed < minimumSpeed) return false;

    const intensity = clamp(
      speed / Math.max(effectiveMaxSpeed * this.config.speed.maximumIntensityRatio, 1),
      0,
      1,
    );
    const anchor = this._resolveContactAnchor(frame);
    const tileSize = this.scene?.config?.tileSize || 1;
    const tileType = this._resolveGroundTileType(anchor, tileSize);
    const family = resolveTileDestructionFamily(tileType, TILE_DESTRUCTION_FX_CONFIG);
    const tint = resolveTileDestructionTint(tileType, TILE_DESTRUCTION_FX_CONFIG);
    this._spawnParticles(anchor, family, tint, intensity);
    this.contactSequence += 1;
    return true;
  }

  _resolveGroundTileType(anchor, tileSize) {
    const tx = Math.floor(anchor.x / tileSize);
    const startTy = Math.floor(
      (anchor.y + tileSize * this.config.rig.floorProbeTiles) / tileSize,
    );
    const fallbackRows = Math.max(0, this.config.rig.floorProbeFallbackRows || 0);
    for (let row = 0; row <= fallbackRows; row += 1) {
      const ty = startTy + row;
      const tileType = this.worldModel?.getTileType?.(tx, ty);
      if (this.worldModel?.isSolid?.(tx, ty) !== false) return tileType;
    }
    return this.worldModel?.getTileType?.(tx, startTy);
  }

  _resolveContactAnchor(frame) {
    const body = this.controller?.physicsBody;
    const bodyWidth = Number(body?.w ?? body?.width) || 0;
    const bodyHeight = Number(body?.h ?? body?.height) || 0;
    const bodyFloorY = (Number(body?.y) || 0) + bodyHeight;
    const fallback = {
      x: (Number(body?.x) || 0) + bodyWidth * 0.5,
      y: bodyFloorY,
    };
    const sourceAction = this.profile?.footstepRigAction || this.config.rig.sourceAction;
    const markers = this.manifest?.actions?.[sourceAction]?.rig_markers?.frames
      ?.[String(frame?.textureFrame)];
    const markerNames = PLAYER_RIG_CONTACT_CONFIG.markerGroups[this.config.rig.markerGroup] || [];
    let plantedMarker = null;
    for (const markerName of markerNames) {
      const marker = markers?.[markerName];
      if (!finiteMarker(marker)) continue;
      if (!plantedMarker || Number(marker[1]) > Number(plantedMarker[1])) plantedMarker = marker;
    }
    if (!plantedMarker) return fallback;

    const frameWidth = this.profile?.frameWidth || 1;
    const frameHeight = this.profile?.frameHeight || 1;
    const projected = projectRigMarkerToWorld({
      marker: plantedMarker,
      spriteX: Number(this.player?.x) || 0,
      spriteY: Number(this.player?.y) || 0,
      scaleX: Number.isFinite(this.player?.scaleX)
        ? Math.abs(this.player.scaleX)
        : (this.profile?.displaySizePx || frameWidth) / frameWidth,
      scaleY: Number.isFinite(this.player?.scaleY)
        ? Math.abs(this.player.scaleY)
        : (this.profile?.displaySizePx || frameHeight) / frameHeight,
      frameWidth,
      frameHeight,
      originX: this.player?.originX ?? this.profile?.visualOriginX ?? 0.5,
      originY: this.player?.originY ?? this.profile?.visualOriginY ?? 1,
      flipX: this.player?.flipX === true,
    });
    if (!projected) return fallback;
    return {
      x: projected.x,
      y: bodyFloorY,
    };
  }

  _spawnParticles(anchor, family, tint, intensity) {
    const cfg = this.config.particles;
    const tileSize = this.scene?.config?.tileSize || 1;
    const visualScale = this.config.speed.minimumVisualScale
      + (1 - this.config.speed.minimumVisualScale) * intensity;
    const count = this.reducedMotion
      ? cfg.reducedMotionCount
      : Math.max(1, Math.round(cfg.count * intensity));
    const direction = Math.sign(this.controller?.physicsBody?.vx || 0)
      || (this.player?.flipX ? -1 : 1);
    for (let index = 0; index < count; index += 1) {
      while (this.activeObjects.size >= cfg.maxLive) this._releaseOldest();
      const frameNumber = (this.contactSequence + index) % TILE_DESTRUCTION_FX_CONFIG.shards.count + 1;
      const frameName = `${family}-s${String(frameNumber).padStart(2, "0")}`;
      const particle = this.scene.add.image(
        anchor.x + randomBetween(-cfg.spawnJitterXTiles, cfg.spawnJitterXTiles) * tileSize,
        anchor.y + randomBetween(-cfg.spawnJitterYTiles, cfg.spawnJitterYTiles) * tileSize,
        TILE_DESTRUCTION_FX_CONFIG.assets.shards.key,
        frameName,
      );
      if (!particle) continue;
      const displayTiles = randomBetween(cfg.displayMinTiles, cfg.displayMaxTiles) * visualScale;
      particle.setOrigin?.(0.5);
      particle.setDepth?.((Number(this.player?.depth) || 0) + cfg.depthOffset);
      particle.setDisplaySize?.(tileSize * displayTiles, tileSize * displayTiles);
      particle.setTint?.(tint);
      particle.setAlpha?.(cfg.startAlpha);
      particle.setRotation?.(randomBetween(-cfg.rotationMin, cfg.rotationMin));
      const baseScaleX = particle.scaleX ?? 1;
      const baseScaleY = particle.scaleY ?? 1;
      particle.setScale?.(baseScaleX * cfg.startScale, baseScaleY * cfg.startScale);
      this.activeObjects.add(particle);
      this._animateParticle(particle, baseScaleX, baseScaleY, direction, tileSize);
    }
  }

  _animateParticle(particle, baseScaleX, baseScaleY, direction, tileSize) {
    const cfg = this.config.particles;
    const backward = randomBetween(cfg.backwardMinTiles, cfg.backwardMaxTiles) * tileSize;
    const lift = randomBetween(cfg.liftMinTiles, cfg.liftMaxTiles) * tileSize;
    const rotation = randomBetween(cfg.rotationMin, cfg.rotationMax)
      * (Math.random() < 0.5 ? -1 : 1);
    const launchX = particle.x - direction * backward * 0.55;
    const launchY = particle.y - lift;
    const launched = this._tween({
      targets: particle,
      x: launchX,
      y: launchY,
      rotation: particle.rotation + rotation * 0.45,
      scaleX: baseScaleX * cfg.peakScale,
      scaleY: baseScaleY * cfg.peakScale,
      duration: randomBetween(cfg.launchMinMs, cfg.launchMaxMs),
      ease: "Cubic.Out",
      onComplete: () => this._tween({
        targets: particle,
        x: particle.x - direction * backward * 0.45,
        y: particle.y + lift + tileSize * cfg.settleDownTiles,
        rotation: particle.rotation + rotation,
        scaleX: baseScaleX * cfg.endScale,
        scaleY: baseScaleY * cfg.endScale,
        alpha: 0,
        duration: randomBetween(cfg.settleMinMs, cfg.settleMaxMs),
        ease: "Quad.In",
        onComplete: () => this._releaseObject(particle),
      }),
    });
    if (!launched) this._releaseObject(particle);
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
    if (!tween) return null;
    this.activeTweens.add(tween);
    this.tweenTargets.set(tween, config.targets);
    return tween;
  }

  _releaseOldest() {
    const oldest = this.activeObjects.values().next().value;
    this._releaseObject(oldest);
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
    const eventName = globalThis.Phaser?.Animations?.Events?.ANIMATION_UPDATE;
    if (this.created && eventName) this.player?.off?.(eventName, this._onAnimationUpdate);
    for (const tween of this.activeTweens) {
      tween.stop?.();
      tween.remove?.();
    }
    for (const object of this.activeObjects) object.destroy?.();
    this.activeTweens.clear();
    this.tweenTargets.clear();
    this.activeObjects.clear();
    this.created = false;
    this.atlasReady = false;
    this.scene = null;
    this.player = null;
    this.controller = null;
    this.worldModel = null;
    this.manifest = null;
  }
}
