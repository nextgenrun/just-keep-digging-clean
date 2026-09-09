import assert from "node:assert/strict";

import { RuntimeAudioAssetManager } from "../sound/RuntimeAudioAssetManager.js";
import { VoiceLineManager } from "../sound/VoiceLineManager.js";

class FakeSound {
  constructor(key) {
    this.key = key;
    this.handlers = new Map();
    this.isPlaying = false;
  }

  play() { this.isPlaying = true; }
  stop() { this.isPlaying = false; }
  destroy() { this.destroyed = true; }
  once(event, listener) { this.handlers.set(event, listener); }
  complete() {
    this.isPlaying = false;
    this.handlers.get("complete")?.();
  }
}

const npcLibraries = {
  moneyMonster: "moneyMonster",
  gearUpgrades: "gearMerchant",
  playerUpgrades: "playerUpgrades",
  gemPowerMerchant: "gemPowerMerchant",
  boboMerchant: "boboMerchant",
};
const cached = new Set();
const pendingLoads = [];
const sounds = [];
const scene = {
  cache: { audio: { exists: key => cached.has(key) } },
  sound: {
    add(key) {
      const sound = new FakeSound(key);
      sounds.push(sound);
      return sound;
    },
  },
};
const soundSystem = {
  getVoiceMixVolume() { return this.voiceVolume; },
  refreshMixVolumes() {},
  masterVolume: 1,
  musicVolume: 1,
  sfxVolume: 1,
  voiceVolume: 1,
  setMusicVolume(value) { this.musicVolume = value; },
  setSfxVolume(value) { this.sfxVolume = value; },
  noteVoiceLineUse() {},
  prefetchVoiceLine() {},
  loadVoiceLineAsset(entry, onReady) {
    const request = {
      entry,
      onReady,
      cancelled: false,
      cancel() { this.cancelled = true; },
    };
    pendingLoads.push(request);
    return request;
  },
};
const manager = new VoiceLineManager(scene, soundSystem);

for (const category of Object.keys(npcLibraries)) {
  manager.loadLibrary("npc", category, "voice/", ["a.ogg", "b.ogg", "c.ogg"]);
  cached.add(`npc-${category}-0`);
}

function playAndResolve(npcName, expectedKey) {
  const beforeSounds = sounds.length;
  const result = manager.playNPCVoiceLine(npcName);
  if (result) return result.key;

  const request = pendingLoads.at(-1);
  assert.equal(request.entry.key, expectedKey);
  assert.equal(request.cancelled, false);
  cached.add(request.entry.key);
  request.onReady();
  assert.equal(sounds.length, beforeSounds + 1);
  return sounds.at(-1).key;
}

for (const [category, npcName] of Object.entries(npcLibraries)) {
  const expected = [0, 1, 2, 0].map(index => `npc-${category}-${index}`);
  const actual = [];
  for (const key of expected) {
    actual.push(playAndResolve(npcName, key));
    sounds.at(-1).complete();
  }
  assert.deepEqual(actual, expected, `${npcName} must cycle through its complete catalog`);
}

const prefetched = [];
const prefetchManager = Object.create(RuntimeAudioAssetManager.prototype);
prefetchManager.streamingEnabled = true;
prefetchManager.destroyed = false;
prefetchManager.pendingKeys = new Set();
prefetchManager._exists = () => false;
prefetchManager.ensure = entry => {
  prefetched.push(entry.key);
  return entry;
};
const prefetchLibrary = ["a", "b", "c"].map(key => ({ key, path: `${key}.ogg` }));
prefetchManager.prefetchVoiceLine(prefetchLibrary, prefetchLibrary[1]);
assert.deepEqual(prefetched, ["c"], "prefetch must prepare the next line in cycle order");

console.log("merchant voice cycle contract: all merchant catalogs advance and wrap passed");
