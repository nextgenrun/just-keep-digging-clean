import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { UalGroundPhaseHandoffSelector } from
  "../systems/visual/UalGroundPhaseHandoffSelector.js";
import {
  SURVIVAL_MIXAMO_WALK_RUNTIME as walk,
  resolveSurvivalMixamoWalkEnabled,
} from "../values/survivalMixamoWalkRuntime.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from
  "../values/survivalUalPlayerAssetProfile.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = resolve(
  root,
  profile.basePath,
  `2026-08-25-${walk.sheet.key}.webp`,
);
const handoffRuntimePath = resolve(
  root,
  profile.basePath,
  walk.handoff.sheet.fileName,
);

assert.equal(profile.walkRunSheet, walk.sheet.key);
assert.equal(resolveSurvivalMixamoWalkEnabled(""), true);
assert.equal(resolveSurvivalMixamoWalkEnabled("?mixamoWalk=0"), false);
assert.deepEqual(profile.walkRunFrames, walk.sheet.frames);
assert.equal(profile.walkRunAnimationFps, walk.sheet.frameRate);
assert.equal(profile.displaySizePxByAnimation[profile.walkRunAnim], walk.sheet.displaySizePx);
assert.equal(
  profile.strideTilesPerCycleByAnimation[profile.walkRunAnim],
  walk.strideTilesPerCycle,
);
assert.deepEqual(
  profile.footstepFrameIndices[profile.walkRunAnim],
  walk.footstepFrameIndices,
);
assert.ok(existsSync(runtimePath), "promoted Mixamo walk runtime sheet is missing");
assert.ok(existsSync(handoffRuntimePath), "Blender walk handoff sheet is missing");
assert.equal(profile.walkStartSheet, walk.handoff.sheet.key);
assert.equal(profile.walkStopSheet, walk.handoff.sheet.key);
assert.equal(profile.frameSizePxBySheet[walk.handoff.sheet.key], 192);
const handoffSheetFile = profile.sheetFiles.find(
  ([profileKey]) => profileKey === "walkHandoffSheet",
);
assert.deepEqual(handoffSheetFile, [
  "walkHandoffSheet",
  walk.handoff.sheet.fileName,
  "walkHandoffFrames",
  profile.basePath,
]);
assert.ok(!profile.requiredSheets.includes("survival-mixamo-v1-walk-start-sheet"));
assert.ok(!profile.requiredSheets.includes("survival-mixamo-v1-walk-stop-sheet"));
const handoffDecodedMiB = walk.handoff.sheet.frames.length
  * walk.handoff.sheet.frameSizePx ** 2 * 4 / (1024 ** 2);
assert.ok(handoffDecodedMiB < 10, `handoff decoded budget is ${handoffDecodedMiB} MiB`);

const handoff = profile.animationPolishConfig.groundHandoff;
assert.equal(handoff.runFrameCount, walk.sheet.frames.length);
assert.equal(handoff.start.key, profile.walkStartAnim);
assert.equal(handoff.stopVariants[0].key, profile.walkStopAnim);
assert.equal(handoff.resumeJogFrame, walk.handoff.resumeWalkFrame);
assert.equal(handoff.resumeJogFrame, 7);
assert.equal(handoff.stopVariants.length, walk.handoff.stopPhases.length);
assert.equal(handoff.stopAnimationKeyByOutgoingJogFrame.length, walk.sheet.frames.length);
assert.deepEqual(
  handoff.stopVariants.map((variant) => variant.runFrame),
  walk.handoff.stopPhases,
);
const registeredKeys = new Set(
  profile.animationPolishAnimations.map((animation) => animation.key),
);
handoff.stopVariants.forEach((variant) => {
  assert.ok(registeredKeys.has(variant.key), `unregistered stop variant ${variant.key}`);
  assert.equal(variant.frames.length, walk.handoff.stopFrameCount);
  if (profile.heldTorchRuntime?.enabled) {
    const torchKey = profile.heldTorchAnimationByBaseAnimation[variant.key];
    assert.ok(torchKey, `held-torch mapping missing for ${variant.key}`);
    assert.ok(
      profile.heldTorchAnimations.some((animation) => animation.key === torchKey),
      `held-torch stop animation missing for ${variant.key}`,
    );
  }
});

const startSelector = new UalGroundPhaseHandoffSelector(profile);
assert.equal(startSelector.locomotionFrameCount, walk.sheet.frames.length);
const started = startSelector.resolve({
  moving: true,
  currentAnimationKey: profile.idleAnim,
  currentTextureFrame: 0,
  isPlaying: true,
  previousFacingFlipX: false,
  nextFacingFlipX: false,
});
assert.equal(started.animationKey, profile.walkStartAnim);
startSelector.resolve({
  moving: true,
  currentAnimationKey: profile.walkStartAnim,
  currentTextureFrame: 4,
  isPlaying: true,
});
const startResume = startSelector.resolve({
  moving: true,
  currentAnimationKey: profile.walkStartAnim,
  currentTextureFrame: 6,
  isPlaying: false,
});
assert.equal(startResume.startFrame, 7, "walk-start did not join the next Standard Walk pose");

const stopSelector = new UalGroundPhaseHandoffSelector(profile);
const stopped = stopSelector.resolve({
  moving: false,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 3,
  isPlaying: true,
  previousFacingFlipX: false,
  nextFacingFlipX: false,
});
const phaseFourStop = handoff.stopVariants.find((variant) => variant.runFrame === 4);
assert.equal(stopped.animationKey, phaseFourStop.key);
assert.equal(stopped.startFrame, null, "phase-authored stop must begin at its first frame");
const continuingStop = stopSelector.resolve({
  moving: false,
  currentAnimationKey: phaseFourStop.key,
  currentTextureFrame: phaseFourStop.frames[1],
  isPlaying: true,
});
assert.equal(continuingStop.restart, false);
assert.equal(continuingStop.startFrame, null);

handoff.stopAnimationKeyByOutgoingJogFrame.forEach((expected, outgoing) => {
  [false, true].forEach((facingFlipX) => {
    const phaseSelector = new UalGroundPhaseHandoffSelector(profile);
    const selection = phaseSelector.resolve({
      moving: false,
      currentAnimationKey: profile.walkRunAnim,
      currentTextureFrame: outgoing,
      isPlaying: true,
      previousFacingFlipX: facingFlipX,
      nextFacingFlipX: facingFlipX,
    });
    assert.equal(selection.animationKey, expected, `wrong stop variant for walk frame ${outgoing}`);
    assert.equal(selection.startFrame, null);
  });
});

const selector = new UalGroundPhaseHandoffSelector(profile);
assert.equal(selector.requestRunResume(27), true);
const phaseResume = selector.resolve({
  moving: true,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 2,
  isPlaying: true,
  previousFacingFlipX: false,
  nextFacingFlipX: false,
});
assert.equal(phaseResume.startFrame, 3, "28-frame action resume did not wrap to 24-frame walk");

console.log("MIXAMO_WALK_SIZE_SKATING_CONTRACT_OK", {
  frames: walk.sheet.frames.length,
  fps: walk.sheet.frameRate,
  strideTilesPerCycle: walk.strideTilesPerCycle,
  displaySizePx: profile.displaySizePxByAnimation[profile.walkRunAnim],
  stopVariants: handoff.stopVariants.length,
  handoffDecodedMiB: Number(handoffDecodedMiB.toFixed(2)),
  rollback: `?${walk.rollbackQuery}=0`,
});
