import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PlayerMovement } from "../player/PlayerMovement.js";
import { resolveGroundHorizontalVelocity } from "../player/playerGroundMotion.js";
import { PLAYER_ANIMATION_POLISH } from "../values/playerAnimationPolish.js";
import {
  PLAYER_GROUND_MOTION_CONFIG,
  resolvePlayerGroundMotionEnabled,
} from "../values/playerGroundMotion.js";
import { PLAYER_KINEMATIC_MOTION_CONFIG } from "../values/playerKinematicMotion.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const speed = 200;

function simulate({ start, target, durationMs, framesPerSecond }) {
  const dt = 1 / framesPerSecond;
  const reversing = Math.sign(start) !== 0
    && Math.sign(target) !== 0
    && Math.sign(start) !== Math.sign(target);
  let velocity = start;
  let elapsedMs = 0;
  while (velocity !== target && elapsedMs < durationMs * 3) {
    velocity = resolveGroundHorizontalVelocity({
      currentVelocity: velocity,
      targetVelocity: target,
      effectiveMaxSpeed: speed,
      deltaSeconds: dt,
      config: PLAYER_GROUND_MOTION_CONFIG,
      reversing,
    });
    elapsedMs += dt * 1000;
  }
  return { velocity, elapsedMs, frameMs: dt * 1000 };
}

for (const framesPerSecond of [30, 60, 144]) {
  const acceleration = simulate({
    start: 0,
    target: speed,
    durationMs: PLAYER_GROUND_MOTION_CONFIG.accelerateToMaxMs,
    framesPerSecond,
  });
  assert.equal(acceleration.velocity, speed);
  assert.ok(acceleration.elapsedMs >= PLAYER_GROUND_MOTION_CONFIG.accelerateToMaxMs);
  assert.ok(
    acceleration.elapsedMs
      <= PLAYER_GROUND_MOTION_CONFIG.accelerateToMaxMs + acceleration.frameMs,
  );

  const release = simulate({
    start: speed,
    target: 0,
    durationMs: PLAYER_GROUND_MOTION_CONFIG.releaseToStopMs,
    framesPerSecond,
  });
  assert.equal(release.velocity, 0);
  assert.ok(release.elapsedMs >= PLAYER_GROUND_MOTION_CONFIG.releaseToStopMs);
  assert.ok(release.elapsedMs <= PLAYER_GROUND_MOTION_CONFIG.releaseToStopMs + release.frameMs);

  const reversal = simulate({
    start: speed,
    target: -speed,
    durationMs: PLAYER_GROUND_MOTION_CONFIG.reverseFullDirectionMs,
    framesPerSecond,
  });
  assert.equal(reversal.velocity, -speed);
  assert.ok(reversal.elapsedMs >= PLAYER_GROUND_MOTION_CONFIG.reverseFullDirectionMs);
  assert.ok(
    reversal.elapsedMs
      <= PLAYER_GROUND_MOTION_CONFIG.reverseFullDirectionMs + reversal.frameMs,
  );
}

const body = { vx: 0, vy: 0 };
const movement = new PlayerMovement(body, { walkSpeedPxPerSec: speed, tileSize: 94 });
movement.applyHorizontalMovement(speed, false, true, 1 / 60, true);
assert.ok(body.vx > 0 && body.vx < speed, "grounded start still snapped to full speed");
movement.applyHorizontalMovement(speed, true, false, 1 / 60, false);
assert.equal(body.vx, -speed, "airborne/flight compatibility path stopped being immediate");

assert.equal(resolvePlayerGroundMotionEnabled("?smoothGroundRun=0"), false);
assert.equal(resolvePlayerGroundMotionEnabled("?smoothGroundRun=1"), true);

const startBridge = PLAYER_ANIMATION_POLISH.groundHandoff.start;
const minimumBridgeDurationMs = (
  startBridge.frames.length
  / startBridge.frameRate
  / PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.walk.minTimeScale
) * 1000;
assert.ok(
  Math.abs(minimumBridgeDurationMs - PLAYER_GROUND_MOTION_CONFIG.releaseToStopMs) < 5,
  "release envelope no longer matches the planted stop handoff",
);
const speedRatioAtStartBridgeExit = minimumBridgeDurationMs
  / PLAYER_GROUND_MOTION_CONFIG.accelerateToMaxMs;
assert.ok(speedRatioAtStartBridgeExit >= 0.65 && speedRatioAtStartBridgeExit <= 0.85);

const controllerSource = readFileSync(resolve(root, "player/PlayerController.js"), "utf8");
assert.match(controllerSource, /smoothGroundMotion/);
assert.match(controllerSource, /applyHorizontalMovement\([\s\S]*dt,[\s\S]*smoothGroundMotion/);

console.log("GROUND_RUNNING_MOTION_CONTRACT_OK", {
  accelerateToMaxMs: PLAYER_GROUND_MOTION_CONFIG.accelerateToMaxMs,
  releaseToStopMs: PLAYER_GROUND_MOTION_CONFIG.releaseToStopMs,
  reverseFullDirectionMs: PLAYER_GROUND_MOTION_CONFIG.reverseFullDirectionMs,
  minimumBridgeDurationMs: Number(minimumBridgeDurationMs.toFixed(2)),
  speedRatioAtStartBridgeExit: Number(speedRatioAtStartBridgeExit.toFixed(3)),
});
