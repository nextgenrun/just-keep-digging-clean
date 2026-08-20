import assert from "node:assert/strict";

import { RetentionProgressSystem } from
  "../systems/progression/RetentionProgressSystem.js";
import { auditUpgradeDefinitions } from
  "../systems/progression/upgradeDefinitionAudit.js";
import {
  getGemPowerBlockRestoreCapacity,
  getGemPowerBlockTier,
} from "../values/specialBlocks.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";

const tiers = [0, 250, 500, 1000, 1500].map(getGemPowerBlockTier);
assert.equal(tiers.length, 5);
assert.equal(new Set(tiers.map(tier => tier.id)).size, 5);
assert.deepEqual(
  tiers.map(tier => tier.restoreAmount),
  [100, 250, 500, 1000, 1700],
);
for (const maximum of [100, 400, 1200, 3000]) {
  for (const depth of [0, 250, 500, 1000, 1500]) {
    assert.ok(getGemPowerBlockRestoreCapacity(depth, maximum) < maximum);
  }
}

const audit = auditUpgradeDefinitions();
assert.equal(audit.ready, true, JSON.stringify(audit.errors, null, 2));
assert.equal(UPGRADES.gemPowerRegeneration.baseCost, 250);
assert.equal(UPGRADES.quickslashAbility.merchant, "boboMerchant");
for (const rows of Object.values(audit.pickaxeMatrix)) {
  for (let index = 1; index < rows.length; index += 1) {
    assert.ok(rows[index].damage >= rows[index - 1].damage);
  }
}

const retention = new RetentionProgressSystem();
for (let second = 0; second < 60; second += 1) {
  retention.updateDepth(100, {
    deltaMs: 1000,
    gemPower: second < 30 ? 100 : 70,
  });
}
retention.recordMiningResult({
  success: true,
  destroyed: true,
  resourceAmount: 5,
  resourceType: "gold",
});
retention.recordExpeditionCost({ hpLost: 2, returnCost: 100, failureLoss: 200 });
retention.updateDepth(0, { isTown: true });
const summary = retention.getSaveData().lastExpedition;
assert.equal(summary.activeMs, 60000);
assert.equal(summary.grossValue, 2500);
assert.equal(summary.gpSpent, 30);
assert.equal(summary.hpLost, 2);
assert.equal(summary.returnCost, 100);
assert.equal(summary.failureLoss, 200);
assert.equal(summary.failed, true);
assert.equal(summary.netValue, 2120);
assert.equal(summary.netValuePerActiveMinute, 2120);

console.log("ECONOMY_PROGRESSION_TRUST_CONTRACT_OK");
