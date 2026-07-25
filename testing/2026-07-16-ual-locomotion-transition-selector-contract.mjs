import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { UalNativeLocomotionTransitionSelector } from "../systems/visual/UalNativeLocomotionTransitionSelector.js";
import {
  UAL_NATIVE_LOCOMOTION_PHASES as PHASE,
  UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG as CONFIG,
} from "../values/ualNativeLocomotionTransitions.js";

const profile = Object.freeze({
  idleAnim: "idle",
  walkStartAnim: "walk-start",
  walkLoopAnim: "walk-loop",
  walkRunAnim: "run",
  walkStopAnim: "walk-stop",
  flightEnterAnim: "flight-enter",
  flightTravelEnterAnim: "flight-travel-enter",
  flightTravelLoopAnim: "flight-travel-loop",
  flightHoverAnim: "flight-hover",
  flightExitAnim: "flight-exit",
  airborneRiseAnim: "airborne-rise",
  airborneFallAnim: "airborne-fall",
  landingAnim: "landing",
});

const selector = new UalNativeLocomotionTransitionSelector(profile);
let currentAnimationKey = null;
let isPlaying = false;
let state = { grounded: true, flying: false, horizontalVelocity: 0, verticalVelocity: 0 };

function resolveState(overrides = {}) {
  state = { ...state, ...overrides };
  return selector.resolve({ ...state, currentAnimationKey, isPlaying });
}

function observePlaying(expectedKey, expectedPhase, expectedFacing) {
  currentAnimationKey = expectedKey;
  isPlaying = true;
  const result = resolveState();
  assert.equal(result.animationKey, expectedKey);
  assert.equal(result.phase, expectedPhase);
  assert.equal(result.facingFlipX, expectedFacing);
  assert.equal(result.restart, false);
}

function completeOneShot() {
  isPlaying = false;
  return resolveState();
}

let result = resolveState();
assert.deepEqual(
  { key: result.animationKey, phase: result.phase, loop: result.loop },
  { key: profile.idleAnim, phase: PHASE.IDLE, loop: true },
);

result = resolveState({ horizontalVelocity: 80 });
assert.equal(result.animationKey, profile.walkStartAnim);
assert.equal(result.phase, PHASE.WALK_START);
assert.equal(result.facingFlipX, false);
observePlaying(profile.walkStartAnim, PHASE.WALK_START, false);
result = completeOneShot();
assert.equal(result.animationKey, profile.walkLoopAnim);
assert.equal(result.phase, PHASE.WALK_LOOP);

currentAnimationKey = profile.walkLoopAnim;
isPlaying = true;
result = resolveState({ horizontalVelocity: 300 });
assert.equal(result.animationKey, profile.walkRunAnim);
assert.equal(result.phase, PHASE.RUN);

currentAnimationKey = profile.walkRunAnim;
result = resolveState({ horizontalVelocity: -90 });
assert.equal(result.animationKey, profile.walkStopAnim);
assert.equal(result.phase, PHASE.PIVOT_STOP);
assert.equal(result.facingFlipX, false, "pivot stop flipped before the old stride had settled");
observePlaying(profile.walkStopAnim, PHASE.PIVOT_STOP, false);
result = completeOneShot();
assert.equal(result.animationKey, profile.walkStartAnim);
assert.equal(result.phase, PHASE.PIVOT_START);
assert.equal(result.facingFlipX, true, "pivot start did not adopt the new left-facing direction");
observePlaying(profile.walkStartAnim, PHASE.PIVOT_START, true);
result = completeOneShot();
assert.equal(result.animationKey, profile.walkLoopAnim);
assert.equal(result.facingFlipX, true);

currentAnimationKey = profile.walkLoopAnim;
isPlaying = true;
result = resolveState({ horizontalVelocity: 0 });
assert.equal(result.phase, PHASE.WALK_STOP);
assert.equal(result.facingFlipX, true);
observePlaying(profile.walkStopAnim, PHASE.WALK_STOP, true);
result = completeOneShot();
assert.equal(result.phase, PHASE.IDLE);

currentAnimationKey = profile.idleAnim;
isPlaying = true;
result = resolveState({ grounded: false, verticalVelocity: -120 });
assert.equal(result.phase, PHASE.AIRBORNE_RISE);
result = resolveState({ verticalVelocity: 60 });
assert.equal(result.phase, PHASE.AIRBORNE_FALL);

currentAnimationKey = profile.airborneFallAnim;
result = resolveState({ grounded: true, verticalVelocity: 0 });
assert.equal(result.phase, PHASE.LANDING);
observePlaying(profile.landingAnim, PHASE.LANDING, true);
result = completeOneShot();
assert.equal(result.phase, PHASE.IDLE);
currentAnimationKey = profile.idleAnim;
isPlaying = true;
assert.equal(resolveState().phase, PHASE.IDLE, "landing repeated without a new airborne interval");

result = resolveState({ flying: true, horizontalVelocity: 0 });
assert.equal(result.phase, PHASE.FLIGHT_ENTER);
observePlaying(profile.flightEnterAnim, PHASE.FLIGHT_ENTER, true);
result = completeOneShot();
assert.equal(result.phase, PHASE.FLIGHT_HOVER);

currentAnimationKey = profile.flightHoverAnim;
isPlaying = true;
result = resolveState({ horizontalVelocity: 100 });
assert.equal(result.phase, PHASE.FLIGHT_TRAVEL_ENTER);
assert.equal(result.facingFlipX, false);
observePlaying(profile.flightTravelEnterAnim, PHASE.FLIGHT_TRAVEL_ENTER, false);
result = completeOneShot();
assert.equal(result.phase, PHASE.FLIGHT_TRAVEL_LOOP);

currentAnimationKey = profile.flightTravelLoopAnim;
isPlaying = true;
assert.equal(resolveState({ horizontalVelocity: 50 }).phase, PHASE.FLIGHT_TRAVEL_LOOP);
assert.equal(resolveState({ horizontalVelocity: 20 }).phase, PHASE.FLIGHT_HOVER);

currentAnimationKey = profile.flightHoverAnim;
result = resolveState({ flying: false, grounded: false, verticalVelocity: 70 });
assert.equal(result.phase, PHASE.FLIGHT_EXIT);
observePlaying(profile.flightExitAnim, PHASE.FLIGHT_EXIT, false);
result = completeOneShot();
assert.equal(result.phase, PHASE.AIRBORNE_FALL);

currentAnimationKey = profile.airborneFallAnim;
isPlaying = true;
result = resolveState({ grounded: true, verticalVelocity: 0 });
assert.equal(result.phase, PHASE.LANDING);
observePlaying(profile.landingAnim, PHASE.LANDING, false);
result = completeOneShot();
assert.equal(result.phase, PHASE.IDLE);

selector.reset({ facingFlipX: true });
currentAnimationKey = null;
isPlaying = false;
result = resolveState({ grounded: true, flying: false, horizontalVelocity: 0 });
assert.equal(result.phase, PHASE.IDLE);
assert.equal(result.facingFlipX, true);

assert.ok(CONFIG.ground.moveEnterSpeedPxPerSec > CONFIG.ground.moveExitSpeedPxPerSec);
assert.ok(CONFIG.ground.runEnterSpeedPxPerSec > CONFIG.ground.runExitSpeedPxPerSec);
assert.ok(CONFIG.flight.travelEnterSpeedPxPerSec > CONFIG.flight.travelExitSpeedPxPerSec);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(
  resolve(root, "systems/visual/UalNativeLocomotionTransitionSelector.js"),
  "utf8",
);
assert.doesNotMatch(source, /\bPhaser\b|scene\./, "selector gained a Phaser dependency");
assert.ok(source.split(/\r?\n/).length < 300, "selector exceeded the one-responsibility size limit");

console.log(JSON.stringify({
  result: "UAL_LOCOMOTION_TRANSITION_SELECTOR_CONTRACT_OK",
  phasesCovered: Object.keys(PHASE).length,
  selectorLines: source.split(/\r?\n/).length,
}, null, 2));
