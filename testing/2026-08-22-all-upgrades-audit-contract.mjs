import assert from "node:assert/strict";

import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";

const entries = Object.entries(UPGRADES);
assert.equal(entries.length, 37, "every current upgrade definition must be audited");
assert.equal(new Set(entries.map(([id]) => id)).size, entries.length);

const validMerchants = new Set([
  "playerUpgrades",
  "gearMerchant",
  "gemPowerMerchant",
  "moneyMonster",
  "boboMerchant",
  "magmaMoneyMonster",
]);
const specialEffectOwners = new Set([
  "gemPowerUnlocked",
  "worldTwoTunnelAccess",
  "arcCoreVehicle",
  "omegaArcCoreVehicle",
  "special",
  "upOrDown",
]);
const system = new UpgradeSystem(null, { level: 1 });
const effectKeys = new Set(Object.keys(system.getUpgradeEffects()));

for (const [id, upgrade] of entries) {
  assert.equal(upgrade.id, id, `${id}: registry key and authored id must agree`);
  assert.ok(String(upgrade.name || "").trim(), `${id}: missing player-facing name`);
  assert.ok(String(upgrade.description || "").trim(), `${id}: missing player-facing description`);
  assert.equal(validMerchants.has(upgrade.merchant), true, `${id}: unknown merchant`);
  const moneyCost = Number(upgrade.goldCost ?? upgrade.baseCost ?? 0);
  assert.ok(Number.isFinite(moneyCost) && moneyCost >= 0, `${id}: invalid money cost`);
  for (const [resource, amount] of Object.entries(upgrade.resources || {})) {
    assert.ok(String(resource).trim(), `${id}: blank resource requirement`);
    assert.ok(Number.isFinite(amount) && amount > 0, `${id}: invalid ${resource} requirement`);
  }
  if (upgrade.effectType) {
    assert.equal(
      effectKeys.has(upgrade.effectType) || specialEffectOwners.has(upgrade.effectType),
      true,
      `${id}: effect has no UpgradeSystem or specialist runtime owner`,
    );
  } else {
    assert.equal(upgrade.merchant, "gearMerchant", `${id}: only pickaxes may omit effectType`);
    assert.equal(upgrade.oneTimePurchase, true, `${id}: pickaxe ownership must be one-time`);
  }
}

assert.equal(UPGRADES.dragonPickaxe.goldCost, 360_000);
assert.equal(UPGRADES.torchDrainEfficiency.requiresDepthGateAccepted, undefined);
assert.equal(UPGRADES.torchRange.requiresDepthGateAccepted, undefined);
assert.equal(UPGRADES.boboCaveEyes.requiresDepthGateAccepted, undefined);

console.log("All-upgrades audit passed: 37 definitions, costs, descriptions, merchants, effects, and survival-tool locks.");
