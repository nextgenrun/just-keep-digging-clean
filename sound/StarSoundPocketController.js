import { TILE_TYPES } from "../values/tileTypes.js";
import { FREESOUND_AUDIO } from "../values/freesoundAudio.js";
import { AudioLayerBus } from "./AudioLayerBus.js";
import { findAudibleStars, starPocketSpatial } from "./starSoundPocketMath.js";

/** One stable world-anchored Star pocket, with bounded handover and rock muffling. */
export class StarSoundPocketController {
  constructor(director, config = FREESOUND_AUDIO.stars) {
    this.director = director;
    this.system = director.system;
    this.config = config;
    this.bus = new AudioLayerBus(this.system, config);
    this.current = null;
    this.candidates = [];
    this.nextScanAt = 0;
    this.nextAccentAt = 0;
    this.quietUntil = 0;
    this.spatial = null;
    this.nearRefuge = false;
  }

  update(snapshot) {
    const { active, time, delta, position, world, speaking, danger, busy, nearRefuge } = snapshot;
    this.nearRefuge = Boolean(nearRefuge);
    if (!active || !position || !world) { this.stop(); return; }
    if (time < this.quietUntil) { this.bus.update([], delta); return; }
    if (this.current && world.getTileType?.(this.current.tx, this.current.ty) !== TILE_TYPES.SKY_TILE) {
      this.consumed(time);
      return;
    }
    if (time >= this.nextScanAt) {
      this.candidates = findAudibleStars(position, world, this.config);
      this.nextScanAt = time + this.config.scanMs;
    }
    const eligible = this.candidates.filter(star => world.getTileType?.(star.tx, star.ty) === TILE_TYPES.SKY_TILE)
      .map(star => ({ ...star, distance: Math.hypot(star.tx + 0.5 - position.x, star.ty + 0.5 - position.y) }))
      .sort((a, b) => a.distance - b.distance);
    const nearest = eligible.find(star => star.distance <= this.config.enterRadius);
    const distance = this.current ? Math.hypot(this.current.tx + 0.5 - position.x, this.current.ty + 0.5 - position.y) : Infinity;
    let selected = distance <= this.config.exitRadius ? this.current : null;
    if (nearest && (!selected || nearest.distance + this.config.handoverMargin < distance)) selected = nearest;
    if (selected?.key !== this.current?.key) {
      this.bus.retainOwners([this.current?.key, selected?.key]);
      this.current = selected;
      this.nextAccentAt = time + this.config.firstAccentMs;
    }
    if (!this.current) { this.spatial = null; this.bus.update([], delta); return; }
    const spatial = starPocketSpatial(position, this.current, world, this.config);
    this.spatial = spatial;
    const identity = `${this.current.identity}:${this.current.key}`;
    const palette = this.director.palette;
    const hum = palette.stable("starHum", identity);
    const grain = palette.stable("starGrain", identity);
    palette.warm(hum);
    if (spatial.distance < this.config.detailRadius) palette.warm(grain);
    const layers = [];
    if (palette.ready(hum)) layers.push({ asset: hum, gain: hum.gain,
      ownerKey: this.current.key, instanceKey: `${hum.key}@${this.current.key}`,
      pan: spatial.pan, cutoff: spatial.cutoff });
    if (spatial.distance < this.config.detailRadius && !danger && palette.ready(grain)) {
      layers.push({ asset: grain, ownerKey: this.current.key, instanceKey: `${grain.key}@${this.current.key}`, gain: grain.gain
        * (1 - spatial.distance / this.config.detailRadius), pan: spatial.pan, cutoff: spatial.cutoff });
    }
    // Calibrate the full pocket first. A limiter applied only after distance
    // attenuation would flatten near/mid distances for louder source loops.
    const nominalPeak = layers.reduce((sum, layer) => sum + layer.gain * layer.asset.peak, 0);
    const calibration = Math.min(1, this.config.peakBudget / Math.max(nominalPeak, 1e-9));
    this.bus.update(layers.map(layer => ({ ...layer, gain: layer.gain * calibration * spatial.gain })), delta);
    if (spatial.distance < this.config.detailRadius && !danger && !speaking && !busy) {
      palette.warmRole("starAccent", identity);
      if (time >= this.nextAccentAt) {
        this.director.play("starAccent", { context: identity, gain: spatial.gain, pan: spatial.pan });
        this.nextAccentAt = time + this.config.accentGapMs;
      }
    }
  }

  consumed(time) {
    this.stop();
    this.quietUntil = time + this.config.consumptionQuietMs;
  }

  stop() { this.current = null; this.candidates = []; this.nextScanAt = 0; this.spatial = null; this.nearRefuge = false; this.bus.stop(); }
  snapshot() { return { source: this.current?.key || null, nearRefuge: this.nearRefuge, ...this.spatial, ...this.bus.snapshot() }; }
  destroy() { this.stop(); this.bus.destroy(); }
}
