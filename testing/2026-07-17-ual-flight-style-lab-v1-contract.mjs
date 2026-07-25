import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  UAL_FLIGHT_LAB_VARIANTS,
  UAL_FLIGHT_STYLE_LAB_CONFIG,
} from "../values/ualFlightStyleLab.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const labRoot = resolve(root, "testing/animation-sandbox/ual-flight-style-lab-v1");
const supermanReviewRoot = resolve(
  root,
  "testing/blender-animation-lab-v1/review-drafts/superman-flight-push-layer-v1",
);
const runtimeRoots = [
  resolve(root, "sprites/character/survival-ual-player-v1/runtime"),
  resolve(root, "sprites/character/ual-native-player-v1/runtime"),
];
const requiredLabFiles = [
  "index.html",
  "flight.css",
  "flightLab.js",
  "flightAssets.js",
  "flightTimeline.js",
  "flightInput.js",
  "flightBackdrop.js",
  "flightEffects.js",
  "flightRenderer.js",
  "flightUi.js",
  "readme.md",
];

assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.version, "ual-flight-style-lab-v1-20260718");
assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.defaultCharacterId, "survivalUal");
assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.defaultVariantId, "C");
assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.stage.tileSizePx, 94);
assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.bodyFallback.displaySizePx, 109);
assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.bodyFallback.colliderWidthPx, 31);
assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.bodyFallback.colliderHeightPx, 75);
assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.productionChanged, false);
assert.deepEqual(UAL_FLIGHT_LAB_VARIANTS.map(variant => variant.id), ["A", "B", "C", "D", "E"]);
assert.deepEqual(
  UAL_FLIGHT_LAB_VARIANTS.filter(variant => variant.boardMode !== "off").map(variant => variant.id),
  ["B", "C", "E"],
);
assert.equal(UAL_FLIGHT_LAB_VARIANTS.find(variant => variant.id === "D").boardMode, "off");
assert.equal(UAL_FLIGHT_LAB_VARIANTS.find(variant => variant.id === "D").motionByPhase.cruise.action, "superman-flight");
assert.equal(UAL_FLIGHT_LAB_VARIANTS.find(variant => variant.id === "D").hitboxMode, "review-flight");
assert.equal(UAL_FLIGHT_LAB_VARIANTS.find(variant => variant.id === "E").boardMode, "hybrid");
assert.equal(UAL_FLIGHT_LAB_VARIANTS.find(variant => variant.id === "C").motionByPhase.cruise.action, "crouch");
assert.equal(
  UAL_FLIGHT_STYLE_LAB_CONFIG.reviewActions.survivalUal["superman-flight"].sourceActionId,
  "superman-flight",
);
assert.equal(UAL_FLIGHT_STYLE_LAB_CONFIG.fallbackActions["superman-flight"], "wall-push");

for (const [name, rule] of Object.entries(UAL_FLIGHT_STYLE_LAB_CONFIG.controls)) {
  assert.ok(Number.isFinite(rule.min), `${name} min must be finite`);
  assert.ok(Number.isFinite(rule.max), `${name} max must be finite`);
  assert.ok(rule.default >= rule.min && rule.default <= rule.max, `${name} default out of bounds`);
}

for (const runtimeRoot of runtimeRoots) {
  const manifest = JSON.parse(readFileSync(resolve(runtimeRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.frame_width, 256);
  assert.equal(manifest.frame_height, 256);
  assert.equal(manifest.display_size_px, 109);
  assert.equal(manifest.target_visible_height_tiles, 0.8);
  assert.equal(manifest.player_body.width_px, 31);
  assert.equal(manifest.player_body.height_px, 75);
  for (const actionId of UAL_FLIGHT_STYLE_LAB_CONFIG.actions.filter(action => action !== "superman-flight")) {
    const action = manifest.actions[actionId];
    assert.ok(action, `${runtimeRoot} missing ${actionId}`);
    assert.equal(action.frame_width, 256);
    assert.equal(action.frame_height, 256);
    const sheetPath = resolve(runtimeRoot, action.file);
    assert.equal(existsSync(sheetPath), true, `missing ${sheetPath}`);
    assert.ok(statSync(sheetPath).size > 1_000, `unexpectedly small ${sheetPath}`);
  }
  for (const variant of UAL_FLIGHT_LAB_VARIANTS) {
    for (const spec of Object.values(variant.motionByPhase)) {
      const actionId = UAL_FLIGHT_STYLE_LAB_CONFIG.fallbackActions[spec.action] || spec.action;
      const action = manifest.actions[actionId];
      assert.ok(action, `${variant.id} references missing ${spec.action}`);
      assert.ok(spec.from >= 0 && spec.from < action.frame_count, `${variant.id} bad start frame`);
      assert.ok(spec.to >= spec.from && spec.to < action.frame_count, `${variant.id} bad end frame`);
    }
  }
}

const supermanManifest = JSON.parse(readFileSync(resolve(supermanReviewRoot, "runtime/manifest.json"), "utf8"));
const supermanReview = JSON.parse(readFileSync(resolve(supermanReviewRoot, "review-manifest.json"), "utf8"));
const supermanAction = supermanManifest.actions["superman-flight"];
assert.equal(supermanManifest.productionChanged, false);
assert.equal(supermanReview.productionChanged, false);
assert.equal(supermanAction.frame_width, 256);
assert.equal(supermanAction.frame_height, 256);
assert.equal(supermanAction.frame_count, 36);
assert.equal(supermanAction.columns, 12);
assert.equal(supermanAction.fps, 16);
assert.equal(existsSync(resolve(supermanReviewRoot, "runtime", supermanAction.file)), true);
assert.ok(statSync(resolve(supermanReviewRoot, "runtime", supermanAction.file)).size > 1_000);
assert.equal(supermanReview.flightHitbox.visualHullWidthPx, 75);
assert.equal(supermanReview.flightHitbox.visualHullHeightPx, 31);
assert.equal(supermanReview.flightHitbox.physicsAabbWidthPx, 70);
assert.equal(supermanReview.flightHitbox.physicsAabbHeightPx, 34);
assert.equal(supermanAction.rig_markers.frames["0"].pelvis.length, 2);

for (const file of requiredLabFiles) {
  const filePath = resolve(labRoot, file);
  assert.equal(existsSync(filePath), true, `missing lab file ${file}`);
  if (file.endsWith(".js")) {
    const lineCount = readFileSync(filePath, "utf8").split(/\r?\n/).length;
    assert.ok(lineCount <= 300, `${file} exceeds 300 lines`);
  }
}

const html = readFileSync(resolve(labRoot, "index.html"), "utf8");
const labSource = readFileSync(resolve(labRoot, "flightLab.js"), "utf8");
const uiSource = readFileSync(resolve(labRoot, "flightUi.js"), "utf8");
assert.match(html, /id="variant-buttons"/);
assert.match(html, /id="phase-buttons"/);
assert.match(html, /id="show-collider"/);
assert.match(html, /id="board-y-control"/);
assert.match(html, /id="copy-link"/);
assert.match(labSource, /__UAL_FLIGHT_STYLE_LAB_V1__/);
assert.match(labSource, /productionChanged: false/);
assert.match(uiSource, /URLSearchParams/);
assert.doesNotMatch(labSource, /world\/playScene|PlayScene|localStorage\.setItem/);

console.log("UAL_FLIGHT_STYLE_LAB_V1_CONTRACT_OK variants=5 characters=2 productionChanged=false");
