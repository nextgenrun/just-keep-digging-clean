import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { RewardFlightMotionSystem } from "../systems/visual/RewardFlightMotionSystem.js";
import { RESOURCE_KEYS } from "../values/resourceTypes.js";
import {
  REWARD_FLIGHT_CHANNELS,
  REWARD_FLIGHT_MOTION_CONFIG,
} from "../values/rewardFlightMotions.js";

const { profiles } = REWARD_FLIGHT_MOTION_CONFIG;
assert.equal(profiles.length, 24, "the shared reward flight library must expose exactly twenty-four arcs");
assert.equal(new Set(profiles.map(profile => profile.id)).size, 24);
assert.equal(new Set(profiles.map(profile => profile.lootWeight)).size, 24);
assert.equal(new Set(profiles.map(profile => profile.xpWeight)).size, 24);
assert.ok(profiles.every(profile => profile.lootWeight > 0 && profile.xpWeight > 0));
assert.deepEqual(
  profiles.filter(profile => /^(slingshot|halo-dive)-/.test(profile.id))
    .map(profile => profile.amountAffinity),
  ["surge", "surge", "surge", "surge"],
);
assert.deepEqual(
  Object.keys(REWARD_FLIGHT_MOTION_CONFIG.resourceFamilies).sort(),
  [...RESOURCE_KEYS].sort(),
  "every mineable inventory resource needs a motion affinity",
);

const start = Object.freeze({ x: 320, y: 280 });
const target = Object.freeze({ x: 1180, y: 670 });
const selector = new RewardFlightMotionSystem();
const topProfile = context => selector.describeTriggerRates({ start, target, ...context })
  .reduce((best, entry) => entry.triggerRate > best.triggerRate ? entry : best);

assert.equal(topProfile({
  channel: REWARD_FLIGHT_CHANNELS.loot,
  resourceType: "dirt",
  amount: 1,
}).profileId, "low-drift-left");
assert.equal(topProfile({
  channel: REWARD_FLIGHT_CHANNELS.loot,
  resourceType: "gold",
  amount: 5,
}).profileId, "late-hook-right");
assert.equal(topProfile({
  channel: REWARD_FLIGHT_CHANNELS.loot,
  resourceType: "magmaCrystal",
  amount: 20,
}).profileId, "comet-left");
assert.equal(topProfile({
  channel: REWARD_FLIGHT_CHANNELS.loot,
  resourceType: "silver",
  amount: 20,
  isStarResource: true,
}).profileId, "comet-right");
assert.equal(topProfile({
  channel: REWARD_FLIGHT_CHANNELS.xp,
  resourceType: "dirt",
  xpGained: 30,
}).profileId, "low-drift-left");
assert.equal(topProfile({
  channel: REWARD_FLIGHT_CHANNELS.xp,
  resourceType: "gold",
  xpGained: 750,
}).profileId, "late-hook-right");
assert.equal(topProfile({
  channel: REWARD_FLIGHT_CHANNELS.xp,
  resourceType: "magmaCrystal",
  xpGained: 2800,
}).profileId, "comet-left");

const firstPlan = selector.createPlan({
  channel: REWARD_FLIGHT_CHANNELS.xp,
  start,
  target,
  resourceType: "gold",
  xpGained: 750,
  index: 0,
});
const secondPlan = selector.createPlan({
  channel: REWARD_FLIGHT_CHANNELS.xp,
  start,
  target,
  resourceType: "gold",
  xpGained: 750,
  index: 1,
});
assert.ok(firstPlan && secondPlan);
assert.notEqual(firstPlan.profileId, secondPlan.profileId, "immediate arc repetition must be suppressed");
assert.notDeepEqual(firstPlan.control1, secondPlan.control1);
assert.deepEqual(firstPlan.sample(0), start);
assert.deepEqual(firstPlan.sample(1), target);
assert.ok(Number.isFinite(firstPlan.sample(0.5).x));
assert.ok(firstPlan.durationMs >= REWARD_FLIGHT_MOTION_CONFIG.geometry.durationMinimumMs);
assert.ok(firstPlan.durationMs <= REWARD_FLIGHT_MOTION_CONFIG.geometry.durationMaximumMs);

const contexts = [
  { channel: REWARD_FLIGHT_CHANNELS.loot, resourceType: "stone", amount: 1 },
  { channel: REWARD_FLIGHT_CHANNELS.loot, resourceType: "gold", amount: 5 },
  { channel: REWARD_FLIGHT_CHANNELS.loot, resourceType: "magmaCrystal", amount: 20 },
  { channel: REWARD_FLIGHT_CHANNELS.xp, resourceType: "dirt", xpGained: 30 },
  { channel: REWARD_FLIGHT_CHANNELS.xp, resourceType: "gold", xpGained: 750 },
  { channel: REWARD_FLIGHT_CHANNELS.xp, xpGained: 2800, levelUp: true },
];
for (const context of contexts) {
  const rates = selector.describeTriggerRates({ start, target, ...context });
  assert.equal(rates.length, 24);
  assert.ok(rates.every(entry => entry.triggerRate >= 0));
  assert.ok(rates.some(entry => entry.triggerRate > 0));
  assert.ok(Math.abs(rates.reduce((sum, entry) => sum + entry.triggerRate, 0) - 1) < 1e-10);
  if (context.levelUp) {
    const bandByProfile = new Map(profiles.map(profile => [profile.id, profile.amountAffinity]));
    assert.ok(rates.filter(entry => entry.triggerRate > 0)
      .every(entry => bandByProfile.get(entry.profileId) === "surge"));
  }
}

const [lootSource, xpSource, setupSource, lifecycleSource] = await Promise.all([
  readFile(new URL("../systems/visual/LootPickupFxSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/XPGatheringFxSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneLifecycle.js", import.meta.url), "utf8"),
]);
assert.match(lootSource, /REWARD_FLIGHT_CHANNELS\.loot/);
assert.match(lootSource, /this\.motionProvider\.createPlan/);
assert.match(lootSource, /isStarResource/);
assert.match(xpSource, /REWARD_FLIGHT_CHANNELS\.xp/);
assert.match(xpSource, /xpGained: details\.xpGained/);
assert.match(xpSource, /skyTileRarity/);
assert.match(setupSource, /new RewardFlightMotionSystem/);
assert.match(lifecycleSource, /rewardFlightMotionSystem/);
assert.ok(lootSource.split(/\r?\n/).length <= 300);
assert.ok(xpSource.split(/\r?\n/).length <= 300);

console.log("REWARD_FLIGHT_MOTION_LIBRARY_OK profiles=24 channels=loot,xp");
