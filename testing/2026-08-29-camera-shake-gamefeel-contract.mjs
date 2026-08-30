import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { CameraShakeSystem } from "../systems/visual/CameraShakeSystem.js";
import { CAMERA_SHAKE_SIGNATURES } from "../values/cameraShake.js";
import { GAMEFEEL_CONFIG } from "../values/gamefeel.js";

function createScene(startTime = 0) {
  const offsets = [];
  const flashes = [];
  const scene = {
    time: { now: startTime },
    game: { loop: { actualFps: 60 } },
    cameras: {
      main: {
        setFollowOffset: (...offset) => offsets.push(offset),
        shakeEffect: { isRunning: false },
      },
    },
    screenFlashSystem: { _flash: (...flash) => flashes.push(flash) },
  };
  return { scene, offsets, flashes };
}

function createShake(startTime = 0) {
  const fixture = createScene(startTime);
  fixture.shake = new CameraShakeSystem(fixture.scene);
  return fixture;
}

// Signature frequencies are real Hz, not cycles-per-millisecond aliases.
for (const signatures of Object.values(CAMERA_SHAKE_SIGNATURES)) {
  for (const signature of Object.values(signatures)) {
    assert.ok(signature.freqX >= 1 && signature.freqX <= 20);
    assert.ok(signature.freqY >= 1 && signature.freqY <= 20);
  }
}
assert.ok(
  CAMERA_SHAKE_SIGNATURES.mining.light.priority
    < CAMERA_SHAKE_SIGNATURES.mining.medium.priority,
);
assert.ok(
  CAMERA_SHAKE_SIGNATURES.mining.medium.priority
    < CAMERA_SHAKE_SIGNATURES.mining.heavy.priority,
);

// Absolute scene time no longer changes the phase of an otherwise equal hit.
const early = createShake(1000);
const late = createShake(9000);
assert.equal(early.shake.shake("mining.heavy"), true);
assert.equal(late.shake.shake("mining.heavy"), true);
early.shake.update(1040, 16);
late.shake.update(9040, 16);
assert.deepEqual(early.offsets.at(-1), late.offsets.at(-1));
for (const offset of early.offsets.at(-1)) {
  assert.ok(Math.abs(offset) <= CAMERA_SHAKE_SIGNATURES.mining.heavy.intensity);
}

// Same-frame duplicate dispatches merge strength without restarting or echoing flash.
const duplicate = createShake(2000);
assert.equal(duplicate.shake.shake("mining.crit", 0.5), true);
const firstStartTime = duplicate.shake._active.startTime;
assert.equal(duplicate.flashes.length, 1);
duplicate.scene.time.now += GAMEFEEL_CONFIG.shake.duplicateMergeWindowMs - 1;
assert.equal(duplicate.shake.shake("mining.crit", 1), true);
assert.equal(duplicate.shake._active.startTime, firstStartTime);
assert.equal(
  duplicate.shake.getStatus().intensity,
  CAMERA_SHAKE_SIGNATURES.mining.crit.intensity,
);
assert.equal(duplicate.flashes.length, 1);
duplicate.shake.update(
  firstStartTime + CAMERA_SHAKE_SIGNATURES.mining.crit.duration + 1,
  16,
);
assert.equal(duplicate.shake.getStatus().active, false);
assert.deepEqual(duplicate.offsets.at(-1), [0, 0]);

// A nominally finished short impulse is not mistaken for a live duplicate.
const stale = createScene(0);
const shortShake = new CameraShakeSystem(stale.scene, {
  misc: { short: { duration: 20, intensity: 1, freqX: 5, freqY: 6 } },
});
assert.equal(shortShake.shake("misc.short"), true);
stale.scene.time.now = GAMEFEEL_CONFIG.shake.minimumDurationMs + 5;
assert.equal(shortShake.shake("misc.short"), true);
assert.equal(shortShake._active.startTime, stale.scene.time.now);

// Priority and the centralized low-FPS safety gate apply to every signature.
const priority = createShake(3000);
assert.equal(priority.shake.shake("earthquake.major"), true);
assert.equal(priority.shake.shake("mining.heavy"), false);
priority.scene.game.loop.actualFps = GAMEFEEL_CONFIG.shake.minFps - 1;
priority.shake.update(3016, 16);
assert.equal(priority.shake.getStatus().active, false);
assert.deepEqual(priority.offsets.at(-1), [0, 0]);
assert.equal(priority.shake.shake("weatherThunder.close"), false);

// Curated depth milestones delegate the one impact impulse to the cinematic.
const updateSource = await readFile(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
const cinematicSource = await readFile(
  new URL("../systems/visual/DepthMilestoneCinematic.js", import.meta.url),
  "utf8",
);
assert.match(updateSource, /const cinematicTriggered =/);
assert.match(updateSource, /if \(!cinematicTriggered\) this\.shakeSystem\?\.shake\("misc\.depthMilestone"\)/);
assert.equal(
  updateSource.match(/shake\("misc\.depthMilestone"\)/g)?.length,
  1,
);
assert.equal(
  cinematicSource.match(/shake\?\.\("misc\.depthMilestone"\)/g)?.length,
  1,
);

console.log("camera shake gamefeel contract: stable Hz, merge, priority, FPS, and ownership passed");
