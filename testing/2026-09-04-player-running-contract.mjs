import assert from "node:assert/strict";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { PlayerController } from "../player/PlayerController.js";
import { UalNativeLocomotionTransitionSelector } from "../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { resolveHardcoreUpkeepGpFloor } from "../values/hardcoreMode.js";
import { createDefaultKeybinds } from "../values/keybindActions.js";
import { LOADING_MESSAGES } from "../values/loadingMessages.js";
import { PLAYER_RUNNING_CONFIG } from "../values/playerRunning.js";
import { UAL_NATIVE_LOCOMOTION_PHASES as PHASE } from "../values/ualNativeLocomotionTransitions.js";

assert.equal(createDefaultKeybinds().run, "CTRL");
assert.ok(LOADING_MESSAGES.some(message => message.label.includes("CTRL")
  && message.detail.includes("over twice walking speed")));
assert.equal(PLAYER_RUNNING_CONFIG.speedMultiplier, 2.1);
assert.equal(PLAYER_RUNNING_CONFIG.gemPowerDrainPerSecond, 2);

const controller = Object.create(PlayerController.prototype);
controller._getWalkSpeed = () => 160;
controller.abilities = { isRunning: () => false };
assert.equal(controller._getGroundTravelSpeed(), 160);
controller.abilities.isRunning = () => true;
assert.equal(controller._getGroundTravelSpeed(), 336);

const makeAbilities = () => {
  const body = { x: 0, y: 0, h: 75, setFlightActive() {} };
  const upgrades = {
    isGemPowerUnlocked: () => true,
    getEffectiveGemPowerCost: amount => amount,
    getEffectiveGemPowerRegen: amount => amount,
    getEffectiveGemPowerDrain: amount => amount,
  };
  return new PlayerAbilities(
    { scene: {} },
    {},
    { tileSize: 94, flightSpeedPxPerSec: 252 },
    upgrades,
    body,
  );
};
const idleInput = {
  getFlyInput: () => false,
  getQuickslashInput: () => false,
};

const running = makeAbilities();
running.setGemPowerExact(10, { silent: true });
running.update(1, idleInput, true, true, { groundRunRequested: true });
assert.equal(running.isRunning(), true);
assert.equal(running.getGemPowerExact(), 8, "one second of running must drain exactly 2 GP");

running.update(1, idleInput, true, true, { groundRunRequested: false });
assert.equal(running.isRunning(), false);
assert.equal(running.getGemPowerExact(), 9, "releasing Ctrl must resume normal GP regeneration");

running.setGemPowerExact(0, { silent: true });
running.update(1, idleInput, true, true, { groundRunRequested: true });
assert.equal(running.isRunning(), false, "an empty GP tank cannot sustain a run");
assert.equal(running.getGemPowerExact(), 0, "held Ctrl must not flicker between regen and running");

running.update(1, idleInput, false, true, { groundRunRequested: true });
assert.equal(running.isRunning(), false, "running is a grounded movement state");
assert.equal(running.getGemPowerExact(), 1, "airborne non-flight movement may regenerate GP");

const flying = makeAbilities();
flying.setGemPowerExact(100, { silent: true });
flying.update(0.1, { ...idleInput, getFlyInput: () => true }, true, true, {
  groundRunRequested: true,
});
assert.equal(flying.isFlying(), true);
assert.equal(flying.isRunning(), false, "flight must take priority over the Ctrl run request");

const armedHardcore = { mode: "hardcore", armed: true };
assert.equal(resolveHardcoreUpkeepGpFloor(armedHardcore, "run"), 1);

const profile = Object.freeze({
  idleAnim: "idle",
  walkStartAnim: "walk-start",
  walkLoopAnim: "legacy-walk",
  walkRunAnim: "legacy-standard-walk",
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
const walkingSelection = new UalNativeLocomotionTransitionSelector(profile).resolve({
  grounded: true,
  groundMovementActive: true,
  running: false,
  horizontalVelocity: 160,
  currentAnimationKey: profile.walkLoopAnim,
  isPlaying: true,
});
assert.equal(walkingSelection.animationKey, profile.walkLoopAnim);
assert.equal(walkingSelection.phase, PHASE.WALK_LOOP);

const runningSelection = new UalNativeLocomotionTransitionSelector(profile).resolve({
  grounded: true,
  groundMovementActive: true,
  running: true,
  horizontalVelocity: 240,
  currentAnimationKey: profile.walkRunAnim,
  isPlaying: true,
});
assert.equal(runningSelection.animationKey, profile.walkRunAnim);
assert.equal(runningSelection.phase, PHASE.RUN);

console.log("player running contract passed");
