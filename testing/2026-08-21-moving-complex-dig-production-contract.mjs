import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { MovingSideDigStandOffController } from "../player/MovingSideDigStandOffController.js";
import { resolveMovingSideDigAnimation } from "../player/UalMovingSideDigSelector.js";
import { COMPLEX_DIG_ANIMATIONS } from "../values/complexDigAnimations.js";
import { MOVING_COMPLEX_DIG_ANIMATION as moving } from "../values/movingComplexDigAnimation.js";
import { MOVING_SIDE_DIG_ANIMATION } from "../values/movingSideDigAnimation.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from "../values/survivalUalPlayerAssetProfile.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = resolve(root, moving.basePath, moving.sheet.fileName);
const piskelPath = resolve(root, moving.sourcePiskel);
const report = JSON.parse(readFileSync(resolve(root, moving.report), "utf8"));
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const sideClips = COMPLEX_DIG_ANIMATIONS.sideSequence.map(
  (clipId) => COMPLEX_DIG_ANIMATIONS.clips[clipId],
);
const runFrameCount = MOVING_SIDE_DIG_ANIMATION.phaseHandoff.runFrameCount;

assert.equal(moving.enabledByDefault, true);
assert.equal(moving.sheet.frameCount, 528);
assert.equal(moving.aliases.length, 80);
assert.equal(moving.phaseVariants.length, 80);
assert.equal(report.stationaryComplexAnimationsChanged, false);
assert.equal(report.sourceGreenPixelsRemoved, 514);
assert.equal(report.maximumSuspiciousGreenPixelsPerFrame, 0);
assert.equal(report.maximumFootBaselineDriftSourcePx, 0);
assert.equal(report.maximumRunPhaseStep, 1);
assert.equal(report.additionalRescaleApplied, false);
assert.equal(report.perFrameRecenteringApplied, false);
assert.equal(report.piskelRoundTripPixelExact, true);
assert.equal(report.runtimeWebpRoundTripPixelExact, true);
assert.equal(sha256(runtimePath), report.runtimeSha256);
assert.equal(sha256(piskelPath), report.piskelSha256);
assert.ok(statSync(runtimePath).size > 1_000_000);
assert.equal(readFileSync(runtimePath, { start: 0, end: 3 }).subarray(0, 4).toString("ascii"), "RIFF");

assert.equal(profile.movingComplexDigSheet, moving.sheet.key);
assert.ok(profile.requiredSheets.includes(moving.sheet.key));
assert.deepEqual(profile.visualOriginBySheet[moving.sheet.key], moving.origin);
assert.equal(profile.movingComplexDigAnimationKeys.length, moving.aliases.length);

const wrappedStep = (left, right) => (right - left + runFrameCount) % runFrameCount;
for (const clip of sideClips) {
  const aliases = moving.aliases.filter((alias) => alias.baseAnimationKey === clip.animationKey);
  assert.equal(aliases.length, 8, `${clip.id} lost a Jog entry phase`);
  assert.ok(profile.movingSideDigAnimationMap[clip.animationKey]);
  assert.equal(
    profile.movingSideDigAnimationMap[clip.animationKey],
    moving.defaultAnimationKeyByBaseAnimation[clip.animationKey],
  );
  for (const alias of aliases) {
    const expectedContacts = alias.dualContact ? 2 : 1;
    assert.equal(alias.frames.length, alias.dualContact ? 44 : 22);
    assert.equal(alias.contact.contacts.length, expectedContacts);
    assert.deepEqual(
      alias.contact.contacts.map(({ sequenceIndex }) => sequenceIndex),
      alias.dualContact ? [6, 28] : [6],
    );
    assert.equal(profile.actionContactByAnimation[alias.animationKey], alias.contact);
    assert.equal(profile.displaySizePxByAnimation[alias.animationKey], 123);
    assert.ok(profile.digAnims.includes(alias.animationKey));
    assert.ok(profile.punchActionAnims.includes(alias.animationKey));
    assert.ok(profile.digAnimationVariants.some((variant) => (
      variant.key === alias.animationKey
      && variant.sheet === moving.sheet.key
      && variant.frames === alias.frames
      && variant.frameRate === 30
    )));
    for (let index = 1; index < alias.runFrames.length; index += 1) {
      assert.ok(
        wrappedStep(alias.runFrames[index - 1], alias.runFrames[index]) <= 1,
        `${alias.animationKey} skips a Jog phase at ${index}`,
      );
    }
  }
}
assert.equal(moving.aliases.filter(({ dualContact }) => dualContact).length, 16);

const cross = COMPLEX_DIG_ANIMATIONS.clips.cross;
const movingRight = resolveMovingSideDigAnimation({
  profile,
  animationKey: cross.animationKey,
  aim: "RIGHT",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 200,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 23,
  search: "",
});
assert.equal(movingRight.movingSideDigActive, true);
assert.equal(movingRight.phaseVariantId, "jab-phase-24");
assert.equal(movingRight.outgoingJogFrame, 23);
assert.ok(profile.movingComplexDigAnimationKeys.includes(movingRight.animationKey));
assert.equal(
  movingRight.animationKey,
  moving.variantByBaseAnimationAndPhaseVariantId[cross.animationKey]["jab-phase-24"].animationKey,
);

const movingLeft = resolveMovingSideDigAnimation({
  profile,
  animationKey: cross.animationKey,
  aim: "LEFT",
  grounded: true,
  motionState: "walk-left",
  horizontalVelocity: -200,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 9,
  search: "",
});
assert.equal(movingLeft.movingSideDigActive, true);
assert.equal(movingLeft.targetDirectionX, -1);
assert.ok(profile.movingComplexDigAnimationKeys.includes(movingLeft.animationKey));

for (const overrides of [
  { horizontalVelocity: 0 },
  { motionState: "walk-left", horizontalVelocity: -200 },
  { grounded: false },
  { search: "?movingSideDig=0" },
]) {
  const result = resolveMovingSideDigAnimation({
    profile,
    animationKey: cross.animationKey,
    aim: "RIGHT",
    grounded: true,
    motionState: "walk-right",
    horizontalVelocity: 200,
    currentAnimationKey: profile.walkRunAnim,
    currentTextureFrame: 23,
    search: "",
    ...overrides,
  });
  assert.equal(result.animationKey, cross.animationKey);
  assert.equal(result.movingSideDigActive, false);
}

const activeAlias = moving.aliases.find(({ animationKey }) => animationKey === movingRight.animationKey);
const chained = resolveMovingSideDigAnimation({
  profile,
  animationKey: COMPLEX_DIG_ANIMATIONS.clips.jab.animationKey,
  aim: "RIGHT",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 200,
  currentAnimationKey: activeAlias.animationKey,
  currentFrameIndex: 7,
  search: "",
});
assert.equal(chained.outgoingJogFrame, activeAlias.runFrames[6]);
assert.ok(profile.movingComplexDigAnimationKeys.includes(chained.animationKey));

const standOff = MOVING_SIDE_DIG_ANIMATION.movement.tileFaceStandOff;
const tileSize = 94;
for (const directionX of [-1, 1]) {
  const body = {
    x: directionX > 0 ? 70 : 100,
    y: 0,
    w: profile.playerBodyWidthPx,
    h: profile.playerBodyHeightPx,
    vx: directionX * 200,
  };
  const targetTile = { tx: directionX > 0 ? 1 : 0, ty: 0 };
  const controller = new MovingSideDigStandOffController(
    body,
    { isSolid: () => true },
    tileSize,
    standOff,
  );
  assert.equal(controller.begin({ targetTile, directionX }), true);
  const anchoredX = directionX > 0
    ? tileSize - body.w - standOff.distancePx
    : tileSize + standOff.distancePx;
  assert.equal(body.x, anchoredX);
  for (let frame = 0; frame < 120; frame += 1) {
    body.x += directionX * 3;
    body.vx = directionX * 200;
    controller.update();
    assert.equal(body.x, anchoredX, `${directionX} anchor drifted at frame ${frame}`);
    assert.equal(body.vx, 0);
  }
}

console.log("MOVING_COMPLEX_DIG_PRODUCTION_CONTRACT_OK", {
  sideClips: sideClips.length,
  aliases: moving.aliases.length,
  dualContactAliases: report.dualContactAliases,
  greenPixelsRemaining: report.maximumSuspiciousGreenPixelsPerFrame,
  footBaselineDriftSourcePx: report.maximumFootBaselineDriftSourcePx,
  maximumRunPhaseStep: report.maximumRunPhaseStep,
  anchorStressFramesPerFacing: 120,
});
