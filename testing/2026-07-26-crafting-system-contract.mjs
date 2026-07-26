import assert from "node:assert/strict";

import {
  CRAFTING_PROGRESS_FLAGS,
  CRAFTING_RECIPES,
  CRAFTING_RECIPE_IDS,
  CRAFTING_REQUIREMENTS,
  isCraftOnlyUpgrade,
} from "../values/craftingRecipes.js";
import {
  ARC_CORE_PURCHASE_COST,
  ARC_CORE_UPGRADE_ID,
  OMEGA_ARC_CORE_PURCHASE_COST,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../values/arcCoreConfig.js";
import { CraftingSystem } from "../systems/crafting/CraftingSystem.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";

function createHarness({
  relics = CRAFTING_REQUIREMENTS.skyIslandRelics,
  skyUnlocked = true,
  resources = {},
  grantTunnel = true,
} = {}) {
  const digSystem = new DigSystem(null, null, {});
  digSystem.setResourceTotals(resources);
  const upgradeSystem = new UpgradeSystem(digSystem, null);
  if (grantTunnel) upgradeSystem.grantUpgrade("worldTwoTunnelAccess");
  const ancientRelicSystem = { getCount: () => relics };
  const progressionFlags = new Set(
    skyUnlocked ? [CRAFTING_PROGRESS_FLAGS.SKY_ISLANDS_UNLOCKED] : []
  );
  const craftingSystem = new CraftingSystem({
    digSystem,
    upgradeSystem,
    ancientRelicSystem,
    progressionStateProvider: () => ({ progressFlags: progressionFlags }),
  });
  return { digSystem, upgradeSystem, ancientRelicSystem, craftingSystem };
}

const arcRecipe = CRAFTING_RECIPES[CRAFTING_RECIPE_IDS.ARC_CORE];
const omegaRecipe = CRAFTING_RECIPES[CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE];
assert.equal(arcRecipe.output.upgradeId, ARC_CORE_UPGRADE_ID);
assert.equal(omegaRecipe.output.upgradeId, OMEGA_ARC_CORE_UPGRADE_ID);
assert.equal(arcRecipe.ingredients, ARC_CORE_PURCHASE_COST);
assert.equal(omegaRecipe.ingredients, OMEGA_ARC_CORE_PURCHASE_COST);
assert.equal(isCraftOnlyUpgrade(ARC_CORE_UPGRADE_ID), true);
assert.equal(isCraftOnlyUpgrade(OMEGA_ARC_CORE_UPGRADE_ID), true);
assert.equal(isCraftOnlyUpgrade("bronzePickaxe"), false);

{
  const { digSystem } = createHarness({ resources: { silver: 20, gold: 20 } });
  const before = digSystem.getResourceTotals();
  const result = digSystem.trySpendResources({ silver: 10, gold: 21 });
  assert.equal(result.success, false);
  assert.equal(result.reason, "not_enough_resources");
  assert.deepEqual(digSystem.getResourceTotals(), before);
  assert.equal(digSystem.trySpendResources({ silver: -1 }).reason, "invalid_amount");
  assert.equal(digSystem.trySpendResources({ skySigil: 1 }).reason, "invalid_resource");
  assert.deepEqual(digSystem.getResourceTotals(), before);
}

{
  const { craftingSystem, digSystem, upgradeSystem } = createHarness({
    relics: CRAFTING_REQUIREMENTS.skyIslandRelics - 1,
    resources: { silver: 200, gold: 100 },
  });
  const before = digSystem.getResourceTotals();
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.success, false);
  assert.equal(result.reason, "not_enough_relics");
  assert.deepEqual(digSystem.getResourceTotals(), before);
  assert.equal(upgradeSystem.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 0);
}

{
  const { craftingSystem } = createHarness({
    skyUnlocked: false,
    resources: { silver: 200, gold: 100 },
  });
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.success, false);
  assert.equal(result.reason, "requires_progress");
  assert.deepEqual(result.missingProgressFlags, [
    CRAFTING_PROGRESS_FLAGS.SKY_ISLANDS_UNLOCKED,
  ]);
}

{
  const { craftingSystem } = createHarness({
    grantTunnel: false,
    resources: { silver: 200, gold: 100 },
  });
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.success, false);
  assert.equal(result.reason, "requires_upgrade");
  assert.equal(result.requiredUpgradeId, "worldTwoTunnelAccess");
}

{
  const relicCount = CRAFTING_REQUIREMENTS.skyIslandRelics;
  const { craftingSystem, digSystem, upgradeSystem, ancientRelicSystem } = createHarness({
    relics: relicCount,
    resources: { silver: 200, gold: 100 },
  });
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.success, true);
  assert.equal(result.outputUpgradeId, ARC_CORE_UPGRADE_ID);
  assert.equal(result.relicsConsumed, 0);
  assert.equal(ancientRelicSystem.getCount(), relicCount);
  assert.equal(upgradeSystem.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 1);
  assert.equal(digSystem.getResourceTotals().silver, 80);
  assert.equal(digSystem.getResourceTotals().gold, 40);

  const beforeSecondCraft = digSystem.getResourceTotals();
  const secondResult = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(secondResult.success, false);
  assert.equal(secondResult.reason, "already_owned");
  assert.deepEqual(digSystem.getResourceTotals(), beforeSecondCraft);
}

{
  const { craftingSystem, digSystem, upgradeSystem } = createHarness({
    resources: { silver: 200, gold: 100 },
  });
  const before = digSystem.getResourceTotals();
  upgradeSystem.grantUpgrade = () => ({ success: false, reason: "forced_grant_failure" });
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.success, false);
  assert.equal(result.reason, "forced_grant_failure");
  assert.deepEqual(digSystem.getResourceTotals(), before);
  assert.equal(upgradeSystem.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 0);
}

{
  const { craftingSystem, digSystem, upgradeSystem } = createHarness({
    resources: { silver: 400, gold: 600 },
  });
  upgradeSystem.grantUpgrade(ARC_CORE_UPGRADE_ID);
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE);
  assert.equal(result.success, true);
  assert.equal(upgradeSystem.getUpgradeLevel(OMEGA_ARC_CORE_UPGRADE_ID), 1);
  assert.equal(digSystem.getResourceTotals().silver, 160);
  assert.equal(digSystem.getResourceTotals().gold, 120);
}

{
  const { digSystem, upgradeSystem } = createHarness({
    resources: { silver: 200, gold: 100 },
  });
  upgradeSystem.setMoney(1000);
  const resourcesBefore = digSystem.getResourceTotals();
  const moneyBefore = upgradeSystem.getMoney();
  const result = upgradeSystem.purchaseUpgrade(ARC_CORE_UPGRADE_ID);
  assert.equal(result.success, false);
  assert.equal(result.reason, "craft_only");
  assert.deepEqual(digSystem.getResourceTotals(), resourcesBefore);
  assert.equal(upgradeSystem.getMoney(), moneyBefore);
}

console.log("CraftingSystem contract passed: atomic resources, permanent relic gates, craft-only Arc ownership, and rollback.");
