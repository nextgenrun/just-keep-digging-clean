import { EventEmitter } from "node:events";
import { SoundSystem } from "../../sound/SoundSystem.js";
import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { APPROVED_SFX_FAMILIES } from "../../values/audioConfig.js";

export function createRuntime({ missing = [] } = {}) {
  const played = [];
  const keys = new Set(Object.values(REVIEWED_AUDIO_ASSETS).filter(asset => !missing.includes(asset.id)).map(asset => asset.key));
  const loads = new Map();
  class Sound extends EventEmitter {
    constructor(key, config) { super(); this.key = key; this.config = config; this.manager = {}; this.isPlaying = false; this.volume = config.volume; }
    set volume(value) { this.config.volume = value; }
    get volume() { return this.config.volume; }
    play() { this.isPlaying = true; played.push({ sound: this, key: this.key, at: scene.time.now }); return true; }
    stop() { this.isPlaying = false; this.emit("stop"); }
    destroy() { if (this.pendingDestroy) return; this.pendingDestroy = true; this.isPlaying = false; this.emit("destroy"); this.manager = null; }
  }
  const scene = { time: { now: 0 }, events: new EventEmitter(), game: { canvas: {} },
    cache: { audio: { exists: key => keys.has(key), remove: key => keys.delete(key) } },
    sound: { volume: 1, context: null, add: (key, config) => new Sound(key, config) },
    tweens: { killTweensOf() {} } };
  const system = new SoundSystem(scene);
  scene.soundSystem = system;
  system.musicEnabled = false;
  system.init();
  system.audioInitialized = true;
  scene.sound.context = {};
  system.runtimeAudioAssetManager.destroy();
  system.runtimeAudioAssetManager = {
    ensure(asset, callbacks) {
      const record = { asset, callbacks, cancelled: false };
      loads.set(asset.key, record);
      return { cancel() { record.cancelled = true; } };
    },
    destroy() { for (const entry of loads.values()) entry.cancelled = true; },
  };
  for (const family of ["starDestruction", "levelUpReward"]) {
    system.soundLibraryManager.libraries[family].push(...APPROVED_SFX_FAMILIES[family]);
  }
  return { scene, system, played, keys, loads,
    ready(id) { const asset = REVIEWED_AUDIO_ASSETS[id]; keys.add(asset.key); loads.get(asset.key)?.callbacks.onReady?.(asset); },
    tick(ms = 16) { scene.time.now += ms; },
  };
}
