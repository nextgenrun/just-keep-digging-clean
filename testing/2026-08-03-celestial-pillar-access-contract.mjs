import assert from "node:assert/strict";
import { CELESTIAL_PILLAR_ACCESS_CONFIG } from "../values/celestialPillarAccess.js";
import { CAMPFIRE_CONFIG } from "../values/campfireConfig.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";

const town = CELESTIAL_PILLAR_ACCESS_CONFIG.town;
assert.equal(TOWN_SQUARE_CONFIG.merchantSlots.moneyMonster.tileX, 17);
assert.equal(CAMPFIRE_CONFIG.surfaceTileX, 23);
assert.equal(town.tileX, 20);
assert.equal(
  town.tileX - TOWN_SQUARE_CONFIG.merchantSlots.moneyMonster.tileX,
  CAMPFIRE_CONFIG.surfaceTileX - town.tileX,
);
assert.ok(town.proximityTiles < TOWN_SQUARE_CONFIG.merchantInteractionRangeTiles);

console.log("Celestial pillar access contract passed.");
