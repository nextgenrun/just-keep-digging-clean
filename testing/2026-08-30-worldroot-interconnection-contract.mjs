import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LEVEL_ONE_BIOME_FIELD } from "../values/levelOneBiomeField.js";
import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
} from "../values/titanDiscoveries.js";
import { CAMPFIRE_CONFIG } from "../values/campfireConfig.js";
import { NPC_ACTIVITY_CONFIG } from "../values/npcActivityConfig.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";
import {
  WORLDROOT_CONFIG,
  isWorldrootEnabled,
  resolveWorldrootGrowthStage,
  sampleWorldrootPath,
} from "../values/worldroot.js";
import {
  formatWorldrootMissingCurrents,
  resolveWorldrootSnapshot,
} from "../systems/visual/WorldrootStateResolver.js";
import {
  findCrossedOneWayPlatform,
  findStandingOneWayPlatform,
  normalizeOneWayPlatforms,
  refreshOneWayPlatformDropState,
  resolveOneWayPlatformDropIds,
} from "../systems/mining/oneWayPlatformCollision.js";
import { TileCollisionSystem } from "../systems/mining/TileCollisionSystem.js";
import { StarPillarSystem } from "../systems/visual/StarPillarSystem.js";
import { WorldrootMemoryLayer } from "../systems/visual/WorldrootMemoryLayer.js";
import { WorldrootWorldVisual } from "../systems/visual/WorldrootWorldVisual.js";

assert.equal(LEVEL_ONE_BIOME_FIELD.profiles.length, 50, "Worldroot must represent all 50 Level 1 biome profiles");
assert.equal(WORLDROOT_CONFIG.regions.length, 5, "Worldroot must retain five broad biome countries");
assert.equal(TITAN_DEFINITIONS.length, 25, "Titan Chorus contract must track all Titans");
assert.equal(WORLDROOT_CONFIG.traversal.enabled, true, "authored Worldroot branch traversal must remain active");
assert.equal(WORLDROOT_CONFIG.traversal.availableAcrossGrowth, true, "visible branches must never lose collision between growth states");
assert.ok(WORLDROOT_CONFIG.terraces.length >= 9, "the panoramic Worldroot needs several broad exploration routes");
assert.equal(
  new Set(WORLDROOT_CONFIG.terraces.map(entry => entry.id)).size,
  WORLDROOT_CONFIG.terraces.length,
  "every authored branch contact needs one stable id",
);
assert.equal(
  WORLDROOT_CONFIG.terraces.every(entry => (
    entry.left >= 0 && entry.right <= 1 && entry.right - entry.left >= 0.08
    && entry.y > 0 && entry.y < WORLDROOT_CONFIG.placement.surfaceSourceY
  )),
  true,
  "branch contacts must be broad, normalized, and above the grounded root seam",
);
for (const group of ["lower-road", "memory-road"]) {
  assert.equal(
    WORLDROOT_CONFIG.terraces.filter(entry => entry.dropGroup === group).length,
    2,
    `${group} must identify both halves of its continuous walking surface`,
  );
}
assert.equal(WORLDROOT_CONFIG.reveal.hardCropEnabled, false, "growth must not slice through the tree painting");
assert.ok(WORLDROOT_CONFIG.placement.displayWidthTiles >= 24, "Worldroot must span multiple town screens");
assert.ok(WORLDROOT_CONFIG.placement.surfaceSourceY >= 0.9, "the heavy root base must penetrate the town ground seam");
assert.match(WORLDROOT_CONFIG.assets.living.path, /worldroot-v3\/worldroot-living-v3\.png/);
assert.match(WORLDROOT_CONFIG.assets.consumed.path, /worldroot-v3\/worldroot-consumed-v3\.png/);
const finalMerchantTileX = Math.max(
  ...Object.values(TOWN_SQUARE_CONFIG.merchantSlots).map(slot => slot.tileX),
);
const worldrootLeftTile = WORLDROOT_CONFIG.placement.hearthTileX
  - WORLDROOT_CONFIG.placement.hearthSourceX * WORLDROOT_CONFIG.placement.displayWidthTiles;
const visibleWorldrootLeftTile = worldrootLeftTile
  + WORLDROOT_CONFIG.clearance.visibleLeftSourceX
    * WORLDROOT_CONFIG.placement.displayWidthTiles;
const finalMerchantVisibleRightTile = finalMerchantTileX + 0.5
  + NPC_ACTIVITY_CONFIG.render.displayScale / 2;
assert.ok(
  visibleWorldrootLeftTile >= finalMerchantVisibleRightTile + 0.2,
  "the grounded tree must begin beyond the final merchant silhouette",
);
assert.equal(WORLDROOT_CONFIG.placement.hearthTileX, CAMPFIRE_CONFIG.surfaceTileX + 0.5);
const groundedFootprintRightTile = worldrootLeftTile
  + WORLDROOT_CONFIG.clearance.groundedFootprintRightSourceX
    * WORLDROOT_CONFIG.placement.displayWidthTiles;
const titanGallery = TITAN_DISCOVERY_CONFIG.surfaceGallery;
const firstTitanVisibleLeftTile = titanGallery.startTileX
  - titanGallery.maxWidthTiles * titanGallery.maximumScaleMultiplier / 2;
assert.ok(
  groundedFootprintRightTile <= firstTitanVisibleLeftTile - 0.5,
  "the grounded Worldroot footprint must not intersect the first Titan statue",
);
const worldrootHeightTiles = WORLDROOT_CONFIG.placement.displayWidthTiles
  * WORLDROOT_CONFIG.source.height / WORLDROOT_CONFIG.source.width;
const elevatedClearanceTiles = (
  WORLDROOT_CONFIG.placement.surfaceSourceY
  - WORLDROOT_CONFIG.clearance.lowestElevatedDetailSourceY
) * worldrootHeightTiles;
assert.ok(
  elevatedClearanceTiles - titanGallery.maxHeightTiles
    >= WORLDROOT_CONFIG.clearance.minimumTitanAirGapTiles,
  "the elevated canopy must leave a full air tile above the tallest Titan statue",
);
assert.ok(
  WORLDROOT_CONFIG.placement.depth < titanGallery.spriteDepth,
  "Titan statues must render in front of the distant Worldroot canopy",
);
const talentTileX = worldrootLeftTile
  + WORLDROOT_CONFIG.interaction.rootTalent.x * WORLDROOT_CONFIG.placement.displayWidthTiles;
assert.ok(
  talentTileX - WORLDROOT_CONFIG.placement.hearthTileX >= 2.5,
  "the talent shrine must remain separately reachable from the Campfire",
);
assert.equal(WORLDROOT_CONFIG.reveal.rightByStage.length, 7, "growth requires six stages plus the rooted beginning");
assert.deepEqual(
  WORLDROOT_CONFIG.currents.routes.map(route => route.id),
  ["root-hearth", "world-memory", "star-memory", "celestial-mastery", "titan-chorus"],
  "named convergence routes must cover every current without depending on array order",
);
assert.deepEqual(
  WORLDROOT_CONFIG.endgame.talentBranchIds,
  ["wayward-star", "hollow-sun", "comet-engine"],
);
assert.deepEqual(sampleWorldrootPath([{ x: 0, y: 0 }, { x: 1, y: 1 }], 0.5), { x: 0.5, y: 0.5 });
assert.deepEqual(
  sampleWorldrootPath([{ x: 0, y: 0 }, { x: 1, y: 1 }], Number.NaN),
  { x: 0, y: 0 },
  "invalid save progress must resolve to the safe root of a path",
);
assert.equal(isWorldrootEnabled("?worldrootPillar=1"), true);
assert.equal(isWorldrootEnabled("?worldrootPillar=legacy"), false, "legacy rollback must remain instant and save-safe");
assert.deepEqual(sampleWorldrootPath([], 0.5), { x: 0.5, y: 0.5 });

const placementVisual = new WorldrootWorldVisual({
  config: { tileSize: 94, topAirRows: 65 },
});
const placementTransform = placementVisual._resolveTransform();
const rootTalentTileX = (
  placementTransform.left
  + WORLDROOT_CONFIG.interaction.rootTalent.x * placementTransform.width
) / placementTransform.tileSize;
assert.ok(
  placementTransform.scaleX <= WORLDROOT_CONFIG.placement.maximumSourceScale,
  "Worldroot art must stay inside its authored presentation-scale ceiling",
);
assert.ok(
  rootTalentTileX - WORLDROOT_CONFIG.placement.hearthTileX >= 2.5,
  "Celestial Talents must remain a separate stop east of the Campfire hearth",
);

const sites = LEVEL_ONE_BIOME_FIELD.seeds.map((seed, index) => ({
  id: `star-${index}`,
  key: `${seed.centerTileX},${LEVEL_ONE_BIOME_FIELD.bounds.topTile + seed.centerDepthM}`,
  tx: seed.centerTileX,
  ty: LEVEL_ONE_BIOME_FIELD.bounds.topTile + seed.centerDepthM,
  identityId: `identity-${index}`,
  identityName: `Star ${index + 1}`,
  rarityIndex: index % 6,
  color: 0x63dfff,
  state: index % 7 === 0 ? "consumed" : "intact",
}));
const titanIds = TITAN_DEFINITIONS.map(definition => definition.id);
const talentBranches = ["wayward-star", "hollow-sun", "comet-engine"].map((id, index) => ({
  id,
  name: ["Wayward Star", "Hollow Sun", "Stellar Lance"][index],
  rootPurchased: true,
  completed: true,
  mastered: true,
  purchasedCount: 10,
  nodeCount: 10,
}));
const scene = {
  worldMapDiscoverySystem: { isTileDiscovered: () => true },
  worldMapStarTerritorySystem: {
    resolveMap: () => ({
      knownSites: sites,
      knownIntactCount: sites.filter(site => site.state === "intact").length,
      knownConsumedCount: sites.filter(site => site.state === "consumed").length,
    }),
  },
  celestialTalentProgressionSystem: {
    getSnapshot: () => ({
      purchasedNodeIds: talentBranches.flatMap(branch => [`${branch.id}-root`, `${branch.id}-capstone`]),
      purchasedRootNodeIds: talentBranches.map(branch => `${branch.id}-root`),
      completedBranchIds: talentBranches.map(branch => branch.id),
      allBranchesCompleted: true,
      branches: talentBranches,
    }),
  },
  retentionProgressSystem: { getDiscoveredTitans: () => titanIds },
  titanClueSystem: { getActiveClueId: () => null },
  campfireSystem: {
    getCampfireLevel: () => 10,
    getActiveBuff: () => ({ type: "warmth", name: "Warmth" }),
  },
  playerController: {
    abilities: {
      getGemPowerExact: () => 74,
      getGemPowerMax: () => 100,
    },
  },
};

const complete = resolveWorldrootSnapshot(scene, { tx: 20, ty: 65 });
assert.equal(complete.profileMemories.length, 50);
assert.equal(complete.regionMemories.length, 5);
assert.equal(complete.starMemories.length, sites.length, "every known Star must appear as a tree memory");
assert.equal(complete.titanMemories.length, 25);
assert.equal(complete.titanCount, 25);
assert.equal(complete.completedTalentBranchCount, 3);
assert.equal(complete.campfireLevel, 10);
assert.equal(complete.currents.length, 5);
assert.equal(complete.endgameReady, true, "all five existing authorities should converge at the Crown Star");
assert.equal(complete.growthStage, 6, "only complete convergence may grow the Crown terrace");
assert.deepEqual(formatWorldrootMissingCurrents(complete), []);
assert.equal(complete.gpRatio, 0.74);
assert.equal(complete.activeCampfireBuff.type, "warmth");

const dynamicOnlySnapshot = resolveWorldrootSnapshot({
  ...scene,
  titanClueSystem: { getActiveClueId: () => titanIds[0] },
  campfireSystem: {
    getCampfireLevel: () => 10,
    getActiveBuff: () => ({ type: "focus", name: "Focus" }),
  },
  playerController: {
    abilities: {
      getGemPowerExact: () => 11,
      getGemPowerMax: () => 100,
    },
  },
});
assert.equal(dynamicOnlySnapshot.gpRatio, 0.11);
assert.equal(dynamicOnlySnapshot.activeCampfireBuff.type, "focus");
assert.equal(dynamicOnlySnapshot.activeTitanClueId, titanIds[0]);
assert.equal(
  dynamicOnlySnapshot.signature,
  complete.signature,
  "live GP, blessing, and tracked-clue pulses must not redraw the static tree",
);

const changedStarIdentitySnapshot = resolveWorldrootSnapshot({
  ...scene,
  worldMapStarTerritorySystem: {
    resolveMap: () => ({
      knownSites: sites.map((site, index) => index === 0
        ? { ...site, identityName: "Changed Star", rarityIndex: 5, color: -12 }
        : site),
    }),
  },
});
assert.equal(changedStarIdentitySnapshot.map.knownSites[0].color, 0);
assert.notEqual(
  changedStarIdentitySnapshot.signature,
  complete.signature,
  "display-affecting Star identity, rarity, and colour changes must redraw the tree",
);

const changedTalentRootSnapshot = resolveWorldrootSnapshot({
  ...scene,
  celestialTalentProgressionSystem: {
    getSnapshot: () => ({
      branches: talentBranches.map((branch, index) => index === 0
        ? { ...branch, rootPurchased: false }
        : branch),
    }),
  },
});
assert.notEqual(
  changedTalentRootSnapshot.signature,
  complete.signature,
  "a changed Talent root must redraw its sap even when purchased counts are unchanged",
);

const hiddenSignals = resolveWorldrootSnapshot({
  ...scene,
  worldMapDiscoverySystem: { isTileDiscovered: () => false },
});
assert.equal(hiddenSignals.starMemories[0].discovered, false);
assert.equal(hiddenSignals.starMemories[0].label, WORLDROOT_CONFIG.copy.unknownStarLabel);
assert.equal(hiddenSignals.starMemories[0].identityId, null);
assert.equal(hiddenSignals.starMemories[0].rarityIndex, 0);
assert.equal(hiddenSignals.starMemories[0].color, WORLDROOT_CONFIG.colors.intact);
assert.equal(hiddenSignals.map.knownSites[0].identityId, null);
assert.equal(hiddenSignals.map.knownSites[0].identityName, WORLDROOT_CONFIG.copy.unknownStarLabel);
assert.notEqual(
  hiddenSignals.signature,
  complete.signature,
  "discovering a Star must refresh its formerly anonymous tree memory",
);

const corruptMapSnapshot = resolveWorldrootSnapshot({
  ...scene,
  worldMapStarTerritorySystem: {
    resolveMap: () => ({
      knownSites: [
        sites[0],
        { ...sites[0] },
        { ...sites[0], id: "duplicate-tile", key: "duplicate-key" },
        { key: "bad-coordinates", tx: Number.NaN, ty: 1, state: "intact" },
        { key: "bad-state", tx: 1, ty: 2, state: "mystery" },
      ],
      knownIntactCount: 99,
      knownConsumedCount: 99,
    }),
  },
});
assert.equal(corruptMapSnapshot.knownStarCount, 1, "duplicate and invalid Star records must be ignored");
assert.equal(corruptMapSnapshot.intactStarCount, 0);
assert.equal(corruptMapSnapshot.consumedStarCount, 1);
assert.equal(corruptMapSnapshot.starMemories.length, 1);

const corruptTalentSnapshot = resolveWorldrootSnapshot({
  ...scene,
  celestialTalentProgressionSystem: {
    getSnapshot: () => ({
      completedBranchIds: ["wayward-star", "fake", "fake"],
      purchasedRootNodeIds: ["fake-root", "fake-root"],
      branches: [{
        id: "wayward-star",
        name: "Wayward Star",
        rootPurchased: true,
        completed: true,
        purchasedCount: 999,
        nodeCount: 10,
      }],
    }),
  },
});
assert.equal(corruptTalentSnapshot.completedTalentBranchCount, 1);
assert.equal(corruptTalentSnapshot.talentRootCount, 1);
assert.equal(corruptTalentSnapshot.talentMemories.length, 3);
assert.equal(corruptTalentSnapshot.talentMemories[0].progress, 1);
assert.equal(corruptTalentSnapshot.endgameReady, false);

const corruptResourceSnapshot = resolveWorldrootSnapshot({
  ...scene,
  campfireSystem: {
    getCampfireLevel: () => 999,
    getActiveBuff: () => null,
  },
  playerController: {
    abilities: {
      getGemPowerExact: () => Number.POSITIVE_INFINITY,
      getGemPowerMax: () => Number.NaN,
    },
  },
});
assert.equal(corruptResourceSnapshot.campfireLevel, WORLDROOT_CONFIG.endgame.requiredCampfireLevel);
assert.equal(corruptResourceSnapshot.gpCurrent, 0);
assert.equal(corruptResourceSnapshot.gpMaximum, 0);
assert.equal(corruptResourceSnapshot.gpRatio, 0);

const invalidTitanSnapshot = resolveWorldrootSnapshot({
  ...scene,
  retentionProgressSystem: {
    getDiscoveredTitans: () => [...titanIds.slice(0, -1), "not-a-real-titan"],
  },
  titanClueSystem: { getActiveClueId: () => "not-a-real-titan" },
});
assert.equal(invalidTitanSnapshot.titanCount, 24, "unknown save ids must not complete the Titan Chorus");
assert.equal(invalidTitanSnapshot.activeTitanClueId, null);
assert.equal(invalidTitanSnapshot.endgameReady, false);

const malformedTitanSnapshot = resolveWorldrootSnapshot({
  ...scene,
  retentionProgressSystem: { getDiscoveredTitans: () => ({ invalid: true }) },
});
assert.equal(malformedTitanSnapshot.titanCount, 0, "non-array Titan save data must fail closed");

const trackedTitanId = titanIds[7];
const trackedTitanSnapshot = resolveWorldrootSnapshot({
  ...scene,
  retentionProgressSystem: { getDiscoveredTitans: () => [] },
  titanClueSystem: { getActiveClueId: () => trackedTitanId },
});
assert.equal(trackedTitanSnapshot.titanMemories.find(titan => titan.id === trackedTitanId)?.tracked, true);
assert.equal(trackedTitanSnapshot.titanMemories.find(titan => titan.id === trackedTitanId)?.discovered, false);

const overfilledGpSnapshot = resolveWorldrootSnapshot({
  ...scene,
  playerController: {
    abilities: {
      getGemPowerExact: () => 250,
      getGemPowerMax: () => 100,
    },
  },
});
assert.equal(overfilledGpSnapshot.gpRatio, 1, "GP sap intensity must remain bounded");

const incomplete = {
  ...complete,
  endgameReady: false,
  awakeRegionCount: 4,
  knownStarCount: 12,
  titanCount: 2,
  talentRootCount: 0,
  campfireLevel: 1,
};
assert.ok(resolveWorldrootGrowthStage(incomplete) < 6);

const platforms = normalizeOneWayPlatforms([
  { id: "worldroot-test", leftX: 20, rightX: 180, y: 100 },
]);
const falling = {
  x: 40,
  y: 60,
  w: 20,
  h: 20,
  oneWayPlatformDropId: null,
  oneWayPlatformDropIds: null,
};
assert.equal(findCrossedOneWayPlatform(platforms, falling, 30, 0, 1)?.id, "worldroot-test");
assert.equal(findCrossedOneWayPlatform(platforms, falling, -30, 0, 1), null, "upward movement must pass through");
falling.y = 80;
assert.equal(findStandingOneWayPlatform(platforms, falling, 0, 1)?.id, "worldroot-test");
falling.oneWayPlatformDropId = "worldroot-test";
assert.equal(findStandingOneWayPlatform(platforms, falling, 0, 1), null);
falling.y = 105;
falling.clearOneWayPlatformDropThrough = function clearDrop() {
  this.oneWayPlatformDropId = null;
  this.oneWayPlatformDropIds = null;
};
assert.equal(refreshOneWayPlatformDropState(platforms, falling, 1), true);
assert.equal(falling.oneWayPlatformDropId, null);
falling.x = 40;
falling.y = 80;
falling.oneWayPlatformDropId = "worldroot-test";
assert.equal(refreshOneWayPlatformDropState(platforms, falling, 1), false);
falling.x = 200;
assert.equal(refreshOneWayPlatformDropState(platforms, falling, 1), true);
assert.equal(falling.oneWayPlatformDropId, null, "walking off a terrace must release its drop lock");
falling.x = 40;
falling.y = 40;
falling.oneWayPlatformDropId = "worldroot-test";
assert.equal(refreshOneWayPlatformDropState(platforms, falling, 1), true);
assert.equal(falling.oneWayPlatformDropId, null, "retreating fully above a terrace must release its drop lock");
falling.oneWayPlatformDropId = "missing-platform";
assert.equal(refreshOneWayPlatformDropState(platforms, falling, 1), true);
assert.deepEqual(normalizeOneWayPlatforms([
  { id: "bad", leftX: 20, rightX: 10, y: 5 },
  { id: "good", leftX: 0, rightX: 10, y: 20 },
]), [{ id: "good", leftX: 0, rightX: 10, y: 20 }]);

const emptyWorld = {
  isSolid: () => false,
  inBounds: () => true,
  getTileType: () => 0,
};
const collision = new TileCollisionSystem(emptyWorld, { tileSize: 10, topAirRows: 65 });
collision.setOneWayPlatformProvider(() => platforms);
const body = {
  x: 40, y: 40, w: 20, h: 20, vx: 0, vy: 100, onGround: false,
  surfaceDropThroughRow: null,
  oneWayPlatformDropId: null,
  oneWayPlatformDropIds: null,
  clearSurfaceDropThrough() { this.surfaceDropThroughRow = null; },
  clearOneWayPlatformDropThrough() {
    this.oneWayPlatformDropId = null;
    this.oneWayPlatformDropIds = null;
  },
};
collision.moveAndCollideY(body, 55);
assert.equal(body.y, 80, "falling body must stand on a Worldroot terrace");
assert.equal(body.onGround, true);
assert.equal(collision.tryBeginOneWayPlatformDropThrough(body), true);
collision.moveAndCollideY(body, 30);
assert.ok(body.y > 100, "drop input must pass through the current terrace");
assert.equal(body.oneWayPlatformDropId, null, "drop lock must clear after the body passes below");
body.y = 120;
body.vy = -100;
collision.moveAndCollideY(body, -50);
assert.equal(body.y, 70, "rising body must pass through a terrace without ceiling collision");
body.y = 10;
assert.equal(collision.tryBeginOneWayPlatformDropThrough(body), false);
body.x = 40;
body.y = 80;
body.oneWayPlatformDropId = "worldroot-test";
collision.moveAndCollideX(body, 200);
assert.equal(body.oneWayPlatformDropId, null, "horizontal movement must refresh terrace drop state");

const groupedPlatforms = normalizeOneWayPlatforms([
  { id: "road-west", leftX: 20, rightX: 110, y: 100, dropGroup: "continuous-road" },
  { id: "road-east", leftX: 90, rightX: 180, y: 106, dropGroup: "continuous-road" },
  { id: "lower-catch", leftX: 20, rightX: 180, y: 150 },
]);
assert.deepEqual(
  resolveOneWayPlatformDropIds(groupedPlatforms, groupedPlatforms[0]),
  ["road-west", "road-east"],
  "connected platform pieces must share one drop-through lock",
);
collision.setOneWayPlatformProvider(() => groupedPlatforms);
Object.assign(body, {
  x: 70,
  y: 80,
  vx: 120,
  vy: 0,
  onGround: true,
  oneWayPlatformDropId: null,
  oneWayPlatformDropIds: null,
});
assert.equal(collision.tryBeginOneWayPlatformDropThrough(body), true);
assert.deepEqual(body.oneWayPlatformDropIds, ["road-west", "road-east"]);
collision.moveAndCollideX(body, 40);
assert.equal(body.vx, 120, "starting a drop while moving must preserve horizontal velocity");
assert.deepEqual(
  body.oneWayPlatformDropIds,
  ["road-west", "road-east"],
  "crossing onto the adjacent surface piece must retain the active drop lock",
);
collision.moveAndCollideY(body, 35);
assert.ok(body.y > 106, "moving drop must clear both connected surface pieces");
assert.equal(body.oneWayPlatformDropId, null);
assert.equal(body.oneWayPlatformDropIds, null);
collision.moveAndCollideY(body, 50);
assert.equal(body.y, 130, "an unrelated lower platform must still catch the moving player");
assert.equal(body.onGround, true);
assert.equal(body.vx, 120);

const interactionCalls = [];
const interactionScene = {
  hudSystem: { flashStatus: (...args) => interactionCalls.push(["status", ...args]) },
  showWorldMap: options => {
    interactionCalls.push(["map", options]);
    return true;
  },
  showPauseMenu: options => {
    interactionCalls.push(["pause", options]);
    return true;
  },
  events: { emit: (...args) => interactionCalls.push(["event", ...args]) },
};
const visual = new WorldrootWorldVisual(interactionScene);
visual.snapshot = complete;
visual._findHotspot = () => ({ kind: "root" });
assert.equal(visual.handleInteract({ tx: 0, ty: 0 }), "talents", "root hearth must route to Celestial Talents");
visual._findHotspot = () => ({
  kind: "star",
  source: { label: "Mercury Fold", state: "consumed", tile: { tx: 44, ty: 91 } },
});
assert.equal(visual.handleInteract({ tx: 0, ty: 0 }), true);
assert.deepEqual(interactionCalls.find(call => call[0] === "map")?.[1], {
  focusTile: { tx: 44, ty: 91 },
}, "Star memories must open the M map at their original territory");
visual._findHotspot = () => ({
  kind: "biome",
  source: { label: "Mercury Fold", knownCount: 3, focusTile: { tx: 55, ty: 155 } },
});
assert.equal(visual.handleInteract({ tx: 0, ty: 0 }), true);
assert.deepEqual(interactionCalls.filter(call => call[0] === "map").at(-1)[1], {
  focusTile: { tx: 55, ty: 155 },
});
visual._findHotspot = () => ({
  kind: "titan",
  source: { name: "The Rootbound", color: 0x83ecff, lore: { epithet: "Worldroot Titan" } },
});
assert.equal(visual.handleInteract({ tx: 0, ty: 0 }), true);
assert.deepEqual(interactionCalls.find(call => call[0] === "pause")?.[1], {
  initialTabKey: "titans",
}, "Titan wounds must route to the Titan Archive");

const unavailableRouteCalls = [];
const unavailableRouteVisual = new WorldrootWorldVisual({
  hudSystem: { flashStatus: (...args) => unavailableRouteCalls.push(args) },
});
unavailableRouteVisual._findHotspot = () => ({
  kind: "star",
  source: { label: "Silent Star", state: "intact", tile: { tx: 4, ty: 8 } },
});
assert.equal(
  unavailableRouteVisual.handleInteract({ tx: 0, ty: 0 }),
  false,
  "a missing map route must not claim the interaction",
);
assert.equal(unavailableRouteCalls.length, 0, "failed routes must not announce an action that did not open");
unavailableRouteVisual.scene.showWorldMap = () => true;
unavailableRouteVisual._findHotspot = () => ({
  kind: "biome",
  source: { label: "Lost Biome", knownCount: 1, focusTile: null },
});
assert.equal(
  unavailableRouteVisual.handleInteract({ tx: 0, ty: 0 }),
  false,
  "a biome without a valid map coordinate must fail safely",
);
unavailableRouteVisual._findHotspot = () => ({
  kind: "titan",
  source: { name: "Silent Titan", color: 0x83ecff },
});
assert.equal(
  unavailableRouteVisual.handleInteract({ tx: 0, ty: 0 }),
  false,
  "a missing Titan Archive route must not claim the interaction",
);
visual._findHotspot = () => ({ kind: "crown" });
visual.snapshot = {
  ...complete,
  endgameReady: false,
  currents: complete.currents.map((current, index) => ({
    ...current,
    ready: index > 0,
    detail: index === 0 ? "Campfire 9/10" : current.detail,
  })),
};
assert.equal(visual.handleInteract({ tx: 0, ty: 0 }), true);
assert.equal(
  interactionCalls.some(call => call[0] === "event" && call[1] === "worldroot-endgame-ready"),
  false,
  "the dormant Crown must explain missing currents without beginning endgame",
);
assert.match(interactionCalls.filter(call => call[0] === "status").at(-1)[1], /Campfire 9\/10/);
visual.snapshot = complete;
assert.equal(visual.handleInteract({ tx: 0, ty: 0 }), true);
assert.equal(visual.handleInteract({ tx: 0, ty: 0 }), true);
assert.equal(
  interactionCalls.filter(call => call[0] === "event" && call[1] === "worldroot-endgame-ready").length,
  1,
  "the complete Crown must emit once even when interact is pressed repeatedly",
);
assert.equal(
  interactionCalls.some(call => call[0] === "event" && call[1] === "worldroot-endgame-ready"),
  true,
  "the complete Crown must emit the endgame-start event",
);

visual.enabled = true;
visual.transform = { left: 100, top: 200, width: 1000, height: 600, tileSize: 10 };
visual.growthStage = 0;
assert.equal(
  visual.getOneWayPlatforms().length,
  WORLDROOT_CONFIG.terraces.length,
  "every fully visible authored branch must remain physical at the rooted beginning",
);
visual.growthStage = 6;
assert.equal(
  visual.getOneWayPlatforms().length,
  WORLDROOT_CONFIG.terraces.length,
  "final convergence must retain every authored upper terrace",
);
assert.deepEqual(
  visual.getOneWayPlatforms()
    .filter(platform => platform.dropGroup === "memory-road")
    .map(platform => platform.id),
  ["worldroot-memory-road-west", "worldroot-memory-road-east"],
  "runtime platform geometry must preserve continuous-surface drop groups",
);

const hotspotVisual = new WorldrootWorldVisual({});
hotspotVisual.enabled = true;
hotspotVisual.transform = { left: 0, top: 0, width: 100, height: 100, tileSize: 10 };
hotspotVisual.memoryLayer = {
  pointToWorld: point => ({ x: point.x * 100, y: point.y * 100 }),
};
hotspotVisual.snapshot = {
  profileMemories: [],
  starMemories: [
    { id: "revealed", point: { x: 0.2, y: 0.2 } },
    { id: "unborn", point: { x: 0.8, y: 0.2 } },
  ],
  titanMemories: [],
};
hotspotVisual.revealRight = WORLDROOT_CONFIG.reveal.rightByStage[0];
hotspotVisual._rebuildHotspots();
assert.deepEqual(
  hotspotVisual.hotspots.filter(hotspot => hotspot.kind === "star").map(hotspot => hotspot.source.id),
  ["revealed"],
  "unborn branches must not expose invisible Star interactions",
);
const cachedHotspot = hotspotVisual._findHotspot({ tx: 2, ty: 2 });
assert.equal(hotspotVisual._findHotspot({ tx: 2, ty: 2 }), cachedHotspot);
assert.equal(hotspotVisual._findHotspot(null), null, "invalid player positions must fail safely");
hotspotVisual.revealRight = 1;
hotspotVisual._rebuildHotspots();
assert.equal(
  hotspotVisual.hotspots.filter(hotspot => hotspot.kind === "star").length,
  2,
  "a newly grown branch must activate its story interaction",
);
assert.notEqual(hotspotVisual._findHotspot({ tx: 2, ty: 2 }), cachedHotspot);

let revealStopped = false;
let revealedRight = 0;
let staticRedrawCount = 0;
const transitionVisual = new WorldrootWorldVisual({
  tweens: {
    add: () => ({ stop: () => { revealStopped = true; } }),
  },
});
transitionVisual.enabled = true;
transitionVisual.growthStage = 3;
transitionVisual.revealRight = WORLDROOT_CONFIG.reveal.rightByStage[3];
transitionVisual.signature = "stage-3";
transitionVisual.memoryLayer = {
  sync() { staticRedrawCount += 1; },
  snapshot: null,
};
transitionVisual._setRevealRight = right => { revealedRight = right; };
transitionVisual._syncConsumedCrops = () => {};
transitionVisual._rebuildHotspots = () => {};
transitionVisual.sync({ ...complete, signature: "stage-4", growthStage: 4 }, true);
transitionVisual.sync({ ...complete, signature: "stage-4", growthStage: 4, gpRatio: 0.1 }, true);
assert.equal(revealStopped, false, "periodic state sync must not interrupt an active growth reveal");
assert.equal(staticRedrawCount, 1, "dynamic-only pulse updates must reuse the static memory drawing");
transitionVisual.sync({ ...complete, signature: "stage-2", growthStage: 2 }, false);
assert.equal(revealStopped, false, "crop-free growth must not create a hidden reveal tween");
assert.equal(revealedRight, WORLDROOT_CONFIG.reveal.rightByStage[2]);

const makeCircle = (x, y) => ({
  x, y,
  scale: 1,
  alpha: 1,
  destroyed: false,
  setDepth() { return this; },
  setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
  setScale(scale) { this.scale = scale; return this; },
  setAlpha(alpha) { this.alpha = alpha; return this; },
  destroy() { this.destroyed = true; },
});
const memoryLayer = new WorldrootMemoryLayer({
  config: { tileSize: 10 },
  add: { circle: makeCircle },
}, { left: 100, top: 200, width: 1000, height: 600 });
const routeMoves = [];
memoryLayer._drawConvergenceCurrents({
  lineStyle() {},
  beginPath() {},
  moveTo(x, y) { routeMoves.push({ x, y }); },
  lineTo() {},
  strokePath() {},
}, {
  growthStage: 6,
  currents: [...complete.currents].reverse().map(current => ({
    ...current,
    ready: current.id === "titan-chorus",
  })),
});
const titanRoute = WORLDROOT_CONFIG.currents.routes.find(route => route.id === "titan-chorus");
assert.deepEqual(
  routeMoves[0],
  memoryLayer.pointToWorld(titanRoute.point),
  "reordered snapshot currents must still draw from their named source branch",
);
const consumedRadii = [];
memoryLayer._drawStarMemories({
  fillStyle() {},
  fillCircle(x, y, radius) { consumedRadii.push(radius); },
  lineStyle() {},
  lineBetween() {},
  strokeCircle() {},
}, {
  growthStage: 6,
  starMemories: [{ state: "consumed", rarityIndex: 0, point: { x: 0.5, y: 0.5 } }],
});
assert.equal(consumedRadii[0], WORLDROOT_CONFIG.markers.consumedRadiusPx);

const stagedStarMarks = [];
memoryLayer._drawStarMemories({
  fillStyle() {},
  fillCircle(x, y) { stagedStarMarks.push({ x, y }); },
  lineStyle() {},
  lineBetween() {},
  strokeCircle() {},
}, {
  growthStage: 0,
  starMemories: [
    { state: "intact", rarityIndex: 0, color: 0x83ecff, point: { x: 0.2, y: 0.5 } },
    { state: "intact", rarityIndex: 0, color: 0x83ecff, point: { x: 0.8, y: 0.5 } },
  ],
});
assert.equal(stagedStarMarks.length, 1, "memory marks must grow with their branch instead of floating in empty air");
memoryLayer.snapshot = {
  starMemories: [{ tile: { tx: 4, ty: 5 }, point: { x: 0.5, y: 0.5 } }],
};
assert.equal(memoryLayer.queueStarArrival({ originTileX: 4, originTileY: 5 }), true);
assert.equal(memoryLayer.queueStarArrival({ originTileX: 6, originTileY: 7 }), true);
const queuedArrivals = [...memoryLayer.arrivals];
assert.equal(queuedArrivals[0].delay, 0);
assert.equal(queuedArrivals[1].delay, WORLDROOT_CONFIG.markers.arrivalStaggerMs);
assert.deepEqual(queuedArrivals[0].target, { x: 600, y: 500 });
memoryLayer.update(0);
memoryLayer.update(WORLDROOT_CONFIG.markers.arrivalDurationMs / 2);
assert.ok(queuedArrivals[0].core.x > queuedArrivals[0].start.x, "Star flight must visibly advance");
memoryLayer.update(
  WORLDROOT_CONFIG.markers.arrivalDurationMs
    + WORLDROOT_CONFIG.markers.arrivalStaggerMs + 1,
);
assert.equal(memoryLayer.arrivals.size, 0, "both staggered Star flights must finish");
assert.ok(queuedArrivals.every(arrival => arrival.core.destroyed && arrival.halo.destroyed));
assert.equal(memoryLayer.queueStarArrival({ originTileX: 4, originTileY: 5 }), true);
memoryLayer.destroy();
assert.equal(memoryLayer.arrivals.size, 0);

globalThis.Phaser = {
  Math: { Clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)) },
};
let accidentalTalentOpenCount = 0;
const arbitrationPillar = new StarPillarSystem({}, {
  starPillarTileX: 10,
  starPillarTileY: 10,
  starPillarProximityTiles: 2,
}, {}, {});
arbitrationPillar._townUsesWorldroot = true;
arbitrationPillar._townWorldVisual = {
  getInteractionDistance: () => 0,
  handleInteract: () => false,
};
arbitrationPillar.openConstellationView = () => {
  accidentalTalentOpenCount += 1;
  return true;
};
assert.equal(arbitrationPillar.handleInteract({ tx: 0, ty: 0 }), false);
assert.equal(
  accidentalTalentOpenCount,
  0,
  "a failed Worldroot map/archive route must not fall through into Celestial Talents",
);

let previewSnapshot = null;
const pillarScene = { _worldrootEndgameStarted: false };
const pillar = new StarPillarSystem(pillarScene, { topAirRows: 65 }, {}, {});
pillar._townUsesWorldroot = true;
pillar._worldrootSnapshot = complete;
pillar._townWorldVisual = {
  sync(snapshot) { previewSnapshot = snapshot; },
  getDebugSnapshot() {
    return {
      knownStars: previewSnapshot?.knownStarCount || 0,
      consumedStars: previewSnapshot?.consumedStarCount || 0,
      endgameReady: previewSnapshot?.endgameReady === true,
    };
  },
};
assert.deepEqual(pillar.previewWorldrootProgress(5, { consumed: true }), {
  knownStars: 50,
  consumedStars: 50,
  endgameReady: false,
});
pillarScene._worldrootEndgameStarted = true;
assert.deepEqual(pillar.previewWorldrootProgress(0), {
  knownStars: 0,
  consumedStars: 0,
  endgameReady: false,
}, "cycling back to the hearth must not inherit consumed preview data");
assert.equal(
  pillarScene._worldrootEndgameStarted,
  false,
  "cycling a save-safe preview must restore the real Crown event guard",
);
assert.equal(pillar.previewWorldrootProgress(6).endgameReady, true);
assert.equal(previewSnapshot.currents.every(current => current.ready), true);
pillarScene._worldrootEndgameStarted = true;
assert.equal(pillar.restoreWorldrootPreview(), true);
assert.equal(previewSnapshot, complete, "preview restore must return to the real authority snapshot");
assert.equal(pillarScene._worldrootEndgameStarted, false);

let promptDestroyed = false;
const destroyScene = { _worldrootEndgameStarted: true };
const destroyPillar = new StarPillarSystem(destroyScene, {}, {}, {});
destroyPillar._worldrootPreviewBaseline = complete;
destroyPillar._worldrootPreviewEndgameStartedBaseline = false;
destroyPillar._ePrompt = { destroy: () => { promptDestroyed = true; } };
destroyPillar.destroy();
assert.equal(destroyScene._worldrootEndgameStarted, false, "teardown must restore the real Crown guard");
assert.equal(promptDestroyed, true);
assert.equal(destroyPillar._ePrompt, null);

const [setupSource, updateSource, inputSource, pillarSource, visualSource, campfireSource, bootSource, uiSource, harnessSource] = await Promise.all([
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlayerInputHandler.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/StarPillarSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/WorldrootWorldVisual.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/environment/CampfireSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
  readFile(new URL("./JkdE2EHarness.js", import.meta.url), "utf8"),
]);
assert.match(setupSource, /setOneWayPlatformProvider/);
assert.match(updateSource, /getWorldrootInteractionDistance/);
assert.match(updateSource, /worldrootClaimsInteraction/);
assert.match(updateSource, /allowOpen:\s*!worldrootClaimsInteraction/);
assert.doesNotMatch(
  inputSource,
  /!this\.scene\?\.specialTileSystem\?\.promptTile/,
  "the shared E-key buffer must not be limited to SpecialTile prompts",
);
assert.match(inputSource, /specialTileInteractBufferedUntilMs = now/);
assert.match(campfireSource, /const allowOpen = options\.allowOpen !== false/);
assert.match(campfireSource, /setVisible\(inRange && !this\._isSelecting && allowOpen\)/);
assert.match(
  campfireSource,
  /inRange && justE && !this\._isSelecting && allowOpen/,
  "Campfire must yield the shared E key while the Worldroot talent hotspot owns it",
);
assert.match(pillarSource, /resolveWorldrootSnapshot/);
assert.match(pillarSource, /queueStarArrival/);
assert.match(visualSource, /createGeometryMask/);
assert.match(visualSource, /clearMask/);
assert.match(bootSource, /WORLDROOT_CONFIG\.assets/);
assert.match(bootSource, /if \(isWorldrootEnabled\(\)\)/, "legacy rollback must not preload Worldroot art");
assert.match(uiSource, /_pendingWorldMapFocusTile/);
assert.match(uiSource, /if \(centered\) this\._pendingWorldMapFocusTile = null/);
assert.doesNotMatch(harnessSource, /event\.code === "Digit6"/, "QA must not steal action-bar slot six");
assert.match(harnessSource, /previewWorldroot/);
assert.match(harnessSource, /BracketLeft/);
assert.match(harnessSource, /interactWorldroot/);

console.log("WORLDROOT_INTERCONNECTION_CONTRACT_OK");
