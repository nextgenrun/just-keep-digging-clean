import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createFreesoundFixture } from "../audio-review-2026-09-03/freesound-fixture.mjs";
import { CORE_ACTION_AUDIO as CORE } from "../../values/coreActionAudio.js";
import { CORE_ACTION_AUDIO as BEFORE } from "./values__coreActionAudio.js";
import { CORE_SFX_WINDOWS as WINDOWS } from "../../values/coreSfxWindows.js";
import { FREESOUND_RUNTIME_ASSETS as FS } from "../../values/freesoundAudio.js";
import { REVIEWED_AUDIO_ASSETS as R } from "../../values/reviewedAudioAssets.js";
import { REVIEWED_AUDIO_MIX as MIX } from "../../values/reviewedAudioMix.js";
import { TILE_TYPES as T } from "../../values/tileTypes.js";

const checks = [], samples = [], comparisons = [];
const measured = JSON.parse(readFileSync(new URL("../audio-destruction-pickup-2026-09-05/window-measurements.json", import.meta.url)));
const priorSource = readFileSync(new URL("sound__SoundSystem.js", import.meta.url), "utf8");
const priorMethod = priorSource.slice(priorSource.indexOf("  playLanding("), priorSource.indexOf("\n  playDig("));
const oldLanding = new Function("CORE_ACTION_AUDIO", "REVIEWED_AUDIO_MIX", "return {" + priorMethod + "}.playLanding;")(BEFORE, MIX);
const assets = [...CORE.hardFootsteps, ...Object.values(FS), ...Object.values(R)];
const bank = type => type === T.DIRT ? CORE.banks.footstepDirt.map(id => FS[id].key) : CORE.hardFootsteps.map(a => a.key);
function check(name, run) { run(); checks.push(name); }
function fixture(type, options = {}) {
  const f = createFreesoundFixture(options);
  if (options.hardLoaded !== false) for (const asset of CORE.hardFootsteps) f.keys.add(asset.key);
  let grounded = true;
  const body = { x: 0, y: 14, w: 40, h: 80, vx: 0, vy: 0 };
  const controller = { physicsBody: body, isGrounded: () => grounded };
  const world = { tileSize: 94, getTileType: (_x, y) => y === 1 ? type : T.AIR };
  f.scene.playerController = controller; f.scene.worldModel = world;
  const requests = [], play = f.system.playSfx.bind(f.system);
  f.system.playSfx = (key, gain, settings) => {
    requests.push({ key, gain, settings }); return play(key, gain, settings);
  };
  return Object.assign(f, { body, controller, world, requests,
    ground: value => { grounded = value; },
    observe(speed, onGround, delta = 80) {
      body.vy = speed; grounded = onGround; f.tick(delta);
      f.system.reviewedAmbience.observeMotion(controller, delta, world);
    },
  });
}
function record(f, sound) {
  const request = f.requests.at(-1), asset = assets.find(a => a.key === sound.key);
  const window = request.settings.window;
  const measurement = measured.find(row => row.id === asset.id || row.id === asset.key);
  const sourcePeak = window ? measurement.peak : asset.peak;
  const outputGain = sound.volume * f.system.masterVolume;
  return { key: sound.key, durationMs: (window?.duration ?? asset.duration) * 1000,
    sourceGainMultiplier: request.gain / asset.gain, outputGain,
    estimatedSoloPeakDb: 20 * Math.log10(sourcePeak * outputGain) };
}

check("All landing speeds use short contacts from the actual ground material", () => {
  for (const type of [T.STONE, T.DIRT]) {
    let previous = 0;
    for (const speed of [220, 400, 599, 600, 601, 720, 1500]) {
      const f = fixture(type), sound = f.system.playLanding(f.controller, speed, f.world);
      assert.ok(sound); assert.equal(f.played.length, 1); assert.ok(bank(type).includes(sound.key));
      const row = record(f, sound);
      assert.ok(row.durationMs >= 90 && row.durationMs <= 120);
      assert.ok(row.sourceGainMultiplier <= 0.8 + 1e-8);
      assert.ok(row.sourceGainMultiplier >= previous - 1e-8);
      if (speed === 600 || speed === 601) assert.ok(row.sourceGainMultiplier - previous < 0.002);
      previous = row.sourceGainMultiplier; samples.push({ material: type === T.DIRT ? "dirt" : "hard", speed, ...row });
      f.system.destroy();
    }
  }
});
check("All six existing foot-contact variants have short faded playback windows", () => {
  for (const id of [...CORE.hardFootsteps.map(a => a.key), ...CORE.banks.footstepDirt]) {
    const window = WINDOWS[id];
    assert.ok(window.duration >= 0.09 && window.duration <= 0.12);
    assert.ok(window.fadeIn > 0 && window.fadeOut > 0);
  }
});
check("Fast landing replaces the previous destruction source and lowers solo output", () => {
  for (const type of [T.STONE, T.DIRT]) {
    const before = fixture(type), after = fixture(type);
    const oldSound = oldLanding.call(before.system, before.controller, MIX.landing.fullSpeed, before.world);
    const newSound = after.system.playLanding(after.controller, MIX.landing.fullSpeed, after.world);
    const old = record(before, oldSound), current = record(after, newSound);
    assert.equal(old.key, (type === T.DIRT ? R.libDirtBreak : R.libLandingDebris).key);
    assert.ok(bank(type).includes(current.key));
    assert.ok(current.estimatedSoloPeakDb < old.estimatedSoloPeakDb - 6);
    comparisons.push({ material: type === T.DIRT ? "dirt" : "hard", before: old, after: current,
      changeDb: current.estimatedSoloPeakDb - old.estimatedSoloPeakDb });
    before.system.destroy(); after.system.destroy();
  }
});
check("Real motion observation emits one contact after a descent and stays silent after braking", () => {
  for (const type of [T.STONE, T.DIRT]) {
    const f = fixture(type);
    f.observe(0, true);
    f.observe(900, false); f.observe(900, false); f.observe(900, false); f.observe(0, true);
    f.observe(0, true); assert.equal(f.played.length, 1); assert.ok(bank(type).includes(f.played[0].key));
    f.tick(1000);
    f.observe(900, false); f.observe(80, false); f.observe(80, false); f.observe(0, true);
    assert.equal(f.played.length, 1);
    f.tick(1000); f.observe(900, false); f.observe(0, true);
    assert.equal(f.played.length, 1);
    f.tick(1000); f.observe(900, false); f.observe(900, false); f.body.y += 1000; f.observe(0, true);
    assert.equal(f.played.length, 1); f.system.destroy();
  }
});
check("Landing then walking cannot stack another contact within the ground cooldown", () => {
  for (const type of [T.STONE, T.DIRT]) {
    const f = fixture(type); f.body.vx = 130;
    assert.ok(f.system.playLanding(f.controller, 900));
    assert.equal(f.system.playFootstep(), null); f.tick(CORE.minFootstepMs - 1);
    assert.equal(f.system.playFootstep(), null); assert.equal(f.played.length, 1);
    f.tick(1); assert.ok(f.system.playFootstep()); assert.equal(f.played.length, 2); f.system.destroy();
  }
});
check("Walking then landing preserves the existing contact without cutting it off", () => {
  for (const type of [T.STONE, T.DIRT]) {
    const f = fixture(type); f.body.vx = 130;
    const step = f.system.playFootstep(); assert.ok(step);
    assert.equal(f.system.playLanding(f.controller, 900), null);
    assert.equal(f.played.length, 1); assert.ok(step.isPlaying); assert.ok(!step.pendingDestroy);
    f.system.destroy();
  }
});
check("Muted, suspended, uninitialized and airborne states cannot play a landing", () => {
  for (const type of [T.STONE, T.DIRT]) for (const state of ["sfxEnabled", "audioSuspended", "audioInitialized", "airborne"]) {
    const f = fixture(type);
    if (state === "airborne") f.ground(false);
    else f.system[state] = state === "audioSuspended";
    assert.equal(f.system.playLanding(f.controller, 900), null); assert.equal(f.played.length, 0);
    f.system.destroy();
  }
});
check("Cold material contacts never insert rubble, another material or delayed playback", () => {
  for (const type of [T.STONE, T.DIRT]) {
    const f = fixture(type, { loaded: false, hardLoaded: type === T.DIRT });
    assert.equal(f.system.playLanding(f.controller, 900), null); assert.equal(f.played.length, 0);
    f.finishLoads(); for (const asset of CORE.hardFootsteps) f.keys.add(asset.key);
    assert.equal(f.played.length, 0);
    assert.ok(f.system.playLanding(f.controller, 900)); assert.equal(f.played.length, 1);
    assert.ok(bank(type).includes(f.played[0].key)); f.system.destroy();
  }
});
const report = { passed: true, totalChecks: checks.length, checks, samples, comparisons,
  peakEstimate: "Stored channel-preserving PCM measurements times actual solo mixer gain; not a loudness or listening judgment.",
  nativeBrowserVerified: false, manualPlaythrough: false, listeningApproved: false };
writeFileSync(new URL("verification.json", import.meta.url), JSON.stringify(report, null, 2));
console.log("LANDING_AUDIO_OK", JSON.stringify({ passed: true, totalChecks: checks.length, comparisons }));
