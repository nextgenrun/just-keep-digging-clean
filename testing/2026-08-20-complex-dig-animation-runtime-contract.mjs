import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { UalMiningComboSelector } from "../player/UalMiningComboSelector.js";
import {
  COMPLEX_DIG_ANIMATIONS as config,
  resolveComplexDigAnimationsEnabled,
} from "../values/complexDigAnimations.js";
import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js";
import { UAL_NATIVE_ACTION_TUNING, resolveUalActionContact } from "../values/ualNativeActionTuning.js";
import {
  resolveComplexDigSelection,
  resolveComplexDigSourceFacesRight,
} from "../world/playScene/ComplexDigAnimationRuntime.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = resolve(root, config.basePath);
const profile = PLAYER_ASSET_PROFILES.survivalUal;
const manifest = JSON.parse(readFileSync(
  resolve(runtimeRoot, "mixamo-complex-dig-runtime-v1-manifest.json"),
  "utf8",
));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

assert.equal(config.enabledByDefault, true);
assert.equal(resolveComplexDigAnimationsEnabled(""), true);
assert.equal(resolveComplexDigAnimationsEnabled("?complexDig=1"), true);
assert.equal(resolveComplexDigAnimationsEnabled("?complexDig=0"), false);
assert.equal(config.displaySizePx, 101);
assert.equal(Object.keys(config.clips).length, 11);
assert.deepEqual(config.sideSequence, [
  "cross", "jab", "roundhouse", "jabElbow", "lowKick", "highKick",
  "spinningBackKick", "elbowUppercut", "singleElbow", "hook",
]);
assert.deepEqual(config.upSequence, ["uppercut"]);
assert.deepEqual(config.sideFamilies.map((family) => [...family]), [
  ["cross", "jab", "roundhouse"],
  ["jabElbow"],
  ["lowKick", "highKick", "spinningBackKick"],
  ["elbowUppercut", "singleElbow", "hook"],
]);

assert.equal(manifest.runtimeWired, true);
assert.equal(manifest.rollbackQuery, "?complexDig=0");
assert.equal(manifest.hotkey, "Ctrl+Alt+9");
assert.equal(manifest.displaySizePx, 101);
assert.deepEqual(manifest.sideSequence, config.sideSequence);
assert.deepEqual(manifest.upSequence, config.upSequence);

for (const [id, clip] of Object.entries(config.clips)) {
  const runtimeClip = manifest.clips[id];
  assert.ok(runtimeClip, `${id} is absent from the runtime manifest`);
  assert.equal(sha256(readFileSync(resolve(runtimeRoot, clip.fileName))), runtimeClip.sha256);
  assert.equal(runtimeClip.maximumSuspiciousGreenPixels, 0, `${id} has green pixels`);
  assert.equal(runtimeClip.sourceRenderSizePx, 1024);
  assert.equal(runtimeClip.packedFrameSizePx, 256);
  assert.equal(runtimeClip.downsamplePasses, 1);
  assert.equal(clip.frames[clip.contact.sequenceIndex], clip.contact.textureFrame);
  assert.equal(clip.contact.visualAlignmentEnabled, false);
  assert.equal(profile.displaySizePxByAnimation[clip.animationKey], 101);
  assert.deepEqual(profile.visualOriginBySheet[clip.sheetKey], clip.origin);
  assert.deepEqual(resolveUalActionContact(profile, clip.animationKey), clip.contact);
}

assert.deepEqual(
  profile.complexDigSideAnimationKeys.filter(key => profile.complexDigAnimationKeys.includes(key)),
  config.sideSequence.map((id) => config.clips[id].animationKey),
);
assert.deepEqual(
  profile.complexDigUpAnimationKeys.filter(key => profile.complexDigAnimationKeys.includes(key)),
  [config.clips.uppercut.animationKey],
);
assert.ok(profile.digAnims.every((key) => (
  !profile.complexDigAnimationKeys.includes(key) || profile.punchActionAnims.includes(key)
)));

const registered = new Map();
createUalNativePlayerAnimations({
  anims: {
    exists: (key) => registered.has(key),
    create: (spec) => registered.set(spec.key, spec),
  },
  textures: { exists: () => true, get: () => ({ setFilter() {} }) },
}, profile);
for (const key of profile.complexDigAnimationKeys) {
  assert.ok(registered.has(key), `${key} was not registered`);
  assert.equal(registered.get(key).repeat, 0);
}

const legacySide = ["legacy-side-a", "legacy-side-b"];
const enabled = resolveComplexDigSelection(
  { complexDigAnimationsEnabled: true }, profile, "side", legacySide, "legacy-side-a",
);
assert.equal(enabled.family, "complex-side");
assert.deepEqual(enabled.animationKeys, profile.complexDigSideAnimationKeys);
assert.equal(enabled.complex, true);
assert.equal(resolveComplexDigSourceFacesRight(profile, enabled.animationKeys[0], false), true);
const disabled = resolveComplexDigSelection(
  { complexDigAnimationsEnabled: false }, profile, "side", legacySide, "legacy-side-a",
);
assert.deepEqual(disabled, {
  family: "side", animationKeys: legacySide, fallback: "legacy-side-a", complex: false,
});

const selector = new UalMiningComboSelector();
const selected = Array.from({
  length: profile.complexDigSideAnimationKeys.length,
}, (_, index) => selector.select({
  family: enabled.family,
  direction: "RIGHT",
  animationKeys: enabled.animationKeys,
  fallback: enabled.fallback,
  targetTile: { tx: 3, ty: 4 },
  nowMs: index * 100,
}));
assert.deepEqual(selected, profile.complexDigSideAnimationKeys);
assert.equal(UAL_NATIVE_ACTION_TUNING.cadence.normal.minDurationMs, 360);
assert.equal(UAL_NATIVE_ACTION_TUNING.cadence.normal.recoveryCancelDelayMs, 100);

for (const path of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/CaveActionAnimationRuntime.js",
]) {
  const source = readFileSync(resolve(root, path), "utf8");
  assert.match(source, /resolveComplexDigSelection/);
  assert.match(source, /resolveUalActionTimeScale/);
  assert.match(source, /resolveUalActionContact/);
}
const runtimeSource = readFileSync(resolve(root, "world/playScene/ComplexDigAnimationRuntime.js"), "utf8");
assert.match(runtimeSource, /ualMiningComboSelector\?\.reset/);
assert.match(runtimeSource, /addEventListener\?\.\("keydown"/);
assert.match(runtimeSource, /Complex dig animations: OFF \(legacy\)/);
assert.match(
  readFileSync(resolve(root, "world/playScene/PlaySceneSetup.js"), "utf8"),
  /installComplexDigAnimationRuntime\(this\)/,
);
assert.match(
  readFileSync(resolve(root, "world/playScene/PlaySceneLifecycle.js"), "utf8"),
  /"complexDigAnimationRuntime"/,
);

console.log("COMPLEX_DIG_ANIMATION_RUNTIME_CONTRACT_OK", {
  clips: Object.keys(config.clips).length,
  sideStages: config.sideSequence.length,
  upStages: config.upSequence.length,
  oneContactPerAction: true,
  legacyRollback: true,
});
