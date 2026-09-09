import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
import { WORLDROOT_SANCTUARY_CONFIG as config, isWorldrootSanctuaryEnabled,
  getWorldrootSanctuaryPreloadAssets, resolveSanctuaryRegionPresentation }
  from "../values/worldrootSanctuary.js";
import {
  CAMPFIRE_CONFIG,
  getCampfireTierAsset,
} from "../values/campfireConfig.js";
import { WorldrootWorldVisual } from "../systems/visual/WorldrootWorldVisual.js";
import { WorldrootSanctuaryView } from "../systems/visual/WorldrootSanctuaryView.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../values/starIdentityLibrary.js";

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require("sharp"); } catch {
  sharp = require(join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp"));
}
assert.equal(isWorldrootSanctuaryEnabled(""), true);
for (const search of ["?worldrootArt=v3", "?worldrootArt=v4", "?worldrootWhitebox=1"])
  assert.equal(isWorldrootSanctuaryEnabled(search), false);
const assets = getWorldrootSanctuaryPreloadAssets("");
assert.equal(assets.length, 10, "shared foliage textures load once; five regions remain independent objects");
const manifest = JSON.parse(await readFile(new URL(`../${config.assetRoot}manifest.json`, import.meta.url)));
assert.equal(manifest.assets.length, 3);
for (const asset of assets) {
  const bytes = await readFile(new URL(`../${asset.path.split("?")[0]}`, import.meta.url));
  const record = manifest.assets.find(entry => entry.key === asset.key);
  if (!record) continue;
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.hasAlpha, true, `${asset.key} requires real alpha`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256);
  assert.equal(record.chromaLeak, 0);
  assert.equal(record.carrierPixels, 0);
}
for (const region of config.regions) {
  const living = manifest.assets.find(entry => entry.key === region.living.key);
  const dead = manifest.assets.find(entry => entry.key === region.consumed.key);
  assert.ok(dead.visiblePixels / living.visiblePixels < 0.55,
    `${region.id}: death must remove canopy volume, not just recolor it`);
}
const sleeping = resolveSanctuaryRegionPresentation({ knownCount: 0 });
const alive = resolveSanctuaryRegionPresentation({ knownCount: 10, consumedCount: 0 });
const mixed = resolveSanctuaryRegionPresentation({ knownCount: 10, consumedCount: 1 });
const killed = resolveSanctuaryRegionPresentation({ knownCount: 10, consumedCount: 10 });
assert.equal(sleeping.livingAlpha, 0);
assert.equal(sleeping.scarAlpha, 0);
assert.equal(alive.livingScale, 1);
assert.equal(alive.scarAlpha, 0);
assert.ok(mixed.scarAlpha >= 0.75, "even the first consumed Star must leave a readable scar");
assert.ok(mixed.livingScale < alive.livingScale);
assert.equal(killed.livingAlpha, 0);
assert.equal(killed.scarScale, 1);

const images = [];
const textureKeys = new Set([...assets.map(asset => asset.key), config.objects.archive.key]);
const dimensions = new Map(manifest.assets.map(entry => [entry.key, entry]));
function makeImage(x, y, key, frame) {
  const size = dimensions.get(key) || { width: 512, height: 512 };
  const image = { x, y, key, frame, ...size, alpha: 1, visible: true, events: {}, destroyed: false,
    setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; },
    setScale(x, y = x) { return this.setDisplaySize(this.width * x, this.height * y); },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setTexture(key, frame) { this.key = key; this.frame = frame; return this; },
    setFlipX(value) { this.flipX = value; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setTint(tint) { this.tint = tint; return this; },
    setVisible(visible) { this.visible = visible; return this; },
    setBlendMode(mode) { this.blendMode = mode; return this; },
    setInteractive() { return this; },
    on(event, callback) { this.events[event] = callback; return this; },
    destroy() { this.destroyed = true; },
  };
  images.push(image);
  return image;
}
let player = { tx: 21, ty: 64 };
let selecting = false;
const routes = [], feedback = [], emitted = [];
const scene = {
  config: { tileSize: 94, topAirRows: 65 }, gameState: "playing",
  textures: { exists: key => textureKeys.has(key), get: () => ({ has: () => false, add() {} }) },
  add: { image: makeImage },
  playerController: { getPlayerTile: () => player },
  campfireSystem: { isSelecting: () => selecting },
  starPillarSystem: { openConstellationView: () => { routes.push("talents"); return true; } },
  showWorldMap: options => { routes.push(options); return true; },
  showPauseMenu: options => { routes.push(options); return true; },
  hudSystem: { flashStatus: text => feedback.push(text) },
  events: { emit: name => emitted.push(name) },
};
const profiles = config.regions.flatMap(region => Array.from({ length: 10 }, (_, index) => ({
  id: `${region.id}-${index}`, regionId: region.id, knownCount: 1, label: `${region.name} ${index}`,
  focusTile: { tx: index, ty: 90 + index },
})));
const stars = profiles.map((profile, index) => ({ key: profile.id, id: profile.id,
  profileId: profile.id, regionId: profile.regionId, label: "Unknown Star Signal", discovered: false,
  state: "intact", tile: { tx: index, ty: 120 },
}));
const snapshot = { signature: "alive", growthStage: 5, knownStarCount: 50, consumedStarCount: 0,
  endgameReady: false, profileMemories: profiles, starMemories: stars,
  regionMemories: config.regions.map(region => ({ id: region.id, knownCount: 10, consumedCount: 0 })),
  titanMemories: [{ id: "test-titan", name: "Titan", discovered: true }], currents: [],
};
const visual = new WorldrootWorldVisual(scene).create(snapshot);
assert.equal(visual.getDebugSnapshot().reviewMode, "root-sanctuary");
assert.equal(visual.memoryLayer, null, "the sprawling old memory/collision diagram must not render");
assert.deepEqual(visual.getOneWayPlatforms(), []);
assert.equal(visual.getInteractionDistance({ tx: 21, ty: 64 }), Infinity, "Campfire must own E at its hearth");
assert.equal(visual.handleInteract({ tx: 24, ty: 64 }), "talents");
assert.equal(visual.handleInteract({ tx: 25, ty: 64 }), true);
assert.equal(emitted.length, 0, "dormant Crown cannot start endgame");
const sanctuary = visual.sanctuaryView;
assert.equal(sanctuary.getDebugSnapshot().hearth.x, (CAMPFIRE_CONFIG.surfaceTileX + 0.5) * 94);
assert.equal(sanctuary.getDebugSnapshot().hearth.y, 65 * 94);
assert.equal(sanctuary.getDebugSnapshot().livingBushes, 15,
  "each of five independently stateful segments uses three living bushes");
assert.ok(sanctuary.entries.every(entry => entry.livingCopies.length === 3));
assert.equal(sanctuary.stars.entries.length, 50);
const beforePoints = new Map(sanctuary.stars.entries.map(entry => [entry.star.key, { ...entry.point }]));
const beforeImages = new Map(sanctuary.stars.entries.map(entry => [entry.star.key, entry.image]));
const siblings = Array.from({ length: 4 }, (_, index) => ({ ...stars[0], key: `sibling-${index}` }));
const youngSnapshot = { ...snapshot, starMemories: siblings,
  regionMemories: snapshot.regionMemories.map(region => ({ ...region, knownCount: 2 })) };
const siblingPoints = siblings.map(star => sanctuary.stars.pointForStar(star, youngSnapshot));
for (let first = 0; first < siblingPoints.length; first++) {
  for (let second = first + 1; second < siblingPoints.length; second++) {
    assert.ok(Math.hypot(siblingPoints[first].x - siblingPoints[second].x,
      siblingPoints[first].y - siblingPoints[second].y) >= config.stars.sizePx * 0.75,
    "same-biome Stars must stay separated even in young foliage");
  }
}
// All growth stages and all sibling sockets must leave the Archive hitbox clear.
const crowdedStars = stars.flatMap(star => Array.from({ length: 4 }, (_, index) => ({
  ...star, key: `${star.key}-sibling-${index}`,
})));
const archivePoint = sanctuary.sourceToWorld(config.objects.archive, true);
const archiveHalfSize = config.objects.archive.size * sanctuary.transform.matureScale / 2;
for (const knownCount of [1, 5, 10]) {
  const crowdedSnapshot = { ...snapshot, starMemories: crowdedStars,
    regionMemories: snapshot.regionMemories.map(region => ({ ...region, knownCount })) };
  for (const star of crowdedStars) {
    const point = sanctuary.stars.pointForStar(star, crowdedSnapshot);
    const clearance = archiveHalfSize + config.stars.sizePx / 2 + 1;
    assert.ok(Math.abs(point.x - archivePoint.x) > clearance
      || Math.abs(point.y - archivePoint.y) > clearance + config.stars.bobPixels,
    "canopy Stars must not overlap the Archive, including pointer rounding and bobbing");
  }
}
assert.equal(sanctuary.growth.getDebugSnapshot().spriteCount, 10);
const manySiblings = Array.from({ length: 14 }, (_, index) => ({ ...stars[0], key: `many-${index}` }));
const manyPoints = manySiblings.map(star => sanctuary.stars.pointForStar(star,
  { ...snapshot, starMemories: manySiblings }));
assert.equal(new Set(manyPoints.map(point => `${point.x}:${point.y}`)).size, manySiblings.length,
  "more than four Stars in one biome may not reuse the same position");
sanctuary.stars.entries[0].image.events.pointerdown();
assert.deepEqual(routes.pop(), { focusTile: stars[0].tile });
selecting = true;
sanctuary.stars.entries[0].image.events.pointerdown();
assert.equal(routes.length, 0, "canopy clicking cannot steal an open Campfire menu");
selecting = false;
sanctuary.archive.events.pointerdown();
assert.deepEqual(routes.pop(), { initialTabKey: "titans" });
sanctuary.talent.events.pointerdown();
assert.equal(routes.pop(), "talents");

const mixedSnapshot = { ...snapshot, signature: "one-region-killed", consumedStarCount: 10,
  regionMemories: snapshot.regionMemories.map((region, index) => ({ ...region, consumedCount: index === 1 ? 10 : 0 })),
  starMemories: stars.map(star => ({ ...star, state: star.regionId === config.regions[1].id ? "consumed" : "intact" })),
};
visual.sync(mixedSnapshot, false);
assert.equal(sanctuary.entries[1].living.alpha, 0);
assert.ok(sanctuary.entries[1].livingCopies.every(copy => copy.image.alpha === 0));
assert.equal(sanctuary.entries[1].consumed.alpha, 1);
assert.equal(sanctuary.entries[0].living.alpha, 1);
assert.ok(sanctuary.entries[0].livingCopies.every(copy => copy.image.alpha === 1));
assert.equal(sanctuary.entries[0].consumed.alpha, 0);
assert.equal(sanctuary.getDebugSnapshot().scars, 10);
assert.equal(sanctuary.growth.entries[1].alpha, 0, "dead regions lose all living fluff");
assert.ok(sanctuary.growth.entries[0].alpha > 0, "unaffected plants remain alive");
for (const entry of sanctuary.stars.entries) {
  assert.equal(entry.image, beforeImages.get(entry.star.key), "a region change must retain other live Star objects");
  assert.deepEqual(entry.point, beforePoints.get(entry.star.key), "consumption cannot reshuffle other Stars");
  if (entry.consumed) assert.equal(entry.image.key, config.stars.scar.key);
}
visual.sync({ ...mixedSnapshot, signature: "ready", endgameReady: true, growthStage: 6 }, false);
visual.handleInteract({ tx: 25, ty: 64 });
visual.handleInteract({ tx: 25, ty: 64 });
assert.deepEqual(emitted, ["worldroot-endgame-ready"]);
assert.deepEqual(visual.getOneWayPlatforms(), []);
assert.equal(visual.queueStarArrival({ originTileX: 0, originTileY: 120 }), true);
visual.update(0, 0, player);
visual.update(5000, 0, player);
assert.equal(sanctuary.stars.arrivals.size, 0);
visual.destroy();
assert.ok(images.every(image => image.destroyed), "all tree objects must be destroyed on scene teardown");

// A discovered Star upgrades to its real atlas frame when its rarity loads.
// An undiscovered signal must remain anonymous, even if given an identity id.
const identity = STAR_IDENTITY_LIBRARY_CONFIG.identities[0];
const hiddenIdentity = STAR_IDENTITY_LIBRARY_CONFIG.identities.find(entry => entry.rarityIndex !== identity.rarityIndex);
const requested = [], released = [], frames = new Set();
let finishLoad;
scene.textures.get = () => ({ has: frame => frames.has(frame), add: frame => frames.add(frame) });
scene.runtimeFeatureAssetManager = {
  enabled: true,
  ensureGroup(group, options) {
    requested.push({ group, options });
    return new Promise(resolve => { finishLoad = resolve; });
  },
  releaseGroup(group, consumer) { released.push({ group, consumer }); },
};
const identityView = new WorldrootSanctuaryView(scene).create({ ...snapshot,
  signature: "identity-loading",
  starMemories: [
    { ...stars[0], discovered: true, identityId: identity.id },
    { ...stars[1], discovered: false, identityId: hiddenIdentity.id },
  ],
});
assert.equal(requested.length, 1, "hidden identities may not request assets");
assert.ok(identityView.stars.entries.every(entry => entry.image.key === config.stars.anonymousKey));
textureKeys.add(identity.atlasKey);
textureKeys.add(identity.lightAtlasKey);
finishLoad({ ready: true });
await Promise.resolve();
assert.equal(identityView.stars.entries[0].image.key, identity.atlasKey);
assert.equal(identityView.stars.entries[0].image.frame, identity.frameName);
assert.equal(identityView.stars.entries[1].image.key, config.stars.anonymousKey);
assert.ok(identityView.stars.entries.every(entry => entry.image.blendMode === "NORMAL" && !entry.light),
  "the tree uses the real Star core without a second colour-blending light layer");
const fixedHotspots = identityView.getGroundHotspots();
const smallHeight = identityView.base.displayHeight;
identityView.sync({ ...snapshot, signature: "mature-hearth", campfireLevel: 10 }, false);
assert.ok(identityView.base.displayHeight > smallHeight, "upgrades grow the main tree, not only leaf props");
assert.deepEqual(identityView.getGroundHotspots(), fixedHotspots, "tree growth cannot move ground interaction targets");
assert.equal(identityView.getDebugSnapshot().treeScale.height, 1);
identityView.destroy();
assert.deepEqual(released, [{ group: requested[0].group, consumer: config.stars.consumer }]);
assert.ok(images.every(image => image.destroyed));

const campfires = [];
const campfireManifest = JSON.parse(await readFile(new URL(
  "../" + CAMPFIRE_CONFIG.spriteBasePath + "/manifest.json",
  import.meta.url,
)));
assert.equal(campfireManifest.family, "campfire-worldroot-v2-runtime");
assert.equal(campfireManifest.tiers.length, 10);
for (let tier = 1; tier <= 10; tier++) {
  const asset = getCampfireTierAsset(tier);
  assert.ok(asset.key.startsWith("campfire-worldroot-v2-tier-"));
  assert.ok(asset.path.startsWith(CAMPFIRE_CONFIG.spriteBasePath + "/"));
  const bytes = await readFile(new URL("../" + asset.path, import.meta.url));
  const meta = await sharp(bytes).metadata();
  const record = campfireManifest.tiers.find(entry => entry.level === tier);
  assert.ok(record, "every Campfire tier needs a runtime manifest record");
  assert.equal(meta.width, 1254);
  assert.equal(meta.height, 1254);
  assert.equal(meta.hasAlpha, true, "Campfire runtime art must be true RGBA");
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    record.runtimeSha256,
    "Campfire runtime pixels must match the transparency manifest",
  );
  assert.ok(record.visibleBounds.transparentRatio >= 0.35);
  const height = Math.round(94 * CAMPFIRE_CONFIG.heightByLevelTiles[tier - 1]);
  campfires.push({ tier, width: Math.round(height * meta.width / meta.height), height });
}
assert.equal(campfires.reduce((widest, entry) => entry.width > widest.width ? entry : widest).tier, 10);
assert.ok(campfires.every(entry => entry.width < 94 * 3 && entry.height < 94 * 2),
  "all forms fit the same grounded hearth opening");
assert.ok(campfires.at(-1).height >= campfires[0].height * 4,
  "the final fire must be unmistakably larger than the starting form");
for (let index = 1; index < campfires.length; index++)
  assert.ok(campfires[index].height - campfires[index - 1].height >= 12,
    "every paid upgrade has a readable size step");
console.log("WORLDROOT_SANCTUARY_CONTRACT_OK", JSON.stringify({ liveStars: 50, mixedScars: 10,
  platforms: 0, campfires }));
