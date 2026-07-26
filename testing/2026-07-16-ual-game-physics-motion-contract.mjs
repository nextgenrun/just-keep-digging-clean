import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateStrideMatchedTimeScale,
  PlayerKinematicMotionSystem,
} from "../systems/visual/PlayerKinematicMotionSystem.js";
import { resolveUalFlightTravel } from "../values/ualNativeActionTuning.js";
import { UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG } from "../values/ualNativeLocomotionTransitions.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import { PLAYER_KINEMATIC_MOTION_CONFIG } from "../values/playerKinematicMotion.js";
import { PLAYER_STATS_CONFIG } from "../values/playerStats.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tileSize = 94;
const body = { x: 0, y: 0, vx: 999, vy: 0 };
const profile = UAL_NATIVE_PLAYER_ASSET_PROFILE;
const system = new PlayerKinematicMotionSystem(
  { config: { tileSize } },
  {},
  { physicsBody: body },
  profile,
);

assert.equal(system.getGroundedVisualYOffset(), 0);
assert.equal(PLAYER_KINEMATIC_MOTION_CONFIG.anchor.legacyGroundedOffsetPx, 6);

system.samplePhysics(50);
assert.equal(system.getHorizontalSpeedPxPerSec(), 0, "requested velocity leaked through a blocked body");
assert.equal(system.getTravelSpeedPxPerSec(), 0, "travel cadence ignored resolved displacement");

for (let frame = 0; frame < 10; frame += 1) {
  body.x += 10;
  system.samplePhysics(50);
}
assert.ok(system.getHorizontalSpeedPxPerSec() > 199);
assert.ok(system.getHorizontalSpeedPxPerSec() <= 200);
assert.ok(system.getResolvedVelocityX() > 199 && system.getResolvedVelocityX() <= 200);

assert.equal(profile.walkAnimation.baseSpeedPxPerSec, PLAYER_STATS_CONFIG.walkSpeedPxPerSec);
assert.equal(UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG.ground.gaitAnimationRole, "run");
assert.equal(profile.sourceClips.walk, profile.sourceClips.run);
assert.equal(
  PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.walk.strideTilesPerCycle,
  PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.run.strideTilesPerCycle,
  "the temporary shared Jog gait must not slow at the run threshold",
);

const directWalkScale = calculateStrideMatchedTimeScale({
  speedPxPerSec: 200,
  frameCount: profile.walkLoopFrames.length,
  frameRate: 30,
  stridePx: PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.walk.strideTilesPerCycle * tileSize,
  minTimeScale: PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.walk.minTimeScale,
  maxTimeScale: PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.walk.maxTimeScale,
});
assert.ok(Math.abs(directWalkScale - 1.28117) < 0.001);
const resolvedWalkScale = system.resolveLocomotionTimeScale(profile.walkLoopAnim, {
  frames: Array.from({ length: profile.walkLoopFrames.length }),
  frameRate: 30,
});
assert.ok(Math.abs(resolvedWalkScale - directWalkScale) < 0.01);
const directRunScale = calculateStrideMatchedTimeScale({
  speedPxPerSec: 200,
  frameCount: profile.walkRunFrames.length,
  frameRate: 30,
  stridePx: PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.run.strideTilesPerCycle * tileSize,
  minTimeScale: PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.run.minTimeScale,
  maxTimeScale: PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.run.maxTimeScale,
});
const resolvedRunScale = system.resolveLocomotionTimeScale(profile.walkRunAnim, {
  frames: Array.from({ length: profile.walkRunFrames.length }),
  frameRate: 30,
});
assert.ok(Math.abs(resolvedRunScale - directRunScale) < 0.01);
assert.ok(Math.abs(resolvedRunScale - resolvedWalkScale) < 0.01);

for (let frame = 0; frame < 10; frame += 1) {
  body.y += 5;
  system.samplePhysics(50);
}
assert.ok(system.getVerticalSpeedPxPerSec() > 99);
assert.ok(system.getVerticalSpeedPxPerSec() <= 100);
assert.ok(system.getResolvedVelocityY() > 99 && system.getResolvedVelocityY() <= 100);
const climbScale = system.resolveLocomotionTimeScale(profile.climbAnim, {
  frames: Array.from({ length: 30 }),
  frameRate: 30,
});
assert.ok(climbScale > 1.05 && climbScale < 1.07);

body.x += tileSize * 2;
body.y += tileSize * 2;
system.samplePhysics(16);
assert.equal(system.getHorizontalSpeedPxPerSec(), 0, "teleport contaminated horizontal cadence");
assert.equal(system.getVerticalSpeedPxPerSec(), 0, "teleport contaminated vertical cadence");
assert.equal(system.getResolvedVelocityX(), 0, "teleport contaminated signed horizontal velocity");
assert.equal(system.getResolvedVelocityY(), 0, "teleport contaminated signed vertical velocity");
assert.equal(system.getTravelSpeedPxPerSec(), 0, "teleport contaminated flight cadence");

assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 72, verticalSpeedPxPerSec: 0 }), true);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 71, verticalSpeedPxPerSec: 0 }), false);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 100, verticalSpeedPxPerSec: 160 }), false);
assert.equal(resolveUalFlightTravel({
  horizontalSpeedPxPerSec: 39,
  verticalSpeedPxPerSec: 0,
  wasTraveling: true,
}), true);

assert.equal(system.isFalling(80), true);
assert.equal(system.isFalling(50), true, "falling state lacked landing hysteresis");
assert.equal(system.isFalling(20), false);

const playSetupSource = readFileSync(resolve(root, "world/playScene/PlaySceneSetup.js"), "utf8");
const playUpdateSource = readFileSync(resolve(root, "world/playScene/PlaySceneUpdate.js"), "utf8");
const playGameplaySource = readFileSync(resolve(root, "world/playScene/PlaySceneGameplay.js"), "utf8");
const caveGameplaySource = readFileSync(resolve(root, "world/playScene/CaveGameplayController.js"), "utf8");
const caveActionSource = readFileSync(resolve(root, "world/playScene/CaveActionAnimationRuntime.js"), "utf8");
assert.match(playSetupSource, /new PlayerKinematicMotionSystem/);
assert.match(playSetupSource, /new UalNativeLocomotionTransitionSelector/);
assert.match(playUpdateSource, /playerKinematicMotion\?\.samplePhysics\(delta\)/);
assert.match(playGameplaySource, /resolveLocomotionTimeScale/);
assert.match(playGameplaySource, /getTravelSpeedPxPerSec/);
assert.match(playGameplaySource, /ualLocomotionTransitionSelector\.resolve/);
assert.match(playGameplaySource, /getResolvedVelocityX/);
assert.match(playGameplaySource, /getResolvedVelocityY/);
assert.match(playGameplaySource, /groundMovementActive/);
assert.match(caveGameplaySource, /new PlayerKinematicMotionSystem/);
assert.match(caveGameplaySource, /playerKinematicMotion\?\.samplePhysics\(delta\)/);
assert.match(caveActionSource, /UalNativeLocomotionTransitionSelector/);
assert.match(caveActionSource, /resolveLocomotionTimeScale/);
assert.match(caveActionSource, /getTravelSpeedPxPerSec/);
assert.match(caveActionSource, /getResolvedVelocityX/);
assert.match(caveActionSource, /getResolvedVelocityY/);
assert.match(caveActionSource, /groundMovementActive/);

console.log(JSON.stringify({
  result: "UAL_GAME_PHYSICS_MOTION_CONTRACT_OK",
  tileSize,
  colliderAnchorOffsetPx: system.getGroundedVisualYOffset(),
  groundedGaitAnimationRole: UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG.ground.gaitAnimationRole,
  directWalkScale: Number(directWalkScale.toFixed(3)),
  directRunScale: Number(directRunScale.toFixed(3)),
  climbScale: Number(climbScale.toFixed(3)),
}, null, 2));
