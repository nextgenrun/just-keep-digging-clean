import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  getNpcActivityPreloadAssets,
  NPC_ACTIVITY_CONFIG,
  resolveNpcActivitiesEnabled,
  resolveNpcWalkingEnabled,
} from "../values/npcActivityConfig.js";
import { NPCActivitySystem } from "../systems/visual/NPCActivitySystem.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const originalLocation = globalThis.location;
globalThis.location = { search: "" };

class FakeVisual {
  constructor(x = 0, y = 0, texture = null) {
    this.x = x;
    this.y = y;
    this.texture = texture;
    this.alpha = 1;
    this.visible = true;
    this.flipX = false;
  }

  setOrigin() { return this; }
  setDepth() { return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setAlpha(alpha) { this.alpha = alpha; return this; }
  setVisible(visible) { this.visible = visible; return this; }
  setTexture(texture) { this.texture = texture; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setRotation(rotation) { this.rotation = rotation; return this; }
  setFlipX(flipX) { this.flipX = flipX; return this; }
  destroy() { this.destroyed = true; }
}

const activityKeys = ASSET_KEYS.npcs.merchantActivities;
const preloadAssets = getNpcActivityPreloadAssets(activityKeys);
assert.equal(preloadAssets.length, 24, "six merchants need four promoted poses each");
assert.equal(
  new Set(preloadAssets.map(asset => asset.key)).size,
  preloadAssets.length,
  "every runtime pose key must be unique",
);
for (const asset of preloadAssets) {
  const relativePath = asset.path.split("?")[0];
  assert.ok(existsSync(`${root}${relativePath}`), `missing ${relativePath}`);
}

const manifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v8-activities/manifest.json`,
  "utf8",
));
assert.equal(manifest.runtimeApproved, true);
assert.equal(manifest.reviewOnly, false);
assert.equal(manifest.productionChanged, true);
assert.deepEqual(manifest.canvas, [512, 512]);
assert.deepEqual(manifest.activities, NPC_ACTIVITY_CONFIG.activityIds);
for (const merchant of Object.values(NPC_ACTIVITY_CONFIG.merchants)) {
  const records = manifest.assets[merchant.assetSlug];
  assert.deepEqual(Object.keys(records), NPC_ACTIVITY_CONFIG.activityIds);
  for (const record of Object.values(records)) {
    assert.ok(record.alphaCoverage > 0.06 && record.alphaCoverage < 0.72);
    assert.deepEqual(record.dimensions, [512, 512]);
  }
}

assert.equal(resolveNpcActivitiesEnabled(NPC_ACTIVITY_CONFIG, ""), true);
assert.equal(resolveNpcActivitiesEnabled(NPC_ACTIVITY_CONFIG, "?npcActivities=0"), false);
assert.equal(resolveNpcWalkingEnabled(NPC_ACTIVITY_CONFIG, "?npcWalking=0"), false);
assert.equal(
  resolveNpcWalkingEnabled(NPC_ACTIVITY_CONFIG, "?npcActivities=0&npcWalking=1"),
  false,
  "walking cannot bypass the master activity rollback",
);

const allKeys = new Set(preloadAssets.map(asset => asset.key));
const scene = {
  config: { tileSize: 94 },
  time: { now: 0 },
  textures: { exists: key => allKeys.has(key) },
  add: {
    image: (x, y, key) => new FakeVisual(x, y, key),
  },
};
const deterministicConfig = {
  ...NPC_ACTIVITY_CONFIG,
  schedule: {
    ...NPC_ACTIVITY_CONFIG.schedule,
    initialBaseDelayMs: 0,
    initialStaggerMs: 0,
    eventGapMinMs: 10000,
    eventGapMaxMs: 10000,
    weights: { work: 0, rare: 0, walk: 1 },
  },
  health: {
    ...NPC_ACTIVITY_CONFIG.health,
    globalKey: "__npcActivityContractHealth",
  },
};
const system = new NPCActivitySystem(
  scene,
  ASSET_KEYS,
  deterministicConfig,
  () => 0.75,
);
const npcs = Object.keys(NPC_ACTIVITY_CONFIG.merchants).map((merchantId, index) => ({
  merchantId,
  tx: index * 10,
  ty: 0,
  activityKeys: activityKeys[merchantId],
}));
for (const [index, npc] of npcs.entries()) {
  system.registerNPC(npc, new FakeVisual(index * 940, 100), {
    x: index * 940,
    y: 100,
    displaySize: 138,
    depth: 15,
  });
}

assert.equal(system.getHealthSnapshot().status, "healthy");
system.update(0, 16, null);
let snapshot = system.getHealthSnapshot();
assert.equal(snapshot.activeCount, 2, "town rhythm caps simultaneous activities");
assert.equal(snapshot.movingCount, 2, "deterministic walk profile starts two actors");

system.update(1000, 50, null);
snapshot = system.getHealthSnapshot();
const firstBeforeApproach = snapshot.actors[0];
assert.notEqual(firstBeforeApproach.offsetPx, 0, "anchored pacing produces real x motion");
assert.ok(
  Math.abs(firstBeforeApproach.offsetPx)
    <= NPC_ACTIVITY_CONFIG.merchants.playerUpgrades.roamTiles * scene.config.tileSize,
  "visual pacing must stay inside its authored safe radius",
);

system.update(1100, 16, { tx: npcs[0].tx, ty: npcs[0].ty });
snapshot = system.getHealthSnapshot();
assert.equal(snapshot.actors[0].offsetPx, 0, "approach snaps a pacing merchant home");
assert.equal(snapshot.actors[0].state, "player", "approach triggers the approved reaction pose");
assert.equal(npcs[0].tx, 0, "visual motion cannot mutate authoritative shop tiles");

assert.equal(system.settleMerchant(npcs[0].merchantId, 1200), true);
assert.equal(system.getHealthSnapshot().actors[0].state, "quiet");
system.destroy();
assert.equal(globalThis.__npcActivityContractHealth.status, "destroyed");
delete globalThis.__npcActivityContractHealth;
if (originalLocation === undefined) delete globalThis.location;
else globalThis.location = originalLocation;

console.log("NPC activity runtime contract passed");
