import assert from "node:assert/strict";

import { CaveActionAnimationRuntime } from "../world/playScene/CaveActionAnimationRuntime.js";
import { CaveGameplayController } from "../world/playScene/CaveGameplayController.js";
import {
  resolveUalActionContact,
  resolveUalFlightTimeScale,
} from "../values/ualNativeActionTuning.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE as profile } from "../values/ualNativePlayerAssetProfile.js";
import { THUNDER_STRIKE_CHAIN_CONFIG } from "../values/thunderStrikeChain.js";

class FakeSprite {
  constructor() {
    this.listeners = new Map();
    this.played = [];
    this.flips = [];
    this.anims = { currentAnim: null, timeScale: 1, isPlaying: false };
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return this;
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
    return this;
  }

  emit(event, ...args) {
    [...(this.listeners.get(event) || [])].forEach((callback) => callback(...args));
    if (event === "animationcomplete") this.anims.isPlaying = false;
  }

  play(key) {
    this.played.push(key);
    this.anims.currentAnim = { key };
    this.anims.isPlaying = true;
    return this;
  }

  setFlipX(value) {
    this.flips.push(value);
    return this;
  }

  setDisplaySize() { return this; }
}

const animation = (key) => ({ key });
const frame = (textureFrame, zeroBasedSequenceIndex) => ({
  textureFrame,
  index: zeroBasedSequenceIndex + 1,
});

const sprite = new FakeSprite();
const animationFrameCounts = new Map([
  [profile.idleAnim, profile.idleFrames.length],
  [profile.airborneRiseAnim, profile.airborneFrames.length],
  [profile.airborneFallAnim, profile.fallingFrames.length],
  [profile.digDownAnim, profile.digDownFrames.length],
  [profile.quickslashAnim, profile.quickslashFrames.length],
  [profile.thunderStrikeStrikeAnim, profile.thunderStrikeStrikeFrames.length],
  [profile.flyAnim, profile.flyFrames.length],
  [profile.flightEnterAnim, profile.flightEnterFrames.length],
  [profile.flightTravelEnterAnim, profile.flightTravelEnterFrames.length],
  [profile.flightTravelLoopAnim, profile.flightTravelLoopFrames.length],
  [profile.flightHoverAnim, profile.flightHoverFrames.length],
  [profile.flightExitAnim, profile.flightExitFrames.length],
  [profile.landingAnim, profile.landingFrames.length],
]);
for (const variant of profile.digAnimationVariants) {
  animationFrameCounts.set(variant.key, variant.frames.length);
}
let flightHorizontalSpeed = 0;
let flightVerticalSpeed = 0;
const scene = {
  playerAssetProfile: profile,
  player: sprite,
  config: { tileSize: 94, playerDisplaySizePx: profile.displaySizePx },
  time: { now: 0 },
  anims: {
    exists: (key) => animationFrameCounts.has(key) || key === profile.thunderStrikeChargeAnim,
    get: (key) => ({
      frames: Array.from({ length: animationFrameCounts.get(key) || 30 }, (_, index) => index),
      frameRate: 30,
    }),
  },
  playerKinematicMotion: {
    getResolvedVelocityX: () => flightHorizontalSpeed,
    getResolvedVelocityY: () => flightVerticalSpeed,
    getHorizontalSpeedPxPerSec: () => flightHorizontalSpeed,
    getVerticalSpeedPxPerSec: () => flightVerticalSpeed,
    getTravelSpeedPxPerSec: () => Math.hypot(flightHorizontalSpeed, flightVerticalSpeed),
  },
};

const worldModel = {
  inBounds: () => true,
  isSolid: () => false,
};
const body = {
  x: 10 * 94 + (94 - profile.playerBodyWidthPx) / 2,
  y: 11 * 94 - profile.playerBodyHeightPx,
  w: profile.playerBodyWidthPx,
  h: profile.playerBodyHeightPx,
  vx: 0,
  vy: 0,
};
const abilities = {
  charging: false,
  chargeStart: null,
  executeCalls: 0,
  executeStages: [],
  armedStages: [],
  armedStage: null,
  flying: false,
  startThunderStrikeCharge(now) {
    this.charging = true;
    this.chargeStart = now;
    return true;
  },
  updateThunderStrikeCharge(now) {
    return {
      complete: this.charging
        && now - this.chargeStart >= THUNDER_STRIKE_CHAIN_CONFIG.initialImpact.chargeTimeMs,
    };
  },
  isThunderStrikeCharging() { return this.charging; },
  armThunderStrikeFollowUp(stageIndex) {
    this.armedStage = stageIndex;
    this.armedStages.push(stageIndex);
    return true;
  },
  cancelThunderStrikeChain() {
    this.charging = false;
    this.armedStage = null;
  },
  executeThunderStrike(stageIndex = 0) {
    if (stageIndex > 0 && this.armedStage !== stageIndex) {
      return { success: false, reason: "follow-up-not-armed" };
    }
    this.executeCalls += 1;
    this.executeStages.push(stageIndex);
    this.charging = false;
    this.armedStage = null;
    return {
      success: true,
      chainStageIndex: stageIndex,
      results: [{ tx: 10, ty: 12, destroyed: false }],
    };
  },
  isFlying() { return this.flying; },
};
let facingRight = true;
let grounded = true;
let motionState = "airborne";
const controller = {
  scene,
  worldModel,
  digSystem: {
    lastMineTime: -Infinity,
    getEffectiveCooldownMs: () => 750,
    isMineCooldownReady(nowMs) {
      return nowMs - this.lastMineTime >= this.getEffectiveCooldownMs();
    },
  },
  playerController: {
    abilities,
    physicsBody: body,
    getMotionState: () => motionState,
    isFacingRight: () => facingRight,
    isGrounded: () => grounded,
  },
  _actionUntilMs: 0,
  displaySizeCalls: 0,
  thunderApplyCalls: 0,
  _applyPlayerDisplaySize() { this.displaySizeCalls += 1; },
  _playAnim(key, time, holdMs) {
    sprite.play(key, true);
    this._actionUntilMs = holdMs === Infinity ? Infinity : time + holdMs;
  },
  _applyThunderStrikeResult(strike, time) {
    this.thunderApplyCalls += 1;
    this.lastStrike = { strike, time };
  },
};

const runtime = new CaveActionAnimationRuntime(controller);
runtime.create();

// Repeated side mining retains the approved four-beat Jab/Cross/Jab/Cross chain.
assert.deepEqual(profile.digSidewaysHitAnims, [
  "ual-native-v1-punch-jab-anim",
  "ual-native-v1-dig-side-cross-anim",
  "ual-native-v1-punch-jab-anim",
  "ual-native-v1-dig-side-cross-anim",
]);
for (const [index, expectedKey] of profile.digSidewaysHitAnims.entries()) {
  assert.equal(runtime.playMiningAnimation(
    "mine",
    "RIGHT",
    index * 300,
    abilities,
    null,
    { tx: 11 + index, ty: 10 },
    { x: 1, y: 0 },
  ), true);
  assert.equal(sprite.played.at(-1), expectedKey);
  const comboContact = resolveUalActionContact(profile, expectedKey, "normal");
  sprite.emit(
    "animationupdate",
    animation(expectedKey),
    frame(comboContact.textureFrame, comboContact.sequenceIndex),
    sprite,
  );
  sprite.emit(
    "animationcomplete",
    animation(expectedKey),
    frame(0, animationFrameCounts.get(expectedKey) - 1),
    sprite,
  );
}

// DOWN mining: no frame-zero hit, one deferred contact, full-animation lock.
let mineContacts = 0;
const downContact = resolveUalActionContact(profile, profile.digDownAnim, "normal");
assert.equal(profile.digDownSheet, profile.groundStrikeSheet);
assert.equal(profile.digDownSheet, profile.attackDownSheet);
assert.ok(downContact.textureFrame >= 0 && downContact.textureFrame < profile.digDownFrames.length);
assert.ok(downContact.sequenceIndex >= 0 && downContact.sequenceIndex < profile.digDownFrames.length);
assert.equal(downContact.markerGroup, "hands");
assert.equal(profile.digDownSourceFacesRight, true);
assert.equal(runtime.playMiningAnimation("mine", "DOWN", 0, abilities, () => { mineContacts += 1; }), true);
assert.equal(sprite.flips.at(-1), false, "right-facing DOWN action flipped its right-facing source");
assert.equal(mineContacts, 0);
assert.equal(runtime.isUalActionLocked, true);
sprite.emit(
  "animationupdate",
  animation(profile.digDownAnim),
  frame(downContact.textureFrame + 1, downContact.sequenceIndex - 1),
  sprite,
);
assert.equal(mineContacts, 0);
sprite.emit(
  "animationupdate",
  animation(profile.digDownAnim),
  frame(downContact.textureFrame, downContact.sequenceIndex),
  sprite,
);
sprite.emit(
  "animationupdate",
  animation(profile.digDownAnim),
  frame(downContact.textureFrame, downContact.sequenceIndex),
  sprite,
);
assert.equal(mineContacts, 1);
assert.equal(runtime.isUalActionLocked, true);
sprite.emit("animationcomplete", animation(profile.digDownAnim), frame(
  profile.digDownFrames.at(-1),
  profile.digDownFrames.length - 1,
), sprite);
assert.equal(runtime.isUalActionLocked, false);
facingRight = false;
assert.equal(runtime.playMiningAnimation("mine", "DOWN", 1, abilities), true);
assert.equal(sprite.flips.at(-1), true, "left-facing DOWN action did not flip its right-facing source");
sprite.emit("animationcomplete", animation(profile.digDownAnim), frame(
  profile.digDownFrames.at(-1),
  profile.digDownFrames.length - 1,
), sprite);
facingRight = true;

// Held mining may replace only the post-contact recovery once cooldown is ready.
let recoveryContacts = 0;
const recoveryStartedAt = 2000;
scene.time.now = 2150;
assert.equal(runtime.playMiningAnimation(
  "mine",
  "RIGHT",
  recoveryStartedAt,
  abilities,
  () => {
    recoveryContacts += 1;
    controller.digSystem.lastMineTime = recoveryStartedAt;
  },
), true);
const recoveryKey = sprite.anims.currentAnim.key;
const recoveryContact = resolveUalActionContact(profile, recoveryKey, "normal");
sprite.emit(
  "animationupdate",
  animation(recoveryKey),
  frame(recoveryContact.textureFrame, recoveryContact.sequenceIndex),
  sprite,
);
assert.equal(recoveryContacts, 1);
assert.equal(runtime.canReplaceMiningRecovery(2249, abilities), false);
assert.equal(runtime.canReplaceMiningRecovery(2749, abilities), false);
assert.equal(runtime.canReplaceMiningRecovery(2750, abilities), true);
scene.time.now = 2750;
assert.equal(runtime.playMiningAnimation("mine", "RIGHT", 2750, abilities), true);
const replacementKey = sprite.anims.currentAnim.key;
assert.equal(runtime.isUalActionLocked, true);
sprite.emit("animationcomplete", animation(recoveryKey), frame(0, 0), sprite);
assert.equal(runtime.isUalActionLocked, true, "cancelled recovery completion unlocked its replacement");
const replacementContact = resolveUalActionContact(profile, replacementKey, "normal");
sprite.emit(
  "animationupdate",
  animation(replacementKey),
  frame(replacementContact.textureFrame, replacementContact.sequenceIndex),
  sprite,
);
sprite.emit(
  "animationcomplete",
  animation(replacementKey),
  frame(0, animationFrameCounts.get(replacementKey) - 1),
  sprite,
);
assert.equal(runtime.isUalActionLocked, false);
controller.digSystem.lastMineTime = -Infinity;

// A committed target still resolves if animation alignment moves the body before contact.
let delayedContact = null;
let delayedMineCalls = 0;
const contactController = Object.create(CaveGameplayController.prototype);
contactController.playerController = { physicsBody: body };
contactController.scene = {
  config: { tileSize: 94 },
  playerAssetProfile: profile,
  time: { now: 100 },
};
contactController.digSystem = {
  tryMine() {
    delayedMineCalls += 1;
    return { success: false };
  },
};
contactController._playMiningAnimation = (action, aim, time, liveAbilities, onContact) => {
  delayedContact = onContact;
  return true;
};
contactController._applyMineResult = () => {};
const downTarget = { tx: 10, ty: 11 };
contactController._tryMine(downTarget, 0, "DOWN", abilities, "mine");
body.y -= 94 * 2;
delayedContact();
assert.equal(delayedMineCalls, 1);
body.y += 94 * 2;
contactController._tryMine(downTarget, 0, "DOWN", abilities, "mine");
delayedContact();
assert.equal(delayedMineCalls, 2);

// Thunder: one quick charged contact plus nine exact-timing, free follow-ups.
runtime.updateThunderStrike(0, true);
assert.equal(abilities.chargeStart, 0);
assert.equal(abilities.executeCalls, 0);
assert.equal(controller.thunderApplyCalls, 0);
assert.equal(runtime.isUalActionLocked, true);
const openingChargeMs = THUNDER_STRIKE_CHAIN_CONFIG.initialImpact.chargeTimeMs;
runtime.updateThunderStrike(openingChargeMs - 1, false);
assert.equal(abilities.executeCalls, 0);
scene.time.now = openingChargeMs;
runtime.updateThunderStrike(openingChargeMs, false);
assert.equal(sprite.played.at(-1), profile.thunderStrikeStrikeAnim);
assert.equal(abilities.executeCalls, 0);

const strikeContact = resolveUalActionContact(profile, profile.thunderStrikeStrikeAnim, "thunderstrike");
sprite.emit(
  "animationupdate",
  animation(profile.thunderStrikeStrikeAnim),
  frame(strikeContact.textureFrame, strikeContact.sequenceIndex),
  sprite,
);
sprite.emit(
  "animationupdate",
  animation(profile.thunderStrikeStrikeAnim),
  frame(strikeContact.textureFrame, strikeContact.sequenceIndex),
  sprite,
);
assert.equal(abilities.executeCalls, 1);
assert.equal(controller.thunderApplyCalls, 1);
assert.equal(controller.lastStrike.time, openingChargeMs);
assert.equal(runtime.isUalActionLocked, true);
sprite.emit("animationcomplete", animation(profile.thunderStrikeStrikeAnim), frame(40, 33), sprite);
assert.equal(runtime.isUalActionLocked, true, "the chain remains locked for Slam II timing");

for (let stageIndex = 1; stageIndex < THUNDER_STRIKE_CHAIN_CONFIG.stages.length; stageIndex += 1) {
  const targetTime = runtime.thunderStrikeRuntime.state.challengeTargetMs;
  scene.time.now = targetTime;
  runtime.updateThunderStrike(targetTime, true);
  assert.equal(sprite.played.at(-1), profile.thunderStrikeStrikeAnim);
  sprite.emit(
    "animationupdate",
    animation(profile.thunderStrikeStrikeAnim),
    frame(strikeContact.textureFrame, strikeContact.sequenceIndex),
    sprite,
  );
  assert.equal(abilities.executeCalls, stageIndex + 1);
  assert.equal(controller.thunderApplyCalls, stageIndex + 1);
  sprite.emit("animationcomplete", animation(profile.thunderStrikeStrikeAnim), frame(40, 33), sprite);
  assert.equal(
    runtime.isUalActionLocked,
    stageIndex < THUNDER_STRIKE_CHAIN_CONFIG.stages.length - 1,
  );
}
assert.equal(runtime.isUalActionLocked, false);
assert.deepEqual(abilities.executeStages, Array.from({ length: 10 }, (_, index) => index));
assert.deepEqual(abilities.armedStages, Array.from({ length: 9 }, (_, index) => index + 1));

// Movement/Escape uses this same public cancellation path. Cancelling while
// the downward strike is committed but still pre-contact must restore control
// and remove the pending tile-damage callback.
const cancelStartedAt = scene.time.now + 1000;
runtime.updateThunderStrike(cancelStartedAt, true);
scene.time.now = cancelStartedAt + openingChargeMs;
runtime.updateThunderStrike(scene.time.now, false);
assert.equal(runtime.isUalActionLocked, true);
assert.equal(abilities.executeCalls, 10);
assert.equal(runtime.cancelThunderStrike(scene.time.now + 1), true);
assert.equal(runtime.isUalActionLocked, false);
assert.equal(controller._actionUntilMs, 0);
assert.equal(abilities.charging, false);
sprite.emit(
  "animationupdate",
  animation(profile.thunderStrikeStrikeAnim),
  frame(strikeContact.textureFrame, strikeContact.sequenceIndex),
  sprite,
);
assert.equal(abilities.executeCalls, 10, "a cancelled pre-contact slam must deal no damage");
assert.equal(runtime.cancelThunderStrike(scene.time.now + 2), false);

// Powered flight: authored enter -> Shield Dash travel -> Jump hover -> exit -> land.
assert.equal(profile.sourceClips.fly, "Shield_Dash");
assert.equal(profile.flySourceFrames.length, 14);
assert.equal(profile.rejectedSourceClips.fly, "Swim_Fwd_Loop");
assert.equal(profile.rejectedSourceClips.flyHover, "Swim_Idle_Loop");
abilities.flying = true;
grounded = false;
motionState = "airborne";
flightHorizontalSpeed = 252;
flightVerticalSpeed = 0;
runtime.updateLocomotionVisual(1100);
assert.equal(sprite.played.at(-1), profile.flightEnterAnim);
assert.equal(sprite.anims.timeScale, resolveUalFlightTimeScale(252, false));
runtime.updateLocomotionVisual(1110);
sprite.anims.isPlaying = false;
runtime.updateLocomotionVisual(1120);
assert.equal(sprite.played.at(-1), profile.flightTravelEnterAnim);
assert.equal(sprite.anims.timeScale, resolveUalFlightTimeScale(252, true));
runtime.updateLocomotionVisual(1130);
sprite.anims.isPlaying = false;
runtime.updateLocomotionVisual(1140);
assert.equal(sprite.played.at(-1), profile.flightTravelLoopAnim);

flightHorizontalSpeed = 50;
runtime.updateLocomotionVisual(1150);
assert.equal(sprite.played.at(-1), profile.flightTravelLoopAnim, "flight travel hysteresis dropped too early");

flightHorizontalSpeed = 30;
flightVerticalSpeed = 160;
runtime.updateLocomotionVisual(1200);
assert.equal(sprite.played.at(-1), profile.flightHoverAnim);
assert.equal(sprite.anims.timeScale, resolveUalFlightTimeScale(Math.hypot(30, 160), false));

abilities.flying = false;
motionState = "airborne";
flightHorizontalSpeed = 0;
flightVerticalSpeed = 400;
runtime.updateLocomotionVisual(1210);
assert.equal(sprite.played.at(-1), profile.flightExitAnim);
runtime.updateLocomotionVisual(1220);
sprite.anims.isPlaying = false;
runtime.updateLocomotionVisual(1230);
assert.equal(sprite.played.at(-1), profile.airborneFallAnim);

grounded = true;
motionState = "idle";
flightVerticalSpeed = 0;
runtime.updateLocomotionVisual(1240);
assert.equal(sprite.played.at(-1), profile.landingAnim);
assert.equal(sprite.anims.timeScale, 1.4);
runtime.updateLocomotionVisual(1250);
sprite.anims.isPlaying = false;
runtime.updateLocomotionVisual(1260);
assert.equal(sprite.played.at(-1), profile.idleAnim);

runtime.destroy();
assert.equal(sprite.listeners.get("animationupdate")?.size || 0, 0);
assert.equal(sprite.listeners.get("animationcomplete")?.size || 0, 0);

console.log("CAVE_UAL_ACTION_CONTRACT_OK");
