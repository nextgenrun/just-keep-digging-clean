import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  INTERACTIVE_WORLD_STATES,
  getInteractiveWorldStateAsset,
  getInteractiveWorldStateBiome,
  resolveInteractiveWorldStateFeature,
} from "../values/interactiveWorldStates.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldModel } from "../world/WorldModel.js";
import { MemoryReliquaryDiscoverySystem } from
  "../systems/progression/MemoryReliquaryDiscoverySystem.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = INTERACTIVE_WORLD_STATES;

assert.deepEqual(config.approvedFamilies, ["cache", "memory-reliquary"]);
assert.equal(
  getInteractiveWorldStateAsset("weathered-roots", "freight-lift"),
  null,
  "freight-lift must remain outside production runtime",
);
assert.equal(
  resolveInteractiveWorldStateFeature(
    config.animatedCaches,
    "?animatedCaches=0",
  ),
  false,
);
assert.equal(
  resolveInteractiveWorldStateFeature(
    config.memoryReliquaries,
    "?memoryReliquaries=off",
  ),
  false,
);
assert.equal(
  resolveInteractiveWorldStateFeature(config.animatedCaches, ""),
  true,
);
assert.equal(
  resolveInteractiveWorldStateFeature(config.memoryReliquaries, ""),
  true,
);

const runtimeAssets = [];
for (const region of config.biomeRegions) {
  for (const familyId of config.approvedFamilies) {
    const asset = getInteractiveWorldStateAsset(region.id, familyId);
    assert.ok(asset);
    assert.ok(fs.statSync(path.join(ROOT, asset.path)).isFile(), asset.path);
    runtimeAssets.push(asset.path);
  }
}
assert.equal(runtimeAssets.length, 20);
assert.equal(new Set(runtimeAssets).size, runtimeAssets.length);

const quietLog = console.log;
console.log = () => {};
const worldModel = new WorldModel();
console.log = quietLog;
const caveIds = new Set(worldModel.caveZones.map(zone => zone.id));
const placement = config.memoryReliquaries.placementContract;
const definitions = config.memoryReliquaries.definitions;
assert.equal(definitions.length, config.biomeRegions.length);
assert.equal(
  new Set(definitions.map(definition => definition.journalKey)).size,
  definitions.length,
);

for (const definition of definitions) {
  assert.ok(caveIds.has(definition.caveId), definition.caveId);
  assert.equal(
    getInteractiveWorldStateBiome(definition.floorTileY)?.id,
    definition.biomeId,
  );
  for (
    let offsetY = placement.clearanceHeightTiles;
    offsetY >= 1;
    offsetY -= 1
  ) {
    for (
      let offsetX = -placement.clearanceHalfWidthTiles;
      offsetX <= placement.clearanceHalfWidthTiles;
      offsetX += 1
    ) {
      assert.equal(
        worldModel.getTileType(
          definition.tileX + offsetX,
          definition.floorTileY - offsetY,
        ),
        TILE_TYPES.AIR,
        `${definition.id} clearance ${offsetX},${offsetY}`,
      );
    }
  }
  for (
    let offsetX = -placement.floorSupportHalfWidthTiles;
    offsetX <= placement.floorSupportHalfWidthTiles;
    offsetX += 1
  ) {
    assert.notEqual(
      worldModel.getTileType(
        definition.tileX + offsetX,
        definition.floorTileY,
      ),
      TILE_TYPES.AIR,
      `${definition.id} floor support ${offsetX}`,
    );
  }
}

const journal = [];
const discoveryCalls = [];
const retention = {
  getJournalSnapshot: () => ({
    discoveries: { journal: [...journal] },
  }),
  discoverJournal: (key, label) => {
    discoveryCalls.push({ key, label });
    if (journal.includes(key)) return false;
    journal.push(key);
    return true;
  },
};
let saveRequests = 0;
const discoverySystem = new MemoryReliquaryDiscoverySystem(
  retention,
  () => { saveRequests += 1; },
);
const firstDefinition = definitions[0];
const firstOpen = discoverySystem.open(firstDefinition);
assert.equal(firstOpen.success, true);
assert.equal(firstOpen.newlyDiscovered, true);
assert.equal(firstOpen.type, "memory-reliquary");
assert.equal(saveRequests, 1);
assert.deepEqual(discoveryCalls, [{
  key: firstDefinition.journalKey,
  label: firstDefinition.title,
}]);
assert.equal("money" in firstOpen, false);
assert.equal("reward" in firstOpen, false);
assert.equal("resources" in firstOpen, false);
assert.equal("star" in firstOpen, false);

const reread = discoverySystem.open(firstDefinition);
assert.equal(reread.success, true);
assert.equal(reread.newlyDiscovered, false);
assert.equal(reread.type, "memory-reliquary-read");
assert.equal(saveRequests, 1);
assert.equal(discoveryCalls.length, 1);

console.log(JSON.stringify({
  pass: true,
  productionFamilies: config.approvedFamilies,
  runtimeAssets: runtimeAssets.length,
  fixedReliquaries: definitions.length,
  rewards: 0,
  liftRuntimeWired: false,
}));
