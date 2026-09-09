import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { FREESOUND_AUDIO as CFG, FREESOUND_AUDIO_ASSETS as ASSETS } from "../values/freesoundAudio.js";
import { REVIEWED_AUDIO_MIX as MIX } from "../values/reviewedAudioMix.js";
import { AUDIO_CONFIG } from "../values/audioConfig.js";
import { createFreesoundFixture } from "./audio-review-2026-09-03/freesound-fixture.mjs";
import { installLayerSpatialFilter, updateLayerSpatialFilter } from "../sound/AudioLayerSpatialFilter.js";

const root = new URL("../", import.meta.url), checks = [];
const manifest = JSON.parse(readFileSync(new URL("sound/soundEffects/approved-freesound-2026-09-03/manifest.json", root)));
function check(name, callback) { callback(); checks.push(name); }
function close(a, b) { assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`); }

check("562 real derivatives are unclipped, onset-aligned, bounded and license-attributed", () => {
  const credits = readFileSync(new URL("sound/soundEffects/approved-freesound-2026-09-03/CREDITS.txt", root), "utf8");
  assert.equal(manifest.assets.length, 562);
  for (const row of manifest.assets) {
    const asset = ASSETS[row.id];
    assert.equal(row.after.clippedSamples, 0, row.id);
    assert.ok(row.after.peak < 0.75, row.id);
    // The decoded Vorbis tail can include one short packet of padding; the
    // measured onset and actual decoded duration remain in the asset registry.
    assert.ok(row.after.duration <= asset.maxSeconds + CFG.codecTailToleranceSeconds, row.id);
    assert.ok(row.after.onsetMs <= (asset.loop ? 35 : 8), row.id);
    if (asset.loop) assert.ok(row.after.seamStep < 0.005, row.id);
    assert.ok(credits.includes(row.sourceUrl) && credits.includes(row.licenseUrl) && credits.includes(row.creator), row.id);
  }
});
check("Role loudness is matched within 4 dB without flattening all transient peaks", () => {
  const roles = new Map();
  for (const asset of Object.values(ASSETS)) {
    const levels = roles.get(asset.role) || [];
    levels.push(asset.activeRmsDb + 20 * Math.log10(asset.gain)); roles.set(asset.role, levels);
    assert.ok(asset.gain > 0 && asset.gain <= 0.5, asset.id);
  }
  for (const [role, levels] of roles) assert.ok(Math.max(...levels) - Math.min(...levels) < 4, role);
});
check("A new approved one-shot receives source gain, SFX gain and master exactly once", () => {
  const f = createFreesoundFixture(); f.system.setMasterVolume(0.5); f.system.setSfxVolume(0.7);
  const sound = f.system.playUiClick(), asset = ASSETS[f.system.freesoundAudio.history.at(-1).id];
  close(sound.volume, asset.gain * 0.7); close(f.scene.sound.volume, 0.5);
  f.system.setMasterVolume(0.25); close(sound.volume, asset.gain * 0.7);
  f.system.setSfxVolume(0.4); close(sound.volume, asset.gain * 0.4); f.system.destroy();
});
check("Star handover and near textures share one bounded pocket budget", () => {
  const f = createFreesoundFixture();
  for (let i = 0; i < 80; i++) {
    const snapshot = f.update({ position: { x: i < 40 ? 7.6 : 14.1, y: 8.5 } }).stars;
    assert.ok(snapshot.active.length <= CFG.stars.maxVoices);
    assert.ok(snapshot.active.reduce((sum, row) => sum + row.peakContribution, 0) <= CFG.stars.peakBudget + 1e-8);
  }
  f.system.destroy();
});
check("The Star peak cap never cancels its steady distance or rock attenuation", () => {
  const f = createFreesoundFixture(), d = f.system.freesoundAudio;
  d.palette.stable = role => Object.values(ASSETS).filter(asset => asset.role === role)
    .sort((a, b) => b.gain * b.peak - a.gain * a.peak)[0];
  const steady = position => {
    for (let i = 0; i < 25; i++) f.update({ position });
    return d.stars.bus.snapshot().active.reduce((sum, row) => sum + row.peakContribution, 0);
  };
  const closePeak = steady({ x: 6.5, y: 8.5 });
  const middlePeak = steady({ x: 2.5, y: 8.5 });
  assert.ok(middlePeak < closePeak * 0.8, `${middlePeak} must be quieter than ${closePeak}`);
  f.cells.set("7,8", 2);
  const blockedPeak = steady({ x: 6.5, y: 8.5 });
  assert.ok(blockedPeak < closePeak * 0.9); f.system.destroy();
});
check("Panic crossfades share one budget and speech duck updates both positional and pulse layers", () => {
  const f = createFreesoundFixture();
  for (let i = 0; i < 40; i++) f.update({ context: { ...f.context, hardcoreStressBand: i < 20 ? "warning" : "critical" } });
  const director = f.system.freesoundAudio;
  assert.ok(director.panic.bus.snapshot().active.reduce((sum, row) => sum + row.peakContribution, 0) <= CFG.panic.peakBudget + 1e-8);
  const track = [...director.stars.bus.tracks.values()][0], before = track.sound.volume;
  f.system.voiceLineManager.volumeDucker.duck();
  close(track.sound.volume, before * AUDIO_CONFIG.voiceSfxDuckMultiplier);
  f.system.setSfxVolume(0.3);
  close(track.sound.volume, track.effectiveGain * 0.3 * AUDIO_CONFIG.voiceSfxDuckMultiplier);
  f.system.voiceLineManager.volumeDucker.restore(); close(track.sound.volume, track.effectiveGain * 0.3);
  f.system.toggleSfx(false); assert.equal(director.stars.bus.tracks.size, 0); assert.equal(director.panic.bus.tracks.size, 0);
  f.system.destroy();
});
check("Rock filter is local, non-resonant, smoothly retuned and leaves the master graph alone", () => {
  const connections = [], destination = {};
  const filter = { Q: {}, frequency: { setTargetAtTime(value) { this.value = value; } },
    connect(node) { connections.push(node); }, disconnect() {} };
  const sound = { volumeNode: { disconnect(node) { assert.equal(node, destination); }, connect(node) { connections.push(node); } },
    pannerNode: destination, setPan(pan) { this.pan = pan; } };
  const manager = { context: { currentTime: 0, createBiquadFilter: () => filter } };
  assert.equal(installLayerSpatialFilter(sound, manager, 1300), filter);
  close(filter.Q.value, 0.5);
  updateLayerSpatialFilter({ sound, filter }, { cutoff: 10000, pan: -0.5 }, manager);
  close(filter.frequency.value, 10000); close(sound.pan, -0.5); assert.deepEqual(connections, [filter, destination]);
});
check("All SFX/ambience budgets leave default music and voice headroom", () => {
  const effects = MIX.oneShotPeakBudget + MIX.cave.peakBudget + MIX.weather.peakBudget + CFG.stars.peakBudget + CFG.panic.peakBudget;
  assert.ok((effects * AUDIO_CONFIG.sfxVolume + AUDIO_CONFIG.musicVolume) * AUDIO_CONFIG.masterVolume < 1);
  assert.ok((effects * AUDIO_CONFIG.sfxVolume * AUDIO_CONFIG.voiceSfxDuckMultiplier
    + AUDIO_CONFIG.voiceVolume * MIX.voiceHeadroom + AUDIO_CONFIG.musicVolume * AUDIO_CONFIG.voiceMusicDuckMultiplier) * AUDIO_CONFIG.masterVolume < 1);
});

const settings = { defaults: { master: AUDIO_CONFIG.masterVolume, sfx: AUDIO_CONFIG.sfxVolume }, mix: MIX, config: CFG, assets: Object.values(ASSETS) };
const report = { passed: true, checks, approved: 562, limits: "Digital levels and routing; not calibrated speaker SPL or subjective long-session acceptance",
  sourceLevels: Object.values(ASSETS).map(asset => ({ id: asset.id, role: asset.role, gain: asset.gain,
    peak: asset.peak, nominalActiveRmsDb: asset.activeRmsDb + 20 * Math.log10(asset.gain * AUDIO_CONFIG.sfxVolume * AUDIO_CONFIG.masterVolume) })) };
writeFileSync(new URL("testing/audio-review-2026-09-03/freesound-volume-audit.json", root), JSON.stringify(report, null, 2) + "\n");
writeFileSync(new URL("testing/audio-review-2026-09-03/freesound-mix-settings.json", root), JSON.stringify(settings, null, 2) + "\n");
console.log("FREESOUND_VOLUME_OK", JSON.stringify({ checks: checks.length, approved: 562 }));
