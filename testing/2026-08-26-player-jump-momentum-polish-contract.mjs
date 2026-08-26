import assert from "node:assert/strict";

import {
  PlayerJumpMotion,
  resolveAirborneJumpVelocityX,
  resolveFixedJumpVelocityPxPerSec,
} from "../player/PlayerJumpMotion.js";
import {
  PLAYER_TRAVERSAL_CONFIG,
  resolvePlayerJumpMomentumEnabled,
} from "../values/playerTraversal.js";

const tileSizePx = 94;
const gravityPxPerSecondSquared = 1400;
const walkSpeedPxPerSec = 200;
const jumpConfig = PLAYER_TRAVERSAL_CONFIG.jump;

const jumpVelocity = resolveFixedJumpVelocityPxPerSec({
  gravityPxPerSecondSquared,
  tileSizePx,
});
const jumpHeightTiles = (jumpVelocity ** 2 / (2 * gravityPxPerSecondSquared)) / tileSizePx;
assert.ok(Math.abs(jumpHeightTiles - 1.2) < Number.EPSILON * 8,
  "horizontal polish must not change the exact fixed jump height");

const body = { vx: 164, vy: 0, onGround: true };
const jump = new PlayerJumpMotion(body, {
  tileSize: tileSizePx,
  gravityY: gravityPxPerSecondSquared,
});
assert.equal(jump.tryStart({ consumeJumpInput: () => true }, true, false), true);
assert.equal(body.vx, 164, "takeoff must inherit grounded horizontal momentum");
assert.equal(body.vy, -jumpVelocity);

assert.equal(jump.updateAirborneHorizontal(
  1 / 60,
  { left: false, right: false },
  false,
  false,
  walkSpeedPxPerSec,
), true);
assert.ok(body.vx > 0 && body.vx < 164,
  "neutral air time must carry momentum with gentle drag instead of snapping to zero");

body.vx = 40;
const firstSteerVelocity = resolveAirborneJumpVelocityX({
  currentVelocityPxPerSec: body.vx,
  inputDirection: 1,
  maxGroundSpeedPxPerSec: walkSpeedPxPerSec,
  tileSizePx,
  deltaSeconds: 1 / 60,
});
assert.ok(firstSteerVelocity > 40 && firstSteerVelocity < walkSpeedPxPerSec,
  "air steering must accelerate progressively");

body.vx = 180;
jump.updateAirborneHorizontal(1 / 60, { left: true, right: false }, false, false, walkSpeedPxPerSec);
assert.ok(body.vx > 0 && body.vx < 180,
  "opposite input must brake existing momentum before reversing");
for (let frame = 0; frame < 30; frame += 1) {
  jump.updateAirborneHorizontal(1 / 60, { left: true, right: false }, false, false, walkSpeedPxPerSec);
}
assert.ok(body.vx < 0, "sustained opposite input must still allow an airborne reversal");

function simulateSteer(frameRate) {
  let vx = 0;
  for (let frame = 0; frame < frameRate / 2; frame += 1) {
    vx = resolveAirborneJumpVelocityX({
      currentVelocityPxPerSec: vx,
      inputDirection: 1,
      maxGroundSpeedPxPerSec: walkSpeedPxPerSec,
      tileSizePx,
      deltaSeconds: 1 / frameRate,
    });
  }
  return vx;
}
assert.ok(Math.abs(simulateSteer(30) - simulateSteer(60)) < 0.001);
assert.ok(Math.abs(simulateSteer(60) - simulateSteer(144)) < 0.001,
  "air steering must remain stable across common frame rates");

assert.equal(resolvePlayerJumpMomentumEnabled("?jumpMomentum=0"), false);
assert.equal(resolvePlayerJumpMomentumEnabled("?jumpMomentum=off"), false);
assert.equal(resolvePlayerJumpMomentumEnabled("?jumpMomentum=1"), true);

console.log("player jump momentum polish contract: PASS");
