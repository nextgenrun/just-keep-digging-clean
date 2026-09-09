import assert from "node:assert/strict";

import { UPGRADES } from "../values/upgradeDefinitions.js";
import { GEM_POWER_CONFIG } from "../values/gemPower.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { THUNDER_STRIKE_CHAIN_CONFIG } from "../values/thunderStrikeChain.js";
import { PlayerLevelSystem } from "../systems/progression/PlayerLevelSystem.js";

const affordabilityLevel = 3;
const playerLevels = new PlayerLevelSystem();
playerLevels.gainLevel(affordabilityLevel - 1);
const availableGemPower = GEM_POWER_CONFIG.baseMax
  + playerLevels.getGemPowerMaxBonus();
const requiredGemPower = PLAYER_ABILITIES_CONFIG.thunderStrikeCost
  * THUNDER_STRIKE_CHAIN_CONFIG.upfrontCostMultiplier;

assert.equal(UPGRADES.thunderStrikeAbility.requiresLevel, undefined);
assert.ok(
  availableGemPower >= requiredGemPower,
  `Thunder Strike needs ${requiredGemPower} GP but level ${affordabilityLevel} only supports ${availableGemPower}.`,
);

console.log("THUNDER_STRIKE_AFFORDABILITY_CONTRACT_OK");
