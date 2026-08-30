import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PlayerInput } from "../player/PlayerInput.js";

const input = Object.assign(Object.create(PlayerInput.prototype), {
  controlsEnabled: true,
  keys: { q: { isDown: true } },
  _queuedQuickslashInput: false,
  scene: {
    debrisShieldSystem: {
      isInputCaptured: () => true,
    },
  },
});

assert.equal(
  input.getQuickslashInput(),
  true,
  "held Q must remain Quickslash even if stale debris state exists on the scene",
);
input.keys.q.isDown = false;
input._queuedQuickslashInput = true;
assert.equal(input.getQuickslashInput(), true, "queued action-bar Quickslash remains supported");
assert.equal(input.getQuickslashInput(), false, "queued Quickslash input is consumed once");

const sources = {
  input: readFileSync("player/PlayerInput.js", "utf8"),
  setup: readFileSync("world/playScene/PlaySceneSetup.js", "utf8"),
  update: readFileSync("world/playScene/PlaySceneUpdate.js", "utf8"),
  lifecycle: readFileSync("world/playScene/PlaySceneLifecycle.js", "utf8"),
  boot: readFileSync("ui/scenes/BootScene.js", "utf8"),
  earthquakes: readFileSync("values/earthquakes.js", "utf8"),
  earthquakeSystem: readFileSync("systems/environment/EarthquakeSystem.js", "utf8"),
  hardcore: readFileSync("values/hardcoreMode.js", "utf8"),
};

for (const name of ["input", "setup", "update", "lifecycle", "boot", "hardcore"]) {
  assert.doesNotMatch(sources[name], /debrisShield/i, `${name} retains active debris-shield wiring`);
}
assert.doesNotMatch(sources.earthquakes, /debrisEvents/,
  "standalone 45-90 second debris-event tuning must stay retired");
assert.doesNotMatch(sources.earthquakeSystem, /triggerDebrisEvent|nextDebrisEventMs/,
  "standalone debris scheduler must stay retired");
assert.match(sources.earthquakeSystem, /fallingRocks/,
  "established earthquake falling-rock hazards remain intact");

console.log("debris-shield retirement contract passed: held Q is Quickslash-only");
