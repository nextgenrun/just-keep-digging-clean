import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { REVIEWED_AUDIO_ASSETS as ASSETS } from "../values/reviewedAudioAssets.js";
import { REVIEWED_AUDIO_MIX as MIX } from "../values/reviewedAudioMix.js";
import { AUDIO_CONFIG } from "../values/audioConfig.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";
import { WeatherRecordedAmbienceController } from "../systems/environment/WeatherRecordedAmbienceController.js";
import { createRuntime } from "./audio-review-2026-09-03/runtime-fixture.mjs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("sound/soundEffects/approved-review-2026-09-03/manifest.json", root)));
const checks = [];
function check(name, callback) { callback(); checks.push(name); }
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`); }
const f = createRuntime();

check("All 51 decoded approved sources are unclipped and use role-specific gains", () => {
  for (const asset of Object.values(ASSETS)) {
    const measured = manifest.assets.find(row => row.id === asset.id).after;
    assert.equal(measured.clippedSamples, 0, asset.id);
    assert.ok(asset.gain > 0 && asset.gain <= 0.5, asset.id);
    close(asset.peak, measured.peakLinear);
  }
});
check("Master is applied only by Phaser and changes already-playing sounds", () => {
  f.system.setMasterVolume(0.5);
  const click = f.system.playUiClick();
  close(click.volume, ASSETS.libUiClick.gain * f.system.sfxVolume);
  const instanceGain = click.volume;
  f.system.setMasterVolume(0.25);
  close(f.scene.sound.volume, 0.25); close(click.volume, instanceGain);
  f.system.setSfxVolume(0.4); close(click.volume, ASSETS.libUiClick.gain * 0.4);
});
check("Speech ducking preserves user settings, including edits made during speech", () => {
  const ducker = f.system.voiceLineManager.volumeDucker;
  f.system.setMusicVolume(0.4); ducker.duck();
  close(f.system.musicVolume, 0.4); close(f.system.sfxVolume, 0.4);
  close(f.system.getMusicMixVolume(), 0.4 * AUDIO_CONFIG.voiceMusicDuckMultiplier);
  close(f.system.getSfxMixVolume(), 0.4 * AUDIO_CONFIG.voiceSfxDuckMultiplier);
  f.system.setSfxVolume(0.8); f.system.setMusicVolume(0.5); ducker.restore();
  close(f.system.sfxVolume, 0.8); close(f.system.musicVolume, 0.5);
  close(f.system.getSfxMixVolume(), 0.8); close(f.system.getMusicMixVolume(), 0.5);
});
check("Music gain changes preserve crossfade envelopes and update the outgoing track", () => {
  const a = f.scene.sound.add("music-a", { volume: 0 }), b = f.scene.sound.add("music-b", { volume: 0 });
  f.system.currentTrack = a; f.system.musicStreamController.fadingTracks.add(b);
  f.system.musicStreamController.trackGains.set(a, { gain: 0.25 });
  f.system.musicStreamController.trackGains.set(b, { gain: 0.75 });
  f.system.setMusicVolume(0.4); close(a.volume, 0.1); close(b.volume, 0.3);
  f.system.voiceLineManager.volumeDucker.duck(); close(a.volume, 0.03); close(b.volume, 0.09);
  f.system.voiceLineManager.volumeDucker.restore();
});
check("Voice has one master stage, explicit headroom, and a preserved NPC multiplier", () => {
  f.system.setVoiceVolume(0.8);
  close(f.system.getVoiceMixVolume(), 0.8 * MIX.voiceHeadroom);
  close(f.system.getVoiceMixVolume(true), 0.8 * MIX.voiceHeadroom * f.system.npcVoiceVolume);
  f.system.setMasterVolume(0.1); close(f.system.getVoiceMixVolume(), 0.8 * MIX.voiceHeadroom);
});
check("Level-up variants are matched by active RMS; dense Star cue has lower gain", () => {
  const level = id => manifest.assets.find(row => row.id === id).after.activeRmsDbfs + 20 * Math.log10(ASSETS[id].gain);
  assert.ok(Math.abs(level("levelUpShort") - level("levelUpEpic")) < 3);
  close(AUDIO_CONFIG.starDestructionVolume, ASSETS.starDestruction.gain);
  assert.ok(ASSETS.starDestruction.gain < ASSETS.levelUpEpic.gain);
});
check("Overlapping one-shots remain below the measured-source peak budget", () => {
  f.system.reviewedSfx.stop(); f.system.activeSfxMixer.stopAll(); f.system.setSfxVolume(1);
  for (const id of ["libStoneBreak", "libToolContact", "digOne", "libPurchaseCoin", "libUiClick", "libLandingDebris", "libPressureRumble", "libTorchReact"]) {
    f.tick(4000); f.system.reviewedSfx.play(id);
  }
  const snapshot = f.system.activeSfxMixer.snapshot();
  assert.ok(snapshot.sources.reduce((sum, row) => sum + row.gain * row.peak, 0) <= MIX.oneShotPeakBudget + 1e-8);
  assert.ok(snapshot.count <= MIX.maxOneShots);
});
check("Cave composite and crossfades remain below the cave-layer peak budget", () => {
  f.system.reviewedAmbience.preset = 3;
  for (let i = 0; i < 30; i++) f.system.reviewedAmbience.update({ depth: 520, time: i * 100, delta: 100 });
  const snapshot = f.system.reviewedAmbience.snapshot();
  assert.equal(snapshot.active.length, 4);
  assert.ok(snapshot.active.reduce((sum, row) => sum + row.peakContribution, 0) <= MIX.cave.peakBudget + 1e-8);
});
check("Reference rain owns its approved wind stem; shelter transitions do not stack a second wind bed", () => {
  const w = createRuntime(); const weather = new WeatherRecordedAmbienceController(w.scene, WEATHER_CONFIG);
  weather.variants.set("rainOpen", { id: "rainReference", until: Infinity });
  const state = { kind: "rain", rainAmount: 0.8, stormAmount: 0, wind: 80, gust: 0,
    delta: 100, depth: { surfaceAmount: 1 }, occlusion: { coveredAmount: 0, openSkyAmount: 1 } };
  for (let i = 0; i < 35; i++) { w.tick(100); weather.update(state); }
  assert.deepEqual(new Set(weather.bus.snapshot().active.map(row => row.id)), new Set(["rainReference", "windReference"]));
  for (let i = 0; i < 40; i++) {
    w.tick(100); weather.update({ ...state, occlusion: { coveredAmount: 0.8, openSkyAmount: 0.2 } });
    const snapshot = weather.bus.snapshot();
    assert.ok(snapshot.active.length <= MIX.weather.maxVoices);
    assert.ok(snapshot.active.reduce((sum, row) => sum + row.peakContribution, 0) <= MIX.weather.peakBudget + 1e-8);
  }
  weather.stop(); assert.equal(weather.bus.tracks.size, 0); weather.destroy(); w.system.destroy();
});
check("Shelter attenuates the same outdoor wind profile while preserving its stable selection", () => {
  const w = createRuntime(); const weather = new WeatherRecordedAmbienceController(w.scene, WEATHER_CONFIG);
  const state = { rainAmount: 0, stormAmount: 0, wind: 70, gust: 0,
    delta: 100, depth: { surfaceAmount: 1 }, occlusion: { coveredAmount: 0 } };
  for (let i = 0; i < 35; i++) { w.tick(100); weather.update(state); }
  const open = weather.bus.snapshot().active[0];
  for (let i = 0; i < 35; i++) { w.tick(100); weather.update({ ...state, occlusion: { coveredAmount: 1 } }); }
  const sheltered = weather.bus.snapshot().active[0];
  assert.equal(sheltered.id, open.id);
  close(sheltered.gain, open.gain * MIX.weather.coveredWindMultiplier);
  weather.destroy(); w.system.destroy();
});
check("Mute is immediate for tracked effects and leaves no managed ambience running", () => {
  f.system.toggleSfx(false); assert.equal(f.system.activeSfxMixer.active.size, 0);
  assert.equal(f.system.reviewedAmbience.bus.tracks.size, 0); close(f.system.getVoiceMixVolume(), 0);
});
f.system.destroy();
const sourceLevels = Object.values(ASSETS).map(asset => {
  const measured = manifest.assets.find(row => row.id === asset.id).after;
  const gainDb = 20 * Math.log10(asset.gain * AUDIO_CONFIG.sfxVolume * AUDIO_CONFIG.masterVolume);
  return { id: asset.id, group: asset.group, gain: asset.gain, sourcePeak: measured.peakLinear,
    soloPeakDbfs: +(measured.peakDbfs + gainDb).toFixed(2),
    soloActiveRmsDbfs: +(measured.activeRmsDbfs + gainDb).toFixed(2), onsetMs: measured.onsetMs };
});
const report = { audit: "volume-and-layer-gain", passed: true, totalChecks: checks.length, checks,
  scope: "Decoded sources and runtime gain routing, not calibrated speaker SPL or subjective listening approval",
  sourceLevelNote: "Nominal solo levels before contextual fades, overlap caps and speech ducking", sourceLevels };
writeFileSync(new URL("testing/audio-review-2026-09-03/volume-audit.json", root), JSON.stringify(report, null, 2) + "\n");
writeFileSync(new URL("testing/audio-review-2026-09-03/mix-settings.json", root), JSON.stringify({ assets: ASSETS, mix: MIX,
  defaults: { master: AUDIO_CONFIG.masterVolume, sfx: AUDIO_CONFIG.sfxVolume, music: AUDIO_CONFIG.musicVolume, voice: AUDIO_CONFIG.voiceVolume } }, null, 2) + "\n");
console.log("REVIEWED_AUDIO_VOLUME_OK", JSON.stringify({ passed: true, checks: checks.length, sources: sourceLevels.length }));
