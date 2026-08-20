import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  destroyAnimationTileClearanceDiagnostics,
  resolveAnimationTileClearance,
} from "../player/AnimationTileClearanceResolver.js";
import {
  ANIMATION_TILE_CLEARANCE_POLICIES,
} from "../values/animationTileClearance.js";
import { COMPLEX_DIG_ANIMATIONS } from "../values/complexDigAnimations.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from
  "../values/survivalUalPlayerAssetProfile.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = relative => readFile(path.join(root, relative), "utf8");

function makeScene({ target = { tx: 6, ty: 5 }, solids = [] } = {}) {
  const solidKeys = new Set([`${target.tx},${target.ty}`, ...solids]);
  const body = { x: 534, y: 512, w: 31, h: 75, vx: 0 };
  return {
    scene: {
      config: { tileSize: 100 },
      playerController: {
        physicsBody: body,
        isGrounded: () => true,
        getMotionState: () => "idle",
      },
      worldModel: { isSolid: (tx, ty) => solidKeys.has(`${tx},${ty}`) },
    },
    body,
    solidKeys,
    target,
  };
}

const profile = {
  animationTileClearanceByAnimation: {
    legacy: ANIMATION_TILE_CLEARANCE_POLICIES.sideCanonical,
    expressive: ANIMATION_TILE_CLEARANCE_POLICIES.sideExpressiveHands,
    kick: ANIMATION_TILE_CLEARANCE_POLICIES.sideWideKick,
    "up-open": ANIMATION_TILE_CLEARANCE_POLICIES.upExpressive,
    "up-short": ANIMATION_TILE_CLEARANCE_POLICIES.upCanonical,
  },
};

{
  const fixture = makeScene();
  const bodyBefore = { ...fixture.body };
  const solidsBefore = [...fixture.solidKeys];
  const open = resolveAnimationTileClearance({
    scene: fixture.scene,
    profile,
    family: "side",
    animationKeys: ["kick", "expressive", "legacy"],
    fallback: "legacy",
    targetTile: fixture.target,
  });
  assert.deepEqual(open.animationKeys, ["kick", "expressive", "legacy"]);
  assert.equal(open.usedCanonicalFallback, false);
  assert.deepEqual(fixture.body, bodyBefore, "selection must not move the physics body");
  assert.deepEqual([...fixture.solidKeys], solidsBefore, "selection must not mutate tiles");
}

{
  const fixture = makeScene({ solids: ["6,4", "5,4", "4,4"] });
  const tight = resolveAnimationTileClearance({
    scene: fixture.scene,
    profile,
    family: "complex-side",
    animationKeys: ["kick", "expressive", "legacy"],
    fallback: "legacy",
    targetTile: fixture.target,
  });
  assert.deepEqual(tight.animationKeys, ["legacy"]);
  assert.deepEqual(
    tight.rejected.map(entry => entry.animationKey),
    ["kick", "expressive"],
  );
}

{
  const fixture = makeScene();
  fixture.body.vx = 120;
  fixture.scene.playerController.getMotionState = () => "walk-right";
  const moving = resolveAnimationTileClearance({
    scene: fixture.scene,
    profile,
    family: "side",
    animationKeys: ["kick", "expressive", "legacy"],
    fallback: "legacy",
    targetTile: fixture.target,
  });
  assert.deepEqual(moving.animationKeys, ["legacy"]);
  assert.ok(moving.rejected.every(entry => /motion-moving/.test(entry.reason)));
}

{
  const fixture = makeScene({
    target: { tx: 5, ty: 4 },
    solids: ["4,4", "6,4"],
  });
  const up = resolveAnimationTileClearance({
    scene: fixture.scene,
    profile,
    family: "up",
    animationKeys: ["up-open"],
    fallback: "up-short",
    targetTile: fixture.target,
  });
  assert.deepEqual(up.animationKeys, ["up-short"]);
  assert.equal(up.usedCanonicalFallback, true);
  assert.equal(up.rejected[0].reason, "occupied-target-left");

  const rollback = resolveAnimationTileClearance({
    scene: fixture.scene,
    profile,
    family: "up",
    animationKeys: ["up-open", "up-short"],
    fallback: "up-short",
    targetTile: fixture.target,
    search: "?animationClearance=0",
  });
  assert.equal(rollback.enabled, false);
  assert.deepEqual(rollback.animationKeys, ["up-open", "up-short"]);
}

for (const [id, clip] of Object.entries(COMPLEX_DIG_ANIMATIONS.clips)) {
  assert.ok(clip.clearance, `${id} lacks authored clearance metadata`);
  assert.ok(["hands", "feet"].includes(clip.clearance.strikingLimb));
  assert.ok(clip.clearance.contactMarker);
  assert.ok(clip.clearance.reachTiles);
  assert.ok(clip.clearance.plantedFoot);
  assert.ok(clip.clearance.allowedMotion.length > 0);
  assert.ok(Number.isFinite(clip.clearance.fallbackPriority));
}

const survival = SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
assert.equal(survival.complexDigUpAnimationKeys.length, 2);
assert.notEqual(
  survival.complexDigUpAnimationKeys[0],
  survival.complexDigUpAnimationKeys[1],
  "UP needs two distinct authored clips",
);
assert.ok(
  survival.complexDigSideAnimationKeys.some(key => (
    survival.digSidewaysHitAnims.includes(key)
  )),
  "the valued legacy SIDE clip must be bridged into the contextual sequence",
);
assert.ok(
  survival.movingSideDigAnimationMap[survival.digSidewaysHitAnims[0]],
  "moving SIDE must retain its dedicated rooted variant",
);

const [gameplaySource, caveSource, lifecycleSource] = await Promise.all([
  source("world/playScene/PlaySceneGameplay.js"),
  source("world/playScene/CaveActionAnimationRuntime.js"),
  source("world/playScene/PlaySceneLifecycle.js"),
]);
assert.match(gameplaySource, /resolveAnimationTileClearance/);
assert.match(caveSource, /resolveAnimationTileClearance/);
assert.match(gameplaySource, /const stationaryAnimKey = animKey/);
assert.match(gameplaySource, /postActionFacingFlipX = quickslashDirectionX < 0/);
assert.match(lifecycleSource, /destroyAnimationTileClearanceDiagnostics/);

destroyAnimationTileClearanceDiagnostics(null);
console.log("ANIMATION_TILE_CLEARANCE_CONTRACT_OK");
