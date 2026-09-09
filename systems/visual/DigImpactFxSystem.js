import { DIG_IMPACT_FX_CONFIG as CONFIG, isDigImpactEnabled } from "../../values/digImpactFx.js";
import {
  TILE_DESTRUCTION_FX_CONFIG as ATLAS, resolveTileDestructionFamily, resolveTileDestructionTint,
} from "../../values/tileDestructionFx.js";
import { installTileDestructionFxAtlasFrames } from "./tileDestructionFxAtlasFrames.js";
import { captureDigImpactPose, resolveDigImpactContact } from "./digImpactContact.js";
import { MATERIAL_PARTICLE_POLISH as POLISH, isMaterialParticlePolishEnabled, materialParticleResponse } from "../../values/materialParticlePolish.js";
import { materialParticleFrame, sizeMaterialParticle } from "./materialParticleFrame.js";
import { MiningImpactFeedback } from "./MiningImpactFeedback.js";

/** Bounded material-matched bitmap feedback at each successful authored dig contact. */
export class DigImpactFxSystem {
  constructor(scene, player, controller, profile, options = {}) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.profile = profile;
    this.enabled = isDigImpactEnabled(options.search);
    this.polished = isMaterialParticlePolishEnabled(options.search);
    this.reducedMotion = options.reducedMotion
      ?? globalThis.matchMedia?.(CONFIG.reducedMotionMediaQuery)?.matches === true;
    this.random = options.random || Math.random;
    this.pending = [];
    this.live = new Set();
    this.seen = new Set();
    this.sequence = 0;
    this.destroyed = false;
    this.lastImpact = null;
    this.feedback = new MiningImpactFeedback(scene, player, controller, options);
    this._flush = () => this.flush();
    scene.events?.on(CONFIG.postUpdateEvent, this._flush);
  }

  play({ result, targetTile, contactEvent } = {}) {
    if (this.destroyed || !result?.success || !targetTile || !contactEvent?.animationKey
      || this.profile?.renderPipeline !== CONFIG.requiredPipeline) return false;
    const token = `${contactEvent.actionId}:${contactEvent.contactIndex}:${targetTile.tx}:${targetTile.ty}`;
    if (this.seen.has(token)) return true;
    this.seen.add(token);
    while (this.seen.size > CONFIG.rememberedContacts) this.seen.delete(this.seen.values().next().value);
    if (this.pending.length >= CONFIG.maxPending) this.pending.shift();
    const tileType = result.typeBeforeDamage ?? result.tileType;
    const destroyed = result.destroyed === true;
    this.pending.push({
      targetTile: { ...targetTile },
      tileType, destroyed,
      hitstopMs: this.feedback.prepare(contactEvent, tileType, destroyed),
      event: contactEvent,
      pose: captureDigImpactPose(this.player, contactEvent),
    });
    return true;
  }

  flush() {
    if (this.destroyed || !this.pending.length) return;
    // POST_UPDATE is before rendering: use this frame's resolved body position,
    // not last frame's running pose. No delayed impact timers or actor writes.
    for (const pending of this.pending.splice(0)) {
      const current = captureDigImpactPose(this.player, pending.event);
      const pose = current.animationKey === pending.event.animationKey
        && current.sheet === pending.pose.sheet ? current : pending.pose;
      const impact = resolveDigImpactContact({
        pose, body: this.controller?.physicsBody,
        targetTile: pending.targetTile, tileSize: this.scene.config?.tileSize,
      });
      if (!impact) continue;
      this.sequence += 1;
      if (this.enabled && installTileDestructionFxAtlasFrames(this.scene, ATLAS)) {
        this._burst(impact, pending);
      }
      this.scene.speedBlockFxSystem?.onMineImpact(pending.targetTile, impact.point);
      const feedback = this.feedback.present(impact, pending);
      this.lastImpact = {
        ...impact, animationKey: pending.event.animationKey,
        actionId: pending.event.actionId, contactIndex: pending.event.contactIndex,
        contactCount: pending.event.contactCount, targetTile: pending.targetTile,
        enabled: this.enabled, liveParticles: this.live.size, sequence: this.sequence,
        tileType: pending.tileType, destroyed: pending.destroyed, feedback,
      };
      this.scene.events?.emit(CONFIG.presentedEvent, this.lastImpact);
    }
  }

  _between(range) { return range[0] + this.random() * (range[1] - range[0]); }

  _image(impact, key, frame, size, heightRatio, tint, depthOffset = 0) {
    while (this.live.size >= CONFIG.maxLive) this._release(this.live.values().next().value);
    const image = this.scene.add.image(impact.point.x, impact.point.y, key, frame)
      .setDisplaySize(size, size * heightRatio).setTint(tint)
      .setDepth(Math.max(CONFIG.minimumDepth, (this.player.depth || 0) + CONFIG.depthOffset) + depthOffset);
    this.live.add(image);
    return image;
  }

  _burst(impact, pending) {
    if (!this.scene.add?.image || !this.scene.tweens?.add) return;
    const family = resolveTileDestructionFamily(pending.tileType);
    const tint = resolveTileDestructionTint(pending.tileType);
    const material = materialParticleResponse(family);
    const strength = impact.strength * (pending.destroyed ? CONFIG.breakStrength : 1);
    const tileSize = this.scene.config.tileSize;
    const cfg = CONFIG.flash;
    const core = this._image(impact, ATLAS.assets.core.key, `${family}-${cfg.firstFrame}`,
      tileSize * cfg.widthTiles * strength * (this.polished ? material.flashScale : 1),
      ATLAS.assets.core.frameHeight / ATLAS.assets.core.frameWidth, tint);
    core.setOrigin(cfg.originX, cfg.originY)
      .setRotation(Math.atan2(impact.normal.y, impact.normal.x) + Math.PI / 2
        + (this.random() * 2 - 1) * cfg.angleVariation)
      .setFlipX(this.sequence % 2 === 0)
      .setAlpha(this.reducedMotion ? cfg.reducedAlpha : cfg.alpha);
    const sx = core.scaleX, sy = core.scaleY;
    core.setScale(sx * cfg.startScale, sy * cfg.startScale);
    this.scene.tweens.add({
      targets: core, scaleX: sx * cfg.peakScale, scaleY: sy * cfg.peakScale,
      duration: cfg.peakMs, ease: cfg.enterEase,
      onComplete: () => {
        core.setFrame(`${family}-${cfg.secondFrame}`);
        this.scene.tweens.add({
          targets: core, alpha: 0, scaleX: sx * cfg.endScale, scaleY: sy * cfg.endScale,
          duration: (this.reducedMotion ? cfg.reducedFadeMs : cfg.fadeMs)
            * (this.polished ? material.fade : 1), ease: cfg.fadeEase,
          onComplete: () => this._release(core),
        });
      },
    });
    const count = this.reducedMotion ? CONFIG.chips.reducedCount
      : Math.max(1, Math.round(CONFIG.chips.count * strength));
    for (let index = 0; index < count; index += 1) {
      this._chip(impact, family, tint, strength, index);
    }
  }

  _chip(impact, family, tint, strength, index) {
    const cfg = CONFIG.chips;
    const tileSize = this.scene.config.tileSize;
    const size = tileSize * this._between(this.polished ? POLISH.hit.sizeTiles : cfg.sizeTiles) * strength;
    const detail = this.polished && materialParticleFrame(this.scene, family, index + this.sequence, size * cfg.foregroundScale);
    const frame = detail ? detail.name : `${family}-s${String((index + this.sequence) % cfg.frameCount + 1).padStart(2, "0")}`;
    const material = materialParticleResponse(family);
    const chip = this._image(impact, ATLAS.assets.shards.key, frame, size, 1, tint, index * cfg.depthStep);
    if (detail) sizeMaterialParticle(chip, detail, size);
    chip.setOrigin(0.5).setAlpha(cfg.alpha);
    const sx = chip.scaleX, sy = chip.scaleY;
    chip.setScale(sx * cfg.startScale, sy * cfg.startScale);
    const reduced = this.reducedMotion ? cfg.reducedTravel : 1;
    const outward = this._between(cfg.travelTiles) * tileSize * strength * reduced
      * (this.polished ? material.travel : 1);
    const across = ((this.random() * 2 - 1) * cfg.spreadTiles
      + impact.sweep * cfg.sweepTiles) * tileSize * reduced;
    const nx = impact.normal.x, ny = impact.normal.y;
    const rotation = (this.random() * 2 - 1) * cfg.rotation * (this.polished ? material.spin : 1);
    const endX = chip.x + nx * outward - ny * across;
    const endY = chip.y + ny * outward + nx * across;
    this.scene.tweens.add({
      targets: chip, x: endX, y: endY, rotation,
      scaleX: sx * cfg.foregroundScale, scaleY: sy * cfg.foregroundScale,
      duration: this._between(cfg.launchMs), ease: cfg.launchEase,
      onComplete: () => this.scene.tweens.add({
        targets: chip, y: endY + tileSize * cfg.gravityTiles * reduced
          * (this.polished ? material.gravity : 1), alpha: 0,
        rotation: rotation * 2, scaleX: sx * cfg.endScale, scaleY: sy * cfg.endScale,
        duration: this._between(cfg.settleMs) * (this.polished ? material.fade : 1), ease: cfg.settleEase,
        onComplete: () => this._release(chip),
      }),
    });
  }

  _release(object) {
    this.scene.tweens?.killTweensOf?.(object);
    this.live.delete(object);
    object?.destroy?.();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.feedback.destroy();
    this.scene.events?.off(CONFIG.postUpdateEvent, this._flush);
    this.pending.length = 0;
    for (const object of [...this.live]) this._release(object);
    this.seen.clear();
  }
}
