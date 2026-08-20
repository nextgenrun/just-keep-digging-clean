import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

globalThis.Phaser = {
  Scene: class {},
  Math: { Between: (minimum) => minimum },
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ASSET_KEYS } = await import("../values/assetKeys.js");
const {
  AUDIO_CONFIG,
  AUDIO_RUNTIME_LOADING,
  resolveRuntimeAudioStreamingEnabled,
} = await import("../values/audioConfig.js");
const { RUNTIME_ASSET_LOADING } = await import("../values/runtimeAssetLoading.js");
const { WORLD_VISUAL_SEMANTIC_ASSETS } = await import(
  "../values/worldVisualSemanticAssets.js"
);
const { BootScene } = await import("../ui/scenes/BootScene.js");
const { MusicStreamController } = await import("../sound/MusicStreamController.js");
const { RuntimeAudioLoadQueue } = await import("../sound/RuntimeAudioLoadQueue.js");
const { VoiceLineManager } = await import("../sound/VoiceLineManager.js");
const { RuntimeAssetLoadCoordinator } = await import(
  "../world/rendering/RuntimeAssetLoadCoordinator.js"
);

const playlist = JSON.parse(await readFile(
  path.join(ROOT, "sound/playlists/playlist.json"),
  "utf8",
));
const randomVoices = JSON.parse(await readFile(
  path.join(ROOT, "sound/voice-lines/player-voice-lines/random-voice-lines/manifest.json"),
  "utf8",
));
const bootSource = await readFile(path.join(ROOT, "ui/scenes/BootScene.js"), "utf8");
assert.equal(
  bootSource.includes("MENU_BACKGROUND_ASSETS.forEach"),
  false,
  "Boot must retain only the already-selected full-quality menu background",
);
assert.ok(bootSource.includes("this.queueImage(ASSET_KEYS.tiles.bedrock"));
assert.equal(WORLD_VISUAL_SEMANTIC_ASSETS.bedrock.material.key, "tile-bedrock");
assert.equal(
  WORLD_VISUAL_SEMANTIC_ASSETS.bedrock.material.path,
  "sprites/tiles/approved-world/bedrock-megalith-lock-v1.png",
);
const retainedBedrockCopy = await readFile(path.join(ROOT, "sprites/backgrounds/world-visual-v2/semantic-decals-v1/bedrock-megalith-lock-v1.png"));
const canonicalBedrock = await readFile(path.join(ROOT, WORLD_VISUAL_SEMANTIC_ASSETS.bedrock.material.path));
assert.deepEqual(
  canonicalBedrock,
  retainedBedrockCopy,
  "shared bedrock consumers must remain pixel-identical at the source-byte level",
);
const originalFetch = globalThis.fetch;
const originalLocation = globalThis.location;
const originalRandom = Math.random;
globalThis.fetch = async url => ({
  json: async () => String(url).includes("playlist.json") ? playlist : randomVoices,
});
Math.random = () => 0;

function makeBootHarness() {
  const queued = [];
  const boot = new BootScene();
  boot.cache = { audio: { exists: () => false } };
  boot.load = { audio: (key, assetPath) => queued.push({ key, path: assetPath }) };
  return { boot, queued };
}

globalThis.location = { search: "" };
const streamedBoot = makeBootHarness();
await streamedBoot.boot.preloadAudio();
const registeredCount = Object.keys(ASSET_KEYS.audio.runtime.paths).length;
assert.equal(resolveRuntimeAudioStreamingEnabled(AUDIO_RUNTIME_LOADING, ""), true);
assert.equal(playlist.length, 144, "the expanded music catalog must remain fully registered");
assert.ok(registeredCount > 250, "all music and voice assets must remain addressable");
assert.equal(streamedBoot.queued.length, 21, "Boot must queue 1 music + 14 SFX + 6 voice seeds");
assert.deepEqual(ASSET_KEYS.audio.runtime.bootQueuedKeys, streamedBoot.queued.map(item => item.key));
let streamedBootBytes = 0;
for (const asset of streamedBoot.queued) {
  streamedBootBytes += (await stat(path.join(ROOT, asset.path))).size;
}
assert.ok(
  streamedBootBytes < 40 * 1024 * 1024,
  `streamed Boot audio must stay below 40 MiB, got ${(streamedBootBytes / 1024 / 1024).toFixed(1)}`,
);

globalThis.location = { search: `?${AUDIO_RUNTIME_LOADING.queryParam}=0` };
const eagerBoot = makeBootHarness();
await eagerBoot.boot.preloadAudio();
assert.equal(resolveRuntimeAudioStreamingEnabled(AUDIO_RUNTIME_LOADING, globalThis.location.search), false);
assert.equal(
  eagerBoot.queued.length,
  Object.keys(ASSET_KEYS.audio.runtime.paths).length,
  "runtimeAudioQueue=0 must restore the complete eager preload",
);
globalThis.fetch = originalFetch;
globalThis.location = originalLocation;
Math.random = originalRandom;

class Emitter {
  constructor() { this.listeners = new Map(); }
  on(event, listener) {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }
  off(event, listener) { this.listeners.get(event)?.delete(listener); }
  once(event, listener) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      listener(...args);
    };
    this.on(event, wrapped);
  }
  emit(event, ...args) {
    for (const listener of [...(this.listeners.get(event) || [])]) listener(...args);
  }
}

class FakeLoader extends Emitter {
  constructor() {
    super();
    this.loading = false;
    this.queued = [];
  }
  isLoading() { return this.loading; }
  audio(key, assetPath) { this.queued.push({ key, path: assetPath, type: "audio" }); }
  image(key, assetPath) { this.queued.push({ key, path: assetPath, type: "image" }); }
  video(key, assetPath) { this.queued.push({ key, path: assetPath, type: "video" }); }
  start() { this.loading = true; }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const queueCache = new Set();
const queueLoader = new FakeLoader();
const queueScene = {
  cache: { audio: { exists: key => queueCache.has(key) } },
  load: queueLoader,
};
const fallbackQueue = new RuntimeAudioLoadQueue(
  queueScene,
  AUDIO_RUNTIME_LOADING,
  { waitForSafeWindow: async () => {} },
);
let fallbackReady = 0;
fallbackQueue.request({ key: "voice-a", path: "voice-a.wav" }, { onReady: () => fallbackReady += 1 });
fallbackQueue.request({ key: "voice-b", path: "voice-b.wav" }, { onReady: () => fallbackReady += 1 });
await flush();
assert.deepEqual(queueLoader.queued.map(item => item.key), ["voice-a"]);
queueCache.add("voice-a");
queueLoader.emit("filecomplete-audio-voice-a");
queueLoader.loading = false;
queueLoader.emit(AUDIO_RUNTIME_LOADING.fallbackQueue.completeEvent);
await flush();
assert.deepEqual(queueLoader.queued.map(item => item.key), ["voice-a", "voice-b"]);
queueCache.add("voice-b");
queueLoader.emit("filecomplete-audio-voice-b");
assert.equal(fallbackReady, 2);
fallbackQueue.destroy();

const coordinatorCache = new Set();
const coordinatorLoader = new FakeLoader();
const coordinatorScene = {
  cache: {
    audio: { exists: key => coordinatorCache.has(key) },
    video: { exists: () => false },
  },
  load: coordinatorLoader,
  textures: { exists: () => false },
};
const coordinator = new RuntimeAssetLoadCoordinator(
  coordinatorScene,
  RUNTIME_ASSET_LOADING,
  `?${RUNTIME_ASSET_LOADING.bitmapDecode.queryParam}=0`,
  { waitForActivation: async () => {} },
);
let coordinatedReady = 0;
coordinator.request(
  { key: "music-runtime", path: "music-runtime.mp3", type: RUNTIME_ASSET_LOADING.types.audio },
  {
    owner: RUNTIME_ASSET_LOADING.owners.audioMusic,
    priority: RUNTIME_ASSET_LOADING.priorities.audioMusic,
    onReady: () => coordinatedReady += 1,
  },
);
await flush();
assert.deepEqual(coordinatorLoader.queued, [
  { key: "music-runtime", path: "music-runtime.mp3", type: "audio" },
]);
coordinatorCache.add("music-runtime");
coordinatorLoader.emit("filecomplete-audio-music-runtime");
assert.equal(coordinatedReady, 1);
assert.equal(coordinator.getSnapshot().lastLoad.owner, RUNTIME_ASSET_LOADING.owners.audioMusic);
coordinator.destroy();

class FakeSound {
  constructor() { this.isPlaying = false; this.handlers = new Map(); }
  play() { this.isPlaying = true; }
  stop() { this.isPlaying = false; }
  destroy() { this.destroyed = true; }
  once(event, listener) { this.handlers.set(event, listener); }
  on(event, listener) { this.handlers.set(event, listener); }
  complete() { this.isPlaying = false; this.handlers.get("complete")?.(); }
}

const voiceCache = new Set(["player-random-0"]);
const voiceLoads = [];
const voicePrefetches = [];
const voiceSystem = {
  voiceVolume: 1,
  masterVolume: 1,
  musicVolume: 1,
  sfxVolume: 1,
  currentTrack: null,
  setMusicVolume(value) { this.musicVolume = value; },
  setSfxVolume(value) { this.sfxVolume = value; },
  noteVoiceLineUse() {},
  prefetchVoiceLine: (...args) => voicePrefetches.push(args),
  loadVoiceLineAsset(entry, onReady) {
    voiceLoads.push(entry);
    return { cancel() {}, ready: onReady };
  },
};
const voiceSounds = [];
const voiceManager = new VoiceLineManager({
  cache: { audio: { exists: key => voiceCache.has(key) } },
  sound: { add: () => { const sound = new FakeSound(); voiceSounds.push(sound); return sound; } },
}, voiceSystem);
voiceManager.loadLibrary("player", "random", "voice/", ["a.ogg", "b.ogg", "c.ogg"]);
assert.equal(voiceManager.libraries.player.random.length, 3);
Math.random = () => 0;
assert.equal(voiceManager.playRandomPlayerVoiceLine(), voiceSounds[0]);
voiceSounds[0].complete();
assert.equal(voicePrefetches.length, 1, "voice prefetch must wait until playback completes");
voiceCache.clear();
assert.equal(voiceManager.playRandomPlayerVoiceLine(), null);
assert.equal(voiceLoads.length, 1, "an uncached catalog entry must load on demand");
voiceManager.destroy();

ASSET_KEYS.audio.music.playlist = ["music-track-1", "music-track-2", "music-track-3"];
const musicCache = new Set(["music-track-2"]);
const delayedCalls = [];
const musicEnsures = [];
const musicSystem = {
  scene: {
    cache: { audio: { exists: key => musicCache.has(key) } },
    sound: { add: () => new FakeSound() },
    tweens: { add: config => config.onComplete?.() },
    time: {
      delayedCall(delay, callback) {
        const call = { delay, callback, remove() { this.removed = true; } };
        delayedCalls.push(call);
        return call;
      },
    },
  },
  config: AUDIO_CONFIG,
  musicEnabled: true,
  musicVolume: 1,
  masterVolume: 1,
  currentTrack: null,
  nextTrack: null,
  currentTrackIndex: -1,
  musicTrackTimer: null,
  isCrossfading: false,
};
const musicAssets = {
  streamingEnabled: true,
  ensure(key, options) { musicEnsures.push({ key, options }); return { cancel() {} }; },
  noteMusicUse() {},
  trimMusic() {},
};
const musicController = new MusicStreamController(musicSystem, musicAssets);
musicController.start();
assert.equal(musicSystem.currentTrackIndex, 1, "the random Boot seed must start immediately");
const prefetchCall = delayedCalls.find(call => call.delay === AUDIO_RUNTIME_LOADING.musicPrefetchDelayMs);
assert.ok(prefetchCall, "next-track prefetch must be delayed until gameplay settles");
prefetchCall.callback();
assert.equal(musicEnsures.length, 1);
assert.equal(musicEnsures[0].options.priority, RUNTIME_ASSET_LOADING.priorities.audioPrefetch);
musicController.destroy();
Math.random = originalRandom;

console.log(
  `runtime audio streaming contract: ok (${registeredCount} registered; `
  + `${streamedBoot.queued.length} Boot seeds; ${(streamedBootBytes / 1024 / 1024).toFixed(1)} MiB)`,
);
