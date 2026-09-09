import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createRuntime } from './audio-review-2026-09-03/runtime-fixture.mjs';
import { VoiceLineVolumeDucker } from '../sound/VoiceLineVolumeDucker.js';

const checks = [];
const check = (name, test) => {
  const f = createRuntime();
  f.system.noteVoiceLineUse = () => {};
  f.system.prefetchVoiceLine = () => {};
  f.system.onVoiceLineIdle = () => {};
  try { test(f); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
  finally { f.system.destroy(); }
};
const entry = { key: 'audit-voice', path: 'audit-voice.ogg' };
check('Stopping an effect releases its peak budget immediately', f => {
  const sound = f.system.reviewedSfx.play('libUiClick');
  assert.ok(sound);
  sound.stop();
  assert.equal(f.system.activeSfxMixer.active.size, 0);
});
for (const failure of ['false', 'throw']) {
  check(`Effect playback ${failure} leaves no sound or occupied mixer slot`, f => {
    const add = f.scene.sound.add;
    let sound;
    f.scene.sound.add = (...args) => {
      sound = add(...args);
      sound.play = () => { if (failure === 'throw') throw Error('injected playback failure'); return false; };
      return sound;
    };
    assert.equal(f.system.playSfx('approved-review-libUiClick'), null);
    assert.equal(f.system.activeSfxMixer.active.size, 0);
    assert.equal(sound.pendingDestroy, true);
  });
  check(`Voice playback ${failure} restores the mix and releases the channel`, f => {
    f.keys.add(entry.key);
    const add = f.scene.sound.add;
    f.scene.sound.add = (...args) => {
      const sound = add(...args);
      sound.play = () => { if (failure === 'throw') throw Error('injected voice failure'); return false; };
      return sound;
    };
    assert.equal(f.system.voiceLineManager.playExactVoiceLine(entry), null);
    assert.equal(f.system.voiceLineManager.isBusy(), false);
    assert.equal(f.system.voiceDucked, false);
  });
}
check('Muting cancels a loading voice and late completion cannot restart it', f => {
  const manager = f.system.voiceLineManager;
  manager.playExactVoiceLine(entry);
  const load = f.loads.get(entry.key);
  assert.ok(load);
  f.system.toggleSfx(false);
  assert.equal(load.cancelled, true);
  f.system.toggleSfx(true);
  f.keys.add(entry.key);
  load.callbacks.onReady(entry);
  assert.equal(manager.isBusy(), false);
  assert.equal(f.played.length, 0);
});
check('An externally stopped or destroyed voice always releases ducking', f => {
  f.keys.add(entry.key);
  for (const action of ['stop', 'destroy']) {
    const sound = f.system.voiceLineManager.playExactVoiceLine(entry);
    assert.ok(sound);
    sound[action]();
    assert.equal(f.system.voiceLineManager.isBusy(), false);
    assert.equal(f.system.voiceDucked, false);
  }
});
check('Voice at zero does not duck music; raising it during speech restores ducking', f => {
  f.keys.add(entry.key);
  f.system.setVoiceVolume(0);
  f.system.voiceLineManager.playExactVoiceLine(entry);
  assert.equal(f.system.getMusicMixVolume(), f.system.musicVolume);
  f.system.setVoiceVolume(.5);
  assert.equal(f.system.getMusicMixVolume(), f.system.musicVolume * f.system.config.voiceMusicDuckMultiplier);
  f.system.setVoiceVolume(0);
  assert.equal(f.system.getMusicMixVolume(), f.system.musicVolume);
});
check('Each duck owner releases only its own request', f => {
  const a = new VoiceLineVolumeDucker(f.system), b = new VoiceLineVolumeDucker(f.system);
  a.duck(); b.duck(); a.restore();
  assert.equal(f.system.voiceDucked, true);
  b.restore();
  assert.equal(f.system.voiceDucked, false);
});
check('A paused voice and an unfinished load are both canceled by scene suspension', f => {
  f.keys.add(entry.key);
  const sound = f.system.voiceLineManager.playExactVoiceLine(entry);
  sound.isPlaying = false;
  f.scene.events.emit('pause');
  assert.equal(f.system.voiceLineManager.isBusy(), false);
  assert.equal(f.system.voiceDucked, false);
});
const report = { passed: checks.every(c => c.passed), checks };
writeFileSync(new URL('./audio-full-audit-2026-09-07/lifecycle-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
