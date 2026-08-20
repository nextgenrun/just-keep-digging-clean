import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerFlightMotion } from "../player/PlayerFlightMotion.js";
import {
  PlayerJumpMotion,
  resolveFixedJumpVelocityPxPerSec,
} from "../player/PlayerJumpMotion.js";
import { PLAYER_TRAVERSAL_CONFIG } from "../values/playerTraversal.js";
import { createDefaultKeybinds } from "../values/keybindActions.js";
import {
  UAL_NATIVE_ACTION_TUNING,
  resolveUalFlightPoseAngle,
  resolveUalFlightTravel,
} from "../values/ualNativeActionTuning.js";

const tileSize = 94;
const gravity = 1400;
const config = { tileSize, gravityY: gravity };
const jumpVelocity = resolveFixedJumpVelocityPxPerSec({
  gravityPxPerSecondSquared: gravity,
  tileSizePx: tileSize,
});
const resolvedHeightTiles = (jumpVelocity ** 2 / (2 * gravity)) / tileSize;
assert.ok(Math.abs(resolvedHeightTiles - 1.2) < Number.EPSILON * 8);
assert.equal(PLAYER_TRAVERSAL_CONFIG.jump.heightTiles, 1.2);
assert.equal(createDefaultKeybinds().jump, "SPACE");

const jumpBody = { vy: 0, onGround: true };
const jump = new PlayerJumpMotion(jumpBody, config);
let jumpQueued = true;
const jumpInput = { consumeJumpInput: () => jumpQueued && (jumpQueued = false, true) };
assert.equal(jump.tryStart(jumpInput, true, false), true);
assert.equal(jumpBody.vy, -jumpVelocity);
assert.equal(jump.tryStart(jumpInput, false, false), false, "jump must not become variable or repeat in air");

const body = { vx: 0, vy: 0 };
let axes = { x: 0, y: 0 };
let horizontal = { left: false, right: false };
const input = {
  getFlightMovement: () => axes,
  getHorizontalMovement: () => horizontal,
};
const flight = new PlayerFlightMotion(body, config);
flight.updatePowered(1 / 60, input, true, 252);
const firstTakeoffVy = body.vy;
assert.ok(firstTakeoffVy < 0, "neutral Shift must produce an assisted takeoff");
assert.ok(Math.abs(firstTakeoffVy) < 252 * PLAYER_TRAVERSAL_CONFIG.flight.maxSpeedMultiplier,
  "takeoff must accelerate instead of snapping to cruise speed");

for (let frame = 0; frame < 18; frame += 1) {
  flight.updatePowered(1 / 60, input, false, 252);
}
assert.ok(body.vy < firstTakeoffVy, "takeoff assist must build upward momentum");

axes = { x: 0, y: 1 };
for (let frame = 0; frame < 50; frame += 1) {
  flight.updatePowered(1 / 60, input, false, 252);
}
assert.ok(body.vy > 0, "held down input must brake ascent and build a dive");
const diveVelocity = body.vy;

axes = { x: 0, y: -1 };
for (let frame = 0; frame < 50; frame += 1) {
  flight.updatePowered(1 / 60, input, false, 252);
}
assert.ok(body.vy < 0, "held up input must brake descent and rebuild ascent momentum");
assert.ok(diveVelocity <= 252 * PLAYER_TRAVERSAL_CONFIG.flight.maxSpeedMultiplier);

axes = { x: 1, y: 0 };
body.vx = 0;
flight.updatePowered(1 / 60, input, false, 252);
assert.ok(body.vx > 0 && body.vx < 252, "horizontal flight must accelerate progressively");
for (let frame = 0; frame < 30; frame += 1) flight.updatePowered(1 / 60, input, false, 252);
const cruiseVelocityX = body.vx;
axes = { x: 0, y: 0 };
flight.updatePowered(1 / 60, input, false, 252);
assert.ok(body.vx > 0 && body.vx < cruiseVelocityX, "neutral flight input must decelerate toward hover");

const releasedVelocityX = body.vx;
horizontal = { left: false, right: false };
assert.equal(flight.updateUnpowered(1 / 60, input, false, 200), true);
assert.ok(body.vx > 0 && body.vx < releasedVelocityX, "released flight must coast instead of stopping instantly");

assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 0, verticalSpeedPxPerSec: 120 }), true,
  "fast ascent and dive must use travel animation pacing");
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 20, verticalSpeedPxPerSec: 20 }), false);
const riseRight = resolveUalFlightPoseAngle({
  horizontalVelocityPxPerSec: 180,
  verticalVelocityPxPerSec: -220,
});
const diveRight = resolveUalFlightPoseAngle({
  horizontalVelocityPxPerSec: 180,
  verticalVelocityPxPerSec: 220,
});
const riseLeft = resolveUalFlightPoseAngle({
  horizontalVelocityPxPerSec: -180,
  verticalVelocityPxPerSec: -220,
  facingFlipX: true,
});
assert.ok(riseRight < 0 && diveRight > 0 && riseLeft > 0);
assert.ok(Math.abs(riseRight) <= UAL_NATIVE_ACTION_TUNING.flight.maxRiseAngleDegrees);
assert.ok(diveRight <= UAL_NATIVE_ACTION_TUNING.flight.maxDiveAngleDegrees);

const abilitiesSource = await readFile(new URL("../player/PlayerAbilities.js", import.meta.url), "utf8");
assert.doesNotMatch(abilitiesSource, /body\.vy\s*=\s*-this\._getFlightSpeed/,
  "flight authority must not restore constant upward levitation");

console.log("player jump and momentum-flight contract: PASS");
