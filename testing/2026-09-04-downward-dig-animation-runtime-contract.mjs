import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createUalNativePlayerAnimations } from
  "../player/UalNativePlayerAnimations.js";
import { getUniquePlayerSheetEntries } from
  "../player/PlayerAssetSheetCatalog.js";
import { UalMiningComboSelector } from "../player/UalMiningComboSelector.js";
import {
  DOWNWARD_DIG_ANIMATIONS as config,
  resolveDownwardDigAnimationsEnabled,
} from "../values/downwardDigAnimations.js";
import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profile = PLAYER_ASSET_PROFILES.survivalUal;
const sha256 = path => createHash("sha256")
  .update(readFileSync(path))
  .digest("hex");

function pngDimensions(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return Object.freeze({
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  });
}

function assertWebp(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
}

assert.equal(resolveDownwardDigAnimationsEnabled(""), true);
assert.equal(resolveDownwardDigAnimationsEnabled("?downDigCombo=1"), true);
assert.equal(resolveDownwardDigAnimationsEnabled("?downDigCombo=0"), false);
assert.equal(config.displaySizePx, 103);
assert.deepEqual(config.sequence, ["bodyLow"]);

const expectedKeys = config.sequence.map(name => config.clips[name].animationKey);
assert.deepEqual(profile.downwardDigAnimationKeys, expectedKeys);
assert.deepEqual(profile.digDownHitAnims, [profile.digDownAnim, ...expectedKeys]);
assert.deepEqual(
  profile.digDownSidewaysHitAnims,
  [profile.digDownAnim, ...expectedKeys],
);
assert.equal(profile.downwardDigPrewarmAnimationKey, expectedKeys[0]);

for (const name of config.sequence) {
  const clip = config.clips[name];
  const sourcePath = resolve(root, config.reviewSourceRoot, clip.reviewFileName);
  const mixedPath = resolve(root, config.basePath, clip.fileName);
  const unifiedPath = resolve(
    root,
    "sprites/character/survival-character-unified-v1/runtime",
    `2026-08-25-${clip.sheetKey}.webp`,
  );
  assert.equal(sha256(sourcePath), clip.sourceSha256);
  assert.equal(sha256(mixedPath), clip.sourceSha256);
  assert.equal(sha256(unifiedPath), clip.unifiedSha256);
  assert.deepEqual(pngDimensions(mixedPath), { width: 4096, height: 512 });
  assertWebp(unifiedPath);

  const contact = profile.actionContactByAnimation[clip.animationKey];
  assert.equal(contact.textureFrame, clip.contact.textureFrame);
  assert.equal(contact.sequenceIndex, clip.contact.sequenceIndex);
  assert.equal(contact.sourceAction, clip.contact.sourceAction);
  assert.equal(contact.markerGroup, clip.contact.markerGroup);
  assert.equal(clip.frames[contact.sequenceIndex], contact.textureFrame);
  assert.equal(
    profile.displaySizePxByAnimation[clip.animationKey],
    config.displaySizePx,
  );
  assert.equal(
    profile.movingDiagonalDigAnimationMap[clip.animationKey],
    "down",
  );
  assert.ok(profile.actionRecoveryAnimationByCompletedAnimation[clip.animationKey]);
}

const registered = new Map();
createUalNativePlayerAnimations({
  anims: {
    exists: key => registered.has(key),
    create: spec => registered.set(spec.key, spec),
  },
  textures: {
    exists: () => true,
    get: () => ({ setFilter() {} }),
  },
}, profile);
for (const name of config.sequence) {
  const clip = config.clips[name];
  assert.deepEqual(
    registered.get(clip.animationKey)?.frames.map(frame => frame.frame),
    clip.frames,
  );
}

const entries = getUniquePlayerSheetEntries(profile)
  .filter(entry => config.sequence.some(
    name => entry.key === config.clips[name].sheetKey,
  ));
assert.equal(entries.length, 1);
const rejected = config.clips.legSweep;
assert.equal(registered.has(rejected.animationKey), false);
assert.equal(profile.digAnims.includes(rejected.animationKey), false);
assert.equal(profile.punchActionAnims.includes(rejected.animationKey), false);
assert.equal(profile.actionContactByAnimation[rejected.animationKey], undefined);
assert.ok(getUniquePlayerSheetEntries(profile).every(entry => entry.key !== rejected.sheetKey));
for (const entry of entries) {
  assert.deepEqual(entry.deferredIds, ["complex-down-mining"]);
  assert.match(entry.path, /survival-character-unified-v1\/runtime/);
}

for (const family of ["down", "down-side"]) {
  const selector = new UalMiningComboSelector();
  const selected = Array.from({ length: 4 }, (_, index) => selector.select({
    family,
    direction: family === "down" ? "DOWN" : "DOWN-RIGHT",
    animationKeys: profile.digDownHitAnims,
    fallback: profile.digDownAnim,
    targetTile: { tx: 4, ty: 5 },
    nowMs: index * 100,
  }));
  assert.deepEqual(selected, [
    profile.digDownAnim,
    ...expectedKeys,
    profile.digDownAnim,
    ...expectedKeys,
  ]);
}

for (const path of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/CaveActionAnimationRuntime.js",
]) {
  const source = readFileSync(resolve(root, path), "utf8");
  assert.match(source, /downwardDigPrewarmAnimationKey/);
  assert.match(source, /ensureForAnimation/);
}

console.log("DOWNWARD_DIG_ANIMATION_RUNTIME_CONTRACT_OK", {
  stages: profile.digDownHitAnims.length,
  newClips: expectedKeys.length,
  contacts: config.sequence.map(name => config.clips[name].contact.textureFrame),
  deferredPack: "complex-down-mining",
  rollback: "?downDigCombo=0",
});
