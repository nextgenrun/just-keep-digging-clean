import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { RESOURCE_ZERO_TOTALS } from "../values/resourceTypes.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { TILED_WORLD_OVERRIDE } from "../values/tiledWorldOverrideData.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import { WorldModel } from "../world/model/WorldModel.js";

const world = new WorldModel(GAME_CONFIG);
const identity = world.getWorldIdentity();

assert.equal(TILED_WORLD_OVERRIDE.enabled, true, "the authored Tiled gameplay map must remain enabled");
assert.equal(identity.width, TILED_WORLD_OVERRIDE.width, "authored and runtime world widths must match");
assert.ok(identity.depth >= TILED_WORLD_OVERRIDE.height, "the authored world must fit inside the extended runtime depth");
assert.ok(world.caveZones.length > 0, "normal cave metadata must still be generated");
assert.equal(world.caveZones.some(zone => zone.standaloneScene), false, "production caves must remain in PlayScene");
assert.ok(
  world.caveZones.some(zone => (
    zone.entry
    && !world.isSolid(zone.entry.tx, zone.entry.ty)
    && world.isSolid(zone.entry.tx, zone.entry.ty + 1)
  )),
  "at least one generated cave mouth must remain traversable after authored imports",
);

const functionalTypes = [
  "TELEPORT_TILE",
  "GAMBLE_TILE",
  "GEM_POWER_BLOCK",
  "SPEED_BLOCK",
  "XP_BLOCK",
  "CRIT_BLOCK",
  "BERSERK_BLOCK",
  "COMBO_BLOCK",
  "LEGEND_BLOCK",
  "CHEST",
  "ANCIENT_RELIC_CACHE",
];
const counts = Object.fromEntries(functionalTypes.map(name => [name, 0]));
for (const type of world.tileType) {
  for (const name of functionalTypes) {
    if (type === TILE_TYPES[name]) counts[name] += 1;
  }
}
for (const [name, count] of Object.entries(counts)) {
  assert.ok(count > 0, `${name} must survive the scenic world port`);
}
assert.equal(world.tileType.includes(TILE_TYPES.GEODE_WALL), false);
assert.equal(world.tileType.includes(TILE_TYPES.GEODE_INTERIOR), false);

let digTarget = null;
for (let ty = world.topAirRows + 1; ty < world.depthTiles - 1 && !digTarget; ty += 1) {
  for (let tx = 1; tx < world.widthTiles - 1; tx += 1) {
    if (!world.isDiggable(tx, ty)) continue;
    const type = world.getTileType(tx, ty);
    if (type !== TILE_TYPES.DIRT && type !== TILE_TYPES.STONE && type !== TILE_TYPES.COPPER) continue;
    digTarget = { tx, ty, type };
    break;
  }
}
assert.ok(digTarget, "the authored world needs a normal diggable tile");
const destroyed = world.damageTile(
  digTarget.tx,
  digTarget.ty,
  world.getTileMaxHp(digTarget.tx, digTarget.ty, digTarget.type),
);
assert.equal(destroyed.destroyed, true, "normal world damage must still destroy a tile");

const restoredWorld = new WorldModel(GAME_CONFIG);
restoredWorld.applyDugTileKeys([`${digTarget.tx},${digTarget.ty}`]);
assert.equal(restoredWorld.getTileType(digTarget.tx, digTarget.ty), TILE_TYPES.AIR, "dug cells must restore from save data");

const saveStore = new DugTilesSaveStore({ slotId: "world-functionality-restoration-contract" });
const payload = saveStore.createPayload(
  identity,
  [`${digTarget.tx},${digTarget.ty}`],
  { ...RESOURCE_ZERO_TOTALS, dirt: 7 },
  { miningPowerLevel: 2 },
  { level: 3, xp: 12 },
  { teleportPairs: [{ from: "a", to: "b" }] },
  { acceptedThresholds: [100, 300] },
  { currentTime: 0.42 },
  [],
  "ualNative",
  { collectedNodes: ["cave-1:5,8"] },
  { count: 2 },
);
const normalized = saveStore.normalizePayload(payload);
assert.equal(normalized.resources.dirt, 7);
assert.equal(normalized.upgrades.miningPowerLevel, 2);
assert.equal(normalized.levelData.level, 3);
assert.equal(normalized.specialTileData.teleportPairs.length, 1);
assert.deepEqual(normalized.depthGateData.acceptedThresholds, [100, 300]);
assert.equal(normalized.dayNightData.currentTime, 0.42);
assert.deepEqual(normalized.caveSceneData.collectedNodes, ["cave-1:5,8"]);
assert.equal(normalized.ancientRelicData.count, 2);

const setupSource = await readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8");
const scenicBranch = setupSource.indexOf("Scenic-v2 owns the complete visible world");
assert.ok(scenicBranch >= 0, "the scenic renderer branch must remain explicit");
for (const token of [
  "this.npcManager.createNPCs()",
  "this.caveEntryController = new CaveEntryController",
  "this.digSystem = new DigSystem",
  "this.tileCollisionSystem = new TileCollisionSystem",
  "this.specialTileSystem = new SpecialTileSystem",
  "this.dayNightCycle = new DayNightCycle",
  "this.weatherSystem = new WeatherSystem",
  "this.lightSystem = new LightSystem",
  "this.earthquakeSystem = new EarthquakeSystem",
  "this.depthGateSystem = new DepthGateSystem",
  "this.surfaceTunnelDoorSystem = new SurfaceTunnelDoorSystem",
  "this.arcCoreVehicleSystem = new ArcCoreVehicleSystem",
]) {
  assert.ok(setupSource.indexOf(token) > scenicBranch, `${token} must be outside the renderer-only branch`);
}

console.log("World functionality restoration contract passed", {
  caves: world.caveZones.length,
  functionalTypes: counts,
  identity,
});
