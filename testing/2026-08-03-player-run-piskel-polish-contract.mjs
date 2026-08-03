import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import {
  isPlayerAnimationFeatureEnabled,
  PLAYER_ANIMATION_POLISH as polish,
} from "../values/playerAnimationPolish.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from "../values/survivalUalPlayerAssetProfile.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const sourceConfig = readJson("values/playerAnimationPolishProduction.json");
const runtimeManifest = readJson("sprites/character/survival-ual-player-v1/runtime/manifest.json");
const piskelManifest = readJson("sprites/character/piskel/character-animation-manifest.json");
const buildReport = readJson(
  "sprites/character/piskel/runtime-active/metadata/player-animation-polish-build-report.json",
);
const driftReport = readJson(
  "sprites/character/piskel/runtime-active/contact-sheets/player-animation-polish-run-drift-report.json",
);

const sourcePath = resolve(root, sourceConfig.sources.run.file);
const runtimePath = resolve(
  root,
  "sprites/character/survival-ual-player-v1/runtime",
  polish.sheets.run.fileName,
);
const sourceHash = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
assert.equal(sourceHash, sourceConfig.runPolish.sourceSha256);
assert.notDeepEqual(readFileSync(runtimePath), readFileSync(sourcePath));
assert.equal(existsSync(runtimePath), true);
assert.ok(statSync(runtimePath).size > 100_000);

assert.equal(polish.version, "survival-player-animation-polish-v3-20260803");
assert.equal(polish.sheets.run.frameCount, 28);
assert.deepEqual(polish.sheets.run.frames, Array.from({ length: 28 }, (_, index) => index));
assert.equal(profile.runPolishEnabled, true);
assert.equal(profile.walkRunSheet, polish.sheets.run.sheetKey);
assert.deepEqual(profile.walkRunFrames, polish.sheets.run.frames);
assert.equal(profile.footstepRigAction, polish.runPolish.manifestAction);
assert.deepEqual(
  profile.footstepFrameIndices[profile.walkRunAnim],
  polish.runPolish.contactSequenceIndices,
);
assert.equal(isPlayerAnimationFeatureEnabled(polish.runPolish, ""), true);
assert.equal(isPlayerAnimationFeatureEnabled(polish.runPolish, "?animationPolish=0"), false);

const sourceAction = runtimeManifest.actions[polish.runPolish.sourceAction];
const polishedAction = runtimeManifest.actions[polish.runPolish.manifestAction];
assert.equal(sourceAction.file, "survival-ual-player-v1-run-sheet.webp");
assert.equal(polishedAction.file, polish.sheets.run.fileName);
assert.equal(polishedAction.frame_count, 28);
assert.equal(polishedAction.piskel_polish.uniform_scale, 1);
assert.equal(polishedAction.piskel_polish.uniform_translate_x, 5);
assert.deepEqual(
  polishedAction.piskel_polish.contact_sequence_indices,
  polish.runPolish.contactSequenceIndices,
);
assert.deepEqual(
  polishedAction.piskel_polish.contact_texture_frames,
  polish.runPolish.contactTextureFrames,
);
assert.equal(polishedAction.alpha_bounds.every((bounds) => bounds[3] === 248), true);

for (let frame = 0; frame < 28; frame += 1) {
  const sourceMarkers = sourceAction.rig_markers.frames[String(frame)];
  const derivedMarkers = polishedAction.rig_markers.frames[String(frame)];
  const dy = polishedAction.piskel_polish.vertical_shifts[frame];
  for (const markerName of polishedAction.rig_markers.marker_names) {
    assert.deepEqual(derivedMarkers[markerName], [
      Math.round((sourceMarkers[markerName][0] + 5) * 10_000) / 10_000,
      Math.round((sourceMarkers[markerName][1] + dy) * 10_000) / 10_000,
    ]);
  }
}

assert.equal(buildReport.run.sourceSha256, sourceHash);
assert.equal(buildReport.run.uniformScale, 1);
assert.equal(buildReport.run.uniformTranslateX, 5);
assert.ok(buildReport.run.maxPelvisCenterErrorPx < 1);
assert.equal(buildReport.run.polishedBottoms.every((bottom) => bottom === 248), true);
assert.equal(buildReport.run.contacts[0].textureFrame, 12);
assert.equal(buildReport.run.contacts[0].marker, "foot_r");
assert.equal(buildReport.run.contacts[1].textureFrame, 26);
assert.equal(buildReport.run.contacts[1].marker, "foot_l");
assert.equal(driftReport.drift.maxBottomDriftPx, 0);
assert.equal(driftReport.frames.some(({ clipped }) => clipped), false);

const entry = piskelManifest.animations.find(({ id }) => id === polish.sheets.run.id);
assert.ok(entry);
assert.deepEqual(entry.hitFrameGroups, [[12], [26]]);
assert.equal(entry.centeringPolicy.bottomTolerancePx, 0);
const piskel = readJson(polish.sheets.run.sourcePiskel);
assert.equal(JSON.parse(piskel.piskel.layers[0]).frameCount, 28);

const registered = new Map();
createUalNativePlayerAnimations({
  anims: {
    exists: (key) => registered.has(key),
    create: (config) => registered.set(config.key, config),
  },
  textures: { exists: () => false },
}, profile);
const runAnimation = registered.get(profile.walkRunAnim);
assert.equal(runAnimation.frames.length, 28);
assert.equal(runAnimation.frames.every(({ key }) => key === polish.sheets.run.sheetKey), true);

const packageSource = readFileSync(
  resolve(root, "pipelines/piskel/player_animation_polish_package.py"),
  "utf8",
);
const piskelDocumentSource = readFileSync(
  resolve(root, "tools/piskel-mcp/piskel_document.py"),
  "utf8",
);
assert.match(packageSource, /strict_transparent_rgb=True/);
assert.match(piskelDocumentSource, /exact=True/);

console.log("PLAYER_RUN_PISKEL_POLISH_CONTRACT_OK", {
  frames: polish.sheets.run.frameCount,
  rootShiftPx: buildReport.run.uniformTranslateX,
  pelvisCenterErrorPx: buildReport.run.maxPelvisCenterErrorPx,
  baselineDriftPx: driftReport.drift.maxBottomDriftPx,
  contactTextureFrames: polish.runPolish.contactTextureFrames,
  rollback: "?animationPolish=0",
});
