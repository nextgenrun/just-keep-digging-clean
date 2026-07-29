import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveMovingSideDigAnimation,
  resolveMovingSideDigAnimationKey,
} from "../player/UalMovingSideDigSelector.js";
import { PlayerRigContactSystem } from "../systems/visual/PlayerRigContactSystem.js";
import { MOVING_SIDE_DIG_ANIMATION } from "../values/movingSideDigAnimation.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from "../values/survivalUalPlayerAssetProfile.js";
import { UAL_NATIVE_ACTION_TUNING } from "../values/ualNativeActionTuning.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = resolve(root, "sprites/character/survival-ual-player-v1/runtime");
const runtimeManifest = JSON.parse(readFileSync(resolve(runtimeRoot, "manifest.json"), "utf8"));
const piskelManifest = JSON.parse(readFileSync(
  resolve(root, "sprites/character/piskel/character-animation-manifest.json"),
  "utf8",
));
const reviewConfig = JSON.parse(readFileSync(resolve(root, "values/movingSideDigReview.json"), "utf8"));
const reviewCandidate = reviewConfig.candidates.find(({ id }) => id === reviewConfig.defaultCandidateId);
const actions = Object.values(MOVING_SIDE_DIG_ANIMATION.actions);

assert.equal(MOVING_SIDE_DIG_ANIMATION.reviewCandidateId, "phase-locked-combo");
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactBackoffSourcePx, 8);
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactBackoffFalloffFrames, 4);
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactFaceClearanceSourcePx, 2);
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactEnvelopePolicy, "shared-visible-silhouette");
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactAlignmentMode, "immediate");
assert.equal(reviewCandidate.contactBackoffPx, MOVING_SIDE_DIG_ANIMATION.contactBackoffSourcePx);
assert.equal(
  reviewCandidate.contactFaceClearancePx,
  MOVING_SIDE_DIG_ANIMATION.contactFaceClearanceSourcePx,
);
assert.equal(MOVING_SIDE_DIG_ANIMATION.rollbackQuery, "movingSideDig");
assert.equal(UAL_NATIVE_ACTION_TUNING.cadence.normal.minDurationMs, 360);

for (const action of actions) {
  assert.equal(profile.movingSideDigAnimationMap[action.baseAnimationKey], action.animationKey);
  assert.ok(profile.requiredSheets.includes(action.sheetKey));
  assert.ok(profile.digAnims.includes(action.animationKey));
  assert.ok(profile.punchActionAnims.includes(action.animationKey));
  assert.equal(profile.displaySizePxByAnimation[action.animationKey], 123);
  assert.ok(profile.digAnimationVariants.some((variant) => (
    variant.key === action.animationKey
    && variant.sheet === action.sheetKey
    && variant.frames.length === 22
    && variant.frameRate === 30
  )));
  assert.deepEqual(profile.actionContactByAnimation[action.animationKey], {
    textureFrame: 6,
    sequenceIndex: 6,
    sourceAction: action.sourceAction,
    markerGroup: "hands",
    visualAlignmentMode: "immediate",
  });
  assert.ok(profile.sheetFiles.some(([profileKey, fileName]) => (
    profile[profileKey] === action.sheetKey && fileName === action.fileName
  )));

  const runtimePath = resolve(runtimeRoot, action.fileName);
  const bytes = readFileSync(runtimePath);
  assert.ok(statSync(runtimePath).size > 10_000, `${action.id} runtime sheet is unexpectedly small`);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");

  const piskelEntry = piskelManifest.animations.find(({ id }) => id === action.id);
  assert.ok(piskelEntry, `${action.id} Piskel manifest entry missing`);
  assert.equal(piskelEntry.frameCount, 22);
  assert.equal(piskelEntry.fps, 30);
  assert.equal(piskelEntry.contactFrame, 6);
  assert.equal(piskelEntry.centeringPolicy.maxAnchorDriftPx, 12);
  assert.equal(piskelEntry.centeringPolicy.enforceAnchor, true);
  assert.equal(piskelEntry.centeringPolicy.enforceBottom, true);
  const piskelPath = resolve(root, piskelEntry.sourcePiskel);
  assert.equal(existsSync(piskelPath), true);
  const piskel = JSON.parse(readFileSync(piskelPath, "utf8"));
  const layer = JSON.parse(piskel.piskel.layers[0]);
  assert.equal(piskel.piskel.width, 256);
  assert.equal(piskel.piskel.height, 256);
  assert.equal(piskel.piskel.fps, 30);
  assert.equal(layer.frameCount, 22);

  const metadata = runtimeManifest.actions[action.sourceAction];
  assert.equal(metadata.frame_count, 22);
  assert.equal(metadata.fps, 30);
  assert.equal(metadata.loop, false);
  assert.equal(metadata.composition.candidate, "phase-locked-combo");
  assert.equal(metadata.composition.contact_backoff_source_px, 8);
  assert.equal(metadata.composition.contact_face_clearance_source_px, 2);
  assert.equal(metadata.composition.contact_envelope_policy, "shared-visible-silhouette");
  assert.equal(metadata.composition.frames_per_action, 22);
  assert.equal(metadata.composition.run_phase_advance_frames, 14);
  assert.deepEqual(metadata.composition.entry_action_blend_weights, [0.12, 0.26, 0.4, 0.54, 0.68, 0.84, 1]);
  assert.deepEqual(metadata.composition.exit_action_blend_weights, [0.94, 0.8, 0.66, 0.52, 0.38, 0.24, 0.1]);
  assert.deepEqual(metadata.composition.action_blend_weights.slice(0, 7), [0.12, 0.26, 0.4, 0.54, 0.68, 0.84, 1]);
  assert.deepEqual(metadata.composition.action_blend_weights.slice(-7), [0.94, 0.8, 0.66, 0.52, 0.38, 0.24, 0.1]);
  assert.equal(metadata.composition.contact_envelope_right_source_px, 194);
  assert.equal(Object.keys(metadata.rig_markers.frames).length, 22);
  assert.equal(metadata.rig_markers.source, "derived-phase-locked-piskel-composite");
  const contactMarkers = metadata.rig_markers.frames[String(action.contactFrame)];
  const leadingHandX = Math.max(contactMarkers.hand_l[0], contactMarkers.hand_r[0]);
  assert.equal(leadingHandX, 196);
  const bottoms = metadata.alpha_bounds.map((bounds) => bounds[3] - 1);
  assert.ok(Math.max(...bottoms) - Math.min(...bottoms) <= 1);
  for (const bounds of metadata.alpha_bounds) {
    assert.ok(bounds[0] > 0 && bounds[1] > 0 && bounds[2] < 256 && bounds[3] < 256);
    assert.ok(bounds[2] - 1 <= metadata.composition.contact_envelope_right_source_px);
  }
}

const jabMetadata = runtimeManifest.actions["moving-side-dig-jab"];
const crossMetadata = runtimeManifest.actions["moving-side-dig-cross"];
assert.equal(jabMetadata.composition.run_frames.at(-1) + 1, crossMetadata.composition.run_frames[0]);
assert.deepEqual(crossMetadata.composition.run_frames.slice(-5), [6, 6, 7, 8, 8]);
assert.equal(jabMetadata.composition.run_frames[0], 9);
assert.deepEqual(
  jabMetadata.rig_markers.frames["6"].pelvis,
  runtimeManifest.actions.run.rig_markers.frames["13"].pelvis,
);
assert.deepEqual(
  crossMetadata.rig_markers.frames["6"].pelvis,
  runtimeManifest.actions.run.rig_markers.frames["27"].pelvis,
);
assert.equal(
  Math.max(...Object.values(jabMetadata.rig_markers.frames["6"]).filter(Array.isArray).map(([x]) => x)),
  Math.max(...Object.values(crossMetadata.rig_markers.frames["6"]).filter(Array.isArray).map(([x]) => x)),
);

const jab = MOVING_SIDE_DIG_ANIMATION.actions.jab;
const cross = MOVING_SIDE_DIG_ANIMATION.actions.cross;
const select = (overrides = {}) => resolveMovingSideDigAnimationKey({
  profile,
  animationKey: jab.baseAnimationKey,
  aim: "RIGHT",
  actionKind: "normal",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 0,
  search: "",
  ...overrides,
});
assert.equal(select(), jab.animationKey);
assert.equal(select({
  animationKey: cross.baseAnimationKey,
  aim: "LEFT",
  motionState: "walk-left",
}), cross.animationKey);
assert.equal(select({ motionState: "idle", horizontalVelocity: 9 }), jab.animationKey);
assert.equal(select({ motionState: "idle", horizontalVelocity: 0 }), jab.baseAnimationKey);
assert.equal(select({ grounded: false }), jab.baseAnimationKey);
assert.equal(select({ motionState: "walk-left" }), jab.baseAnimationKey);
assert.equal(select({ aim: "UP-RIGHT" }), jab.baseAnimationKey);
assert.equal(select({ actionKind: "quickslash" }), jab.baseAnimationKey);
assert.equal(select({ search: "?movingSideDig=0" }), jab.baseAnimationKey);
assert.equal(select({ animationKey: profile.digDownAnim }), profile.digDownAnim);
const phaseLocked = resolveMovingSideDigAnimation({
  profile,
  animationKey: jab.baseAnimationKey,
  aim: "RIGHT",
  actionKind: "normal",
  grounded: true,
  motionState: "walk-right",
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 23,
  search: "",
});
assert.equal(phaseLocked.phaseVariantId, "jab-phase-24");
assert.equal(phaseLocked.outgoingJogFrame, 23);
assert.equal(phaseLocked.resumeJogFrame, 10);

let visualOffset = null;
let syncCount = 0;
const contactPlayer = {
  x: 78,
  y: 0,
  scaleX: 123 / 256,
  scaleY: 123 / 256,
  originX: 0.5,
  originY: 247 / 256,
  flipX: false,
  getData: () => visualOffset,
  setData: (_key, value) => {
    visualOffset = value;
  },
};
const contactSystem = new PlayerRigContactSystem(
  { config: { tileSize: 94 } },
  contactPlayer,
  { _syncSpriteWithPhysics: () => { syncCount += 1; } },
  profile,
  runtimeManifest,
);
assert.equal(contactSystem.create(), true);
assert.equal(contactSystem.beginAction({
  animationKey: jab.animationKey,
  contactSpec: profile.actionContactByAnimation[jab.animationKey],
  targetTile: { tx: 1, ty: 0 },
  direction: { x: 1, y: 0 },
}), true);
assert.ok(visualOffset.x < -15, `moving-side-dig alignment was not immediate: ${visualOffset.x}`);
assert.equal(syncCount, 2);
contactSystem.destroy();

for (const relativePath of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/CaveActionAnimationRuntime.js",
]) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.match(source, /resolveMovingSideDigAnimation/);
  assert.match(source, /resumeJogFrame/);
}

console.log("MOVING_SIDE_DIG_PRODUCTION_CONTRACT_OK", {
  clips: actions.length,
  framesPerClip: 22,
  contactFrame: 6,
  contactBackoffSourcePx: MOVING_SIDE_DIG_ANIMATION.contactBackoffSourcePx,
  contactFaceClearanceSourcePx: MOVING_SIDE_DIG_ANIMATION.contactFaceClearanceSourcePx,
});
