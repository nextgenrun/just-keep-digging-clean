import assert from "node:assert/strict";
import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { createReviewWorld } from "./dynamic-event-sandbox/reviewWorld.js";
import { DYNAMIC_EVENT_REVIEW } from "../values/dynamicEventReview.js";
import { createReviewRandom, withReviewRandom } from "./dynamic-event-sandbox/reviewSupport.js";

function fixture() {
  const world = createReviewWorld(300), ts = DYNAMIC_EVENT_REVIEW.world.tileSize;
  const body = { x: 36 * ts, y: (world.standingTy + 1) * ts - 75, w: 31, h: 75, vx: 0 };
  const metrics = { hits: 0, reactions: 0, complete: 0, saves: 0 };
  let now = 10000;
  const graphics = () => ({ clear() {}, lineStyle() {}, lineBetween() {}, destroy() {}, setDepth() { return this; } });
  const scene = {
    config: { ...DYNAMIC_EVENT_REVIEW.world, seed: 7331 }, worldModel: world, time: { now },
    add: { graphics, circle(x, y) { return { x, y, setDepth() { return this; }, destroy() {} }; } },
    tweens: { add({ onComplete }) { onComplete?.(); } },
    worldRenderer: { applyTileUpdate() {} },
    upgradeSystem: { getUpgradeLevel: () => 0 },
    playerController: {
      physicsBody: body, getPlayerTile: () => ({ tx: Math.floor((body.x + body.w / 2) / ts), ty: Math.floor((body.y + body.h / 2) / ts) }),
      drainAllGemPower() { metrics.hits++; return 100; }, applyExternalKnockback() {},
    },
    retentionProgressSystem: { getJournalSnapshot: () => ({ stats: { earthquakesSurvived: 0 } }),
      recordEarthquake() { metrics.complete++; } },
    playPlayerImpactReaction() { metrics.reactions++; },
    queueDugTilesSave() { metrics.saves++; },
  };
  const random = createReviewRandom(1337);
  const system = withReviewRandom(random, () => new EarthquakeSystem(scene, EARTHQUAKE_CONFIG, () => now));
  return { system, world, body, scene, metrics, ts, random, tick(dt = 25) {
    now += dt; scene.time.now = now; withReviewRandom(random, () => system.update(dt));
  } };
}

const parked = fixture();
assert.equal(withReviewRandom(parked.random, () => parked.system.start("minor")), true);
for (let i = 0; i < 2800 && parked.metrics.complete === 0; i++) parked.tick();
assert.equal(parked.metrics.complete, 1);
assert.ok(parked.system.health.rocks >= 1, "even a minor quake drops a real rock when a local ceiling exists");
assert.ok(parked.metrics.hits >= 1, "remaining in a marked lane must be dangerous");
assert.equal(parked.metrics.reactions, parked.metrics.hits);
assert.ok(parked.system.health.queued <= EARTHQUAKE_CONFIG.localHazards.budget.minor);

const dodge = fixture();
dodge.system.start("minor");
while (!dodge.system.caveIns.length) dodge.tick();
const warnedX = dodge.system.caveIns[0].tx;
dodge.body.x = (warnedX + 4) * dodge.ts;
for (let i = 0; i < 110; i++) dodge.tick();
assert.equal(dodge.metrics.hits, 0, "walking out of a committed lane avoids its first rock");

const floor = fixture();
const sourceTy = floor.world.standingTy - 5, oldFloor = floor.world.standingTy + 1;
floor.world.setTile(36, sourceTy, TILE_TYPES.AIR);
floor.system._spawnFallingRock({ id: 1, tx: 36, ty: sourceTy, landingTy: oldFloor }, TILE_TYPES.STONE);
floor.world.setTile(36, oldFloor, TILE_TYPES.AIR);
floor.world.setTile(36, oldFloor + 1, TILE_TYPES.AIR);
floor.body.x = 45 * floor.ts;
for (let i = 0; i < 140 && floor.system.fallingRocks.length; i++) {
  floor.system._updateFallingRocks(25);
  if (floor.system.fallingRocks[0]) assert.ok(floor.system.fallingRocks[0].endY > oldFloor * floor.ts,
    "a dug-away floor does not make a rock stop in mid-air");
}
assert.equal(floor.system.fallingRocks.length, 0);

const cover = fixture();
cover.world.setTile(36, sourceTy, TILE_TYPES.AIR);
cover.world.setTile(36, sourceTy + 2, TILE_TYPES.STONE);
cover.system._spawnFallingRock({ id: 1, tx: 36, ty: sourceTy, landingTy: oldFloor }, TILE_TYPES.STONE);
for (let i = 0; i < 100 && cover.system.fallingRocks.length; i++) cover.system._updateFallingRocks(25);
assert.equal(cover.metrics.hits, 0, "solid cover intercepts a boulder");
assert.equal(cover.system.fallingRocks.length, 0);

console.log(JSON.stringify({ passed: "minor quake danger, fixed-lane dodge, removed floor and solid cover",
  minor: parked.system.health, dodgeHits: dodge.metrics.hits, coverHits: cover.metrics.hits }));