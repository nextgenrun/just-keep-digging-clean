import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js?contract=unified-animation-v1";
import { getUniquePlayerSheetEntries } from "../player/PlayerAssetSheetCatalog.js";
import { MOVING_COMPLEX_DIG_ANIMATION_UNIFIED_V1 as moving } from
  "../values/movingComplexDigAnimationUnifiedV1.js";
import {
  SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1 as runtime,
  applySurvivalUnifiedAnimationRuntimeV1,
  resolveSurvivalUnifiedAnimationEnabled,
} from "../values/survivalUnifiedAnimationRuntimeV1.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profile = PLAYER_ASSET_PROFILES.survivalUal;
const config = JSON.parse(readFileSync(
  resolve(root, "values/survivalUnifiedAnimationRuntimeV1.json"),
  "utf8",
));
const manifestPath = resolve(
  root,
  runtime.runtimeRoot,
  "2026-08-25-survival-unified-animation-runtime-v1-manifest.json",
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

assert.equal(manifest.runtimeWired, true);
assert.equal(resolveSurvivalUnifiedAnimationEnabled(""), true);
assert.equal(resolveSurvivalUnifiedAnimationEnabled("?unifiedAnimation=1"), true);
assert.equal(resolveSurvivalUnifiedAnimationEnabled("?unifiedAnimation=0"), false);
const rollbackProbe = Object.freeze({ renderPipeline: "legacy-mixed" });
assert.equal(applySurvivalUnifiedAnimationRuntimeV1(rollbackProbe, false), rollbackProbe);

assert.equal(profile.renderPipeline, "survival-unified-animation-runtime-v1");
assert.equal(profile.version, runtime.version);
assert.equal(profile.basePath, runtime.runtimeRoot);
assert.equal(profile.displaySizePx, 101);
assert.equal(profile.rigManifestKey, null);
assert.equal(profile.rigManifestFile, null);
assert.ok([
  ...Object.values(profile.actionContactByAnimation || {}),
  ...Object.values(profile.quickslashActionContactByAnimation || {}),
].every((contact) => contact.visualAlignmentEnabled === false));
assert.equal(profile.displaySizePxByAnimation[profile.idleAnim], 101);
assert.equal(profile.displaySizePxByAnimation[profile.walkRunAnim], 101);
assert.ok(
  new Set(Object.values(profile.displaySizePxByAnimation)).size > 1,
  "animation-wide stature calibration was flattened back to one cell size",
);

const configuredSheets = Object.keys(config.sheets);
assert.equal(configuredSheets.length, 54);
assert.equal(profile.requiredSheets.length, 54);
assert.deepEqual(new Set(profile.requiredSheets), new Set(configuredSheets));
assert.equal(Object.keys(manifest.sheets).length, 54);
assert.deepEqual(new Set(Object.keys(manifest.sheets)), new Set(configuredSheets));

const sheetKeysFromFiles = new Set();
for (const entry of profile.sheetFiles) {
  const [property, fileName, , sourceRoot] = entry;
  const sheetKey = profile[property];
  sheetKeysFromFiles.add(sheetKey);
  assert.equal(sourceRoot, runtime.runtimeRoot, `${property} retains a mixed source root`);
  assert.equal(fileName, `2026-08-25-${sheetKey}.webp`);
}
assert.deepEqual(sheetKeysFromFiles, new Set(configuredSheets));
const catalogEntries = getUniquePlayerSheetEntries(profile);
assert.equal(catalogEntries.length, 54);
assert.ok(catalogEntries.every((entry) => entry.path.includes(`/${runtime.runtimeRoot.split("/").slice(-2).join("/")}/`)));
const movingCatalogEntry = catalogEntries.find((entry) => entry.key === profile.movingComplexDigSheet);
assert.deepEqual(movingCatalogEntry.frameConfig, {
  frameWidth: 192,
  frameHeight: 192,
  endFrame: 959,
});

for (const sheetKey of configuredSheets) {
  const sheet = manifest.sheets[sheetKey];
  const piskelSource = config.sheets[sheetKey].piskelSource;
  const output = resolve(root, runtime.runtimeRoot, sheet.file);
  assert.ok(existsSync(output), `${sheetKey} runtime sheet is absent`);
  assert.equal(sheet.sha256, sha256(output), `${sheetKey} hash drifted`);
  assert.equal(sheet.sourceRenderSizePx, piskelSource ? 256 : 1024);
  assert.equal(sheet.downsamplePasses, piskelSource ? 0 : 1);
  assert.equal(sheet.sourceAuthority, piskelSource ? "piskel" : undefined);
  assert.equal(sheet.sourcePiskel, piskelSource);
  assert.ok(sheet.minimumRawEdgeMarginPx >= 4, `${sheetKey} clips its source cell`);
  assert.equal(sheet.maximumSuspiciousGreenPixels, 0, `${sheetKey} has green contamination`);
  assert.equal(
    profile.frameSizePxBySheet[sheetKey],
    sheetKey === profile.movingComplexDigSheet || sheetKey === profile.walkHandoffSheet
      ? 192
      : 256,
  );
  if (sheetKey !== profile.ledgeClimbSheet) {
    assert.deepEqual(profile.visualOriginBySheet[sheetKey], runtime.groundedOrigin);
  }
}

assert.equal(moving.sheet.frames.length, 960);
assert.equal(Math.max(...moving.sheet.frames), 959);
assert.equal(moving.aliases.length, 80);
assert.equal(moving.phaseVariants.length, 80);
assert.deepEqual(moving.visualFrameReplacements, { 232: 231 });
assert.equal(new Set(moving.aliases.map((alias) => alias.clipId)).size, 10);
assert.equal(new Set(moving.aliases.map((alias) => alias.phaseVariantId)).size, 8);
assert.equal(new Set(moving.aliases.map((alias) => alias.frames.join(","))).size, 80);
for (const alias of moving.aliases) {
  assert.equal(alias.frames.length, alias.runFrames.length);
  const collapsedHookPose = alias.animationKey.endsWith("hook-cross-phase-15-anim");
  assert.ok(alias.frames.every((frame, index, frames) => (
    index === 0
    || frame === frames[index - 1] + 1
    || (collapsedHookPose && index === 2 && frame === frames[index - 1])
    || (collapsedHookPose && index === 3 && frame === frames[index - 1] + 2)
  )));
  assert.equal(alias.dualContact, alias.contact.contacts.length === 2);
  for (const contact of alias.contact.contacts) {
    assert.equal(alias.frames[contact.sequenceIndex], contact.textureFrame);
  }
}
const correctedHook = moving.aliases.find((alias) => (
  alias.animationKey.endsWith("hook-cross-phase-15-anim")
));
assert.deepEqual(correctedHook.frames, [230, 231, 231, 233, 234, 235, 236, 237, 238, 239]);
assert.equal(
  moving.aliases.filter((alias) => alias.dualContact).length,
  16,
  "two dual-hit actions must remain dual-hit across all eight run phases",
);

console.log("SURVIVAL_UNIFIED_ANIMATION_RUNTIME_CONTRACT_OK", {
  sheets: configuredSheets.length,
  sourceFrames: Object.values(manifest.sheets).reduce((sum, sheet) => sum + sheet.frames, 0),
  movingFrames: moving.sheet.frames.length,
  movingAliases: moving.aliases.length,
  rollbackQuery: "?unifiedAnimation=0",
});
