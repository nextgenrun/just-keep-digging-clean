import assert from "node:assert/strict";

import {
  UPGRADE_RECOMMENDATION_CONFIG,
  resolveUpgradeRecommendations,
} from "../systems/progression/UpgradeRecommendationPolicy.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";

const upgrades = new UpgradeSystem(null, { level: 99 });
upgrades.setMoney(500);
const first = resolveUpgradeRecommendations({
  upgradeSystem: upgrades,
  bestDepth: 250,
  gemPowerPercent: 20,
});
assert.ok(first.length > 3);
assert.ok(
  UPGRADE_RECOMMENDATION_CONFIG.survivalIds.includes(first[0].id),
  "deep/low-GP state must prioritize an attainable survival upgrade",
);
const second = resolveUpgradeRecommendations({
  upgradeSystem: upgrades,
  bestDepth: 250,
  gemPowerPercent: 20,
  history: [first[0].id],
});
assert.notEqual(second[0].id, first[0].id, "recommendations must not pin forever");
assert.ok(second.some(candidate => candidate.affordable));

upgrades.setMoney(3);
const early = resolveUpgradeRecommendations({
  upgradeSystem: upgrades,
  bestDepth: 10,
  gemPowerPercent: 100,
});
assert.equal(early[0].id, "agility");
assert.equal(early[0].affordable, true);

console.log("UPGRADE_RECOMMENDATION_POLICY_CONTRACT_OK");
