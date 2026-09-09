import { CelestialContactVfx } from "./CelestialContactVfx.js";
import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { CELESTIAL_PRESENTATION as P } from "../../values/celestialPresentation.js";

const starSequences = new WeakMap();

/** Solid, stable Star/Corona artwork with short matching echoes and contact pulses. */
export class CelestialStarVfx {
  constructor({ scene, x, y, assetKey, size, kind, passive = false, delay = 0, coreRadius, tileSize, paletteIndex }) {
    Object.assign(this, { scene, x, y, assetKey, kind, passive });
    this.config = P[kind];
    this.paletteIndex = paletteIndex ?? (starSequences.get(scene) || 0);
    if (kind === "wayward") starSequences.set(scene, this.paletteIndex + 1);
    this.size = size * this.config.sizeScale;
    this.strength = passive ? P.passiveAlpha : 1;
    this.effects = new Set();
    this.trails = new Set();
    this.pulses = new Set();
    this.previous = { x, y };
    this.trailIndex = 0;
    this.lastPulseAt = -Infinity;
    this.startedAt = (scene.time?.now || 0) + delay;
    this.envelope = { value: 0 };
    this.contacts = kind === "wayward"
      ? new CelestialContactVfx(scene, tileSize || scene.config?.tileSize || size, this.strength) : null;
    try {
      this.halo = this._image(x, y, this.size * P.haloScale, 0, P.detailDepthOffset);
      this.halo.setTint?.(...this.config.haloTints);
      if (kind === "hollow") {
        this.core = scene.add.circle(x, y, coreRadius ?? size * P.hollow.passiveCoreRadius, 0, 1)
          .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + P.coreDepthOffset)
          .setAlpha(0);
      }
      this.sprite = this._image(x, y, this.size, 0);
      this.sprite.setTint?.(...this.config.tints);
      if (kind === "hollow") {
        this.sprite.preFX?.addColorMatrix?.()?.hue(this.config.coreHueDeg);
        this.halo.preFX?.addColorMatrix?.()?.hue(this.config.haloHueDeg);
      }
      if (kind === "wayward") this.setPalette(this.paletteIndex);
      this._pose(this.startedAt);
      scene.tweens.add({ targets: this.envelope, value: 1, delay,
        duration: P.enterMs, ease: "Sine.out", onUpdate: () => this._pose(scene.time?.now || 0) });
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  _image(x, y, size, alpha, depthOffset = 0, assetKey = this.assetKey, frame) {
    return this.scene.add.image(x, y, assetKey, frame)
      .setDisplaySize(size, size).setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + depthOffset);
  }

  _pose(_nowMs) {
    if (this.destroyed) return;
    const envelope = this.envelope.value;
    // Only the surrounding glow fades. The visible skill keeps a solid, fixed silhouette.
    this.sprite.setDisplaySize(this.size, this.size).setAlpha(envelope > 0 ? P.coreAlpha : 0);
    this.halo.setDisplaySize(this.size * P.haloScale, this.size * P.haloScale * P.haloAspect)
      .setAlpha(P.haloAlpha * this.strength * envelope);
    this.core?.setAlpha(envelope > 0 ? 1 : 0);
    this.core?.setScale(1);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    for (const image of [this.sprite, this.halo, this.core]) image?.setPosition(x, y);
  }

  update(nowMs, deltaMs, x = this.x, y = this.y) {
    if (this.destroyed || this.finishing) return;
    this.setPosition(x, y);
    const dt = Math.min(P.maxDeltaMs, Math.max(0, deltaMs || 0)) / P.millisecondsPerSecond;
    this.sprite.angle += this.config.rotationDegPerSecond * dt;
    this.halo.angle += this.config.rotationDegPerSecond * P.haloRotationRatio * dt;
    this._pose(nowMs);
    if (this.kind === "wayward" && nowMs >= this.startedAt) this._trail();
  }

  _trail() {
    const c = this.config;
    const dx = this.x - this.previous.x;
    const dy = this.y - this.previous.y;
    const distance = Math.hypot(dx, dy);
    const spacing = c.trailSpacingPx / this.strength;
    if (distance < spacing) return;
    const count = Math.min(c.trailMaxSamples, Math.floor(distance / spacing));
    for (let index = 0; index < count && this.trails.size < c.trailMaxLive; index += 1) {
      // Emit behind the current core so new copies do not brighten it on every sample.
      const t = index / count;
      const trail = this._image(this.previous.x + dx * t, this.previous.y + dy * t,
        this.size * c.echoScale, c.echoAlpha * this.strength * this.envelope.value,
        P.detailDepthOffset);
      trail.angle = this.sprite.angle;
      trail.preFX?.addColorMatrix?.()?.hue(this.palette.hueDeg);
      this.trailIndex += 1;
      this._track(trail, this.trails);
      this.scene.tweens.add({ targets: trail, alpha: 0, duration: c.trailLifeMs,
        ease: "Linear", onComplete: () => this._release(trail) });
    }
    this.previous = { x: this.x, y: this.y };
  }

  setPalette(index) {
    if (this.kind !== "wayward") return;
    this.paletteIndex = index % P.wayward.palettes.length;
    this.palette = P.wayward.palettes[this.paletteIndex];
    for (const sprite of [this.sprite, this.halo]) {
      sprite.setTint?.(0xffffff);
      sprite.celestialColourMatrix ||= sprite.preFX?.addColorMatrix?.();
      sprite.celestialColourMatrix?.reset().hue(this.palette.hueDeg);
    }
  }

  impact(point, direction) { return this.contacts?.play(point, direction) || false; }

  pulse(radius = this.size * P.pulse.impactRadiusInSizes, index = 0) {
    if (this.destroyed || this.finishing) return false;
    const c = P.pulse;
    const now = this.scene.time?.now || 0;
    const interval = this.passive ? c.passiveIntervalMs : c.minimumIntervalMs;
    if (now - this.lastPulseAt < interval || this.pulses.size >= c.maxLive) return false;
    this.lastPulseAt = now;
    const pulling = this.kind === "hollow";
    const size = Math.min(radius, this.size * c.maxRadiusInSizes) * c.diameterScale;
    const start = pulling ? c.pullStart : c.expandStart;
    const end = pulling ? c.pullEnd : c.expandEnd;
    const pulse = this._image(this.x, this.y, size * start, 0, P.detailDepthOffset);
    pulse.angle = this.sprite.angle + index * c.rotationDeg;
    pulse.setTint?.(...(index % 2 ? this.config.tints : this.config.haloTints));
    this._track(pulse, this.pulses);
    const alpha = this.passive ? c.passiveAlpha : c.alpha;
    this.scene.tweens.add({ targets: pulse, alpha, duration: c.attackMs, ease: "Sine.out",
      onComplete: () => {
        if (!this.effects.has(pulse)) return;
        this.scene.tweens.add({ targets: pulse, alpha: 0,
          scaleX: pulse.scaleX * end / start, scaleY: pulse.scaleY * end / start,
          angle: pulse.angle + (pulling ? -c.rotationDeg : c.rotationDeg),
          duration: c.lifeMs, ease: "Sine.inOut", onComplete: () => this._release(pulse) });
      } });
    return true;
  }

  _track(image, group) {
    this.effects.add(image);
    group.add(image);
  }

  _release(image) {
    this.effects.delete(image);
    this.trails.delete(image);
    this.pulses.delete(image);
    image.destroy?.();
  }

  finish(onComplete) {
    if (this.destroyed || this.finishing) return;
    this.finishing = true;
    this.scene.tweens?.killTweensOf?.(this.envelope);
    this.scene.tweens.add({ targets: this.envelope, value: 0, duration: P.exitMs,
      ease: "Sine.inOut", onUpdate: () => this._pose(this.scene.time?.now || 0),
      onComplete: () => { if (!this.destroyed) onComplete?.(); } });
  }

  getSnapshot() {
    return { liveTrails: this.trails.size, livePulses: this.pulses.size,
      trailSamples: this.trailIndex, passive: this.passive,
      palette: this.palette?.id, ...this.contacts?.getSnapshot() };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.contacts?.destroy();
    for (const target of [this.envelope, this.sprite, this.halo, this.core, ...this.effects]) {
      if (!target) continue;
      this.scene.tweens?.killTweensOf?.(target);
      target.destroy?.();
    }
    this.effects.clear();
    this.trails.clear();
    this.pulses.clear();
  }
}
