import assert from "node:assert/strict";

import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { getUniquePlayerSheetEntries } from "../player/PlayerAssetSheetCatalog.js";
import { PlayerKinematicMotionSystem } from
  "../systems/visual/PlayerKinematicMotionSystem.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from
  "../values/survivalUalPlayerAssetProfile.js?rev=20260815-contract-repair-v2";

const availableSheets = new Set(
  getUniquePlayerSheetEntries(profile).map((entry) => entry.key),
);
const registered = new Map();
createUalNativePlayerAnimations({
  textures: {
    exists: (key) => availableSheets.has(key),
    get: () => ({ setFilter: () => {} }),
  },
  anims: {
    exists: (key) => registered.has(key),
    create: (animation) => registered.set(animation.key, animation),
  },
}, profile);

assert.equal(registered.size, 174, "the accepted animation registry changed");
assert.equal(
  [...registered.values()].reduce((sum, animation) => sum + animation.frames.length, 0),
  4034,
  "the approved frame order/count changed",
);
assert.equal(
  registered.get(profile.leanAgainstWallAnim)?.frames.length,
  profile.leanAgainstWallFrames.length,
  "lean-wall animation was not registered from a loaded texture",
);
assert.equal(profile.leanAgainstWallSheet, profile.idleSheet);
assert.equal(profile.sourceClips.run.includes("MINER_run"), false);
assert.equal(
  profile.displaySizePxByAnimation[profile.quickslashAnim] ?? profile.displaySizePx,
  101,
);
assert.equal(profile.displaySizePxByAnimation[profile.idleAnim], 101);
assert.equal(profile.displaySizePxByAnimation[profile.walkStartAnim], 101);
assert.equal(profile.displaySizePxByAnimation[profile.walkLoopAnim], 104);
assert.equal(profile.displaySizePxByAnimation[profile.walkRunAnim], 122);
assert.equal(profile.displaySizePxByAnimation[profile.walkStopAnim], 101);
assert.equal(
  profile.displaySizePxByAnimation[profile.animationPolishConfig.groundHandoff.start.key],
  119,
  "the planted start bridge lost its calibrated scale",
);
for (const key of new Set(
  profile.animationPolishConfig.groundHandoff.stopAnimationKeyByOutgoingJogFrame,
)) {
  assert.equal(
    profile.displaySizePxByAnimation[key],
    123,
    `${key} lost its phase-matched stop scale`,
  );
}

const displaySizes = Object.values(profile.displaySizePxByAnimation);
assert.ok(Math.min(...displaySizes) >= 101, "character display fell below the reviewed detail floor");
assert.ok(Math.max(...displaySizes) <= 123, "character display exceeded the reviewed detail ceiling");
assert.equal(profile.playerBodyWidthPx, 31, "visual polish changed collision width");
assert.equal(profile.playerBodyHeightPx, 75, "visual polish changed collision height");

const runStride = profile.strideTilesPerCycleByAnimation[profile.walkRunAnim];
assert.equal(runStride, 1.12);
const body = { x: 0, y: 0, vx: 0, vy: 0 };
const motion = new PlayerKinematicMotionSystem(
  { config: { tileSize: GAME_CONFIG.tileSize } },
  {},
  { physicsBody: body },
  profile,
);
const runScale = motion.resolveLocomotionTimeScale(
  profile.walkRunAnim,
  registered.get(profile.walkRunAnim),
  200,
);
const expected = (profile.walkRunFrames.length / profile.walkRunAnimationFps)
  * 200 / (runStride * GAME_CONFIG.tileSize);
assert.ok(Math.abs(runScale - expected) < 0.0001);
assert.ok(runScale > 1.77 && runScale < 1.78);

for (const contact of Object.values(profile.actionContactByAnimation)) {
  if (contact?.sourceAction?.includes("moving-") || contact?.sourceAction?.includes("body-locked")) {
    assert.equal(contact.visualAlignmentEnabled, false, "body authority was replaced by visual drift");
  }
}

console.log(JSON.stringify({
  result: "SURVIVAL_ANIMATION_GLOBAL_POLISH_CONTRACT_OK",
  animations: registered.size,
  referencedFrames: 4034,
  runStrideTiles: runStride,
  runTimeScaleAt200PxPerSec: Number(runScale.toFixed(3)),
  displaySizeRangePx: [Math.min(...displaySizes), Math.max(...displaySizes)],
  locomotionDisplaySizesPx: {
    idle: profile.displaySizePxByAnimation[profile.idleAnim],
    start: profile.displaySizePxByAnimation[profile.walkStartAnim],
    walk: profile.displaySizePxByAnimation[profile.walkLoopAnim],
    run: profile.displaySizePxByAnimation[profile.walkRunAnim],
    stop: profile.displaySizePxByAnimation[profile.walkStopAnim],
  },
  colliderPx: [profile.playerBodyWidthPx, profile.playerBodyHeightPx],
}, null, 2));
