import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GAME_CONFIG } from "../values/gameConfig.js";
import { PLAYER_KINEMATIC_MOTION_CONFIG } from "../values/playerKinematicMotion.js";
import { PLAYER_STATS_CONFIG } from "../values/playerStats.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import { UAL_WALK_REVIEW_CONFIG } from "../values/ualWalkReviewConfig.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = resolve(root, "testing/animation-sandbox/ual-walk-review-v1");
const manifest = JSON.parse(readFileSync(resolve(reviewRoot, "assets/manifest.json"), "utf8"));
const renderer = readFileSync(resolve(root, "ai-tools/2026-07-16-render-ual-native-player.py"), "utf8");

assert.equal(GAME_CONFIG.tileSize, 94);
assert.equal(PLAYER_STATS_CONFIG.walkSpeedPxPerSec, 160);
assert.equal(PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.walk.strideTilesPerCycle, 1.55);
assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.displaySizePx, 109);
assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx, 31);
assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyHeightPx, 75);
assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.targetVisibleHeightTiles, 0.8);
assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.sourceClips.walk, "Jog_Fwd_Loop");

assert.equal(manifest.production_runtime_unchanged, false);
assert.equal(manifest.promoted_action, "walk-review-jog");
assert.equal(UAL_WALK_REVIEW_CONFIG.promotedCandidateId, "jog");
assert.equal(UAL_WALK_REVIEW_CONFIG.defaultCadenceMode, "game-matched");
assert.equal(UAL_WALK_REVIEW_CONFIG.candidates.length, 5);
assert.equal(UAL_WALK_REVIEW_CONFIG.viewScales.live, 1);
assert.equal(UAL_WALK_REVIEW_CONFIG.viewScales.inspection, 2);
assert.equal(UAL_WALK_REVIEW_CONFIG.inspection.zoomGroundOffsetPx, 30);
assert.deepEqual(
  UAL_WALK_REVIEW_CONFIG.candidates.map(({ id, actionId }) => [id, actionId]),
  [
    ["current", "walk-review-current"],
    ["formal", "walk-review-formal"],
    ["jog", "walk-review-jog"],
    ["sprint", "walk-review-sprint"],
    ["carry", "walk-review-carry"],
  ],
);
assert.equal(Object.hasOwn(manifest.actions, "walk-review-crouched"), false);
assert.equal(Object.hasOwn(manifest.actions, "walk-review-heavy"), false);

for (const candidate of UAL_WALK_REVIEW_CONFIG.candidates) {
  const metadata = manifest.actions[candidate.actionId];
  assert.ok(metadata, `missing candidate metadata: ${candidate.actionId}`);
  assert.equal(metadata.frame_width, 256);
  assert.equal(metadata.frame_height, 256);
  assert.equal(metadata.fps, 30);
  assert.equal(metadata.loop, true);
  const assetPath = resolve(reviewRoot, "assets", metadata.file);
  assert.equal(existsSync(assetPath), true, `missing sheet: ${metadata.file}`);
  assert.ok(statSync(assetPath).size > 50_000, `unexpectedly small sheet: ${metadata.file}`);
}

assert.match(renderer, /WALK_REVIEW_SPECS = \(/);
assert.match(renderer, /if requested\s+else ACTION_SPECS/);
assert.equal(existsSync(resolve(reviewRoot, "index.html")), true);
assert.equal(existsSync(resolve(reviewRoot, "review.js")), true);
assert.equal(existsSync(resolve(reviewRoot, "reviewStageRenderer.js")), true);
assert.equal(existsSync(resolve(reviewRoot, "review.css")), true);
assert.equal(existsSync(resolve(reviewRoot, "readme.md")), true);
assert.match(readFileSync(resolve(reviewRoot, "index.html"), "utf8"), /ual-animation-tuning-lab-v2/);

console.log("UAL_WALK_REVIEW_CONTRACT_OK candidates=5 promoted=walk-review-jog");
