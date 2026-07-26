import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  getNpcActivityPreloadAssets,
  NPC_ACTIVITY_CONFIG,
  resolveNpcActivitiesEnabled,
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
assert.equal(
  preloadAssets.length,
  66,
  "six merchants need four quiet frames and seven planted activities each",
);
assert.equal(
  new Set(preloadAssets.map(asset => asset.key)).size,
  preloadAssets.length,
  "every runtime pose key must be unique",
);
for (const asset of preloadAssets) {
  const relativePath = asset.path.split("?")[0];
  assert.ok(existsSync(`${root}${relativePath}`), `missing ${relativePath}`);
  assert.match(relativePath, /npc-v11-piskel-motion-idles/);
}

const manifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v11-piskel-motion-idles/manifest.json`,
  "utf8",
));
const reviewManifest = JSON.parse(readFileSync(
  `${root}visual-approval-previews/npc-planted-idles-v5/manifest.json`,
  "utf8",
));
const cropSourceManifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v9-planted-idles/manifest.json`,
  "utf8",
));
assert.equal(manifest.runtimeApproved, true);
assert.equal(manifest.reviewOnly, false);
assert.equal(manifest.productionChanged, true);
assert.equal(manifest.walkingRemoved, true);
assert.equal(manifest.frameMotionRestored, true);
assert.equal(manifest.piskelRoundTripped, true);
assert.equal(manifest.frameCount, 66);
assert.deepEqual(manifest.canvas, [512, 512]);
assert.deepEqual(manifest.frameOrder, NPC_ACTIVITY_CONFIG.poseAssetIds);
assert.deepEqual(manifest.quietFrameOrder, NPC_ACTIVITY_CONFIG.quietFrameIds);
assert.deepEqual(
  manifest.quietPlaybackSequence,
  NPC_ACTIVITY_CONFIG.quietLoop.sequence,
);
for (const merchant of Object.values(NPC_ACTIVITY_CONFIG.merchants)) {
  const merchantRecord = manifest.merchants[merchant.assetSlug];
  const records = merchantRecord.assets;
  const quietBodyTargets = merchantRecord.quietSourceFrames
    .map(record => record.targetMainHeight);
  assert.equal(
    new Set(quietBodyTargets).size,
    1,
    `${merchant.assetSlug} quiet frames must retain one body-height target`,
  );
  assert.equal(merchantRecord.uniformScale, 1);
  assert.ok(merchantRecord.drift.maxRootAnchorDriftPx <= 1);
  assert.equal(merchantRecord.drift.maxBottomDriftPx, 0);
  assert.ok(existsSync(`${root}${merchantRecord.sourcePiskel}`));
  assert.deepEqual(Object.keys(records), NPC_ACTIVITY_CONFIG.poseAssetIds);
  assert.equal(
    new Set(
      NPC_ACTIVITY_CONFIG.quietFrameIds.map(frameId => records[frameId].sha256),
    ).size,
    NPC_ACTIVITY_CONFIG.quietFrameIds.length,
    `${merchant.assetSlug} quiet loop needs four visibly distinct frames`,
  );
  for (const record of Object.values(records)) {
    assert.deepEqual(record.dimensions, [512, 512]);
    assert.equal(record.edgeOpaquePixels, 0);
    assert.equal(record.bottom, 496);
    assert.ok(record.alphaBounds[0] > 0 && record.alphaBounds[1] > 0);
    assert.ok(record.alphaBounds[2] < 512 && record.alphaBounds[3] < 512);
  }
}

const creatureRows = reviewManifest.boards["creature-base"].rows;
const gemQuiet = cropSourceManifest.assets["gem-power-merchant"].quiet;
assert.ok(
  creatureRows[2][0] - creatureRows[1][1] >= 6,
  "Gem and Magma source rows need a real empty gutter",
);
assert.equal(gemQuiet.sourcePanel[3], creatureRows[1][1]);
assert.ok(
  gemQuiet.sourcePanel[3] < creatureRows[2][0],
  "Gem crop must end before any Magma head pixel can enter",
);

assert.equal(resolveNpcActivitiesEnabled(NPC_ACTIVITY_CONFIG, ""), true);
assert.equal(resolveNpcActivitiesEnabled(NPC_ACTIVITY_CONFIG, "?npcActivities=0"), false);
assert.equal("motion" in NPC_ACTIVITY_CONFIG, false);
assert.equal(NPC_ACTIVITY_CONFIG.schedule.maxSimultaneousActivities, 1);
assert.ok(NPC_ACTIVITY_CONFIG.render.crossfadeInMs >= 1000);
assert.ok(NPC_ACTIVITY_CONFIG.render.crossfadeOutMs >= 1200);
assert.ok(NPC_ACTIVITY_CONFIG.quietLoop.transitionMs >= 450);
assert.ok(NPC_ACTIVITY_CONFIG.quietLoop.frameDurationsMs.every(ms => ms >= 850));

const activeSourceFiles = [
  "values/npcActivityConfig.js",
  "systems/visual/NPCActivitySystem.js",
  "systems/visual/npcActivityVisuals.js",
  "world/playScene/NPCManager.js",
  "ui/scenes/BootScene.js",
].map(path => readFileSync(`${root}${path}`, "utf8")).join("\n");
const managerSource = readFileSync(
  `${root}world/playScene/NPCManager.js`,
  "utf8",
);
assert.match(
  managerSource,
  /const sprite = hasActivityQuiet[\s\S]*add\.sprite\(pos\.x, pos\.y, quietFrameKey\)[\s\S]*: hasIdleVideo/,
  "enabled frame animation must use a texture-swappable sprite before video fallback",
);
assert.match(
  managerSource,
  /if \(!hasActivityQuiet && hasIdleVideo\)/,
  "legacy idle video may play only when frame activities are disabled",
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

const allKeys = new Set(preloadAssets.map(asset => asset.key));
const scene = {
  config: { tileSize: 94 },
  time: { now: 0 },
  textures: { exists: key => allKeys.has(key) },
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
  quietLoop: {
    ...NPC_ACTIVITY_CONFIG.quietLoop,
    frameDurationsMs: [1000, 1000, 1000, 1000, 1000, 1000],
    transitionMs: 100,
    initialHoldMinMs: 0,
    initialHoldMaxMs: 0,
    loopGapMinMs: 1000,
    loopGapMaxMs: 1000,
  },
  health: {
    ...NPC_ACTIVITY_CONFIG.health,
    globalKey: "__npcActivityContractHealth",
  },
};
const system = new NPCActivitySystem(scene, ASSET_KEYS, deterministicConfig, () => 0.75);
const npcs = Object.keys(NPC_ACTIVITY_CONFIG.merchants).map((merchantId, index) => ({
  merchantId,
  tx: index * 10,
  ty: 0,
  activityKeys: activityKeys[merchantId],
}));
for (const [index, npc] of npcs.entries()) {
  const x = index * 940;
  system.registerNPC(npc, new FakeVisual(x, 100), {
    x,
    y: 100,
    displaySize: 138,
    depth: 15,
  });
}

let snapshot = system.getHealthSnapshot();
assert.equal(snapshot.status, "healthy");
assert.equal(snapshot.anchorLocked, true);
system.update(0, 16, null);
snapshot = system.getHealthSnapshot();
assert.equal(snapshot.activeCount, 1, "calm town rhythm allows only one activity");
assert.deepEqual(
  snapshot.actors.slice(0, 2).map(actor => actor.state),
  ["inspect", "quiet"],
);
assert.equal(snapshot.anchorViolationCount, 0);

const firstActor = system.actors[0];
const quietActor = system.actors[1];
const initialQuietTexture = quietActor.baseVisual.texture;
firstActor.baseVisual.x += 80;
firstActor.baseVisual.y -= 30;
firstActor.quietOverlay.x += 35;
firstActor.quietOverlay.y -= 20;
firstActor.overlay.x -= 45;
firstActor.overlay.y += 55;
system.update(100, 50, null);
snapshot = system.getHealthSnapshot();
assert.equal(snapshot.anchorViolationCount, 0, "every update must repair anchor drift");
assert.equal(
  quietActor.quietFrameId,
  "quiet1",
  "a quiet merchant must advance to a real second sprite frame",
);
assert.notEqual(
  quietActor.quietOverlay.texture,
  initialQuietTexture,
  "quiet animation must change texture rather than leave every frame still",
);
assert.equal(firstActor.baseVisual.x, firstActor.anchorX);
assert.equal(firstActor.baseVisual.y, firstActor.anchorY);
assert.equal(firstActor.quietOverlay.x, firstActor.anchorX);
assert.equal(firstActor.quietOverlay.y, firstActor.anchorY);
assert.equal(firstActor.overlay.x, firstActor.anchorX);
assert.equal(firstActor.overlay.y, firstActor.anchorY);
assert.equal(firstActor.baseVisual.rotation, 0);
assert.equal(firstActor.quietOverlay.rotation, 0);
assert.equal(firstActor.overlay.rotation, 0);
assert.equal(firstActor.baseVisual.displayWidth, firstActor.displaySize);
assert.equal(firstActor.baseVisual.displayHeight, firstActor.displaySize);
assert.equal(firstActor.quietOverlay.displayWidth, firstActor.displaySize);
assert.equal(firstActor.quietOverlay.displayHeight, firstActor.displaySize);
assert.equal(firstActor.overlay.displayWidth, firstActor.displaySize);
assert.equal(firstActor.overlay.displayHeight, firstActor.displaySize);

system.update(1100, 16, { tx: npcs[0].tx, ty: npcs[0].ty });
snapshot = system.getHealthSnapshot();
assert.equal(snapshot.actors[0].state, "player");
assert.equal(snapshot.actors[0].anchorErrorPx, 0);
assert.equal(npcs[0].tx, 0, "visual activity cannot mutate authoritative shop tiles");

assert.equal(system.settleMerchant(npcs[0].merchantId, 1200), true);
assert.equal(system.getHealthSnapshot().actors[0].state, "quiet");
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

console.log("NPC planted activity runtime contract passed");
