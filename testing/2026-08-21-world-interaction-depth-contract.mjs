import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DigSystem } from "../systems/mining/DigSystem.js";
import { CAVE_GAMEPLAY_CONFIG } from "../values/caveGameplay.js";
import { CAVE_SCENE_CONFIG } from "../values/caveSceneConfig.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { PILLAR_VISUAL_CONFIG } from "../values/pillarVisuals.js";
import {
  MONEY_MONSTER_RESOURCE_KEYS,
  SECOND_WORLD_RESOURCE_KEYS,
} from "../values/resourceTypes.js";
import { TREASURE_CHEST_CONFIG } from "../values/treasureChestConfig.js";
import { WorldModel } from "../world/model/WorldModel.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = relative => readFile(path.join(root, relative), "utf8");

const reward = CAVE_GAMEPLAY_CONFIG.resourceSeams.reward;
assert.ok(reward.multiplier > 1);
assert.ok(reward.minimumBonusUnits >= 1);

const world = new WorldModel(GAME_CONFIG);
assert.ok(world.caveResourceSeams.length >= 500);
for (const seam of world.caveResourceSeams) {
  assert.equal(seam.yieldMultiplier, reward.multiplier);
  assert.equal(seam.minimumYieldBonusUnits, reward.minimumBonusUnits);
  assert.equal(world.getCaveResourceSeam(seam.tx, seam.ty), seam);
}

const sample = world.caveResourceSeams[0];
const caveYield = DigSystem.prototype._applyCaveSeamYield.call(
  { worldModel: world },
  2,
  sample.tx,
  sample.ty,
);
assert.equal(caveYield, 3, "a live cave seam must pay an explicit risk premium");
assert.equal(
  DigSystem.prototype._applyCaveSeamYield.call(
    { worldModel: world },
    2,
    0,
    0,
  ),
  2,
);

assert.ok(CAVE_SCENE_CONFIG.overworldEntrance.scenic.assetPath.endsWith(".png"));
assert.equal(CAVE_SCENE_CONFIG.integratedEntrances.enabledByDefault, true);
assert.equal(LIGHT_CONFIG.caveLights.enabled, true);
assert.equal(LIGHT_CONFIG.skyTileLights.enabled, true);
assert.equal(PILLAR_VISUAL_CONFIG.star.filenames.length, 5);
assert.equal(TREASURE_CHEST_CONFIG.interaction.prompt, "Open Treasure Chest");
for (const resource of SECOND_WORLD_RESOURCE_KEYS) {
  assert.equal(MONEY_MONSTER_RESOURCE_KEYS.includes(resource), false);
}

const [specialTiles, cacheVisual, jackpot, caveEntry, pillar, hazard] = await Promise.all([
  source("systems/mining/SpecialTileSystem.js"),
  source("systems/visual/AnimatedCacheVisualSystem.js"),
  source("world/playScene/SleepingJackpotBridge.js"),
  source("world/playScene/CaveEntryController.js"),
  source("systems/visual/StarPillarSystem.js"),
  source("systems/environment/CaveHazardSystem.js"),
]);
assert.match(specialTiles, /openedChestKeys/);
assert.match(specialTiles, /applyDugTileKeys/);
assert.match(specialTiles, /recordChest/);
assert.match(cacheVisual, /states\.activation/);
assert.match(cacheVisual, /states\.spent/);
assert.match(jackpot, /JackpotSaveTransaction/);
assert.match(jackpot, /consumeChestForEvent/);
assert.match(caveEntry, /CAVE_SCENE_CONFIG\.overworldEntrance/);
assert.match(caveEntry, /entrance\.scenic/);
assert.match(pillar, /StarPillarWorldVisual/);
assert.match(pillar, /USER_SETTINGS\.getKeyLabel\("interact"\)/);
assert.match(hazard, /resolveCaveHazardState/);

console.log("WORLD_INTERACTION_DEPTH_CONTRACT_OK");
