import { REVIEWED_AUDIO_ASSETS as ASSETS } from "../values/reviewedAudioAssets.js";
import { REVIEWED_AUDIO_MIX as MIX } from "../values/reviewedAudioMix.js";
import { AudioLayerBus } from "./AudioLayerBus.js";

const between = range => range[0] + Math.random() * (range[1] - range[0]);
const clamp = value => Math.max(0, Math.min(1, value));

/** Context, not timers detached from gameplay, owns deep beds and distant detail. */
export class ReviewedAmbienceController {
  constructor(system) {
    this.system = system;
    this.bus = new AudioLayerBus(system, MIX.cave);
    this.entered = false;
    this.preset = 0;
    this.nextBedAt = 0;
    this.nextDetailAt = 0;
    this.detail = null;
    this.motion = null;
    this.compositeEntryPending = false;
    this.compositeAccentUntil = 0;
  }

  updateFromScene(time = 0, delta = 16) {
    const scene = this.system.scene;
    const tile = scene.playerController?.getPlayerTile?.();
    const depth = tile ? Math.max(0, tile.ty - (scene.config?.topAirRows || 0) + 1) : 0;
    const blocked = scene.gameState !== "playing" || scene.shopOverlay?.isVisible
      || scene._pillarViewActive || scene.campfireSystem?.isSelecting?.()
      || scene._hardcoreDeathInProgress;
    this.update({ time, delta, depth, active: !blocked && Boolean(tile),
      speaking: this.system.voiceLineManager?.isBusy?.() === true,
      detailAllowed: this.system.freesoundAudio?.allowDetail?.() !== false,
      ambienceGain: this.system.freesoundAudio?.decorativeGain?.() ?? 1 });
  }

  update({ time = 0, delta = 16, depth = 0, active = true, speaking = false, detailAllowed = true, ambienceGain = 1 } = {}) {
    const cfg = MIX.cave;
    const eligible = active && this.system.sfxEnabled && this.system.audioInitialized
      && depth >= (this.entered ? cfg.exitDepth : cfg.enterDepth);
    if (!eligible) {
      this.entered = false;
      this.detail = null;
      this.compositeEntryPending = false;
      this.compositeAccentUntil = 0;
      if (!active) this.motion = null;
      this.bus.update([], delta);
      return;
    }
    if (!this.entered) {
      this.entered = true;
      this.nextBedAt = time + between(cfg.bedHoldMs);
      this.nextDetailAt = time + cfg.firstDetailDelayMs;
      this.compositeEntryPending = this.preset === 3;
      this.compositeAccentUntil = 0;
    }
    if (time >= this.nextBedAt) {
      const indices = cfg.presets.map((_, index) => index).filter(index => index !== this.preset);
      this.preset = indices[Math.floor(Math.random() * indices.length)];
      this.nextBedAt = time + between(cfg.bedHoldMs);
      this.detail = null;
      this.compositeEntryPending = this.preset === 3;
      this.compositeAccentUntil = 0;
    }
    const weight = (0.4 + 0.6 * clamp((depth - cfg.exitDepth) / (cfg.fullDepth - cfg.exitDepth))) * ambienceGain;
    const preset = cfg.presets[this.preset];
    const layers = preset.map(layer => ({ asset: ASSETS[layer.id], gain: (layer.gain ?? ASSETS[layer.id].gain) * weight }));
    if (this.preset === 3 && (this.compositeEntryPending || time < this.compositeAccentUntil)) {
      layers.push({ asset: ASSETS.panicTimber, gain: ASSETS.panicTimber.gain * weight,
        loop: false, fadeMs: cfg.detailFadeMs });
    }
    if (speaking || !detailAllowed || preset.length > 1) this.detail = null;
    if (time >= this.nextDetailAt && !speaking && detailAllowed && preset.length === 1) {
      this.nextDetailAt = time + between(cfg.detailGapMs);
      if (Math.random() < 0.25) this.system.reviewedSfx.play("libWaterSeep");
      else {
        const id = this.system.reviewedSfx.choose("cave-detail", cfg.vocalDetails);
        this.system.reviewedSfx.warm(id);
        this.detail = { id, until: time + ASSETS[id].duration * 1000 - cfg.detailFadeMs };
      }
    }
    if (this.detail && time < this.detail.until) {
      layers.push({ asset: ASSETS[this.detail.id], gain: ASSETS[this.detail.id].gain * weight,
        loop: false, fadeMs: cfg.detailFadeMs });
    } else this.detail = null;
    this.bus.update(layers, delta);
    // All four approved stems start together after loading. The timber accent
    // shares the cave headroom/fade and is removed before its natural end.
    if (this.compositeEntryPending && this.bus.tracks.has(ASSETS.panicTimber.key)) {
      this.compositeAccentUntil = time + ASSETS.panicTimber.duration * 1000 - cfg.detailFadeMs;
      this.compositeEntryPending = false;
    }
  }

  observeMotion(controller, delta = 16, worldModel = this.system.scene.worldModel) {
    const body = controller?.physicsBody;
    if (!body) return;
    const next = { owner: controller, x: body.x, y: body.y, grounded: controller.isGrounded?.() === true,
      speed: Math.max(0, body.vy || 0), airMs: 0 };
    const previous = this.motion;
    this.motion = next;
    if (!previous || previous.owner !== controller || Math.hypot(next.x - previous.x, next.y - previous.y) > MIX.landing.teleportDistance) return;
    if (!next.grounded) {
      next.airMs = (previous.grounded ? 0 : previous.airMs) + Math.min(100, delta);
    } else if (!previous.grounded && previous.airMs >= MIX.landing.minAirMs && previous.speed >= MIX.landing.minSpeed) {
      this.system.playLanding(controller, previous.speed, worldModel);
    }
  }

  stop() { this.entered = false; this.detail = null; this.motion = null; this.compositeEntryPending = false; this.compositeAccentUntil = 0; this.bus.stop(); }
  destroy() { this.stop(); this.bus.destroy(); }
  snapshot() { return { entered: this.entered, preset: this.preset, detail: this.detail?.id ?? null, ...this.bus.snapshot() }; }
}
