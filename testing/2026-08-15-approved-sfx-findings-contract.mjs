import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVED_SFX_FAMILIES,
  AUDIO_CONFIG,
} from "../values/audioConfig.js";
import { SoundLibraryManager } from "../sound/SoundLibraryManager.js";
import { SoundSystem } from "../sound/SoundSystem.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const familyNames = Object.keys(APPROVED_SFX_FAMILIES);
assert.deepEqual(familyNames, ["seismicWarning", "rareDiscovery"]);
assert.equal(APPROVED_SFX_FAMILIES.seismicWarning.length, 2);
assert.equal(APPROVED_SFX_FAMILIES.rareDiscovery.length, 2);
assert.ok(AUDIO_CONFIG.seismicWarningVolume > 0 && AUDIO_CONFIG.seismicWarningVolume <= 1);
assert.ok(AUDIO_CONFIG.rareDiscoveryVolume > 0 && AUDIO_CONFIG.rareDiscoveryVolume <= 1);

const approvedAssets = Object.values(APPROVED_SFX_FAMILIES).flat();
assert.equal(new Set(approvedAssets.map(asset => asset.key)).size, 4);
for (const asset of approvedAssets) {
  assert.match(asset.path, /^sound\/soundEffects\/approved-sfx-findings-v1\/.+\.ogg$/);
  assert.ok((await stat(path.join(ROOT, asset.path))).size > 10_000);
  const bytes = await readFile(path.join(ROOT, asset.path));
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), asset.sha256);
}
assert.equal(approvedAssets.some(asset => /mining|crystal/.test(asset.path)), false);

const cacheKeys = new Set(approvedAssets.map(asset => asset.key));
const manager = new SoundLibraryManager(
  { cache: { audio: { exists: key => cacheKeys.has(key) } } },
  familyNames,
);
for (const [familyName, assets] of Object.entries(APPROVED_SFX_FAMILIES)) {
  manager.libraries[familyName].push(...assets);
}
const originalRandom = Math.random;
Math.random = () => 0;
assert.equal(manager.getRandomSound("seismicWarning"), "sfx-seismic-warning-0");
Math.random = () => 0.99;
assert.equal(manager.getRandomSound("seismicWarning"), "sfx-seismic-warning-1");
Math.random = originalRandom;
assert.deepEqual(manager.getStats(), {
  dig: 0,
  footsteps: 0,
  tileBreak: 0,
  tileHit: 0,
  seismicWarning: 2,
  rareDiscovery: 2,
});

class FakeSound {
  constructor(key, options) {
    this.key = key;
    this.options = options;
    this.manager = {};
    this.pendingDestroy = false;
    this.handlers = new Map();
    this.played = false;
    this.stopped = false;
  }
  once(event, handler) {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }
  play() { this.played = true; }
  stop() { this.stopped = true; }
  destroy() { this.pendingDestroy = true; this.manager = null; }
}

const playedSounds = [];
const fakeScene = {
  cache: { audio: { exists: key => cacheKeys.has(key) } },
  sound: {
    volume: 1,
    context: null,
    add(key, options) {
      const sound = new FakeSound(key, options);
      playedSounds.push(sound);
      return sound;
    },
  },
  tweens: { killTweensOf() {} },
  time: { now: 0 },
};
const soundSystem = new SoundSystem(fakeScene);
soundSystem.audioInitialized = true;
soundSystem.loadSoundLibraries();
Math.random = () => 0;
const firstWarning = soundSystem.playSeismicWarning(0.5);
assert.equal(firstWarning.key, "sfx-seismic-warning-0");
assert.equal(
  firstWarning.options.volume,
  AUDIO_CONFIG.sfxVolume * AUDIO_CONFIG.masterVolume
    * AUDIO_CONFIG.seismicWarningVolume * 0.5,
);
Math.random = () => 0.99;
const secondWarning = soundSystem.playSeismicWarning(1);
assert.equal(firstWarning.stopped, true, "a new warning must stop the old long cue");
assert.equal(secondWarning.key, "sfx-seismic-warning-1");
soundSystem.stopSeismicWarning();
assert.equal(secondWarning.stopped, true);
const discovery = soundSystem.playRareDiscovery();
assert.ok(APPROVED_SFX_FAMILIES.rareDiscovery.some(asset => asset.key === discovery.key));
Math.random = originalRandom;

const bootSource = await readFile(path.join(ROOT, "ui/scenes/BootScene.js"), "utf8");
const soundSource = await readFile(path.join(ROOT, "sound/SoundSystem.js"), "utf8");
const quakeSource = await readFile(path.join(ROOT, "systems/environment/EarthquakeSystem.js"), "utf8");
const digSource = await readFile(path.join(ROOT, "systems/mining/DigSystem.js"), "utf8");
const titanSource = await readFile(path.join(ROOT, "systems/visual/TitanUnlockController.js"), "utf8");

assert.ok(bootSource.includes("Object.values(APPROVED_SFX_FAMILIES)"));
assert.ok(soundSource.includes("playSeismicWarning(proximity = 1)"));
assert.ok(soundSource.includes("playRareDiscovery()"));
assert.ok(soundSource.includes("stopSeismicWarning()"));
assert.ok(quakeSource.includes("playSeismicWarning?.(warningProximity)"));
assert.ok(quakeSource.includes("this.scene.soundSystem?.stopSeismicWarning?.()"));
assert.ok(digSource.includes("soundSystem?.playRareDiscovery?.()"));
assert.ok(titanSource.includes("this.scene.soundSystem?.playRareDiscovery?.()"));

console.log("approved SFX findings contract: ok (4 rated-good assets; 2 randomized families)");
