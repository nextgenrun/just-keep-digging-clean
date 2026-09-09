import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { RewardFlightMotionSystem } from "../systems/visual/RewardFlightMotionSystem.js";
import { LootPickupFlightView } from "../systems/visual/LootPickupFlightView.js";
import { RewardPickupVisualResolver } from "../systems/visual/RewardPickupVisualResolver.js";
import {
  getRememberedResourcePickupVisual,
  getRememberedSpecialPickupVisual,
  rememberRewardPickupVisual,
} from "../systems/visual/RewardPickupContinuityState.js";
import {
  LOOT_PICKUP_PRESENTATION,
  resolveLootPickupMoment,
} from "../values/lootPickupPresentation.js";
import {
  REWARD_FLIGHT_CHANNELS,
  REWARD_FLIGHT_MOTION_CONFIG,
} from "../values/rewardFlightMotions.js";
import { GEM_POWER_BLOCK_TIERS } from "../values/specialBlocks.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../values/starIdentityLibrary.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";

class FakeTexture {
  constructor() { this.frames = new Set(); }
  has(name) { return this.frames.has(name); }
  add(name) { this.frames.add(name); }
}

const atlasKeys = [
  WORLD_VISUAL_SEMANTIC_ASSETS.resources.atlas.key,
  WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.beautyAtlas.key,
  LOOT_PICKUP_PRESENTATION.assets.soilMinis.key,
];
const fakeTextures = new Map(atlasKeys.map(key => [key, new FakeTexture()]));
const scene = {
  textures: {
    exists: key => fakeTextures.has(key),
    get: key => fakeTextures.get(key),
  },
};
const resolver = new RewardPickupVisualResolver(scene);

const resourceTypes = Object.keys(WORLD_VISUAL_SEMANTIC_ASSETS.resources.frameStarts);
for (const resourceType of resourceTypes) {
  const descriptor = resolver.resolveResourcePickup({ resourceType, tileX: 17, tileY: 43 });
  assert.equal(descriptor.textureKey, WORLD_VISUAL_SEMANTIC_ASSETS.resources.atlas.key);
  assert.equal(descriptor.exactWorldFrame, true);
  assert.match(descriptor.frameName, /world-visual-v2-semantic-resource-/);
  assert.deepEqual(descriptor, resolver.resolveResourcePickup({
    resourceType, tileX: 17, tileY: 43,
  }), "descriptors are immutable values but need not be referentially cached");
}

for (const [resourceType, frameIndex] of Object.entries(
  LOOT_PICKUP_PRESENTATION.assets.soilMinis.frameByResource,
)) {
  const descriptor = resolver.resolveResourcePickup({ resourceType, tileX: 2, tileY: 9 });
  assert.equal(descriptor.textureKey, LOOT_PICKUP_PRESENTATION.assets.soilMinis.key);
  assert.equal(descriptor.frameIndex, frameIndex);
  assert.equal(descriptor.sourceId, "authored-soil-mini-atlas");
  assert.equal(descriptor.exactWorldFrame, false);
}

const specialTypes = [
  TILE_TYPES.SPEED_BLOCK,
  TILE_TYPES.XP_BLOCK,
  TILE_TYPES.BERSERK_BLOCK,
  TILE_TYPES.COMBO_BLOCK,
  TILE_TYPES.LEGEND_BLOCK,
  TILE_TYPES.ANCIENT_RELIC_CACHE,
];
for (const tileType of specialTypes) {
  const descriptor = resolver.resolveSpecialPickup({ tileType, depthTiles: 500 });
  assert.equal(descriptor.textureKey, WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.beautyAtlas.key);
  assert.equal(descriptor.exactWorldFrame, true);
}
for (const tier of GEM_POWER_BLOCK_TIERS) {
  const descriptor = resolver.resolveSpecialPickup({
    tileType: TILE_TYPES.GEM_POWER_BLOCK,
    gemPowerTierId: tier.id,
  });
  assert.equal(descriptor.frameIndex, tier.semanticFrame);
  assert.equal(descriptor.gemPowerTierId, tier.id);
}

const continuityScene = {};
const rememberedResource = resolver.resolveResourcePickup({
  resourceType: "gold", tileX: 17, tileY: 43,
});
const rememberedSpecial = resolver.resolveSpecialPickup({
  tileType: TILE_TYPES.GEM_POWER_BLOCK, gemPowerTierId: "gp1000",
});
assert.equal(rememberRewardPickupVisual(continuityScene, {
  descriptor: rememberedResource, resourceType: "gold",
}), true);
assert.equal(rememberRewardPickupVisual(continuityScene, {
  descriptor: rememberedSpecial, tileType: TILE_TYPES.GEM_POWER_BLOCK,
}), true);
assert.strictEqual(getRememberedResourcePickupVisual(continuityScene, "gold"), rememberedResource);
assert.strictEqual(
  getRememberedSpecialPickupVisual(continuityScene, TILE_TYPES.GEM_POWER_BLOCK),
  rememberedSpecial,
);

const soilPng = await readFile(new URL(
  `../${LOOT_PICKUP_PRESENTATION.assets.soilMinis.path.split("?")[0]}`,
  import.meta.url,
));
assert.equal(soilPng.subarray(1, 4).toString("ascii"), "PNG");
assert.equal(soilPng.readUInt32BE(16), 192);
assert.equal(soilPng.readUInt32BE(20), 192);
assert.equal(soilPng[25], 6, "soil mini atlas must preserve RGBA transparency");

const profileBandIndex = new Map(REWARD_FLIGHT_MOTION_CONFIG.profiles.map(profile => [
  profile.id,
  REWARD_FLIGHT_MOTION_CONFIG.amountBandOrder.indexOf(profile.amountAffinity),
]));
assert.equal(REWARD_FLIGHT_MOTION_CONFIG.profiles.length, 24);
assert.equal(resolveLootPickupMoment({
  isStarResource: true, skyTileRarity: 0, identityNewlyDiscovered: true,
}).id, "star-lift");
for (const pickupMoment of [
  LOOT_PICKUP_PRESENTATION.moments.routine,
  LOOT_PICKUP_PRESENTATION.moments.special,
  ...LOOT_PICKUP_PRESENTATION.moments.star,
]) {
  assert.equal(Object.isFrozen(pickupMoment.softEchoRatios), true);
  assert.ok(pickupMoment.softEchoAlpha > 0 && pickupMoment.softEchoAlpha <= 0.11);
  assert.ok(pickupMoment.softEchoDurationMs >= 150 && pickupMoment.softEchoDurationMs <= 240);
}
const originalMatchMedia = globalThis.matchMedia;
const reducedTweens = [];
globalThis.matchMedia = () => ({ matches: true });
try {
  const reducedRoot = {
    active: true, x: 0, y: 0, rotation: 0,
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale() { return this; }, setAlpha() { return this; },
    setRotation(value) { this.rotation = value; return this; },
  };
  const reducedView = new LootPickupFlightView({
    tweens: { add: tween => { reducedTweens.push(tween); return tween; } },
  }, { removeFlight: () => {} });
  const reducedFlight = {
    root: reducedRoot, trails: [], softEchoes: [], descriptor: {}, displaySize: 32,
  };
  assert.equal(reducedView.animate({
    flight: reducedFlight,
    motionPlan: {
      durationMs: 480, ease: "Linear", rotationRadians: 0,
      start: { x: 10, y: 20 }, target: { x: 110, y: 60 },
      route: {}, sample: () => { throw new Error("reduced motion must not sample routed path"); },
    },
    moment: LOOT_PICKUP_PRESENTATION.moments.star[5],
    targetProvider: () => ({ x: 110, y: 60 }),
  }), true);
  reducedFlight.state.t = 0.5;
  reducedTweens[0].onUpdate();
  assert.deepEqual({ x: reducedRoot.x, y: reducedRoot.y }, { x: 60, y: 40 });
  assert.equal(reducedFlight.softEchoes.length, 0);
} finally {
  globalThis.matchMedia = originalMatchMedia;
}
const context = {
  channel: REWARD_FLIGHT_CHANNELS.loot,
  start: { x: 220, y: 510 },
  target: { x: 1190, y: 670 },
  resourceType: "silver",
  amount: 1,
  isStarResource: true,
  skyTileRarity: 5,
  identityId: "astral-contract-star",
};
const firstRouter = new RewardFlightMotionSystem();
const secondRouter = new RewardFlightMotionSystem();
const recent = [];
const rareProfileIds = new Set();
for (let sequence = 0; sequence < 120; sequence += 1) {
  const first = firstRouter.createPlan(context);
  const second = secondRouter.createPlan(context);
  assert.equal(first.profileId, second.profileId);
  assert.deepEqual(first.route, second.route);
  assert.ok(profileBandIndex.get(first.profileId) >= 3, "rare Stars require surge routes");
  assert.equal(first.route.rareReward, true);
  rareProfileIds.add(first.profileId);
  assert.ok(!recent.includes(first.profileId), "profile repeated inside recent window");
  recent.push(first.profileId);
  if (recent.length > REWARD_FLIGHT_MOTION_CONFIG.selector.recentWindow) recent.shift();
  assert.deepEqual(first.sample(0), context.start);
  assert.deepEqual(first.sample(1), context.target);
  const cubic = t => {
    const u = 1 - t;
    return {
      x: u ** 3 * first.start.x + 3 * u ** 2 * t * first.control1.x
        + 3 * u * t ** 2 * first.control2.x + t ** 3 * first.target.x,
      y: u ** 3 * first.start.y + 3 * u ** 2 * t * first.control1.y
        + 3 * u * t ** 2 * first.control2.y + t ** 3 * first.target.y,
    };
  };
  const deviation = [0.23, 0.41, 0.63].reduce((maximum, t) => {
    const routed = first.sample(t);
    const base = cubic(t);
    return Math.max(maximum, Math.hypot(routed.x - base.x, routed.y - base.y));
  }, 0);
  assert.ok(deviation > 0.1, "route must depart from a static cubic");
}
assert.ok(rareProfileIds.size >= 8, "rare rewards need a broad deterministic path pool");
assert.ok([...rareProfileIds].some(id => /^(slingshot|halo-dive)-/.test(id)));

for (const routeContext of [
  { special: true, amount: 1, minimumBand: 2 },
  { levelUp: true, amount: 1, minimumBand: 3 },
  { isStarResource: true, skyTileRarity: 0, amount: 1, minimumBand: 2 },
]) {
  const router = new RewardFlightMotionSystem();
  for (let index = 0; index < 30; index += 1) {
    const plan = router.createPlan({
      channel: REWARD_FLIGHT_CHANNELS.loot,
      start: { x: 180, y: 460 }, target: { x: 1120, y: 650 },
      resourceType: "gold", ...routeContext,
    });
    assert.ok(profileBandIndex.get(plan.profileId) >= routeContext.minimumBand);
    assert.equal(plan.amountBand, "small", "routing semantics must not falsify amount telemetry");
  }
}

const sourceFiles = await Promise.all([
  "../systems/visual/LootPickupFxSystem.js",
  "../systems/visual/LootPickupFlightView.js",
  "../systems/visual/RewardFlightMotionSystem.js",
  "../systems/visual/RewardPickupVisualResolver.js",
  "../systems/visual/StarReleaseAssetCoordinator.js",
  "../systems/visual/SkyStarReleaseView.js",
  "../systems/mining/DigSystem.js",
  "../world/playScene/PlaySceneGameplay.js",
  "../world/playScene/PlaySceneUpdate.js",
  "../ui/overlays/UIInventoryHoldingsView.js",
  "../ui/overlays/UIInventorySpecialBlocks.js",
  "../ui/scenes/BootScene.js",
].map(url => readFile(new URL(url, import.meta.url), "utf8")));
const [lootSource, flightSource, motionSource, resolverSource, starSource, starViewSource,
  digSource, gameplaySource, updateSource, holdingsSource, specialsSource, bootSource] = sourceFiles;
for (const source of [lootSource, flightSource, motionSource, resolverSource]) {
  assert.ok(source.split(/\r?\n/).length <= 301);
}
assert.doesNotMatch(lootSource + flightSource + motionSource, /Math\.random|createCanvas|\.add\.circle|\.setTint/);
assert.doesNotMatch(lootSource + flightSource + resolverSource, /gainXP\(|grantResource|currentXP\s*=/);
assert.match(lootSource, /lightTextureKey/);
assert.match(flightSource, /descriptor\.textureFrame/);
assert.match(flightSource, /_createRoot\(\s*flight\.descriptor/);
assert.match(flightSource, /flight\.softEchoes\.push\(echo\)/);
assert.match(flightSource, /if \(this\.reducedMotion\) return;/);
assert.match(lootSource, /\.\.\.\(flight\.softEchoes \|\| \[\]\)/);
assert.match(lootSource, /rareRewardPath: plan\.route\?\.rareReward === true/);
assert.match(starSource, /textureKey: entry\.textureKey/);
assert.match(starSource, /lightTextureFrame: entry\.lightTextureFrame/);
assert.match(starSource, /if \(!detail\?\.progress\) return null/);
assert.doesNotMatch(starSource, /activeFloatingTexts\.push\(star\)/);
assert.match(starSource, /maxActiveReleases/);
assert.match(starViewSource, /this\._onComplete = null;[\s\S]*onComplete\?\.\(\);/);
assert.doesNotMatch(digSource, /^\s*skyTileRarity\s*=\s*0;/m);
assert.match(gameplaySource, /tileX: targetTile\.tx/);
assert.match(gameplaySource, /rewardTileType === TILE_TYPES\.SKY_TILE/);
assert.match(gameplaySource, /if \(isStarResource\) return/);
assert.match(updateSource, /showHeavyPunchLootPickup/);
assert.match(updateSource, /behindSpecialBlockDestroyed/);
assert.match(holdingsSource, /RewardPickupVisualResolver/);
assert.match(holdingsSource, /getRememberedResourcePickupVisual/);
assert.match(specialsSource, /resolveSpecialPickup/);
assert.match(specialsSource, /getRememberedSpecialPickupVisual/);
assert.match(bootSource, /LOOT_PICKUP_PRESENTATION\.assets\.soilMinis/);

const authoredVisualCount = resourceTypes.length * WORLD_VISUAL_SEMANTIC_ASSETS.resources.atlas.variants
  + LOOT_PICKUP_PRESENTATION.assets.soilMinis.frameCount
  + WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.beautyAtlas.frameCount
  + STAR_IDENTITY_LIBRARY_CONFIG.identities.length;
assert.ok(authoredVisualCount >= 326);
console.log(
  `LOOT_PICKUP_CONTINUITY_V2_OK visuals=${authoredVisualCount} routes=120 `
  + `stars=${STAR_IDENTITY_LIBRARY_CONFIG.identities.length}`,
);
