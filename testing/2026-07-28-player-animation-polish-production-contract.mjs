import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveMovingDiagonalDigAnimation } from "../player/UalMovingDiagonalDigSelector.js";
import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { UalActionRecoverySelector } from "../systems/visual/UalActionRecoverySelector.js";
import { UalGroundPhaseHandoffSelector } from "../systems/visual/UalGroundPhaseHandoffSelector.js";
import { UalNativeLocomotionTransitionSelector } from "../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { UalWallBraceSelector } from "../systems/visual/UalWallBraceSelector.js";
import { PLAYER_ANIMATION_POLISH as polish } from "../values/playerAnimationPolish.js";
import { PLAYER_MOTION_POLISH_CONFIG } from "../values/playerMotionPolish.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from "../values/survivalUalPlayerAssetProfile.js";
import {
  resolveUalActionContact,
  UAL_NATIVE_ACTION_TUNING,
} from "../values/ualNativeActionTuning.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = resolve(root, "sprites/character/survival-ual-player-v1/runtime");
const runtimeManifest = JSON.parse(readFileSync(resolve(runtimeRoot, "manifest.json"), "utf8"));
const sourceConfig = JSON.parse(readFileSync(
  resolve(root, "values/playerAnimationPolishProduction.json"),
  "utf8",
));
const piskelManifest = JSON.parse(readFileSync(
  resolve(root, "sprites/character/piskel/character-animation-manifest.json"),
  "utf8",
));

assert.equal(polish.version, sourceConfig.version);
assert.equal(polish.enabledByDefault, true);
assert.equal(polish.rollbackQuery, "animationPolish");
assert.equal(polish.sheets.transitions.frameCount, 133);
assert.equal(polish.sheets.diagonalDig.frameCount, 120);
assert.equal(polish.transitionAnimations.length, 29);
assert.equal(polish.diagonalMining.variants.length, 8);
assert.equal(profile.animationPolishAnimations.length, 37);
assert.equal(profile.landingCompressionOwner, "authored-animation");
assert.equal(profile.walkStartAnim, polish.groundHandoff.start.key);
assert.equal(profile.walkStopAnim, polish.groundHandoff.stopVariants[0].key);
assert.equal(profile.landingAnim, polish.landing.hard.key);
assert.equal(profile.softLandingAnim, polish.landing.soft.key);
assert.equal(profile.wallBraceEnterAnim, polish.wallBrace.entry.key);
assert.equal(profile.wallBraceExitAnim, polish.wallBrace.exit.key);
assert.equal(profile.wallPushAnim, polish.wallBrace.loop.key);
assert.equal(polish.wallBrace.loop.frames.length, 16);
assert.equal(polish.wallBrace.loop.repeat, -1);
for (const sourceId of ["groundStrike", "punchJab", "punchCross", "landing", "wallPush"]) {
  assert.equal(sourceConfig.sources[sourceId].displaySizePx, 109);
}

const upVertical = polish.verticalMining.up;
assert.equal(upVertical.animations.length, upVertical.animationKeys.length);
assert.equal(upVertical.animations.every(({ frames }) => (
  frames.length === upVertical.sourceFrames.length
)), true);
for (const animation of upVertical.animations) {
  assert.equal(profile.animationPolishAnimations.some(({ key }) => key === animation.key), true);
  assert.deepEqual(profile.actionContactByAnimation[animation.key], {
    textureFrame: upVertical.sourceContactFrame,
    sequenceIndex: upVertical.contactSequenceIndex,
    sourceAction: upVertical.sourceAction,
    markerGroup: upVertical.markerGroup,
    visualAlignmentEnabled: false,
  });
}

const downVertical = polish.verticalMining.down;
assert.equal(downVertical.animations.length, downVertical.animationKeys.length);
assert.deepEqual(profile.animationPolishRetainedLegacyAnimationKeys, [profile.digDownAnim]);
for (const animation of downVertical.animations) {
  assert.equal(profile.animationPolishAnimations.some(({ key }) => key === animation.key), false);
  assert.equal(profile.actionContactByAnimation[animation.key], undefined);
}
assert.equal(profile.digDownSheet, profile.groundStrikeSheet);
assert.deepEqual(profile.digDownFrames, Array.from({ length: 37 }, (_, index) => index + 4));
assert.deepEqual(
  resolveUalActionContact(profile, profile.digDownAnim),
  UAL_NATIVE_ACTION_TUNING.contact.digDown,
);
const registeredAnimations = new Map();
createUalNativePlayerAnimations({
  anims: {
    exists: (key) => registeredAnimations.has(key),
    create: (config) => registeredAnimations.set(config.key, config),
  },
  textures: { exists: () => false },
}, profile);
const registeredDigDown = registeredAnimations.get(profile.digDownAnim);
assert.deepEqual(
  registeredDigDown.frames.map(({ key, frame }) => [key, frame]),
  profile.digDownFrames.map((frame) => [profile.digDownSheet, frame]),
);
for (const animationKey of upVertical.animationKeys) {
  const registeredUp = registeredAnimations.get(animationKey);
  assert.equal(registeredUp.frames.length, upVertical.sourceFrames.length);
  assert.equal(registeredUp.frames.every(({ key }) => (
    key === polish.sheets.transitions.sheetKey
  )), true);
}
for (const spec of polish.stationaryContactPolish.side) {
  assert.equal(profile.actionContactByAnimation[spec.animationKey].visualAlignmentEnabled, false);
}
for (const spec of polish.stationaryContactPolish.quickslash) {
  assert.equal(profile.quickslashActionContactByAnimation[spec.animationKey].visualAlignmentEnabled, false);
}

for (const sheet of Object.values(polish.sheets)) {
  assert.equal(profile.requiredSheets.includes(sheet.sheetKey), true);
  assert.ok(profile.sheetFiles.some(([property, fileName]) => (
    profile[property] === sheet.sheetKey && fileName === sheet.fileName
  )));
  const runtimePath = resolve(runtimeRoot, sheet.fileName);
  assert.equal(existsSync(runtimePath), true);
  assert.ok(statSync(runtimePath).size > 100_000);
  const bytes = readFileSync(runtimePath);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  const entry = piskelManifest.animations.find(({ id }) => id === sheet.id);
  assert.ok(entry);
  assert.equal(entry.frameCount, sheet.frameCount);
  assert.equal(entry.frameSize[0], 256);
  assert.equal(entry.centeringPolicy.enforceAnchor, true);
  assert.equal(entry.centeringPolicy.enforceBottom, true);
  const piskel = JSON.parse(readFileSync(resolve(root, sheet.sourcePiskel), "utf8"));
  const layer = JSON.parse(piskel.piskel.layers[0]);
  assert.equal(layer.frameCount, sheet.frameCount);
}

for (const id of [
  "player-animation-polish-transitions",
  "player-animation-polish-diagonal-dig",
]) {
  const drift = JSON.parse(readFileSync(resolve(
    root,
    `sprites/character/piskel/runtime-active/contact-sheets/${id}-drift-report.json`,
  ), "utf8"));
  assert.equal(drift.frames.some(({ clipped }) => clipped), false);
  assert.ok(drift.drift.maxRootAnchorDriftPx <= drift.centeringPolicy.maxAnchorDriftPx);
  assert.ok(drift.drift.maxBottomDriftPx <= drift.centeringPolicy.bottomTolerancePx);
}

for (const family of ["up", "down"]) {
  const familyConfig = polish.diagonalMining[family];
  assert.equal(familyConfig.entryVariantIdByOutgoingJogFrame.length, 28);
  for (let outgoing = 0; outgoing < 28; outgoing += 1) {
    const ideal = (outgoing + polish.diagonalMining.entryPhaseOffset) % 28;
    const id = familyConfig.entryVariantIdByOutgoingJogFrame[outgoing];
    const variant = polish.diagonalMining.variants.find((entry) => entry.id === id);
    const rawDistance = Math.abs(ideal - variant.runStartFrame);
    assert.ok(Math.min(rawDistance, 28 - rawDistance) <= 4);
  }
}

for (const variant of polish.diagonalMining.variants) {
  assert.equal(variant.frames.length, 15);
  assert.equal(variant.resumeJogFrame, (variant.runStartFrame + 15) % 28);
  assert.equal(profile.digAnims.includes(variant.animationKey), true);
  assert.equal(profile.punchActionAnims.includes(variant.animationKey), true);
  assert.equal(profile.displaySizePxByAnimation[variant.animationKey], 123);
  assert.deepEqual(profile.actionContactByAnimation[variant.animationKey], {
    textureFrame: variant.contactFrame,
    sequenceIndex: variant.contactSequenceIndex,
    sourceAction: variant.sourceAction,
    markerGroup: "hands",
    visualAlignmentEnabled: false,
  });
  const metadata = runtimeManifest.actions[variant.sourceAction];
  assert.equal(metadata.frame_count, 15);
  assert.equal(Object.keys(metadata.rig_markers.frames).length, 15);
  assert.equal(metadata.composition.run_frame_start, variant.runStartFrame);
  const contact = metadata.rig_markers.frames[String(variant.contactSequenceIndex)].contact;
  if (variant.family === "up") {
    assert.ok(contact[0] > 175 && contact[1] < 115);
  } else {
    assert.deepEqual(metadata.source_clips, ["Jog_Fwd_Loop", "Blender MINER_dig_down"]);
    assert.equal(contact.every(Number.isFinite), true);
    assert.ok(contact[0] >= 0 && contact[0] <= 256);
    assert.ok(contact[1] >= 0 && contact[1] <= 256);
  }
  for (let index = 0; index < 15; index += 1) {
    const runFrame = (variant.runStartFrame + index) % 28;
    const markers = metadata.rig_markers.frames[String(index)];
    const runMarkers = runtimeManifest.actions.run.rig_markers.frames[String(runFrame)];
    assert.deepEqual(markers.foot_l, runMarkers.foot_l);
    assert.deepEqual(markers.foot_r, runMarkers.foot_r);
    assert.deepEqual(markers.pelvis, runMarkers.pelvis);
  }
}

const upBase = profile.digUpSidewaysHitAnims[0];
const downBase = profile.digDownSidewaysHitAnims[0];
const selectDiagonal = (animationKey, aim, overrides = {}) => (
  resolveMovingDiagonalDigAnimation({
    profile,
    animationKey,
    aim,
    actionKind: "normal",
    grounded: true,
    motionState: aim.includes("LEFT") ? "walk-left" : "walk-right",
    horizontalVelocity: 90,
    currentAnimationKey: profile.walkRunAnim,
    currentTextureFrame: 7,
    search: "",
    ...overrides,
  })
);
const upSelection = selectDiagonal(upBase, "UP-RIGHT");
const downSelection = selectDiagonal(downBase, "DOWN-RIGHT");
assert.equal(upSelection.phaseVariantId, "up-phase-08");
assert.equal(downSelection.phaseVariantId, "down-phase-08");
assert.equal(upSelection.resumeJogFrame, 23);
assert.equal(downSelection.resumeJogFrame, 23);
assert.equal(selectDiagonal(upBase, "UP-RIGHT", { motionState: "idle", horizontalVelocity: 0 }).animationKey, upBase);
assert.equal(selectDiagonal(upBase, "UP-RIGHT", { motionState: "walk-left" }).animationKey, upBase);
assert.equal(selectDiagonal(upBase, "UP-RIGHT", { search: "?movingDiagonalDig=0" }).animationKey, upBase);
assert.equal(selectDiagonal(upBase, "UP-RIGHT", { search: "?animationPolish=0" }).animationKey, upBase);

const upContactMs = upSelection
  ? polish.diagonalMining.up.contactSequenceIndex / (30 * (0.5 / 0.75))
  : 0;
const downContactMs = polish.diagonalMining.down.contactSequenceIndex / (30 * (0.5 / 0.75));
assert.ok(Math.abs(upContactMs * 1000 - 350) < 1);
assert.ok(Math.abs(downContactMs * 1000 - 300) < 1);

const locomotion = new UalNativeLocomotionTransitionSelector(profile);
locomotion.reset({ grounded: true, facingFlipX: false });
const idleState = {
  grounded: true,
  flying: false,
  verticalVelocity: 0,
  facingFlipX: false,
};
locomotion.resolve({
  ...idleState,
  horizontalVelocity: 0,
  groundMovementActive: false,
  currentAnimationKey: profile.idleAnim,
  isPlaying: true,
});
const start = locomotion.resolve({
  ...idleState,
  horizontalVelocity: 90,
  groundMovementActive: true,
  currentAnimationKey: profile.idleAnim,
  isPlaying: true,
});
assert.equal(start.animationKey, polish.groundHandoff.start.key);
assert.equal(start.phase, "walk-start");
assert.equal(start.restart, true);
locomotion.resolve({
  ...idleState,
  horizontalVelocity: 90,
  groundMovementActive: true,
  currentAnimationKey: start.animationKey,
  isPlaying: true,
});
const started = locomotion.resolve({
  ...idleState,
  horizontalVelocity: 90,
  groundMovementActive: true,
  currentAnimationKey: start.animationKey,
  isPlaying: false,
});
assert.equal(started.animationKey, profile.walkRunAnim);
assert.equal(started.startFrame, 1);
const stop = locomotion.resolve({
  ...idleState,
  horizontalVelocity: 0,
  groundMovementActive: false,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 5,
  isPlaying: true,
});
assert.equal(stop.animationKey, polish.groundHandoff.stopAnimationKeyByOutgoingJogFrame[5]);
assert.equal(stop.phase, "walk-stop");

const recovery = new UalActionRecoverySelector(profile);
const completedAction = profile.digUpSidewaysHitAnims[0];
assert.equal(recovery.begin(completedAction, true), true);
const settle = recovery.resolve({
  moving: false,
  currentAnimationKey: completedAction,
  isPlaying: false,
});
assert.equal(settle.animationKey, polish.actionRecovery.families.up.key);
assert.equal(settle.flipX, true);
assert.equal(recovery.resolve({ moving: true }), null);
assert.equal(new UalActionRecoverySelector(
  profile,
  "?actionSettle=0",
).begin(completedAction), false);

const wall = new UalWallBraceSelector(profile, PLAYER_MOTION_POLISH_CONFIG);
assert.equal(wall.resolve({ now: 0, blocked: true }), null);
const wallEnter = wall.resolve({ now: 150, blocked: true });
assert.equal(wallEnter.animationKey, profile.wallBraceEnterAnim);
wall.resolve({
  now: 160,
  blocked: true,
  currentAnimationKey: wallEnter.animationKey,
  isPlaying: true,
});
const wallLoop = wall.resolve({
  now: 200,
  blocked: true,
  currentAnimationKey: wallEnter.animationKey,
  isPlaying: false,
});
assert.equal(wallLoop.animationKey, profile.wallPushAnim);
assert.equal(wall.resolve({
  now: 300,
  blocked: false,
  movingAway: true,
}), null);
assert.equal(wall.consumeRunResumeFrame(), 13);

const softLanding = new UalNativeLocomotionTransitionSelector(profile);
softLanding.reset({ grounded: true });
softLanding.resolve({ grounded: false, verticalVelocity: 180 });
const soft = softLanding.resolve({
  grounded: true,
  verticalVelocity: 0,
  horizontalVelocity: 0,
  groundMovementActive: false,
});
assert.equal(soft.animationKey, profile.softLandingAnim);
const hardLanding = new UalNativeLocomotionTransitionSelector(profile);
hardLanding.reset({ grounded: true });
hardLanding.resolve({ grounded: false, verticalVelocity: 650 });
const hard = hardLanding.resolve({
  grounded: true,
  verticalVelocity: 0,
  horizontalVelocity: 0,
  groundMovementActive: false,
});
assert.equal(hard.animationKey, profile.landingAnim);
assert.equal(hard.timeScale, 1);

for (const relativePath of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/PlaySceneSetup.js",
  "world/playScene/CaveActionAnimationRuntime.js",
  "world/playScene/CaveLocomotionAnimationRuntime.js",
]) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.match(source, /movingDiagonalDig|actionRecovery|wallBrace|RunResume|runResume/i);
}
const bodyLanguage = readFileSync(
  resolve(root, "systems/visual/PlayerBodyLanguageSystem.js"),
  "utf8",
);
assert.match(bodyLanguage, /authoredLandingCompression/);
assert.match(bodyLanguage, /isPlayerAnimationFeatureEnabled/);

console.log("PLAYER_ANIMATION_POLISH_PRODUCTION_CONTRACT_OK", {
  transitionFrames: polish.sheets.transitions.frameCount,
  diagonalFrames: polish.sheets.diagonalDig.frameCount,
  diagonalVariants: polish.diagonalMining.variants.length,
  actionSettles: Object.keys(polish.actionRecovery.families).length,
  landingOwner: profile.landingCompressionOwner,
});
