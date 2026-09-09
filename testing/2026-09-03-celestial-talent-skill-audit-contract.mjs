import assert from "node:assert/strict";

import { MINING_CONFIG } from "../values/miningConfig.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import {
  CELESTIAL_TALENT_PROGRESSION_CONFIG,
} from "../values/celestialTalentProgression.js";
import {
  CELESTIAL_TALENT_RANK_BONUSES,
  CELESTIAL_TALENT_RANK_CONFIG,
} from "../values/celestialTalentRanks.js";
import { resolveCelestialTalentEngineDefinition as resolve } from
  "../values/celestialTalentEffects.js";
import {
  CONSTELLATION_BUFFS,
  computeAbilityStats,
} from "../values/constellationBuffs.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  resolveThunderStrikeEffectiveDamageMultiplier,
} from "../values/thunderStrikeChain.js";

const branches = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches;
const nodes = branches.flatMap(branch => branch.nodes);
const unfriendlyCopy = /target slots|independent gravity|implementation|effect id|projectile buff/i;

assert.equal(nodes.length, 36);
assert.equal(Object.keys(CELESTIAL_TALENT_RANK_BONUSES).length, 36);
assert.equal(CELESTIAL_TALENT_RANK_CONFIG.hollowPulseRadiusCapTiles, 10);
for (const node of nodes) {
  assert.ok(node.description.length >= 20 && node.description.length <= 160, node.id);
  assert.doesNotMatch(node.description, unfriendlyCopy, node.id);
  assert.doesNotMatch(CELESTIAL_TALENT_RANK_BONUSES[node.id].description, unfriendlyCopy, node.id);
  if (node.kind === "capstone") {
    assert.match(node.description, /Opens another starting ability\./, node.id);
  }
}

function branchDefinition(branch, rank) {
  return resolve(
    branch.id,
    branch.nodes.map(node => node.effectId),
    Object.fromEntries(branch.nodes.map(node => [node.id, rank])),
  );
}

function waywardCapacity(definition) {
  return definition.simultaneousStars
    * (definition.maxImpacts + definition.supernovaMaxImpacts);
}

function hollowCapacity(definition) {
  return definition.simultaneousHoles
    * (definition.maxImpacts + definition.implosionMaxImpacts);
}

function lanceFirstHitBudget(definition, stateMultiplier = 1) {
  return Math.ceil(definition.lifetimeMs / MINING_CONFIG.mineCooldownMs)
    * (definition.projectileSideLanes * 2 + 1)
    * definition.projectileDamageMultiplier
    * stateMultiplier;
}

const definitions = Object.fromEntries(branches.map(branch => [
  branch.id,
  { rank1: branchDefinition(branch, 1), rank3: branchDefinition(branch, 3) },
]));
const wayward = definitions["wayward-star"];
const hollow = definitions["hollow-sun"];
const lance = definitions["comet-engine"];

assert.equal(waywardCapacity(wayward.rank1), 145);
assert.equal(waywardCapacity(wayward.rank3), 215);
assert.ok(waywardCapacity(wayward.rank3) / waywardCapacity(wayward.rank1) < 1.5);
assert.equal(hollowCapacity(hollow.rank1), 344);
assert.equal(hollowCapacity(hollow.rank3), 456);
assert.ok(hollowCapacity(hollow.rank3) / hollowCapacity(hollow.rank1) < 1.4);
assert.equal(lanceFirstHitBudget(lance.rank1), 37.5);
assert.equal(Math.round(lanceFirstHitBudget(lance.rank3) * 100) / 100, 48.3);
assert.equal(
  Math.round(lanceFirstHitBudget(lance.rank3, 1.35) * 100) / 100,
  65.21,
);
assert.ok(lanceFirstHitBudget(lance.rank3, 1.35) < hollowCapacity(hollow.rank3));
assert.ok(lanceFirstHitBudget(lance.rank3, 1.35) < waywardCapacity(wayward.rank3));

assert.equal(wayward.rank3.simultaneousStars, 5);
assert.equal(hollow.rank3.simultaneousHoles, 4);
assert.equal(lance.rank3.projectileSideLanes, 1);
assert.equal(lance.rank3.projectileRangeTiles, 9);
assert.equal(lance.rank3.projectileDamageMultiplier, 1.61);
assert.equal(lance.rank1.lifetimeMs, 15000);
assert.equal(lance.rank3.lifetimeMs, 15000);
assert.deepEqual(
  lance.rank3.projectileStates.map(state => state.damageMultiplier),
  [1, 1.35, 1.35],
);
assert.equal(wayward.rank3.supernovaMaxImpacts, 0);
assert.equal(wayward.rank3.companionEnabled, true);
assert.equal(hollow.rank3.passiveHollowPulseEveryDigs, 2);
assert.equal(lance.rank3.passiveLanceRangeTiles, 4);
assert.equal(lance.rank3.finalWindowSideLanes, 1);

// Buying either paid rank must still change the live ability even when every
// other node in that branch is already at rank 3.
for (const branch of branches) {
  const effects = branch.nodes.map(node => node.effectId);
  const maximumRanks = Object.fromEntries(branch.nodes.map(node => [node.id, 3]));
  for (const node of branch.nodes) {
    for (const rank of [1, 2]) {
      const before = resolve(branch.id, effects, { ...maximumRanks, [node.id]: rank });
      const after = resolve(branch.id, effects, { ...maximumRanks, [node.id]: rank + 1 });
      assert.notDeepEqual(after, before, `${node.id} rank ${rank + 1}`);
    }
  }
}

// Quick Slash remains the sustained bilateral GP spender. Thunder Strike
// remains the expensive precision burst; neither needs another power increase.
const abilityStats = computeAbilityStats(Object.keys(CONSTELLATION_BUFFS));
assert.equal(Math.round(PLAYER_ABILITIES_CONFIG.quickslashDamageMultiplier
  * (1 + abilityStats.quickslashDamageMult) * 10) / 10, 3.6);
assert.equal(PLAYER_ABILITIES_CONFIG.quickslashMasteryMinimumCooldownMs, 150);
assert.equal(PLAYER_ABILITIES_CONFIG.quickslashCost - abilityStats.quickslashCostReduction, 9);
assert.equal(PLAYER_ABILITIES_CONFIG.thunderStrikeBaseRangeTiles
  + abilityStats.thunderstrikeRange, 8);
assert.equal(PLAYER_ABILITIES_CONFIG.thunderStrikeCost
  * THUNDER_STRIKE_CHAIN_CONFIG.upfrontCostMultiplier
  - abilityStats.thunderstrikeCostReduction, 200);
const finalThunder = resolveThunderStrikeEffectiveDamageMultiplier(
  THUNDER_STRIKE_CHAIN_CONFIG.stages.at(-1).damageMultiplier,
  THUNDER_STRIKE_CHAIN_CONFIG.stages.length - 1,
) * PLAYER_ABILITIES_CONFIG.thunderStrikeNormalDamageMultiplier
  * (1 + abilityStats.thunderstrikeDamageMult);
assert.ok(finalThunder > 30 && finalThunder < 31);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.stages.at(-1).timing.windowMs, 80);

console.log("CELESTIAL_TALENT_SKILL_AUDIT_OK", {
  nodes: nodes.length,
  wayward: [waywardCapacity(wayward.rank1), waywardCapacity(wayward.rank3)],
  hollow: [hollowCapacity(hollow.rank1), hollowCapacity(hollow.rank3)],
  lanceFirstHitBudget: [
    lanceFirstHitBudget(lance.rank1),
    lanceFirstHitBudget(lance.rank3, 1.35),
  ],
});
