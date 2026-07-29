import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CAVE_ARCHETYPE_CONFIG,
  getCaveArchetype,
} from "../values/caveArchetypes.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { CaveAtmosphereSystem } from "../systems/visual/CaveAtmosphereSystem.js";
import { CaveInteriorOcclusionSystem } from "../systems/visual/CaveInteriorOcclusionSystem.js";
import {
  applyCaveFeatures,
  attachCaveIdentity,
  rebuildCaveFeatureIndexes,
  resolveCaveIdentity,
} from "../world/model/CaveIdentityPlanner.js";
import { WorldModel } from "../world/model/WorldModel.js";

function makeBlankWorld(width = 90, depth = 90) {
  const model = Object.create(WorldModel.prototype);
  model.config = { seed: 133742, tileSize: 94, topAirRows: 0, maxTileHp: 100 };
  model.widthTiles = width;
  model.depthTiles = depth;
  model.width = width;
  model.depth = depth;
  model.topAirRows = 0;
  model.tileSize = 94;
  model._types = new Uint8Array(width * depth);
  model._types.fill(TILE_TYPES.DIRT);
  model._hp = new Float32Array(width * depth);
  model.dugTiles = new Map();
  model.dugTileSource = new Map();
  model.rubbleTiles = new Map();
  model.caveZones = [];
  model.hiddenCaveZones = [];
  model.treasureRoomZones = [];
  model.geodeZones = [];
  model.glowCrystalZones = [];
  model.getTileMaxHp = () => 10;
  return model;
}

assert.equal(CAVE_ARCHETYPE_CONFIG.archetypes.length, 6);
assert.equal(new Set(CAVE_ARCHETYPE_CONFIG.archetypes.map(entry => entry.id)).size, 6);
assert.equal(new Set(CAVE_ARCHETYPE_CONFIG.archetypes.map(entry => entry.motif)).size, 6);

const formCases = [
  [3, "Pocket"],
  [7, "Crawl"],
  [16, "Gallery"],
  [30, "Longreach"],
];
for (const [rx, expectedForm] of formCases) {
  const identity = resolveCaveIdentity({ cx: 40 + rx, cy: 1300, rx }, 133742, 0);
  assert.ok(identity.displayName.endsWith(expectedForm), `${rx} radius resolves ${expectedForm}`);
}

const sampledIdentities = [];
for (let index = 0; index < 240; index += 1) {
  const zone = {
    id: `sample-${index}`,
    cx: 4 + (index * 37) % 270,
    cy: 35 + (index * 83) % 1900,
    rx: 2 + (index * 11) % 39,
    ry: 1,
  };
  const identity = resolveCaveIdentity(zone, 133742, 0);
  const repeated = resolveCaveIdentity(zone, 133742, 0);
  assert.deepEqual(identity, repeated, "identity and feature plans must be deterministic");
  assert.ok(
    getCaveArchetype(identity.archetypeId).minDepth <= identity.depth,
    `${identity.archetypeId} obeys its minimum depth`,
  );
  sampledIdentities.push(identity);
}
assert.equal(
  new Set(sampledIdentities.map(identity => identity.archetypeId)).size,
  6,
  "the production seed exposes every cave family across the mine",
);

const featureWorld = makeBlankWorld();
let featureZone = null;
for (let index = 0; index < 300 && !featureZone; index += 1) {
  const candidate = {
    id: `feature-${index}`,
    cx: 12 + index % 60,
    cy: 12 + (index * 7) % 60,
    rx: 6,
    ry: 1,
    wallThickness: 1,
    standaloneScene: false,
    entranceSides: ["left"],
  };
  attachCaveIdentity(candidate, featureWorld.config.seed, featureWorld.topAirRows);
  if (candidate.identity.featurePlans.length) featureZone = candidate;
}
assert.ok(featureZone, "the deterministic planner must produce feature-bearing caves");
featureWorld.caveZones.push(featureZone);
featureWorld.applyCaveZone(featureZone);
assert.equal(featureWorld.getTileType(featureZone.cx, featureZone.cy), TILE_TYPES.AIR);
assert.ok(featureZone.features.length > 0);
for (const feature of featureZone.features) {
  assert.equal(feature.tx, featureZone.cx, "features remain in the center cap");
  assert.notEqual(feature.ty, featureZone.cy, "features never block the travel lane");
  assert.ok(
    feature.ty === featureZone.cy - featureZone.ry
      || feature.ty === featureZone.cy + featureZone.ry,
    "features use only the ceiling or floor niche",
  );
  assert.equal(featureWorld.getTileType(feature.tx, feature.ty), feature.tileType);
}

const indexedWorld = makeBlankWorld();
const indexedZone = {
  id: "indexed-cave",
  cx: 25,
  cy: 25,
  rx: 7,
  ry: 1,
  archetypeId: "gilded-burrow",
  visualSeed: 77,
  features: [
    { id: "chest", tx: 25, ty: 26, tileType: TILE_TYPES.CHEST, source: "cave-archetype" },
    { id: "crystal", tx: 25, ty: 24, tileType: TILE_TYPES.GLOW_CRYSTAL, source: "cave-archetype" },
    { id: "stale-chest", tx: 26, ty: 26, tileType: TILE_TYPES.CHEST, source: "cave-archetype" },
  ],
};
indexedWorld.caveZones.push(indexedZone);
indexedWorld.setTile(25, 26, TILE_TYPES.CHEST, 0);
indexedWorld.setTile(25, 24, TILE_TYPES.GLOW_CRYSTAL, 0);
indexedWorld.setTile(26, 26, TILE_TYPES.AIR, 0);
assert.deepEqual(rebuildCaveFeatureIndexes(indexedWorld), {
  treasureRooms: 1,
  glowCrystals: 1,
});
assert.equal(indexedWorld.treasureRoomZones[0].chestTx, 25);
assert.equal(indexedWorld.glowCrystalZones[0].color, getCaveArchetype("gilded-burrow").palette.glow);

const occlusionWorld = makeBlankWorld();
const occlusionZone = {
  id: "cave-discovery",
  cx: 40,
  cy: 40,
  rx: 7,
  ry: 1,
  wallThickness: 1,
  standaloneScene: false,
  entranceSides: ["left"],
};
attachCaveIdentity(occlusionZone, 133742, 0);
occlusionWorld.caveZones.push(occlusionZone);
occlusionWorld.applyCaveZone(occlusionZone);
const discoveryEvents = [];
const fakeScene = {
  config: { tileSize: 94 },
  time: { now: 1000 },
  retentionProgressSystem: {
    discoverJournal: (...args) => discoveryEvents.push(["journal", ...args]),
  },
  caveAtmosphereSystem: {
    celebrateDiscovery: zoneId => discoveryEvents.push(["celebrate", zoneId]),
  },
  uiNotifications: {
    info: message => discoveryEvents.push(["notification", message]),
  },
};
const occlusion = new CaveInteriorOcclusionSystem(fakeScene);
occlusion.worldModel = occlusionWorld;
const collectedZone = occlusion.collectZones(occlusionWorld)[0];
assert.equal(
  occlusion.isBreached(collectedZone),
  false,
  "a permanent integrated-cave entrance must not reveal every cave at boot",
);
assert.equal(occlusion.isPlayerInside(collectedZone, occlusionZone.entry), true);
occlusion._revealZone(collectedZone);
assert.ok(discoveryEvents.some(event => event[0] === "journal"));
assert.equal(
  discoveryEvents.some(event => event[0] === "notification"),
  false,
  "cave discovery stays in the Journey and world presentation without a popup",
);
assert.deepEqual(
  discoveryEvents.find(event => event[0] === "celebrate"),
  ["celebrate", occlusionZone.id],
);

function makeGraphics() {
  const calls = [];
  let proxy;
  proxy = new Proxy({ calls }, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => {
        calls.push([property, ...args]);
        return proxy;
      };
    },
  });
  return proxy;
}

globalThis.Phaser = { BlendModes: { ADD: "add" } };
const atmosphereGraphics = [];
const atmosphereScene = {
  config: { tileSize: 94 },
  time: { now: 1000 },
  add: {
    graphics: () => {
      const graphics = makeGraphics();
      atmosphereGraphics.push(graphics);
      return graphics;
    },
  },
};
const atmosphere = new CaveAtmosphereSystem(atmosphereScene);
assert.equal(atmosphere.create(occlusionWorld), true);
atmosphere.update({ tx: occlusionZone.cx, ty: occlusionZone.cy }, 1000);
assert.equal(atmosphere.activeZones.length, 1);
assert.ok(atmosphereGraphics.some(graphics => graphics.calls.length > 0));
atmosphere.celebrateDiscovery(occlusionZone.id);
atmosphere.update({ tx: occlusionZone.cx, ty: occlusionZone.cy }, 1200);
assert.equal(atmosphere.revealStartedAt.has(occlusionZone.id), true);
atmosphere.destroy();
delete globalThis.Phaser;

const productionWorld = new WorldModel(GAME_CONFIG);
const productionLevelOneCaves = productionWorld.caveZones
  .filter(zone => zone.source !== "second-world");
const productionGapCaves = productionWorld.caveZones
  .filter(zone => zone.source === "authored-gap");
const productionLevelTwoCaves = productionWorld.caveZones
  .filter(zone => zone.source === "second-world");
assert.ok(productionLevelOneCaves.length >= 25, "Level One retains at least five live caves per depth band");
assert.ok(productionGapCaves.length >= 15, "authored gaps receive a meaningful low-cave supplement");
assert.ok(productionGapCaves.every(zone => zone.ry === 1), "supplemental normal caves stay 2-3 tiles high");
assert.ok(productionLevelTwoCaves.length >= 180, "existing Level Two caverns join shared cave progression");
assert.equal(
  new Set(productionLevelOneCaves.map(zone => zone.archetypeId)).size,
  6,
  "the production Level One route exposes all six cave identities",
);
assert.ok(productionWorld.treasureRoomZones.length > 0, "live Gilded caves index functional chests");
assert.ok(productionWorld.glowCrystalZones.length > 0, "live luminous caves index crystal lighting");
assert.equal(
  productionWorld.caveLightZones.filter(zone => zone.isHazardLight !== true).length,
  productionWorld.caveZones.filter(zone => zone.standaloneScene !== true).length,
  "every integrated cave receives a local darkness-mask light pool",
);
for (const zone of productionLevelOneCaves) {
  assert.equal(
    productionWorld.getTileType(zone.cx, zone.cy),
    TILE_TYPES.AIR,
    `${zone.id} keeps its main travel lane open`,
  );
}

const setupSource = await readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8");
const updateSource = await readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8");
const modelSource = await readFile(new URL("../world/model/WorldModel.js", import.meta.url), "utf8");
assert.match(setupSource, /new CaveAtmosphereSystem\(this\)/);
assert.match(setupSource, /new CaveInteriorOcclusionSystem\(this\)/);
assert.match(updateSource, /caveAtmosphereSystem\.update\(activePlayerTile, time\)/);
assert.match(modelSource, /attachCaveIdentity\(zone/);
assert.match(modelSource, /supplementAuthoredCaveGaps\(this, TILED_WORLD_OVERRIDE\)/);
assert.match(modelSource, /finalizeCaveIdentities\(this\)/);

// Keep the direct feature helper import live for focused future contracts.
assert.equal(typeof applyCaveFeatures, "function");

console.log("cave identity overhaul contract passed");
