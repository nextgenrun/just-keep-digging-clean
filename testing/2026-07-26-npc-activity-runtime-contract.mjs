import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  getNpcActivityPreloadAssets,
  NPC_ACTIVITY_CONFIG,
  resolveNpcActivitiesEnabled,
  resolveNpcGroundContact,
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

class FakeVideo extends FakeVisual {
  constructor(x, y, texture) {
    super(x, y, texture);
    this.setTexture = undefined;
  }
}

const activityKeys = ASSET_KEYS.npcs.merchantActivities;
const preloadAssets = getNpcActivityPreloadAssets(activityKeys);
assert.equal(
  preloadAssets.length,
  42,
  "six merchants need seven accepted activity frames each",
);
assert.equal(
  new Set(preloadAssets.map((asset) => asset.key)).size,
  preloadAssets.length,
  "every runtime activity key must be unique",
);
for (const asset of preloadAssets) {
  const relativePath = asset.path.split("?")[0];
  assert.match(relativePath, /npc-v13-piskel-polished-activities/);
  assert.doesNotMatch(relativePath, /quiet|npc-v11/);
}

assert.equal(resolveNpcActivitiesEnabled(NPC_ACTIVITY_CONFIG, ""), true);
assert.equal(
  resolveNpcActivitiesEnabled(NPC_ACTIVITY_CONFIG, "?npcActivities=0"),
  false,
);
assert.equal("motion" in NPC_ACTIVITY_CONFIG, false);
assert.equal("quietLoop" in NPC_ACTIVITY_CONFIG, false);
assert.equal("quietFrameIds" in NPC_ACTIVITY_CONFIG, false);
assert.equal("poseAssetIds" in NPC_ACTIVITY_CONFIG, false);
assert.equal(NPC_ACTIVITY_CONFIG.schedule.maxSimultaneousActivities, 1);
assert.ok(NPC_ACTIVITY_CONFIG.render.crossfadeInMs >= 1400);
assert.ok(NPC_ACTIVITY_CONFIG.render.crossfadeOutMs >= 1600);
assert.ok(NPC_ACTIVITY_CONFIG.schedule.eventGapMinMs >= 22000);
assert.ok(NPC_ACTIVITY_CONFIG.schedule.townQuietGapMinMs >= 7000);

const activeSourceFiles = [
  "values/npcActivityConfig.js",
  "values/assetKeys.js",
  "systems/visual/NPCActivitySystem.js",
  "systems/visual/npcActivityVisuals.js",
  "world/playScene/NPCManager.js",
  "ui/scenes/BootScene.js",
].map((path) => readFileSync(`${root}${path}`, "utf8")).join("\n");
const managerSource = readFileSync(
  `${root}world/playScene/NPCManager.js`,
  "utf8",
);
assert.match(
  managerSource,
  /const sprite = hasIdleVideo[\s\S]*add\.video\(pos\.x, pos\.y, npc\.videoKey\)[\s\S]*add\.sprite\(pos\.x, pos\.y, npc\.assetKey\)/,
  "original idle video must remain the preferred baseline",
);
assert.match(
  managerSource,
  /if \(hasIdleVideo\)[\s\S]*sprite\.play\(true\)/,
  "the original idle video must keep playing beneath activity crossfades",
);
assert.match(
  managerSource,
  /resolveNpcGroundContact\([\s\S]*npc\.merchantId,[\s\S]*spriteSize,[\s\S]*\)/,
  "runtime grounding must derive from measured feet at the actual display size",
);
assert.match(
  managerSource,
  /groundSurfaceY[\s\S]*groundContact\.anchorOffsetPx[\s\S]*groundSurfaceY,[\s\S]*groundContact,/,
  "runtime actors must retain their authoritative platform contact metadata",
);
assert.doesNotMatch(
  activeSourceFiles,
  /quiet0|quiet1|quiet2|quiet3|npc-v11-piskel-motion-idles/,
  "active production code must not reference rejected quiet frames",
);
assert.doesNotMatch(
  activeSourceFiles,
  /npcWalking|walkingEnabled|roamTiles|startNpcWalk|updateNpcWalk|state\s*===?\s*["']walk["']/,
  "production NPC activity code must contain no walking path",
);
assert.doesNotMatch(
  activeSourceFiles,
  /swayDegrees|breathPhase|quietCycleMs|Math\.sin|scaleX|scaleY/,
  "production NPC actors must not wobble, rotate, or breathe-scale as a whole",
);

const allKeys = new Set(preloadAssets.map((asset) => asset.key));
const scene = {
  config: { tileSize: 94 },
  time: { now: 0 },
  textures: { exists: (key) => allKeys.has(key) },
  add: { image: (x, y, key) => new FakeVisual(x, y, key) },
};
const deterministicConfig = {
  ...NPC_ACTIVITY_CONFIG,
  ambientActivityIds: ["inspect"],
  schedule: {
    ...NPC_ACTIVITY_CONFIG.schedule,
    initialBaseDelayMs: 0,
    initialStaggerMs: 0,
    eventGapMinMs: 10000,
    eventGapMaxMs: 10000,
    townQuietGapMinMs: 5000,
    townQuietGapMaxMs: 5000,
    weights: { inspect: 1 },
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
const npcs = Object.keys(NPC_ACTIVITY_CONFIG.merchants).map(
  (merchantId, index) => ({
    merchantId,
    tx: index * 10,
    ty: 0,
    activityKeys: activityKeys[merchantId],
  }),
);
for (const [index, npc] of npcs.entries()) {
  const x = index * 940;
  const displaySize = 138;
  const groundSurfaceY = 100;
  const groundContact = resolveNpcGroundContact(
    npc.merchantId,
    displaySize,
  );
  const y = groundSurfaceY + groundContact.anchorOffsetPx;
  const baseline = index < 5
    ? new FakeVideo(x, y, `idle-video-${index}`)
    : new FakeVisual(x, y, "magma-static");
  system.registerNPC(npc, baseline, {
    x,
    y,
    displaySize,
    depth: 15,
    groundSurfaceY,
    groundContact,
  });
}

let snapshot = system.getHealthSnapshot();
assert.equal(snapshot.status, "healthy");
assert.equal(snapshot.anchorLocked, true);
assert.equal(snapshot.groundContactLocked, true);
assert.equal(snapshot.groundContactViolationCount, 0);
system.update(0, 16, null);
snapshot = system.getHealthSnapshot();
assert.equal(snapshot.activeCount, 1, "calm town rhythm allows only one activity");
assert.deepEqual(
  snapshot.actors.slice(0, 2).map((actor) => actor.state),
  ["inspect", "quiet"],
);
assert.equal(snapshot.anchorViolationCount, 0);

const firstActor = system.actors[0];
const originalBaselineTexture = firstActor.baseVisual.texture;
firstActor.baseVisual.displayHeight += 12;
snapshot = system.getHealthSnapshot();
assert.equal(snapshot.anchorViolationCount, 0);
assert.equal(
  snapshot.groundContactViolationCount,
  1,
  "same-anchor display-size drift must be detected as lifted feet",
);
system.update(50, 16, null);
snapshot = system.getHealthSnapshot();
assert.equal(
  snapshot.groundContactViolationCount,
  0,
  "the fixed-size activity lock must repair ground contact",
);
firstActor.baseVisual.x += 80;
firstActor.baseVisual.y -= 30;
firstActor.overlay.x -= 45;
firstActor.overlay.y += 55;
system.update(100, 50, null);
snapshot = system.getHealthSnapshot();
assert.equal(snapshot.anchorViolationCount, 0, "updates must repair anchor drift");
assert.equal(snapshot.groundContactViolationCount, 0);
assert.equal(firstActor.baseVisual.x, firstActor.anchorX);
assert.equal(firstActor.baseVisual.y, firstActor.anchorY);
assert.equal(firstActor.overlay.x, firstActor.anchorX);
assert.equal(firstActor.overlay.y, firstActor.anchorY);
assert.equal(firstActor.baseVisual.rotation, 0);
assert.equal(firstActor.overlay.rotation, 0);
assert.equal(firstActor.baseVisual.displayWidth, firstActor.displaySize);
assert.equal(firstActor.baseVisual.displayHeight, firstActor.displaySize);
assert.equal(firstActor.overlay.displayWidth, firstActor.displaySize);
assert.equal(firstActor.overlay.displayHeight, firstActor.displaySize);
assert.equal(
  firstActor.baseVisual.texture,
  originalBaselineTexture,
  "activity wiring must never replace the original idle video texture",
);

system.update(110, 16, { tx: npcs[0].tx, ty: npcs[0].ty });
snapshot = system.getHealthSnapshot();
assert.equal(
  snapshot.actors[0].state,
  "inspect",
  "player proximity must not snap-swap a visible activity texture",
);
assert.equal(snapshot.actors[0].anchorErrorPx, 0);
assert.equal(snapshot.actors[0].groundContactErrorPx, 0);
assert.equal(npcs[0].tx, 0, "visual activity cannot mutate shop tiles");

assert.equal(system.settleMerchant(npcs[0].merchantId, 120), true);
assert.equal(system.getHealthSnapshot().actors[0].state, "quiet");
system.update(130, 16, { tx: npcs[1].tx, ty: npcs[1].ty });
snapshot = system.getHealthSnapshot();
assert.equal(
  snapshot.actors[1].state,
  "player",
  "a quiet merchant may ease into the player reaction",
);
assert.equal(system.settleMerchant(npcs[1].merchantId, 140), true);
system.update(5000, 16, null);
assert.equal(
  system.getHealthSnapshot().activeCount,
  0,
  "town-wide quiet gap prevents immediate activity handoff",
);
system.destroy();
assert.equal(globalThis.__npcActivityContractHealth.status, "destroyed");
delete globalThis.__npcActivityContractHealth;
if (originalLocation === undefined) delete globalThis.location;
else globalThis.location = originalLocation;

console.log("NPC accepted activity runtime contract passed");
