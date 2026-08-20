import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getUniquePlayerSheetEntries } from "../player/PlayerAssetSheetCatalog.js";
import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { UalNativeLocomotionTransitionSelector } from
  "../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js";
import { MIXAMO_ACCEPTED_PLAYER_ANIMATIONS as accepted } from
  "../values/mixamoAcceptedPlayerAnimations.js";
import { resolveUalActionContact } from "../values/ualNativeActionTuning.js";
import { resolveMovingSideDigAnimation } from "../player/UalMovingSideDigSelector.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profile = PLAYER_ASSET_PROFILES.survivalUal;
const runtimeRoot = resolve(root, accepted.basePath);
const manifest = JSON.parse(readFileSync(resolve(
  runtimeRoot,
  "mixamo-accepted-runtime-v2-manifest.json",
), "utf8"));
const sheetSpecs = Object.values(accepted.sheets);
const acceptedAnimationKeys = new Set(Object.values(accepted.animations));

assert.equal(manifest.productionChanged, true);
assert.equal(manifest.runtimeWired, true);
assert.equal(manifest.sourceRenderSizePx, 1024);
assert.equal(manifest.packedFrameSizePx, 256);
assert.equal(manifest.downsamplePasses, 1);
assert.equal(manifest.fixedRuntimeDisplaySizePx, 101);
assert.equal(manifest.gates.maximumSuspiciousGreenPixelsPerFrame, 0);
assert.equal(Object.keys(manifest.clips).length, 10);

for (const spec of sheetSpecs) {
  const path = resolve(runtimeRoot, spec.fileName);
  assert.equal(existsSync(path), true, `${spec.fileName} is missing`);
  const png = readFileSync(path);
  assert.equal(png.readUInt32BE(16) % 256, 0);
  assert.equal(png.readUInt32BE(20) % 256, 0);
  assert.equal(profile.displaySizePxByAnimation[
    Object.values(accepted.animations).find((key) => (
      profile.visualOriginBySheet[spec.key]
      && profile.displaySizePxByAnimation[key] === spec.displaySizePx
    ))
  ], 101);
  assert.deepEqual(profile.visualOriginBySheet[spec.key], spec.origin);
}

for (const [clipId, expectedHash] of Object.entries(manifest.clips)) {
  const fileName = {
    "flight-loop": accepted.sheets.flight.fileName,
    "walk-start": accepted.sheets.walkStart.fileName,
    "walk-stop": accepted.sheets.walkStop.fileName,
    "idle-fidget": accepted.sheets.idleFidget.fileName,
    "crouch-idle": accepted.sheets.crouch.fileName,
    "crouch-enter": accepted.sheets.crouchEnter.fileName,
    "crouch-exit": accepted.sheets.crouchExit.fileName,
    "thunder-strike": accepted.sheets.thunderStrike.fileName,
    "hard-landing": accepted.sheets.hardLanding.fileName,
    "hurricane-quickslash": accepted.sheets.quickslash.fileName,
  }[clipId];
  const actual = createHash("sha256")
    .update(readFileSync(resolve(runtimeRoot, fileName)))
    .digest("hex");
  assert.equal(actual, expectedHash, `${clipId} changed after approval`);
}

assert.equal(profile.walkStartAnim, accepted.animations.walkStart);
assert.equal(profile.walkStopAnim, accepted.animations.walkStop);
assert.equal(profile.landingAnim, accepted.animations.hardLanding);
assert.equal(profile.duckAnim, accepted.animations.crouch);
assert.equal(profile.flyAnim, accepted.animations.flight);
assert.equal(profile.thunderStrikeStrikeAnim, accepted.animations.thunderStrike);
assert.equal(profile.quickslashAnim, accepted.animations.quickslash);
assert.equal(profile.quickslashSheet, accepted.sheets.quickslash.key);
assert.equal(profile.quickslashSourceFacesRight, false);
assert.deepEqual(profile.landingFrames, Array.from({ length: 14 }, (_, index) => index + 10));
assert.ok(profile.locomotionTransitionAnims.includes(accepted.animations.crouchEnter));
assert.ok(profile.locomotionTransitionAnims.includes(accepted.animations.crouchExit));
assert.ok(profile.idleFidgets.some(({ key }) => key === accepted.animations.idleFidget));

for (const key of acceptedAnimationKeys) {
  assert.equal(profile.displaySizePxByAnimation[key], 101, `${key} can size-drift`);
}

const unchangedFamilies = [
  profile.walkLoopAnim,
  profile.walkRunAnim,
  ...profile.digAnims,
  profile.flightEnterAnim,
  profile.flightExitAnim,
  profile.wallPushAnim,
  profile.earthquakeReactAnim,
  profile.deathAnim,
];
assert.ok(unchangedFamilies.every((key) => !acceptedAnimationKeys.has(key)));

const entries = getUniquePlayerSheetEntries(profile);
for (const key of [profile.duckSheet, profile.crouchEnterSheet, profile.crouchExitSheet]) {
  assert.ok(entries.find((entry) => entry.key === key)?.deferredIds.includes("crouch"));
}
assert.ok(entries.find((entry) => entry.key === profile.flySheet)?.deferredIds.includes("flight"));
assert.ok(entries.find((entry) => entry.key === profile.landingSheet)?.deferredIds.includes("locomotion-polish"));
assert.equal(entries.find((entry) => entry.key === profile.thunderStrikeStrikeSheet)?.abilityId, "thunderStrike");
assert.equal(entries.find((entry) => entry.key === profile.quickslashSheet)?.abilityId, "quickslash");

const animations = new Map();
createUalNativePlayerAnimations({
  anims: {
    exists: (key) => animations.has(key),
    create: (config) => animations.set(config.key, config),
  },
  textures: { exists: () => true, get: () => ({ setFilter() {} }) },
}, profile);
for (const key of acceptedAnimationKeys) assert.ok(animations.has(key), `${key} not registered`);
assert.equal(animations.get(profile.duckAnim).repeat, -1);
assert.equal(animations.get(profile.crouchEnterAnim).repeat, 0);
assert.equal(animations.get(profile.crouchExitAnim).repeat, 0);
assert.equal(animations.get(profile.flyAnim).repeat, -1);
assert.equal(animations.get(profile.landingAnim).frames.length, 14);
assert.equal(animations.get(profile.quickslashAnim).frames.length, 28);

const locomotion = new UalNativeLocomotionTransitionSelector(profile);
locomotion.reset({ grounded: true, facingFlipX: false });
locomotion.resolve({
  grounded: true,
  horizontalVelocity: 0,
  groundMovementActive: false,
  currentAnimationKey: profile.idleAnim,
  isPlaying: true,
});
const start = locomotion.resolve({
  grounded: true,
  horizontalVelocity: 90,
  groundMovementActive: true,
  currentAnimationKey: profile.idleAnim,
  isPlaying: true,
});
assert.equal(start.animationKey, accepted.animations.walkStart);
locomotion.reset({ grounded: true, facingFlipX: false });
locomotion.resolve({
  grounded: true,
  horizontalVelocity: 90,
  groundMovementActive: true,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 5,
  isPlaying: true,
});
const stop = locomotion.resolve({
  grounded: true,
  horizontalVelocity: 0,
  groundMovementActive: false,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 5,
  isPlaying: true,
});
assert.equal(stop.animationKey, accepted.animations.walkStop);

assert.deepEqual(resolveUalActionContact(profile, profile.thunderStrikeStrikeAnim), {
  textureFrame: accepted.thunderContactSequenceIndex,
  sequenceIndex: accepted.thunderContactSequenceIndex,
  sourceAction: "mixamo-standing-2h-magic-area-attack-01",
  markerGroup: "hands",
  visualAlignmentEnabled: false,
});

assert.deepEqual(resolveUalActionContact(profile, profile.quickslashAnim, "quickslash"), {
  textureFrame: accepted.quickslashContactSequenceIndex,
  sequenceIndex: accepted.quickslashContactSequenceIndex,
  sourceAction: "mixamo-hurricane-kick",
  markerGroup: "feet",
  visualAlignmentEnabled: false,
});
assert.equal(resolveMovingSideDigAnimation({
  profile,
  animationKey: profile.quickslashAnim,
  aim: "RIGHT",
  actionKind: "quickslash",
  grounded: true,
  motionState: "walk-right",
  horizontalVelocity: 120,
  currentAnimationKey: profile.walkRunAnim,
  currentTextureFrame: 5,
  search: "",
}).animationKey, accepted.animations.quickslash);

for (const runtimeEntry of [
  "index.html",
  "main.js",
  "ui/scenes/PlayScene.js",
  "world/PlayScene.js",
  "values/playerAssetProfiles.js",
  "world/playScene/PlaySceneSetup.js",
  "world/playScene/PlayScenePlayerAssetSetup.js",
]) {
  assert.match(
    readFileSync(resolve(root, runtimeEntry), "utf8"),
    /20260820-complex-dig-v1/,
    `${runtimeEntry} can serve a cached pre-acceptance runtime`,
  );
}

console.log("MIXAMO_ACCEPTED_RUNTIME_CONTRACT_OK", {
  clips: sheetSpecs.length,
  fixedScalePx: manifest.fixedRuntimeDisplaySizePx,
  retainedFamilies: unchangedFamilies.length,
});
