import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { UalMiningComboSelector } from "../player/UalMiningComboSelector.js";
import { PLAYER_ANIMATION_POLISH } from "../values/playerAnimationPolish.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from
  "../values/survivalUalPlayerAssetProfile.js";
import { UAL_NATIVE_ACTION_TUNING } from "../values/ualNativeActionTuning.js";
import { resolveComplexDigSelection } from
  "../world/playScene/ComplexDigAnimationRuntime.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const uppercutKey = profile.complexDigAnimationKeys.find((key) => (
  key.endsWith("complex-dig-uppercut-anim")
));
const upKeys = Array.from(new Set([
  ...profile.digUpHitAnims,
  ...profile.digUpSidewaysHitAnims,
]));

assert.equal(profile.renderPipeline, "survival-unified-animation-runtime-v1");
assert.ok(uppercutKey);
assert.deepEqual(profile.complexDigUpAnimationKeys, [profile.digUpAnim, uppercutKey]);

const upSelection = resolveComplexDigSelection(
  { complexDigAnimationsEnabled: true },
  profile,
  "up",
  profile.digUpHitAnims,
  profile.digUpAnim,
);
const selector = new UalMiningComboSelector();
const alternating = Array.from({ length: 4 }, (_, index) => selector.select({
  family: upSelection.family,
  direction: "UP",
  animationKeys: upSelection.animationKeys,
  fallback: upSelection.fallback,
  targetTile: { tx: 6, ty: 5 },
  nowMs: index * 1500,
}));
assert.ok(UAL_NATIVE_ACTION_TUNING.combo.resetAfterMs > 1500);
assert.deepEqual(alternating, [
  profile.digUpAnim,
  uppercutKey,
  profile.digUpAnim,
  uppercutKey,
]);

for (const key of upKeys) {
  assert.equal(
    profile.animationPolishAnimations.some((animation) => animation.key === key),
    false,
  );
  const variant = profile.digAnimationVariants.find((animation) => animation.key === key);
  assert.equal(variant.sheet, profile.digUpSheet);
  assert.deepEqual(variant.frames, profile.digUpFrames);
}

const wallLoop = profile.animationPolishAnimations.find((animation) => (
  animation.key === profile.wallPushAnim
));
assert.ok(wallLoop);
assert.equal(wallLoop.sheet, profile.wallPushSheet);
assert.deepEqual(wallLoop.frames, profile.wallPushFrames);
assert.equal(wallLoop.repeat, -1);
assert.notEqual(wallLoop.sheet, PLAYER_ANIMATION_POLISH.sheets.transitions.sheetKey);

const registered = new Map();
createUalNativePlayerAnimations({
  anims: {
    exists: (key) => registered.has(key),
    create: (spec) => registered.set(spec.key, spec),
  },
  textures: { exists: () => true, get: () => ({ setFilter() {} }) },
}, profile);
for (const key of upKeys) {
  const animation = registered.get(key);
  assert.ok(animation);
  assert.equal(animation.frames.every((frame) => frame.key === profile.digUpSheet), true);
}
assert.equal(
  registered.get(profile.wallPushAnim).frames.every((frame) => (
    frame.key === profile.wallPushSheet
  )),
  true,
);

for (const path of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/CaveActionAnimationRuntime.js",
]) {
  const source = readFileSync(resolve(root, path), "utf8");
  assert.match(source, /resolveComplexDigSelection/);
  assert.match(source, /digUpHitAnims/);
}

console.log("UP_DIG_WALL_PIPELINE_CONTRACT_OK", {
  upSequence: profile.complexDigUpAnimationKeys,
  unifiedDigSheet: profile.digUpSheet,
  unifiedWallSheet: profile.wallPushSheet,
  rollbackQueries: ["?complexDig=0", "?wallBrace=0", "?unifiedAnimation=0"],
});
