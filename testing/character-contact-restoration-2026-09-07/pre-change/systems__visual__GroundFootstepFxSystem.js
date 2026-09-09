import { PLAYER_GROUND_FOOTSTEP_FX_CONFIG, resolvePlayerGroundFootstepFxEnabled } from "../../values/playerGroundFootstepFx.js";
import { MATERIAL_PARTICLE_POLISH as POLISH, isMaterialParticlePolishEnabled, materialParticleResponse } from "../../values/materialParticlePolish.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  resolveTileDestructionFamily,
  resolveTileDestructionTint,
} from "../../values/tileDestructionFx.js";
import { groundFootstepAnchor, supportedFootstepSurface, unifiedFootstepSheet } from "./groundFootstepContact.js";
import { materialParticleFrame, sizeMaterialParticle } from "./materialParticleFrame.js";
import { installTileDestructionFxAtlasFrames } from "./tileDestructionFxAtlasFrames.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

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
    this.polished = isMaterialParticlePolishEnabled(options.search);
    this.pendingFrames = [];
    this.lastContact = null;
    this._flushContacts = () => {
      for (const frame of this.pendingFrames.splice(0)) this._emitContact(frame);
    };
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
    if (this.polished) this.scene.events?.on?.(POLISH.foot.postUpdateEvent, this._flushContacts);
    this.created = true;
    return true;
  }

  _handleAnimationUpdate(animation, frame) {
    const contacts = this.profile?.footstepFrameIndices?.[animation?.key];
    const sheet = this.polished && unifiedFootstepSheet(this.profile, this.player, frame);
    const isFallbackContact = !contacts
      && this.profile?.walkMovingAnims?.includes(animation?.key)
      && (frame?.index === 1 || frame?.index === 5);
    const isContact = sheet ? Boolean(sheet.contacts[frame?.textureFrame])
      : contacts?.includes(frame?.index) || isFallbackContact;
    if (!isContact) {
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
    const snapshot = { index: frame.index, textureFrame: frame.textureFrame,
      textureKey: frame.textureKey || this.player?.texture?.key, animationKey: animation.key };
    if (this.polished && this.scene.events?.on) {
      if (this.pendingFrames.length >= POLISH.foot.maxPending) this.pendingFrames.shift();
      this.pendingFrames.push(snapshot);
      return true;
    }
    return this._emitContact(snapshot);
  }

  _emitContact(frame) {
    if (!this.atlasReady || !this.scene?.add?.image || !this.controller?.isGrounded?.()) return false;
    if (this.polished && frame.textureKey && this.player?.texture?.key !== frame.textureKey) return false;
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
    let anchor = this._resolveContactAnchor(frame);
    const tileSize = this.scene?.config?.tileSize || 1;
    const surface = this.polished && supportedFootstepSurface(this.worldModel, anchor, body, tileSize, this.config);
    if (this.polished && !surface) return false;
    if (surface) anchor = surface.anchor;
    const tileType = surface ? surface.tileType : this._resolveGroundTileType(anchor, tileSize);
    const family = resolveTileDestructionFamily(tileType, TILE_DESTRUCTION_FX_CONFIG);
    const tint = resolveTileDestructionTint(tileType, TILE_DESTRUCTION_FX_CONFIG);
    this._spawnParticles(anchor, family, tint, intensity);
    this.contactSequence += 1;
    this.lastContact = { ...anchor, family, tileType, frame: frame.textureFrame,
      animationKey: frame.animationKey, sequence: this.contactSequence, liveParticles: this.activeObjects.size };
    this.scene.events?.emit?.(POLISH.foot.presentedEvent, this.lastContact);
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
    return groundFootstepAnchor({ player: this.player, body: this.controller?.physicsBody,
      profile: this.profile, manifest: this.manifest, frame, config: this.config, polished: this.polished });
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
      if (this.polished && index === 0) {
        this._spawnScuff(anchor, family, tint, direction, visualScale);
        continue;
      }
      const frameNumber = (this.contactSequence + index) % TILE_DESTRUCTION_FX_CONFIG.shards.count + 1;
      const sizeRange = this.polished ? POLISH.foot.sizeTiles : [cfg.displayMinTiles, cfg.displayMaxTiles];
      const displayTiles = randomBetween(...sizeRange) * visualScale;
      const detail = this.polished && materialParticleFrame(this.scene, family, this.contactSequence + index, tileSize * displayTiles * cfg.peakScale);
      const frameName = detail ? detail.name : `${family}-s${String(frameNumber).padStart(2, "0")}`;
      const particle = this.scene.add.image(
        anchor.x + randomBetween(-cfg.spawnJitterXTiles, cfg.spawnJitterXTiles) * tileSize,
        anchor.y + randomBetween(-cfg.spawnJitterYTiles, cfg.spawnJitterYTiles) * tileSize,
        TILE_DESTRUCTION_FX_CONFIG.assets.shards.key,
        frameName,
      );
      if (!particle) continue;
      particle.setOrigin?.(0.5);
      particle.setDepth?.(this.polished ? Math.max(POLISH.foot.minimumDepth, (this.player?.depth || 0) + POLISH.foot.depthOffset)
        : (Number(this.player?.depth) || 0) + cfg.depthOffset);
      if (detail) sizeMaterialParticle(particle, detail, tileSize * displayTiles);
      else particle.setDisplaySize?.(tileSize * displayTiles, tileSize * displayTiles);
      if (this.polished) particle.y = anchor.y - tileSize * displayTiles / 2;
      particle.setTint?.(tint);
      particle.setAlpha?.(cfg.startAlpha);
      particle.setRotation?.(randomBetween(-cfg.rotationMin, cfg.rotationMin));
      const baseScaleX = particle.scaleX ?? 1;
      const baseScaleY = particle.scaleY ?? 1;
      particle.setScale?.(baseScaleX * cfg.startScale, baseScaleY * cfg.startScale);
      this.activeObjects.add(particle);
      this._animateParticle(particle, baseScaleX, baseScaleY, direction, tileSize, family, anchor.y);
    }
  }

  _spawnScuff(anchor, family, tint, direction, visualScale) {
    const cfg = POLISH.foot, tileSize = this.scene.config.tileSize;
    const material = materialParticleResponse(family);
    const width = tileSize * cfg.scuffWidthTiles * visualScale;
    const scuff = this.scene.add.image(anchor.x, anchor.y, TILE_DESTRUCTION_FX_CONFIG.assets.core.key,
      `${family}-${cfg.scuffFrame}`);
    scuff.setOrigin?.(0.5, cfg.scuffOriginY);
    scuff.setDisplaySize?.(width, width * TILE_DESTRUCTION_FX_CONFIG.assets.core.frameHeight / TILE_DESTRUCTION_FX_CONFIG.assets.core.frameWidth);
    scuff.setDepth?.(Math.max(cfg.minimumDepth, (this.player?.depth || 0) + cfg.depthOffset));
    scuff.setTint?.(tint);
    scuff.setAlpha?.(material.scuffAlpha);
    const sx = scuff.scaleX, sy = scuff.scaleY;
    scuff.setScale?.(sx * cfg.scuffStartScale, sy * cfg.scuffStartScale);
    this.activeObjects.add(scuff);
    const travel = this.reducedMotion ? cfg.reducedTravel : 1;
    if (!this._tween({ targets: scuff, alpha: 0,
      x: anchor.x - direction * tileSize * cfg.scuffDriftTiles * travel,
      scaleX: sx * cfg.scuffEndScale, scaleY: sy,
      duration: cfg.scuffFadeMs * material.fade, ease: "Sine.Out",
      onComplete: () => this._releaseObject(scuff) })) this._releaseObject(scuff);
  }

  _animateParticle(particle, baseScaleX, baseScaleY, direction, tileSize, family, floorY) {
    const cfg = this.config.particles;
    const material = materialParticleResponse(family);
    const travel = this.polished ? material.travel * (this.reducedMotion ? POLISH.foot.reducedTravel : 1) : 1;
    const backward = randomBetween(cfg.backwardMinTiles, cfg.backwardMaxTiles) * tileSize * travel;
    const lift = randomBetween(cfg.liftMinTiles, cfg.liftMaxTiles) * tileSize * travel;
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
        y: this.polished ? Math.min(floorY, particle.y + lift) : particle.y + lift + tileSize * cfg.settleDownTiles,
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
    this.scene?.events?.off?.(POLISH.foot.postUpdateEvent, this._flushContacts);
    this.pendingFrames.length = 0;
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
