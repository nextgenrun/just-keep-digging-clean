import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PlayerBodyLanguageSystem } from
  "../systems/visual/PlayerBodyLanguageSystem.js";
import {
  shouldUseLegacyPostActionRecovery,
} from "../systems/visual/UalActionRecoverySelector.js";
import { resolveUalCrouchTransitionAnimation } from
  "../systems/visual/ualCrouchTransitionSelection.js";
import { GAMEFEEL_CONFIG } from "../values/gamefeel.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from
  "../values/survivalUalPlayerAssetProfile.js";
import {
  SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1,
  resolveSurvivalPresentationContinuityEnabled,
} from "../values/survivalUnifiedAnimationRuntimeV1.js";

const profile = SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
assert.equal(resolveSurvivalPresentationContinuityEnabled(""), true);
assert.equal(resolveSurvivalPresentationContinuityEnabled("?presentationContinuity=0"), false);
assert.equal(resolveSurvivalPresentationContinuityEnabled("?presentationContinuity=off"), false);
assert.equal(
  SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1.presentationContinuity.rollbackQuery,
  "presentationContinuity",
);
assert.equal(profile.proceduralBodyLanguageScaleEnabled, false);
assert.equal(profile.preferAuthoredActionRecovery, true);

globalThis.Phaser = { Scenes: { Events: { POST_UPDATE: "postupdate" } } };
let unifiedPostUpdateRegistrations = 0;
const unifiedBodyLanguage = new PlayerBodyLanguageSystem({
  playerAssetProfile: profile,
  events: { on: () => { unifiedPostUpdateRegistrations += 1; } },
}, { active: true });
unifiedBodyLanguage.create();
assert.equal(unifiedBodyLanguage.enabled, false);
assert.equal(unifiedPostUpdateRegistrations, 0);

let postUpdate = null;
const scaleWrites = [];
const legacyPlayer = {
  active: true,
  scaleX: 0.5,
  scaleY: 0.5,
  width: 200,
  height: 200,
  frame: { realWidth: 200, realHeight: 200 },
  anims: { currentAnim: { key: "legacy-idle" } },
  setScale(x, y) {
    this.scaleX = x;
    this.scaleY = y;
    scaleWrites.push({ x, y });
  },
};
const legacyScene = {
  playerAssetProfile: {},
  config: { playerDisplaySizePx: 100 },
  playerController: {
    physicsBody: { vy: 0 },
    isGrounded: () => true,
  },
  events: {
    on: (_event, callback) => { postUpdate = callback; },
    off: () => {},
  },
  tweens: { add: () => ({ stop: () => {} }) },
};
const legacyBodyLanguage = new PlayerBodyLanguageSystem(
  legacyScene,
  legacyPlayer,
  GAMEFEEL_CONFIG.bodyLanguage,
);
legacyBodyLanguage.create();
legacyBodyLanguage._squash = { x: 1.1, y: 0.9 };
postUpdate();
assert.equal(scaleWrites.length, 1);
assert.notEqual(legacyPlayer.scaleX, 0.5);
legacyBodyLanguage._squash = { x: 1, y: 1 };
postUpdate();
assert.deepEqual(scaleWrites.at(-1), { x: 0.5, y: 0.5 });
assert.equal(legacyBodyLanguage._deformationApplied, false);
legacyBodyLanguage.destroy();

const crouchKeys = {
  crouchIdleAnimationKey: "crouch-idle",
  crouchEnterAnimationKey: "crouch-enter",
  crouchExitAnimationKey: "crouch-exit",
};
assert.equal(resolveUalCrouchTransitionAnimation({
  ...crouchKeys,
  wantsCrouch: true,
  currentAnimationKey: "idle",
}), "crouch-enter");
assert.equal(resolveUalCrouchTransitionAnimation({
  ...crouchKeys,
  wantsCrouch: true,
  currentAnimationKey: "crouch-enter",
  isPlaying: true,
}), "crouch-enter");
assert.equal(resolveUalCrouchTransitionAnimation({
  ...crouchKeys,
  wantsCrouch: true,
  currentAnimationKey: "crouch-enter",
  isPlaying: false,
}), "crouch-idle");
assert.equal(resolveUalCrouchTransitionAnimation({
  ...crouchKeys,
  currentAnimationKey: "crouch-idle",
}), "crouch-exit");
assert.equal(resolveUalCrouchTransitionAnimation({
  ...crouchKeys,
  currentAnimationKey: "crouch-exit",
  isPlaying: true,
}), "crouch-exit");
assert.equal(resolveUalCrouchTransitionAnimation({
  ...crouchKeys,
  currentAnimationKey: "crouch-exit",
  isPlaying: false,
}), null);

assert.equal(shouldUseLegacyPostActionRecovery(profile, true), false);
assert.equal(shouldUseLegacyPostActionRecovery(profile, false), true);
assert.equal(shouldUseLegacyPostActionRecovery({
  ...profile,
  preferAuthoredActionRecovery: false,
}, true), true);

const mainRuntime = readFileSync(
  new URL("../world/playScene/PlaySceneGameplay.js", import.meta.url),
  "utf8",
);
const caveRuntime = readFileSync(
  new URL("../world/playScene/CaveLocomotionAnimationRuntime.js", import.meta.url),
  "utf8",
);
const setupRuntime = readFileSync(
  new URL("../world/playScene/PlaySceneSetup.js", import.meta.url),
  "utf8",
);
for (const source of [mainRuntime, caveRuntime]) {
  assert.match(source, /resolveUalCrouchTransitionAnimation/);
  assert.match(source, /\.animationKey === (?:targetAnim|key)/);
}
assert.match(mainRuntime, /requestedTargetAnim/);
assert.match(mainRuntime, /startFrame = locomotionSelection\?\.animationKey === targetAnim/);
assert.match(caveRuntime, /selectionOwnsKey/);
assert.match(setupRuntime, /authoredRecoveryStarted/);
assert.match(setupRuntime, /shouldUseLegacyPostActionRecovery/);

console.log("PLAYER_ANIMATION_PRESENTATION_CONTINUITY_V4_CONTRACT_OK", {
  fixedDisplaySizePx: profile.displaySizePx,
  proceduralScaleDeformation: profile.proceduralBodyLanguageScaleEnabled,
  authoredRecoveryPreferred: profile.preferAuthoredActionRecovery,
  crouchTransitionsShared: true,
  rollback: "?presentationContinuity=0",
});
