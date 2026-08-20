import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveMovingSideDigAnimation,
  resolveMovingSideDigAnimationKey,
} from "../player/UalMovingSideDigSelector.js";
import { MovingSideDigStandOffController } from "../player/MovingSideDigStandOffController.js";
import { resolvePlayerTargetDirection } from "../player/playerDirectionalTargets.js";
import { PlayerRigContactSystem } from "../systems/visual/PlayerRigContactSystem.js";
import { MOVING_SIDE_DIG_ANIMATION } from "../values/movingSideDigAnimation.js";
import { resolvePlayerDisplaySizePx } from "../values/playerAssetProfiles.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from "../values/survivalUalPlayerAssetProfile.js";
import {
  resolveUalActionContact,
  UAL_NATIVE_ACTION_TUNING,
} from "../values/ualNativeActionTuning.js";

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
const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const alphaHeight = (bounds) => bounds[3] - bounds[1];

assert.equal(MOVING_SIDE_DIG_ANIMATION.reviewCandidateId, "phase-locked-combo");
assert.equal("actionDisplaySizePx" in MOVING_SIDE_DIG_ANIMATION, false);
assert.equal("actionScale" in MOVING_SIDE_DIG_ANIMATION, false);
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactBackoffSourcePx, 8);
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactBackoffFalloffFrames, 4);
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactFaceClearanceSourcePx, 2);
assert.equal(MOVING_SIDE_DIG_ANIMATION.runSource.manifestAction, profile.footstepRigAction);
assert.equal(
  MOVING_SIDE_DIG_ANIMATION.runSource.file.endsWith(
    "survival-ual-player-v1-animation-polish-run-sheet.webp",
  ),
  true,
);
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactEnvelopePolicy, "shared-visible-silhouette");
assert.equal(MOVING_SIDE_DIG_ANIMATION.contactVisualAlignmentEnabled, false);
const standOffConfig = MOVING_SIDE_DIG_ANIMATION.movement.tileFaceStandOff;
assert.equal(standOffConfig.enabled, true);
assert.equal(standOffConfig.mode, "authoritative-body-gap");
assert.equal(standOffConfig.distancePx, 21);
assert.equal(standOffConfig.releaseWhenTargetNotSolid, true);
assert.equal(standOffConfig.stopTowardVelocity, true);
assert.deepEqual(runtimeManifest.moving_side_dig_pipeline.tile_face_stand_off, standOffConfig);
assert.equal(MOVING_SIDE_DIG_ANIMATION.quickslash.contactSequenceIndex, 4);
assert.equal(MOVING_SIDE_DIG_ANIMATION.quickslash.frameIndexes.length, 16);
assert.equal(reviewCandidate.contactBackoffPx, MOVING_SIDE_DIG_ANIMATION.contactBackoffSourcePx);
assert.equal(
  reviewCandidate.contactFaceClearancePx,
  MOVING_SIDE_DIG_ANIMATION.contactFaceClearanceSourcePx,
);
assert.equal(MOVING_SIDE_DIG_ANIMATION.rollbackQuery, "movingSideDig");
assert.equal(UAL_NATIVE_ACTION_TUNING.cadence.normal.minDurationMs, 360);

for (const action of actions) {
  const expectedBaseDisplaySize = action.baseAnimationKey === profile.quickslashAnim
    ? profile.displaySizePxByAnimation[profile.quickslashAnim]
    : profile.displaySizePx;
  assert.equal(
    resolvePlayerDisplaySizePx(profile, profile.displaySizePx, action.baseAnimationKey),
    expectedBaseDisplaySize,
  );
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
    visualAlignmentEnabled: false,
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
  assert.equal(metadata.composition.version, 2);
  assert.equal("action_scale" in metadata.composition, false);
  assert.equal(metadata.composition.contact_backoff_source_px, 8);
  assert.equal(metadata.composition.contact_face_clearance_source_px, 2);
  assert.equal(metadata.composition.contact_envelope_policy, "shared-visible-silhouette");
  assert.equal(metadata.composition.frames_per_action, 22);
  assert.equal(metadata.composition.run_phase_advance_frames, 14);
  assert.deepEqual(metadata.composition.entry_action_blend_weights, [0.12, 0.26, 0.4, 0.54, 0.68, 0.84, 1]);
  assert.deepEqual(metadata.composition.exit_action_blend_weights, [0.94, 0.8, 0.66, 0.52, 0.38, 0.24, 0.1]);
  assert.deepEqual(metadata.composition.action_blend_weights.slice(0, 7), [0.12, 0.26, 0.4, 0.54, 0.68, 0.84, 1]);
  assert.deepEqual(metadata.composition.action_blend_weights.slice(-7), [0.94, 0.8, 0.66, 0.52, 0.38, 0.24, 0.1]);
  assert.equal(metadata.composition.contact_envelope_right_source_px, 199);
  assert.equal(Object.keys(metadata.rig_markers.frames).length, 22);
  assert.equal(metadata.rig_markers.source, "derived-phase-locked-piskel-composite");
  const contactMarkers = metadata.rig_markers.frames[String(action.contactFrame)];
  const leadingHandX = Math.max(contactMarkers.hand_l[0], contactMarkers.hand_r[0]);
  assert.equal(leadingHandX, 201);
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
  runtimeManifest.actions[MOVING_SIDE_DIG_ANIMATION.runSource.manifestAction]
    .rig_markers.frames["13"].pelvis,
);
assert.deepEqual(
  crossMetadata.rig_markers.frames["6"].pelvis,
  runtimeManifest.actions[MOVING_SIDE_DIG_ANIMATION.runSource.manifestAction]
    .rig_markers.frames["27"].pelvis,
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
  horizontalVelocity: 200,
  search: "",
  ...overrides,
});
assert.equal(select(), jab.animationKey);
assert.equal(select({
  animationKey: cross.baseAnimationKey,
  aim: "LEFT",
  motionState: "walk-left",
  horizontalVelocity: -200,
}), cross.animationKey);
assert.equal(select({ motionState: "idle", horizontalVelocity: 9 }), jab.animationKey);
assert.equal(select({ motionState: "idle", horizontalVelocity: 0 }), jab.baseAnimationKey);
assert.equal(select({ motionState: "walk-right", horizontalVelocity: 0 }), jab.baseAnimationKey);
assert.equal(select({ grounded: false }), jab.baseAnimationKey);
assert.equal(select({ motionState: "walk-left" }), jab.baseAnimationKey);
assert.equal(select({ aim: "UP-RIGHT" }), jab.baseAnimationKey);
assert.equal(
  select({ animationKey: profile.quickslashAnim, actionKind: "quickslash" }),
  profile.quickslashAnim,
);
assert.equal(
  select({
    animationKey: profile.quickslashAnim,
    actionKind: "quickslash",
    motionState: "idle",
    horizontalVelocity: 0,
  }),
  profile.quickslashAnim,
);
assert.equal(select({ search: "?movingSideDig=0" }), jab.baseAnimationKey);
assert.equal(select({ animationKey: profile.digDownAnim }), profile.digDownAnim);
const phaseLocked = resolveMovingSideDigAnimation({
  profile,
  animationKey: jab.baseAnimationKey,
  aim: "RIGHT",
  actionKind: "normal",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 200,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 23,
  search: "",
});
assert.equal(phaseLocked.phaseVariantId, "jab-phase-24");
assert.equal(phaseLocked.outgoingJogFrame, 23);
assert.equal(phaseLocked.resumeJogFrame, 10);
assert.equal(phaseLocked.movingSideDigActive, true);
assert.equal(phaseLocked.targetDirectionX, 1);

assert.deepEqual(profile.movingSideQuickslashAnimationKeys, [profile.quickslashAnim]);
assert.deepEqual(profile.movingSideQuickslashPhaseVariants, []);
const standingQuickslashDisplaySize = resolvePlayerDisplaySizePx(
  profile,
  profile.displaySizePx,
  profile.quickslashAnim,
);
assert.equal(standingQuickslashDisplaySize, 101);
assert.deepEqual(resolveUalActionContact(profile, profile.quickslashAnim, "quickslash"), {
  textureFrame: 16,
  sequenceIndex: 16,
  sourceAction: "mixamo-hurricane-kick",
  markerGroup: "feet",
  visualAlignmentEnabled: false,
});
const phaseLockedQuickslash = resolveMovingSideDigAnimation({
  profile,
  animationKey: profile.quickslashAnim,
  aim: "RIGHT",
  actionKind: "quickslash",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 200,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 23,
  search: "",
});
assert.equal(phaseLockedQuickslash.phaseVariantId, "jab-phase-24");
assert.equal(phaseLockedQuickslash.outgoingJogFrame, 23);
assert.equal(phaseLockedQuickslash.resumeJogFrame, 10);
assert.ok(profile.movingSideQuickslashAnimationKeys.includes(phaseLockedQuickslash.animationKey));
assert.equal(phaseLockedQuickslash.movingSideDigActive, true);
assert.equal(phaseLockedQuickslash.targetDirectionX, 1);

const collisionStoppedSelection = resolveMovingSideDigAnimation({
  profile,
  animationKey: jab.baseAnimationKey,
  aim: "RIGHT",
  actionKind: "normal",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 0,
  search: "",
});
assert.equal(collisionStoppedSelection.animationKey, jab.baseAnimationKey);
assert.equal(collisionStoppedSelection.movingSideDigActive, false);
assert.equal(collisionStoppedSelection.targetDirectionX, 0);

const tileSize = 94;
const contactEnvelope = runtimeManifest.actions["moving-side-dig-jab"]
  .composition.contact_envelope_right_source_px;
const visibleContactReachPx = (
  contactEnvelope - MOVING_SIDE_DIG_ANIMATION.visualOriginX * profile.frameWidth
) * MOVING_SIDE_DIG_ANIMATION.displaySizePx / profile.frameWidth;
const visibleClearancePx = standOffConfig.distancePx
  + profile.playerBodyWidthPx * 0.5
  - visibleContactReachPx;
assert.ok(visibleClearancePx >= 1.5, `moving fist clearance is only ${visibleClearancePx}px`);

let targetSolid = true;
const worldModel = { isSolid: () => targetSolid };
const rightBody = {
  x: tileSize - profile.playerBodyWidthPx,
  y: 0,
  w: profile.playerBodyWidthPx,
  h: profile.playerBodyHeightPx,
  vx: 200,
};
const rightStandOff = new MovingSideDigStandOffController(
  rightBody,
  worldModel,
  tileSize,
  standOffConfig,
);
assert.equal(rightStandOff.begin({ targetTile: { tx: 1, ty: 0 }, directionX: 1 }), true);
assert.equal(rightBody.x, tileSize - rightBody.w - standOffConfig.distancePx);
assert.equal(rightBody.vx, 0);
assert.equal(resolvePlayerTargetDirection(rightBody, tileSize, { tx: 1, ty: 0 })?.x, 1);
rightBody.x += 4;
rightBody.vx = 200;
assert.equal(rightStandOff.update(), true);
assert.equal(rightBody.x, tileSize - rightBody.w - standOffConfig.distancePx);
assert.equal(rightBody.vx, 0);
targetSolid = false;
assert.equal(rightStandOff.update(), false);
assert.equal(rightStandOff.isActive, false);

targetSolid = true;
const leftBody = {
  x: tileSize,
  y: 0,
  w: profile.playerBodyWidthPx,
  h: profile.playerBodyHeightPx,
  vx: -200,
};

let visualOffset = { x: -12, y: 0 };
let syncCount = 0;
let standOffEndCount = 0;
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
  {
    _syncSpriteWithPhysics: () => { syncCount += 1; },
    endMovingSideDigStandOff: () => { standOffEndCount += 1; },
  },
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
assert.equal(visualOffset, null);
assert.equal(standOffEndCount, 1);
assert.equal(syncCount, 1);
contactSystem.update(16.67);
assert.equal(visualOffset, null);
assert.equal(syncCount, 1);
contactSystem.destroy();
assert.equal(standOffEndCount, 2);

for (const relativePath of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/CaveActionAnimationRuntime.js",
]) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.match(source, /resolveMovingSideDigAnimation/);
  assert.match(source, /resumeJogFrame/);
  const cave = relativePath.includes("Cave");
  const playIndex = source.indexOf(cave ? "scene.player.play(key, true)" : "this.player.play(animKey, true)");
  const sizeIndex = source.indexOf(
    cave ? "controller._applyPlayerDisplaySize()" : "this.player.setDisplaySize(displaySize, displaySize)",
    playIndex,
  );
  const rigIndex = source.indexOf(
    cave ? "scene.playerRigContact?.beginAction" : "this.playerRigContact?.beginAction",
    sizeIndex,
  );
  const standOffIndex = source.indexOf("beginMovingSideDigStandOff", rigIndex);
  assert.ok(rigIndex < standOffIndex);
  assert.ok(playIndex >= 0 && playIndex < sizeIndex && sizeIndex < rigIndex);
}

console.log("MOVING_SIDE_DIG_PRODUCTION_CONTRACT_OK", {
  clips: actions.length,
  framesPerClip: 22,
  contactFrame: 6,
  contactBackoffSourcePx: MOVING_SIDE_DIG_ANIMATION.contactBackoffSourcePx,
  contactFaceClearanceSourcePx: MOVING_SIDE_DIG_ANIMATION.contactFaceClearanceSourcePx,
  tileFaceStandOffPx: standOffConfig.distancePx,
});
