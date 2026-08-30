import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js?held-torch-contract";
import {
  SURVIVAL_HELD_TORCH_RUNTIME,
  resolveSurvivalHeldTorchRuntimeEnabled,
} from "../values/survivalHeldTorchRuntime.js";
import {
  isHeldTorchAnimationKey,
  resolveHeldTorchAnimationKey,
  resolveHeldTorchBaseAnimationKey,
} from "../systems/visual/heldTorchAnimationSelection.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profile = PLAYER_ASSET_PROFILES.survivalUal;
const config = JSON.parse(readFileSync(
  resolve(root, "values/survivalUnifiedAnimationRuntimeV1.json"),
  "utf8",
));
const manifest = JSON.parse(readFileSync(resolve(
  root,
  SURVIVAL_HELD_TORCH_RUNTIME.runtimeRoot,
  "2026-08-25-survival-unified-animation-runtime-v1-manifest.json",
), "utf8"));

assert.equal(resolveSurvivalHeldTorchRuntimeEnabled(""), true);
assert.equal(resolveSurvivalHeldTorchRuntimeEnabled("?heldTorch3d=1"), true);
for (const value of ["0", "off", "false"]) {
  assert.equal(resolveSurvivalHeldTorchRuntimeEnabled(`?heldTorch3d=${value}`), false);
}
assert.equal(profile.heldTorchRuntime.enabled, true);
assert.equal(profile.heldTorchRuntime.version, SURVIVAL_HELD_TORCH_RUNTIME.version);
assert.equal(Object.keys(profile.heldTorchRuntime.variants).length, 11);
assert.ok(profile.heldTorchAnimations.length >= 11);

for (const animation of profile.heldTorchAnimations) {
  const base = resolveHeldTorchBaseAnimationKey(profile, animation.key);
  assert.equal(resolveHeldTorchAnimationKey(profile, base, true), animation.key);
  assert.equal(resolveHeldTorchAnimationKey(profile, base, false), base);
  assert.equal(isHeldTorchAnimationKey(profile, animation.key), true);
  assert.equal(profile.displaySizePxByAnimation[animation.key], 101);
}

for (const variant of Object.values(SURVIVAL_HELD_TORCH_RUNTIME.variants)) {
  const spec = config.sheets[variant.sheetKey];
  assert.equal(spec.heldTorchPose, true);
  assert.ok(spec.sourceBlend.endsWith("held-torch-rig-v1/survival-held-torch-rig-v1.blend"));
  assert.equal(spec.frames, variant.frames.length);
  const sheet = manifest.sheets[variant.sheetKey];
  assert.ok(sheet, `${variant.sheetKey} is absent from the runtime manifest`);
  assert.equal(sheet.sourceRenderSizePx, 1024);
  assert.equal(sheet.downsamplePasses, 1);
  assert.ok(sheet.minimumRawEdgeMarginPx >= 4);
  assert.equal(sheet.maximumSuspiciousGreenPixels, 0);
  assert.ok(existsSync(resolve(root, SURVIVAL_HELD_TORCH_RUNTIME.runtimeRoot, sheet.file)));
}

const fireSource = readFileSync(resolve(root, "systems/lighting/FireLightSystem.js"), "utf8");
const selectionSource = readFileSync(resolve(
  root,
  "systems/visual/heldTorchAnimationSelection.js",
), "utf8");
assert.match(fireSource, /resolveHeldTorchPresentation/);
assert.match(fireSource, /flameVisible: heldTorch\.legacyVisible/);
assert.match(selectionSource, /legacyVisible: carriedVisible && !available/);
assert.match(selectionSource, /source: "blender-character-animation"/);

const buildReport = JSON.parse(readFileSync(resolve(
  root,
  "testing/blender-animation-lab-v1/review-drafts/held-torch-rig-v1/build-report.json",
), "utf8"));
assert.equal(buildReport.attachment.parentType, "BONE");
assert.equal(buildReport.attachment.bone, "weapon_r");
assert.ok(buildReport.gripGapWorld.maximum < 0.00001);
assert.equal(buildReport.torch.realMeshParts, 13);
assert.equal(buildReport.torch.spritePlaneCount, 0);

console.log("HELD_TORCH_BLENDER_RUNTIME_CONTRACT_OK", {
  sheets: Object.keys(SURVIVAL_HELD_TORCH_RUNTIME.variants).length,
  animations: profile.heldTorchAnimations.length,
  gripGapWorld: buildReport.gripGapWorld.maximum,
  rollback: "?heldTorch3d=0",
});
