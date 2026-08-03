import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveMovingSideDigAnimation } from "../player/UalMovingSideDigSelector.js";
import { UalGroundPhaseHandoffSelector } from "../systems/visual/UalGroundPhaseHandoffSelector.js";
import { UalNativeLocomotionTransitionSelector } from "../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { MOVING_SIDE_DIG_ANIMATION as config } from "../values/movingSideDigAnimation.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from "../values/survivalUalPlayerAssetProfile.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = resolve(root, "sprites/character/survival-ual-player-v1/runtime");
const runtimeManifest = JSON.parse(readFileSync(resolve(runtimeRoot, "manifest.json"), "utf8"));
const sourceConfig = JSON.parse(readFileSync(
  resolve(root, "values/movingSideDigProduction.json"),
  "utf8",
));
const handoff = config.phaseHandoff;
const variants = handoff.variants;
const atlasVariants = variants.filter(({ base }) => base !== true);
const atlasPath = resolve(runtimeRoot, handoff.atlas.fileName);
const piskelPath = resolve(root, handoff.atlas.sourcePiskel);
const driftPath = resolve(
  root,
  "sprites/character/piskel/runtime-active/contact-sheets/"
    + "moving-side-dig-phase-handoff-drift-report.json",
);

assert.equal(config.version, sourceConfig.version);
assert.equal(handoff.version, sourceConfig.phaseHandoff.version);
assert.deepEqual(handoff.actionBlendWeights, [0.12, 0.26, 0.4, 0.54, 0.68, 0.84, 1]);
assert.deepEqual(handoff.exitActionBlendWeights, [0.94, 0.8, 0.66, 0.52, 0.38, 0.24, 0.1]);
assert.equal(handoff.runFrameCount, 28);
assert.equal(handoff.actionFrameCount, 22);
assert.equal(handoff.runPhaseAdvanceFrames, 14);
assert.equal(handoff.runFrameOffsets.length, 22);
assert.equal(handoff.entryVariantIdByOutgoingJogFrame.length, 28);
assert.equal(variants.length, 8);
assert.equal(atlasVariants.length, 6);
assert.equal(handoff.atlas.frameCount, 132);
assert.equal(handoff.atlas.frames.length, 132);
assert.equal(new Set(variants.map(({ id }) => id)).size, variants.length);

for (const variant of variants) {
  assert.equal(variant.frames.length, 22);
  assert.equal(variant.runFrames.length, 22);
  assert.equal(new Set(variant.runFrames).size, 14);
  assert.equal(variant.resumeJogFrame, (variant.runStartFrame + 14) % 28);
  assert.ok(profile.digAnims.includes(variant.animationKey));
  assert.ok(profile.punchActionAnims.includes(variant.animationKey));
  assert.ok(profile.requiredSheets.includes(variant.sheetKey));
  assert.equal(profile.displaySizePxByAnimation[variant.animationKey], config.displaySizePx);
  assert.deepEqual(profile.actionContactByAnimation[variant.animationKey], {
    textureFrame: 6,
    sequenceIndex: 6,
    sourceAction: variant.manifestAction,
    markerGroup: "hands",
    visualAlignmentEnabled: false,
  });
  const metadata = runtimeManifest.actions[variant.manifestAction];
  assert.equal(metadata.frame_count, 22);
  assert.equal(metadata.fps, 30);
  assert.equal(metadata.loop, false);
  assert.equal(metadata.composition.run_frame_start, variant.runStartFrame);
  assert.equal(Object.keys(metadata.rig_markers.frames).length, 22);
}

for (let outgoing = 0; outgoing < handoff.runFrameCount; outgoing += 1) {
  const ideal = (outgoing + handoff.entryPhaseOffset) % handoff.runFrameCount;
  const variant = variants.find(({ id }) => (
    id === handoff.entryVariantIdByOutgoingJogFrame[outgoing]
  ));
  const rawDistance = Math.abs(ideal - variant.runStartFrame);
  const error = Math.min(rawDistance, handoff.runFrameCount - rawDistance);
  assert.ok(error <= handoff.maxEntryPhaseError);
}

assert.equal(existsSync(atlasPath), true);
assert.ok(statSync(atlasPath).size > 100_000);
const atlasBytes = readFileSync(atlasPath);
assert.equal(atlasBytes.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(atlasBytes.subarray(8, 12).toString("ascii"), "WEBP");
const piskel = JSON.parse(readFileSync(piskelPath, "utf8"));
const piskelLayer = JSON.parse(piskel.piskel.layers[0]);
assert.equal(piskel.piskel.width, 256);
assert.equal(piskel.piskel.height, 256);
assert.equal(piskel.piskel.fps, 30);
assert.equal(piskelLayer.frameCount, 132);
const drift = JSON.parse(readFileSync(driftPath, "utf8"));
assert.equal(drift.frameCount, 132);
assert.ok(drift.drift.maxRootAnchorDriftPx <= drift.centeringPolicy.maxAnchorDriftPx);
assert.ok(drift.drift.maxBottomDriftPx <= drift.centeringPolicy.bottomTolerancePx);
assert.equal(drift.frames.some(({ clipped }) => clipped), false);

const phaseEntry = resolveMovingSideDigAnimation({
  profile,
  animationKey: config.actions.jab.baseAnimationKey,
  aim: "RIGHT",
  actionKind: "normal",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 200,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 23,
  search: "",
});
assert.equal(phaseEntry.phaseVariantId, "jab-phase-24");
assert.equal(phaseEntry.animationKey, variants.find(({ id }) => id === "jab-phase-24").animationKey);
assert.equal(phaseEntry.resumeJogFrame, 10);
const repeatedLowerPhase = resolveMovingSideDigAnimation({
  profile,
  animationKey: config.actions.cross.baseAnimationKey,
  aim: "RIGHT",
  actionKind: "normal",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 200,
  currentAnimationKey: phaseEntry.animationKey,
  currentFrameIndex: 3,
  search: "",
});
assert.equal(
  repeatedLowerPhase.outgoingJogFrame,
  variants.find(({ id }) => id === "jab-phase-24").runFrames[2],
);
assert.equal(resolveMovingSideDigAnimation({
  profile,
  animationKey: config.actions.jab.baseAnimationKey,
  aim: "RIGHT",
  actionKind: "normal",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 200,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 23,
  search: "?phaseHandoff=0",
}).animationKey, config.actions.jab.animationKey);

const locomotion = new UalNativeLocomotionTransitionSelector(profile);
const moving = {
  grounded: true,
  flying: false,
  horizontalVelocity: 80,
  verticalVelocity: 0,
  currentAnimationKey: profile.walkRunAnim,
  isPlaying: true,
  currentFrameIndex: 13,
  currentTextureFrame: 13,
  groundMovementActive: true,
};
locomotion.resolve({ ...moving, facingFlipX: false });
const pivot = locomotion.resolve({ ...moving, facingFlipX: true });
assert.equal(pivot.animationKey, profile.walkRunAnim);
assert.equal(pivot.facingFlipX, true);
assert.equal(pivot.phase, "pivot-stop");
assert.equal(pivot.restart, true);
assert.equal(pivot.startFrame, 21);
assert.equal(locomotion.resolve({
  ...moving,
  facingFlipX: true,
  currentFrameIndex: 21,
  currentTextureFrame: 21,
}).phase, "pivot-stop");
assert.equal(locomotion.resolve({
  ...moving,
  facingFlipX: true,
  currentFrameIndex: 22,
  currentTextureFrame: 22,
}).phase, "pivot-start");
assert.equal(locomotion.resolve({
  ...moving,
  facingFlipX: true,
  currentFrameIndex: 23,
  currentTextureFrame: 23,
}).phase, "run");

assert.equal(locomotion.requestRunResume(10), true);
const resumed = locomotion.resolve({
  ...moving,
  currentAnimationKey: phaseEntry.animationKey,
  currentTextureFrame: 131,
  facingFlipX: true,
});
assert.equal(resumed.animationKey, profile.walkRunAnim);
assert.equal(resumed.phase, "run");
assert.equal(resumed.restart, true);
assert.equal(resumed.startFrame, 10);
const disabled = new UalGroundPhaseHandoffSelector(
  profile,
  config.phaseHandoff,
  "?phaseHandoff=0",
);
assert.equal(disabled.requestRunResume(10), false);
assert.equal(disabled.resolve({
  moving: true,
  horizontalSpeed: 80,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 13,
  previousFacingFlipX: false,
  nextFacingFlipX: true,
}), null);

for (const relativePath of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/PlaySceneSetup.js",
  "world/playScene/CaveActionAnimationRuntime.js",
  "world/playScene/CaveLocomotionAnimationRuntime.js",
]) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.match(source, /resumeJogFrame|requestRunResume|startFrame/);
}

console.log("PHASE_HANDOFF_PRODUCTION_CONTRACT_OK", {
  variants: variants.length,
  atlasFrames: handoff.atlas.frameCount,
  maxEntryPhaseError: handoff.maxEntryPhaseError,
  rootAnchorDriftPx: drift.drift.maxRootAnchorDriftPx,
  bottomDriftPx: drift.drift.maxBottomDriftPx,
  approvedEntry: `${phaseEntry.outgoingJogFrame}->${phaseEntry.phaseVariantId}->${phaseEntry.resumeJogFrame}`,
  approvedPivot: "13->21,22",
});
