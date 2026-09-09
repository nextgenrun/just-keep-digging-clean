import { CORE_ACTION_AUDIO } from "../values/coreActionAudio.js";
import { FREESOUND_AUDIO as CFG, FREESOUND_ROLE_SETTINGS as ROLES } from "../values/freesoundAudio.js";
import { FreesoundPaletteBank } from "./FreesoundPaletteBank.js";
import { StarSoundPocketController } from "./StarSoundPocketController.js";
import { PanicSoundscapeController } from "./PanicSoundscapeController.js";

/** Routes approved banks through existing event owners and a shared context snapshot. */
export class FreesoundAudioDirector {
  constructor(system, config = CFG) {
    this.system = system;
    this.config = config;
    const search = typeof window === "undefined" ? "" : window.location?.search || "";
    this.enabled = config.enabledByDefault && new URLSearchParams(search).get(config.rollbackQuery) !== "0";
    this.palette = new FreesoundPaletteBank(system, config);
    this.stars = new StarSoundPocketController(this, config.stars);
    this.panic = new PanicSoundscapeController(this, config.panic);
    this.context = {};
    this.lastAt = new Map();
    this.lastActionAt = -Infinity;
    this.nextStructuralAt = 0;
    this.nextQuakeAt = 0;
    this.motion = null;
    this.history = [];
    this.frame = null;
    this.destroyed = false;
  }

  now() { return this.palette.now(); }
  available() { return !this.destroyed && this.enabled && this.system.audioInitialized && this.system.sfxEnabled
    && !this.system.audioSuspended && (typeof document === "undefined" || !document.hidden); }
  setContext(context) { this.context = context || {}; }
  noteAction() { this.lastActionAt = this.now(); }

  play(role, options = {}, fallback = null) {
    if (!this.enabled) return fallback?.() || null;
    if (!this.available()) return null;
    const settings = ROLES[role];
    if (!settings) return fallback?.() || null;
    const time = this.now(), key = options.cooldownKey || role;
    if (time - (this.lastAt.get(key) ?? -Infinity) < settings.cooldownMs) return null;
    const context = options.context || (CORE_ACTION_AUDIO.banks[role] ? CORE_ACTION_AUDIO.context : this.context.biome) || "default";
    const asset = this.palette.pick(role, context);
    if (!asset) {
      // Drop a cold contact and warm its own material; never insert another
      // recording family or replay a contact after its loading completes.
      if (CORE_ACTION_AUDIO.banks[role]) return null;
      const sound = fallback?.() || null;
      if (sound) this.lastAt.set(key, time);
      return sound;
    }
    const sound = this.system.reviewedSfx.play(asset.id, { ...options, cooldownKey: `fs:${key}` });
    if (sound) {
      this.lastAt.set(key, time);
      this.history.push({ id: asset.id, role, at: time, context });
      if (this.history.length > this.config.maxHistory) this.history.shift();
    }
    return sound;
  }

  updateFromScene(time = 0, delta = 16) {
    const scene = this.system.scene, controller = scene.playerController;
    const tile = controller?.getPlayerTile?.(), body = controller?.physicsBody;
    const size = scene.worldModel?.tileSize || scene.config?.tileSize || this.config.stars.fallbackTileSize;
    const position = body ? { x: (body.x + (body.width || 0) / 2) / size,
      y: (body.y + (body.height || 0) / 2) / size } : tile ? { x: tile.tx + 0.5, y: tile.ty + 0.5 } : null;
    const active = this.available() && scene.gameState === "playing" && Boolean(tile)
      && !scene.shopOverlay?.isVisible && !scene._pillarViewActive
      && !scene.campfireSystem?.isSelecting?.() && !scene._hardcoreDeathInProgress;
    this.update({ active, time, delta, position, world: scene.worldModel,
      context: this.context, speaking: this.system.voiceLineManager?.isBusy?.() === true,
      nearRefuge: scene.starSanctuarySnapshot?.nearIntactStar === true,
      flying: controller?.abilities?.isFlying?.() === true, vx: body?.vx || 0, vy: body?.vy || 0 });
  }

  update(snapshot) {
    const { time = 0, delta = 16, active = true, context = this.context } = snapshot;
    this.context = context;
    const seismic = context.earthquakePlayerAware === true
      && this.config.quakeStates.includes(context.earthquakeState);
    const danger = seismic || context.wurmActive === true || (context.hardcoreArmed === true
      && ["warning", "critical"].includes(context.hardcoreStressBand));
    this.frame = { ...snapshot, time, delta, active: active && this.available(), context, danger,
      busy: time - this.lastActionAt < this.config.busyWindowMs };
    if (!this.frame.active) {
      // Menus and modal UI still need their short approved click/reward banks.
      // Warming never plays a sound. True suspension/mute still cancels it.
      this.stop({ cancelPending: !this.available() });
      this.palette.trim();
      return;
    }
    for (const role of Object.keys(CORE_ACTION_AUDIO.banks)) {
      this.palette.warmRole(role, CORE_ACTION_AUDIO.context);
    }
    this.stars.update(this.frame);
    this.panic.update(this.frame);
    const biome = String(context.biome || "").toLowerCase();
    const structural = this.config.structuralBiomes.some(word => biome.includes(word))
      && context.depth >= this.config.structuralDepth;
    if (!this.nextStructuralAt) this.nextStructuralAt = time + this.config.structuralFirstDelayMs;
    if ((structural || seismic) && !snapshot.speaking && !snapshot.nearRefuge) {
      this.palette.warmRole("structuralCreak", biome);
      if (time >= this.nextStructuralAt && !this.frame.busy) {
        this.play("structuralCreak", { context: biome });
        this.nextStructuralAt = time + this.config.structuralGapMs;
      }
    }
    if ((seismic || context.wurmActive) && !snapshot.speaking) {
      this.palette.warmRole("quakeRumble", biome);
      if (time >= this.nextQuakeAt) {
        const sound = this.play("quakeRumble", { context: biome });
        if (sound) this.nextQuakeAt = time + this.config.quakeGapMs;
      }
    } else {
      this.nextQuakeAt = time;
      this.system.reviewedSfx.stop("dangerDetail");
    }
    this.observeFlight(this.frame);
    this.palette.trim([...this.stars.bus.tracks.values(), ...this.panic.bus.tracks.values()].map(track => track.asset.key).concat(
      [...this.system.activeSfxMixer.active.keys()].map(sound => sound.key)));
  }

  updateFromCaveScene(scene, time, delta) {
    const controller = scene.gameplay?.playerController, body = controller?.physicsBody;
    const size = scene.worldModel?.tileSize || scene.config?.tileSize;
    // Interior gameplay has no active overworld seismic/Hardcore owner. Never
    // reuse the paused world's last threat or its Star coordinates here.
    const context = { scene: "cave", biome: scene.archetype?.id || "cave",
      depth: scene.entryData?.depthTiles || 0, earthquakeState: "idle",
      earthquakePlayerAware: false, hardcoreArmed: false, hardcoreStressBand: "calm", wurmActive: false };
    this.update({ time, delta, context, active: !scene.isLeaving && Boolean(body && size),
      world: scene.worldModel, position: body && size ? {
        x: (body.x + (body.width || 0) / 2) / size, y: (body.y + (body.height || 0) / 2) / size,
      } : null, speaking: this.system.voiceLineManager?.isBusy?.() === true,
      nearRefuge: false, flying: controller?.abilities?.isFlying?.() === true,
      vx: body?.vx || 0, vy: body?.vy || 0 });
  }

  observeFlight(snapshot) {
    const { flying, vx = 0, vy = 0 } = snapshot;
    const previous = this.motion;
    this.motion = { flying, vx, vy };
    this.palette.warmRole("flightWhoosh", this.context.biome || "default");
    if (!previous) return;
    const poweredStart = flying && (!previous.flying
      || Math.hypot(previous.vx, previous.vy) < this.config.flightMinSpeed);
    const turn = flying && previous.flying && Math.sign(vx) !== Math.sign(previous.vx)
      && Math.abs(vx - previous.vx) >= this.config.flightTurnThreshold;
    if ((poweredStart || turn) && Math.hypot(vx, vy) >= this.config.flightMinSpeed) this.play("flightWhoosh");
  }

  materialRole(tileType) { return this.isMetal(tileType) ? "mineMetal" : this.config.softTypes.includes(tileType) ? "mineEarth" : "mineStone"; }
  isMetal(tileType) { return this.config.metalTypes.includes(tileType); }
  isCrystal(tileType) { return this.config.crystalTypes.includes(tileType); }
  decorativeGain() { return this.frame?.nearRefuge ? this.config.stars.refugeAmbienceGain : this.config.stars.normalAmbienceGain; }
  allowDetail() { return !this.frame?.nearRefuge && !this.frame?.danger && !this.frame?.busy; }
  refreshVolume() { this.stars.bus.refreshVolume(); this.panic.bus.refreshVolume(); }
  stop({ cancelPending = true } = {}) {
    this.stars.stop(); this.panic.stop();
    if (cancelPending) this.palette.cancel();
    this.motion = null; this.nextStructuralAt = 0;
  }
  snapshot() { return { enabled: this.enabled, context: this.context, stars: this.stars.snapshot(), panic: this.panic.snapshot(),
    memory: this.palette.snapshot(), history: this.history.slice() }; }
  destroy() { this.destroyed = true; this.stop(); this.stars.destroy(); this.panic.destroy(); this.palette.destroy(); }
}
