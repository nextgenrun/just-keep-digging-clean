import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { SpecialBlockEffectsManager } from
  "../systems/mining/SpecialBlockEffectsManager.js";
import { INVENTORY_SPECIAL_BLOCKS } from "../values/inventorySpecialBlocks.js";
import { SPECIAL_BLOCKS_CONFIG } from "../values/specialBlocks.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_GAMEPLAY_EFFECTS } from
  "../values/worldVisualGameplayEffects.js";
import {
  TILE_RENDER_INDEX,
  getTileRenderIndex,
  getTileTextureLayerKeys,
} from "../world/rendering/tileRenderMap.js";
import {
  activateCelestialActionBarEntry,
  getCelestialActionBarAbilityState,
} from "../world/playScene/CelestialActionBarRuntime.js";

const effect = SPECIAL_BLOCKS_CONFIG.effects.abilityBlock;
assert.equal(SPECIAL_BLOCKS_CONFIG.spawnRates.abilityBlock,
  SPECIAL_BLOCKS_CONFIG.spawnRates.legendBlock / 2);
assert.equal(effect.duration, 20_000);
assert.deepEqual(effect.eligibleAbilityIds, [
  "quickslash", "thunderStrike", "wayward-star", "hollow-sun", "comet-engine",
]);
assert.equal(SPECIAL_BLOCKS_CONFIG.effects.legendBlock.value, 1);
assert.ok(INVENTORY_SPECIAL_BLOCKS.entries.some(entry => entry.id === "abilityBlock"));

assert.equal(
  getTileRenderIndex(TILE_TYPES.ABILITY_BLOCK, 160, 160),
  TILE_RENDER_INDEX.ABILITY_BLOCK,
);
assert.deepEqual(
  getTileTextureLayerKeys(TILE_TYPES.ABILITY_BLOCK, 160, 160),
  ["ability-block"],
);

const scene = { time: { now: 1_000 } };
const manager = new SpecialBlockEffectsManager(scene);
const events = [];
manager.setAbilityChoiceListener(event => events.push(event));
assert.equal(manager.applyEffect("abilityBlock").ok, true);
assert.equal(manager.isAbilityChoicePending(), true);
assert.equal(events.at(-1).type, "opened");

const pendingQuick = getCelestialActionBarAbilityState({
  specialBlockEffectsManager: manager,
}, "quickslash");
assert.deepEqual(
  { unlocked: pendingQuick.unlocked, available: pendingQuick.available, active: pendingQuick.active },
  { unlocked: true, available: true, active: true },
);
const pendingCampfire = getCelestialActionBarAbilityState({
  specialBlockEffectsManager: manager,
}, "campfire");
assert.equal(pendingCampfire.available, false);

const selected = activateCelestialActionBarEntry({
  specialBlockEffectsManager: manager,
}, "quickslash");
assert.equal(selected.ok, true);
assert.equal(manager.isAbilityChoicePending(), false);
assert.equal(manager.isFreeAbilityActive("quickslash"), true);
assert.equal(manager.getRemainingTime("freeAbility"), 20);
assert.equal(events.at(-1).type, "selected");

const upgrades = {
  isQuickslashUnlocked: () => false,
  isThunderStrikeUnlocked: () => false,
  getUpgradeEffects: () => ({}),
};
const abilities = new PlayerAbilities(
  { scene: {} },
  null,
  { tileSize: 64 },
  upgrades,
);
abilities.setFreeAbilityProvider(abilityId => manager.isFreeAbilityActive(abilityId));
assert.equal(abilities.isQuickslashUnlocked(), true);
assert.equal(abilities.getQuickslashCost(), 0);

const dig = new DigSystem(
  {},
  {},
  {},
  null,
  null,
  null,
  null,
  manager,
);
manager.beginAbilityChoice();
assert.deepEqual(dig.tryMine({ tx: 0, ty: 0 }, 2_000), {
  success: false,
  reason: "ability-choice-pending",
});

manager.selectFreeAbility("thunderStrike");
assert.equal(abilities.isThunderStrikeUnlocked(), true);
assert.equal(abilities.getThunderStrikeCost(), 0);
scene.time.now += 20_000;
manager.update();
assert.equal(manager.isFreeAbilityActive("thunderStrike"), false);
assert.equal(abilities.isThunderStrikeUnlocked(), false);
assert.ok(abilities.getThunderStrikeCost() > 0);
assert.equal(events.at(-1).type, "expired");

const abilityGlow = WORLD_VISUAL_GAMEPLAY_EFFECTS.specialBlocks
  .profilesByTileType[TILE_TYPES.ABILITY_BLOCK];
const crownGlow = WORLD_VISUAL_GAMEPLAY_EFFECTS.specialBlocks
  .profilesByTileType[TILE_TYPES.LEGEND_BLOCK];
assert.ok(abilityGlow);
assert.ok(crownGlow.haloRadiusScale > abilityGlow.haloRadiusScale);
assert.ok(crownGlow.haloAlphaBase > abilityGlow.haloAlphaBase);
assert.ok(crownGlow.sparkleCount > abilityGlow.sparkleCount);

const soundSource = await readFile(
  new URL("../sound/SoundSystem.js", import.meta.url),
  "utf8",
);
const engineSource = await readFile(
  new URL("../world/playScene/CelestialEngineController.js", import.meta.url),
  "utf8",
);
assert.match(soundSource, /playLegendReward\(\)[\s\S]*REVIEWED_AUDIO_ASSETS\.levelUpEpic/);
assert.match(engineSource, /temporaryGrant[\s\S]*_activateTemporaryEngine/);
assert.match(engineSource, /ability-block:/);

console.log("ABILITY_BLOCK_CONTRACT_OK", {
  durationMs: effect.duration,
  abilityRate: SPECIAL_BLOCKS_CONFIG.spawnRates.abilityBlock,
  crownRate: SPECIAL_BLOCKS_CONFIG.spawnRates.legendBlock,
  choices: effect.eligibleAbilityIds,
});
