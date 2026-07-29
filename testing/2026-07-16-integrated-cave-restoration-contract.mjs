import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CAVE_SCENE_CONFIG,
  resolveCompactCaveScenesEnabled,
  resolveIntegratedCaveEntrancesEnabled,
} from "../values/caveSceneConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_GEN_CONFIG } from "../values/worldGen.js";
import { CaveEntryController } from "../world/playScene/CaveEntryController.js";
import { CaveWorldModel, makeCaveTileSaveKey } from "../world/model/CaveWorldModel.js";
import { sanitizeCaveSceneData } from "../world/model/DugTilesSaveStore.js";
import { WorldModel } from "../world/model/WorldModel.js";

function makeBlankWorld(width = 40, depth = 32) {
  const model = Object.create(WorldModel.prototype);
  model.config = { seed: 77, tileSize: 94, topAirRows: 0 };
  model.widthTiles = width;
  model.depthTiles = depth;
  model.width = width;
  model.depth = depth;
  model.topAirRows = 0;
  model.tileSize = 94;
  model._types = new Uint8Array(width * depth);
  model._types.fill(TILE_TYPES.DIRT);
  model._hp = new Float32Array(width * depth);
  model._hp.fill(10);
  model.dugTiles = new Map();
  model.dugTileSource = new Map();
  model.rubbleTiles = new Map();
  model.caveZones = [];
  return model;
}

assert.equal(
  WORLD_GEN_CONFIG.caves.standaloneScene.enabled,
  false,
  "integrated PlayScene caves must be the production default",
);
assert.equal(resolveCompactCaveScenesEnabled(false, ""), false);
assert.equal(resolveCompactCaveScenesEnabled(false, "?compactCaves=1"), true);
assert.equal(resolveCompactCaveScenesEnabled(false, "?compactCaves=true"), true);
assert.equal(resolveCompactCaveScenesEnabled(true, "?compactCaves=0"), false);
assert.equal(resolveIntegratedCaveEntrancesEnabled(CAVE_SCENE_CONFIG, ""), true);
assert.equal(resolveIntegratedCaveEntrancesEnabled(CAVE_SCENE_CONFIG, "?caveEntrances=0"), false);
assert.equal(
  resolveCompactCaveScenesEnabled(false, "?cave-review=1"),
  true,
  "existing cave review URLs must implicitly enable the compact review scene",
);
assert.equal(
  resolveCompactCaveScenesEnabled(false, "?cave-review=1&compactCaves=0"),
  false,
  "an explicit compact rollback value must override review-mode inference",
);

const world = makeBlankWorld();
const zone = {
  id: "cave-17",
  source: "authored-gap",
  cx: 20,
  cy: 15,
  rx: 6,
  ry: 1,
  wallThickness: 1,
  standaloneScene: false,
  entranceSides: ["left", "right"],
};
world.caveZones.push(zone);
world.applyCaveZone(zone);
assert.equal(world.getTileType(zone.cx, zone.cy), TILE_TYPES.AIR, "legacy ellipse interior must be open");
assert.equal(world.getTileType(zone.cx, zone.cy - 2), TILE_TYPES.CAVE_WALL, "legacy shell must remain solid");
assert.equal(world.getTileType(zone.entry.tx, zone.entry.ty), TILE_TYPES.AIR, "integrated entrance must reach interior air");
assert.equal(world.getTileType(zone.mouthAnchor.tx, zone.mouthAnchor.ty), TILE_TYPES.AIR, "scenic mouth anchor must be an open world cell");

const compactWorld = makeBlankWorld();
const compactZone = {
  id: "cave-compact",
  cx: 20,
  cy: 15,
  rx: 6,
  ry: 1,
  wallThickness: 1,
  standaloneScene: true,
};
compactWorld.applyCaveZone(compactZone);
assert.ok(compactZone.entry, "explicit compact rollback must retain its CaveScene mouth");
assert.equal(compactWorld.getTileType(compactZone.entry.tx, compactZone.entry.ty), TILE_TYPES.AIR);

const validKey = makeCaveTileSaveKey("cave-17", 5, 8);
const sanitized = sanitizeCaveSceneData({
  collectedNodes: [
    validKey,
    "cave-17:005,008",
    "cave-legacy:0",
    "../cave:5,8",
    "cave-17:-1,8",
    "cave-17:1000,8",
  ],
});
assert.deepEqual(
  sanitized.collectedNodes,
  [validKey, makeCaveTileSaveKey("cave-legacy", CAVE_SCENE_CONFIG.rewards.nodeLayout[0].tx, CAVE_SCENE_CONFIG.rewards.nodeLayout[0].ty)],
  "real coordinate keys and safe legacy node indices must survive save normalization",
);

const integratedEntry = new CaveEntryController({ worldModel: { caveZones: [zone] } });
assert.equal(
  integratedEntry._findNearestZone(zone.entry),
  zone,
  "safe integrated Level One mouths must open their persistent CaveScene interior",
);
const compactEntry = new CaveEntryController({ worldModel: { caveZones: [compactZone] } });
assert.equal(compactEntry._findNearestZone(compactZone.entry), compactZone);

const modelSource = await readFile(new URL("../world/model/WorldModel.js", import.meta.url), "utf8");
const entrySource = await readFile(new URL("../world/playScene/CaveEntryController.js", import.meta.url), "utf8");
assert.match(modelSource, /this\.reapplyStandaloneCaveMouths\(\)/, "only compact rollback mouths may override authored terrain");
assert.doesNotMatch(modelSource, /reapplyCaveZones\(\)/, "procedural ellipses must not carve over authored Tiled authority");
assert.match(entrySource, /if \(!zone\?\.entry\) continue;/, "approved scenic mouths must remain on integrated caves");
assert.match(entrySource, /resolveIntegratedCaveEntrancesEnabled/, "production integrated entrances must keep an explicit rollback");
assert.match(entrySource, /eligibleSources\.includes\(zone\.source\)/, "only approved Level One cave sources may consume interaction");
assert.ok(CAVE_SCENE_CONFIG.overworldEntrance.scenic.assetPath.includes("underground-cave-mouth"));

// Keep the compact model import live as an explicit rollback contract.
assert.equal(typeof CaveWorldModel, "function");

console.log("integrated cave restoration contract passed");
