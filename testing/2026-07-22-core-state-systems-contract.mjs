import assert from "node:assert/strict";

import { SoundLibraryManager } from "../sound/SoundLibraryManager.js";
import { SoundSystem } from "../sound/SoundSystem.js";
import { VoiceLineManager } from "../sound/VoiceLineManager.js";
import { ComboSystem } from "../systems/combo/ComboSystem.js";
import { HitstopSystem } from "../systems/combo/HitstopSystem.js";
import { SpecialBlockEffectsManager } from "../systems/mining/SpecialBlockEffectsManager.js";
import { AncientRelicSystem } from "../systems/progression/AncientRelicSystem.js";
import { PlayerLevelSystem } from "../systems/progression/PlayerLevelSystem.js";
import { CameraShakeSystem } from "../systems/visual/CameraShakeSystem.js";
import { COMBO_CONFIG } from "../values/comboConfig.js";

globalThis.Phaser = { Math: { Between: (min, max) => Math.round((min + max) / 2) } };

function makeSound(key, config = {}) {
  const listeners = new Map();
  return {
    key, config, volume: config.volume ?? 1, manager: {}, pendingDestroy: false,
    isPlaying: false, played: 0, stopped: 0, destroyed: 0,
    play() { this.isPlaying = true; this.played += 1; return true; },
    stop() { this.isPlaying = false; this.stopped += 1; },
    destroy() { this.isPlaying = false; this.destroyed += 1; this.manager = null; },
    once(event, callback) { listeners.set(event, callback); return this; },
    on(event, callback) { listeners.set(event, callback); return this; },
    emit(event) { listeners.get(event)?.(); },
  };
}

function makeAudioScene(cachedKeys) {
  const sounds = [];
  const timers = [];
  return {
    sounds, timers,
    cache: { audio: { exists: (key) => cachedKeys.has(key) } },
    load: { audio: (key, path) => cachedKeys.add(key) && sounds.push({ queued: key, path }) },
    sound: {
      volume: 1,
      context: {
        destination: {}, createBuffer: () => ({}),
        createBufferSource: () => ({ connect() {}, start() {} }),
      },
      add(key, config) { const sound = makeSound(key, config); sounds.push(sound); return sound; },
    },
    time: {
      now: 1000,
      delayedCall(delay, callback) {
        const timer = { delay, callback, removed: false, remove() { this.removed = true; } };
        timers.push(timer);
        return timer;
      },
    },
    tweens: {
      timeScale: 1, killed: [],
      add(config) { config.onComplete?.(); return config; },
      killTweensOf(target) { this.killed.push(target); },
    },
    game: { canvas: { addEventListener() {}, removeEventListener() {} } },
  };
}

// Sound libraries queue deterministic keys, expose cache state, and avoid immediate repeats.
const cached = new Set();
const audioScene = makeAudioScene(cached);
const library = new SoundLibraryManager(audioScene);
library.loadLibrary("dig", "sfx/", ["one.wav", "two.wav"]);
assert.deepEqual(library.getStats(), { dig: 2, footsteps: 0, tileBreak: 0, tileHit: 0 });
assert.equal(library.soundExists("dig-0"), true);
const originalRandom = Math.random;
let randomIndex = 0;
Math.random = () => [0, 0, 0.99][randomIndex++] ?? 0.99;
assert.equal(library.getRandomSound("dig"), "dig-0");
assert.equal(library.getRandomSound("dig"), "dig-1");
Math.random = originalRandom;

// The aggregate sound system clamps settings, overlaps SFX instances, and cleans timers/tracks.
for (const key of ["dig-0", "dig-1", "footsteps-0", "tileBreak-0", "tileHit-0", "voice-0"]) cached.add(key);
const soundSystem = new SoundSystem(audioScene);
soundSystem.loadSoundLibraries();
assert.equal(soundSystem.soundLibraryManager.libraries.dig.length, 2);
soundSystem.audioInitialized = true;
soundSystem.applySettings({ masterVolume: 2, musicVolume: -1, sfxVolume: 0.5, voiceVolume: 0.4 });
assert.equal(soundSystem.masterVolume, 1);
assert.equal(soundSystem.musicVolume, 0);
const firstSfx = soundSystem.playSfx("dig-0", 0.5, { rate: 1.2 });
const secondSfx = soundSystem.playSfx("dig-0");
assert.notEqual(firstSfx, secondSfx);
assert.equal(firstSfx.config.rate, 1.2);
assert.ok(firstSfx.config.volume > 0);
firstSfx.emit("complete");
assert.equal(firstSfx.destroyed, 1);
soundSystem.scheduleNextVoiceLine();
assert.equal(audioScene.timers.at(-1).delay, soundSystem.getRandomVoiceLineInterval());
soundSystem.destroy();
assert.equal(audioScene.timers.at(-1).removed, true);

// Voice playback stops overlap, ducks both buses, restores them, and resolves merchant aliases.
const volumeCalls = [];
const voiceSoundSystem = {
  masterVolume: 0.8, musicVolume: 0.6, sfxVolume: 0.4, voiceVolume: 0.5,
  setMusicVolume(value) { volumeCalls.push(["music", value]); this.musicVolume = value; },
  setSfxVolume(value) { volumeCalls.push(["sfx", value]); this.sfxVolume = value; },
};
for (const key of ["player-random-0", "player-random-1", "npc-gearUpgrades-0"]) cached.add(key);
const voices = new VoiceLineManager(audioScene, voiceSoundSystem);
voices.loadLibrary("player", "random", "voice/", ["a.wav", "b.wav"]);
voices.loadLibrary("npc", "gearUpgrades", "voice/", ["gear.wav"]);
const voice = voices.playRandomPlayerVoiceLine();
assert.equal(voice.played, 1);
assert.deepEqual(volumeCalls.slice(0, 2), [["music", 0.18], ["sfx", 0.2]]);
voice.emit("complete");
assert.deepEqual(volumeCalls.slice(-2), [["music", 0.6], ["sfx", 0.4]]);
assert.equal(voices.playNPCVoiceLine("gearMerchant").key, "npc-gearUpgrades-0");

// Combo behavior covers milestones, expiry, save sanitization, and multiplier caps.
const combo = new ComboSystem();
const milestones = [];
let broken = null;
combo.setMilestoneReachedCallback((value) => milestones.push(value));
combo.setComboBreakCallback((count) => { broken = count; });
combo.addCombo(10, 100);
assert.equal(combo.getComboCount(), 10);
assert.deepEqual(milestones, [10]);
assert.ok(combo.getMultiplier() > 1 && combo.getMultiplier() <= 1.5);
assert.equal(combo.update(6101), false);
assert.equal(broken, 10);
combo.fromJSON({ comboCount: -8, currentMultiplier: 99, lastComboTime: 4 });
assert.deepEqual(combo.toJSON(), {
  comboCount: 0, currentMultiplier: COMBO_CONFIG.maxMultiplier, lastComboTime: 4,
});

// Hitstop replaces re-entrant timers and always restores tween time on cleanup.
const hitstop = new HitstopSystem(audioScene, {
  critDurationMs: 40, luckyDurationMs: 70, slowTimeScale: 0.05, resumeTimeScale: 1,
});
hitstop.triggerCrit();
const critTimer = audioScene.timers.at(-1);
assert.equal(audioScene.tweens.timeScale, 0.05);
hitstop.triggerLucky();
assert.equal(critTimer.removed, true);
audioScene.timers.at(-1).callback();
assert.equal(audioScene.tweens.timeScale, 1);
hitstop.destroy();

// Progression state survives save/load and composes campfire bonuses without exceeding caps.
const relics = new AncientRelicSystem(-5);
assert.equal(relics.getCount(), 0);
assert.equal(relics.add(3), 3);
relics.loadSaveData({ count: -1 });
assert.deepEqual(relics.getSaveData(), { count: 0 });
const levels = new PlayerLevelSystem();
levels.setCampfireSystem({ getCritBonus: () => 0.04, getXpBonus: () => 0.2, getMiningSpeedBonus: () => 0.1 });
levels.gainLevel(4);
assert.equal(levels.level, 5);
assert.ok(levels.getCriticalHitChance() >= 0.04);
assert.ok(levels.getMiningSpeedBonus() <= 0.75);
assert.ok(levels.getGemPowerMaxBonus(100) > levels.getGemPowerMaxBonus(99));
const savedLevel = levels.toJSON();
const restoredLevel = new PlayerLevelSystem();
restoredLevel.fromJSON(savedLevel);
assert.equal(restoredLevel.level, 5);

// Timed special-block effects stack, serialize with remaining time, expire, and clear.
const toasts = [];
const effectScene = {
  time: { now: 1000 },
  playerController: { getPlayerPosition: () => ({ x: 4, y: 8 }) },
  uiNotifications: { success: (...args) => toasts.push(args) },
};
const effects = new SpecialBlockEffectsManager(effectScene);
effects.applyTimedEffect({ effect: "damageBoost", value: 0.25, duration: 3000, stacks: true });
effects.applyTimedEffect({ effect: "damageBoost", value: 0.25, duration: 3000, stacks: true });
assert.equal(effects.getDamageMultiplier(), 1.5);
assert.equal(effects.getRemainingTime("damageBoost"), 3);
assert.equal(
  toasts.length,
  0,
  "the state manager must not duplicate the caller-owned special-block notifications"
);
const savedEffects = effects.getSaveData();
const restoredEffects = new SpecialBlockEffectsManager(effectScene);
restoredEffects.loadSaveData(savedEffects);
assert.equal(restoredEffects.getDamageMultiplier(), 1.5);
effectScene.time.now = 4001;
restoredEffects.update();
assert.equal(restoredEffects.getDamageMultiplier(), 1);

// Camera shake obeys master/group settings, priority, flash policy, decay, and cleanup.
const offsets = [];
const flashes = [];
const display = { cameraShakeEnabled: true, cameraShakeIntensity: 0.5, cameraShakeFlashEnabled: true };
const shakeScene = {
  time: { now: 0 },
  cameras: { main: { setFollowOffset: (...value) => offsets.push(value), shakeEffect: { isRunning: false } } },
  screenFlashSystem: { _flash: (...args) => flashes.push(args) },
};
const shake = new CameraShakeSystem(shakeScene, {
  mining: { light: { duration: 100, intensity: 4, priority: 1, color: 0xffffff } },
  earthquake: { major: { duration: 200, intensity: 8, priority: 5 } },
}, { getDisplaySettings: () => display });
assert.equal(shake.shake("mining.light"), true);
assert.equal(shake.getStatus().active, true);
assert.equal(flashes.length, 1);
assert.equal(shake.shake("earthquake.major"), true);
assert.equal(shake.shake("mining.light"), false);
shake.update(201, 16);
assert.deepEqual(offsets.at(-1), [0, 0]);
display.cameraShakeEnabled = false;
assert.equal(shake.shake("mining.light"), false);

console.log("core state systems contract: sound, combo, progression, effects, and shake passed");
