import assert from "node:assert/strict";
import { SHADOW_MINER_CONFIG } from "../values/shadowMiner.js";
import { resolveShadowMinerGroundedPose } from "../world/playScene/shadowMinerGrounding.js";

const tileSize = 64;
const scene = {
  config: { tileSize },
  worldModel: {
    inBounds: (tx, ty) => tx >= 0 && tx < 20 && ty >= 0 && ty < 20,
    isSolid: (tx, ty) => tx === 5 && ty === 6,
  },
};
const replayPose = { time: 200, x: 5.35 * tileSize, y: 4 * tileSize, textureKey: "player" };
const grounded = resolveShadowMinerGroundedPose(scene, SHADOW_MINER_CONFIG, replayPose);
assert.equal(grounded.x, replayPose.x, "grounding preserves replay travel on the X axis");
assert.equal(grounded.y, 6 * tileSize, "spawn lands on the supported tile surface");
assert.equal(grounded.tileX, 5);
assert.equal(grounded.tileY, 5);
assert.equal(grounded.grounded, true);

const unsupportedScene = {
  config: { tileSize },
  worldModel: { inBounds: () => true, isSolid: () => false },
};
assert.equal(
  resolveShadowMinerGroundedPose(unsupportedScene, SHADOW_MINER_CONFIG, replayPose),
  null,
  "an unsupported replay pose cannot create a stationary airborne Shadowminer",
);

const fixtureWithoutCollision = resolveShadowMinerGroundedPose(
  { config: { tileSize }, worldModel: {} },
  SHADOW_MINER_CONFIG,
  replayPose,
);
assert.notEqual(fixtureWithoutCollision, replayPose);
assert.deepEqual(fixtureWithoutCollision, replayPose, "headless fixtures retain their recorded pose");
console.log("SHADOW_MINER_GROUNDING_CONTRACT_PASS: supported spawn, unsupported rejection, replay compatibility");
