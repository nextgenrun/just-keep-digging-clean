import assert from "node:assert/strict";

import { UPGRADES } from "../values/upgradeDefinitions.js";
import { GEM_POWER_CONFIG } from "../values/gemPower.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { THUNDER_STRIKE_CHAIN_CONFIG } from "../values/thunderStrikeChain.js";

const requiredLevel = UPGRADES.thunderStrikeAbility.requiresLevel;
const availableGemPower = GEM_POWER_CONFIG.baseMax
  + requiredLevel * GEM_POWER_CONFIG.gpPerLevel;
const requiredGemPower = PLAYER_ABILITIES_CONFIG.thunderStrikeCost
  * THUNDER_STRIKE_CHAIN_CONFIG.upfrontCostMultiplier;

assert.equal(requiredLevel, 20);
assert.ok(
  availableGemPower >= requiredGemPower,
  `Thunder Strike needs ${requiredGemPower} GP but level ${requiredLevel} only supports ${availableGemPower}.`,
);

console.log("THUNDER_STRIKE_AFFORDABILITY_CONTRACT_OK");
