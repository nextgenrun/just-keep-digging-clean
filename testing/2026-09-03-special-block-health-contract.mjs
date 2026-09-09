import assert from "node:assert/strict";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { createGameplayCapabilities, GAMEPLAY_PROFILE_IDS } from "../values/gameplayCapabilities.js";
import { INVENTORY_SPECIAL_BLOCKS } from "../values/inventorySpecialBlocks.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { SPECIAL_BLOCKS_CONFIG } from "../values/specialBlocks.js";
import { getTileHealth } from "../values/tileHealth.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_DEPTH_CONFIG } from "../values/worldDepthConfig.js";
import { WorldModel } from "../world/model/WorldModel.js";

const blocks = [...INVENTORY_SPECIAL_BLOCKS.entries];
const passiveRewardBlocks = blocks
  .filter(block => block.id !== "abilityBlock")
  .sort((a, b) =>
  SPECIAL_BLOCKS_CONFIG.spawnRates[b.id] - SPECIAL_BLOCKS_CONFIG.spawnRates[a.id]);
const depths = [0, 100, 500, 1000, 1900, 3500, WORLD_DEPTH_CONFIG.levelTwoDepthMeters];
const basicDamage = MINING_CONFIG.baseDamage;

for (const depth of depths) {
  let previousRarityHp = 0;
  for (const block of passiveRewardBlocks) {
    const hp = getTileHealth(TILE_TYPES[block.renderKey], depth);
    assert.ok(Number.isInteger(hp), `${block.id}: HP must remain an integer`);
    assert.ok(hp >= basicDamage * 4, `${block.id}: no one-hit fallback health`);
    assert.ok(hp > previousRarityHp, `${block.id}: rarer blocks must be tougher at ${depth}m`);
    previousRarityHp = hp;
  }
}
for (const depth of depths) {
  const abilityHp = getTileHealth(TILE_TYPES.ABILITY_BLOCK, depth);
  assert.ok(abilityHp >= basicDamage * 4, "abilityBlock: no one-hit fallback health");
  assert.ok(
    abilityHp < getTileHealth(TILE_TYPES.LEGEND_BLOCK, depth),
    "abilityBlock: the active choice shell must break faster than the passive Crown reward",
  );
}
for (const block of blocks) {
  const type = TILE_TYPES[block.renderKey];
  for (let index = 1; index < depths.length; index += 1) {
    assert.ok(getTileHealth(type, depths[index]) > getTileHealth(type, depths[index - 1]),
      `${block.id}: health must increase with depth`);
  }
  assert.equal(getTileHealth(type, -100), getTileHealth(type, 0));
  assert.equal(getTileHealth(type, 10000), getTileHealth(type, 5000));
}

// Exercise actual authored generation, not just the values table.
const world = new WorldModel(GAME_CONFIG, createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.FULL_REVIEW));
const generatedCounts = Object.fromEntries(blocks.map(block => [block.id, 0]));
let deepestAbilityBlock = 0;
const blockByType = new Map(blocks.map(block => [TILE_TYPES[block.renderKey], block]));
for (let index = 0; index < world.tileType.length; index += 1) {
  const block = blockByType.get(world.tileType[index]);
  if (!block) continue;
  const tx = index % world.widthTiles;
  const ty = Math.floor(index / world.widthTiles);
  assert.equal(world.getHp(tx, ty), getTileHealth(world.getType(tx, ty), ty - world.topAirRows),
    `${block.id}: generated HP must use the live depth curve`);
  assert.equal(world.getHp(tx, ty), world.getTileMaxHp(tx, ty));
  generatedCounts[block.id] += 1;
  if (block.id === "abilityBlock") {
    deepestAbilityBlock = Math.max(deepestAbilityBlock, ty - world.topAirRows);
  }
}
for (const block of blocks) assert.ok(generatedCounts[block.id] > 0, `${block.id}: generated fixture missing`);
assert.ok(generatedCounts.abilityBlock < generatedCounts.legendBlock,
  "Ability Blocks must remain less common than Crowns in the canonical world");
assert.ok(deepestAbilityBlock <= SPECIAL_BLOCKS_CONFIG.worldSpawns.abilityBlock.maximumDepthTiles,
  "Ability Blocks must remain in the configured early-world band");

// Use the real hit/reward transaction: partial hits must never grant the effect.
const hitCounts = {};
for (const block of blocks) {
  const type = TILE_TYPES[block.renderKey];
  const target = { tx: 10, ty: world.topAirRows + 20 };
  const hp = world.getTileMaxHp(target.tx, target.ty, type);
  world.setTile(target.tx, target.ty, type, hp);
  const rewards = [];
  let combo = 0;
  const level = { gainLevelProgress: value => {
    rewards.push({ kind: "level", value });
    return { xpGained: value, levelsGained: 0 };
  } };
  const comboSystem = {
    getMultiplier: () => 1,
    getComboCount: () => combo,
    addCombo: value => { combo += value; rewards.push({ kind: "combo", value }); },
  };
  const effects = {
    applyEffect: value => rewards.push({ kind: "effect", value }),
    getDamageMultiplier: () => 1,
    getMiningSpeedMultiplier: () => 1,
  };
  const renderer = { applyTileUpdate() {}, applyTileDamageUpdate() {} };
  if (type === TILE_TYPES.GEM_POWER_BLOCK) renderer.scene = {
    playerController: { abilities: { restoreGemPower: value => {
      rewards.push({ kind: "gp", value });
      return value;
    } } },
  };
  const dig = new DigSystem(world, renderer, GAME_CONFIG, null, level, null, comboSystem, effects);
  const expectedHits = Math.ceil(hp / basicDamage);
  assert.equal(dig.getHitsToBreakPreview(type, target.tx, target.ty).hits, expectedHits);
  for (let hit = 1; hit <= expectedHits; hit += 1) {
    const result = dig.tryMine(target, hit * MINING_CONFIG.mineCooldownMs, null, null,
      { ignoreCooldown: true, skipHeavyPunch: true });
    assert.equal(result.success, true, `${block.id}: hit ${hit} must succeed`);
    assert.equal(result.damage, basicDamage);
    assert.equal(result.maxHp, hp, `${block.id}: damage feedback must use full scaled HP`);
    assert.equal(result.hp, Math.max(0, hp - hit * basicDamage));
    const lastHit = hit === expectedHits;
    assert.equal(result.destroyed, lastHit);
    assert.equal(result.specialBlockDestroyed, lastHit);
    assert.equal(rewards.length, lastHit ? 1 : 0, `${block.id}: effect only on final hit`);
    if (!lastHit) assert.equal(world.getType(target.tx, target.ty), type);
  }
  assert.equal(world.getType(target.tx, target.ty), TILE_TYPES.AIR);
  assert.equal(dig.tryMine(target, 999999, null, null, { ignoreCooldown: true }).success, false);
  assert.equal(rewards.length, 1, `${block.id}: a destroyed tile cannot pay again`);
  hitCounts[block.id] = expectedHits;
}

console.log("SPECIAL_BLOCK_HEALTH_OK", {
  generatedCounts,
  deepestAbilityBlock,
  basicHitCountsAt20m: hitCounts,
});
