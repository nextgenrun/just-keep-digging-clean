import assert from "node:assert/strict";

import {
  CRAFTING_RECIPES,
  CRAFTING_RECIPE_IDS,
  CRAFTING_REQUIREMENTS,
  isCraftOnlyUpgrade,
} from "../values/craftingRecipes.js";
import {
  ARC_CORE_CRAFT_COST,
  ARC_CORE_PURCHASE_COST,
  ARC_CORE_UPGRADE_ID,
  OMEGA_ARC_CORE_CRAFT_COST,
  OMEGA_ARC_CORE_PURCHASE_COST,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../values/arcCoreConfig.js";
import {
  HEAVENBLOCKS_PROGRESSION_CONFIG,
} from "../values/heavenblocksProgressionConfig.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import { CraftingSystem } from "../systems/crafting/CraftingSystem.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { HeavenblocksProgressionSystem } from "../systems/progression/HeavenblocksProgressionSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";

function completeHeavenblocks(progression, { installParts = true } = {}) {
  assert.equal(progression.activateSkyGate().success, true);
  for (const region of HEAVENBLOCKS_PROGRESSION_CONFIG.regions) {
    assert.equal(progression.visitRegion(region.id).success, true);
    assert.equal(progression.discoverPart(region.uniquePartId).success, true);
    if (installParts) assert.equal(progression.installPart(region.uniquePartId).success, true);
    assert.equal(progression.completeRegion(region.id).success, true);
  }
}

function createHarness({
  relics = CRAFTING_REQUIREMENTS.arcCoreRelics,
  resources = {},
  grantTunnel = true,
  completeSky = true,
  installParts = true,
  grantArc = false,
  grantKeystone = false,
} = {}) {
  const digSystem = new DigSystem(null, null, {});
  digSystem.setResourceTotals(resources);
  const upgradeSystem = new UpgradeSystem(digSystem, null);
  if (grantTunnel) upgradeSystem.grantUpgrade("worldTwoTunnelAccess");
  if (grantArc) upgradeSystem.grantUpgrade(ARC_CORE_UPGRADE_ID);
  const ancientRelicSystem = { getCount: () => relics };
  const progressionSystem = new HeavenblocksProgressionSystem({
    relicCountProvider: () => relics,
  });
  if (completeSky) completeHeavenblocks(progressionSystem, { installParts });
  if (grantKeystone) progressionSystem.grantZenithKeystone();
  const craftingSystem = new CraftingSystem({
    digSystem,
    upgradeSystem,
    ancientRelicSystem,
    heavenblocksProgressionSystem: progressionSystem,
  });
  return {
    digSystem,
    upgradeSystem,
    ancientRelicSystem,
    progressionSystem,
    craftingSystem,
  };
}

const arcRecipe = CRAFTING_RECIPES[CRAFTING_RECIPE_IDS.ARC_CORE];
const omegaRecipe = CRAFTING_RECIPES[CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE];
assert.equal(arcRecipe.ingredients, ARC_CORE_PURCHASE_COST);
assert.equal(omegaRecipe.ingredients, OMEGA_ARC_CORE_PURCHASE_COST);
assert.equal(ARC_CORE_PURCHASE_COST, ARC_CORE_CRAFT_COST);
assert.equal(OMEGA_ARC_CORE_PURCHASE_COST, OMEGA_ARC_CORE_CRAFT_COST);
assert.deepEqual(ARC_CORE_CRAFT_COST, {
  silver: 120,
  gold: 60,
  cloudstone: 40,
  stormglass: 12,
  halostone: 30,
  lumenite: 10,
  cinderstone: 24,
  hellglass: 8,
});
assert.deepEqual(OMEGA_ARC_CORE_CRAFT_COST, {
  silver: 240,
  gold: 240,
  obsidian: 40,
  emberOre: 15,
  magmaCrystal: 3,
  cloudstone: 100,
  stormglass: 35,
  halostone: 80,
  lumenite: 30,
  cinderstone: 75,
  hellglass: 24,
});
assert.equal(arcRecipe.requirements.minimumAncientRelics, 3);
assert.equal(omegaRecipe.requirements.minimumAncientRelics, 18);
assert.equal(isCraftOnlyUpgrade(ARC_CORE_UPGRADE_ID), true);
assert.equal(isCraftOnlyUpgrade(OMEGA_ARC_CORE_UPGRADE_ID), true);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].hiddenFromShop, true);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].acquisitionMode, "craft");
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].hiddenFromShop, true);

{
  const { digSystem } = createHarness({ resources: { silver: 20, gold: 20 } });
  const before = digSystem.getResourceTotals();
  assert.equal(digSystem.trySpendResources({ silver: 10, gold: 21 }).success, false);
  assert.deepEqual(digSystem.getResourceTotals(), before);
  assert.equal(digSystem.trySpendResources({ silver: -1 }).reason, "invalid_amount");
  assert.equal(digSystem.trySpendResources({ skySigil: 1 }).reason, "invalid_resource");
  assert.deepEqual(digSystem.getResourceTotals(), before);
}

{
  const { craftingSystem } = createHarness({
    relics: 2,
    completeSky: false,
    resources: ARC_CORE_PURCHASE_COST,
  });
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.success, false);
  assert.equal(result.reason, "not_enough_relics");
}

{
  const { craftingSystem } = createHarness({
    completeSky: false,
    resources: ARC_CORE_PURCHASE_COST,
  });
  assert.equal(craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE).reason, "requires_blueprint");
}

{
  const { craftingSystem } = createHarness({
    installParts: false,
    resources: ARC_CORE_PURCHASE_COST,
  });
  assert.equal(
    craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE).reason,
    "requires_installed_parts",
  );
}

{
  const { craftingSystem } = createHarness({
    grantTunnel: false,
    resources: ARC_CORE_PURCHASE_COST,
  });
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.reason, "requires_upgrade");
  assert.equal(result.requiredUpgradeId, "worldTwoTunnelAccess");
}

{
  const relics = CRAFTING_REQUIREMENTS.arcCoreRelics;
  const { craftingSystem, digSystem, upgradeSystem, progressionSystem } = createHarness({
    relics,
    resources: { ...ARC_CORE_CRAFT_COST, silver: 200, gold: 100 },
  });
  const progressionBefore = progressionSystem.getSaveData();
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.success, true);
  assert.equal(result.relicsConsumed, 0);
  assert.equal(result.progressionItemsConsumed, 0);
  assert.equal(upgradeSystem.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 1);
  assert.equal(digSystem.getResourceTotals().silver, 80);
  assert.equal(digSystem.getResourceTotals().gold, 40);
  for (const key of Object.keys(ARC_CORE_CRAFT_COST).filter(
    (key) => key !== "silver" && key !== "gold",
  )) {
    assert.equal(digSystem.getResourceTotals()[key], 0);
  }
  assert.deepEqual(progressionSystem.getSaveData(), progressionBefore);
  assert.equal(craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE).reason, "already_owned");
}

{
  const { craftingSystem, digSystem, upgradeSystem } = createHarness({
    resources: { ...ARC_CORE_CRAFT_COST, silver: 200, gold: 100 },
  });
  const before = digSystem.getResourceTotals();
  upgradeSystem.grantUpgrade = () => ({ success: false, reason: "forced_grant_failure" });
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
  assert.equal(result.reason, "forced_grant_failure");
  assert.deepEqual(digSystem.getResourceTotals(), before);
  assert.equal(upgradeSystem.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 0);
}

{
  const { craftingSystem } = createHarness({
    relics: 18,
    grantArc: true,
    grantKeystone: false,
    resources: OMEGA_ARC_CORE_PURCHASE_COST,
  });
  assert.equal(
    craftingSystem.craft(CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE).reason,
    "requires_zenith_keystone",
  );
}

{
  const { craftingSystem, digSystem, upgradeSystem, progressionSystem } = createHarness({
    relics: 18,
    grantArc: true,
    grantKeystone: true,
    resources: {
      ...OMEGA_ARC_CORE_CRAFT_COST,
      silver: 300,
      gold: 300,
      obsidian: 50,
      emberOre: 20,
      magmaCrystal: 5,
    },
  });
  const progressionBefore = progressionSystem.getSaveData();
  const result = craftingSystem.craft(CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE);
  assert.equal(result.success, true);
  assert.equal(upgradeSystem.getUpgradeLevel(OMEGA_ARC_CORE_UPGRADE_ID), 1);
  assert.deepEqual(
    {
      silver: digSystem.getResourceTotals().silver,
      gold: digSystem.getResourceTotals().gold,
      obsidian: digSystem.getResourceTotals().obsidian,
      emberOre: digSystem.getResourceTotals().emberOre,
      magmaCrystal: digSystem.getResourceTotals().magmaCrystal,
    },
    { silver: 60, gold: 60, obsidian: 10, emberOre: 5, magmaCrystal: 2 },
  );
  for (const key of [
    "cloudstone", "stormglass", "halostone", "lumenite", "cinderstone", "hellglass",
  ]) {
    assert.equal(digSystem.getResourceTotals()[key], 0);
  }
  assert.deepEqual(progressionSystem.getSaveData(), progressionBefore);
}

{
  const { craftingSystem, upgradeSystem } = createHarness();
  const first = craftingSystem.getRecipeIngredientConflicts([
    "silver", "gold", "cloudstone", "hellglass", "obsidian", "dirt",
  ]);
  assert.deepEqual(
    first.map((entry) => entry.resourceKey),
    ["silver", "gold", "cloudstone", "hellglass", "obsidian"],
  );
  upgradeSystem.grantUpgrade(ARC_CORE_UPGRADE_ID);
  const afterArc = craftingSystem.getRecipeIngredientConflicts(["silver", "gold", "obsidian"]);
  assert.ok(afterArc.every((entry) => entry.recipeIds.length === 1));
  assert.ok(afterArc.every((entry) => entry.recipeIds[0] === CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE));
  upgradeSystem.grantUpgrade(OMEGA_ARC_CORE_UPGRADE_ID);
  assert.deepEqual(craftingSystem.getRecipeIngredientConflicts(["silver", "gold"]), []);
}

{
  const { digSystem, upgradeSystem } = createHarness({
    resources: { ...ARC_CORE_CRAFT_COST, silver: 200, gold: 100 },
  });
  const resourcesBefore = digSystem.getResourceTotals();
  assert.equal(upgradeSystem.purchaseUpgrade(ARC_CORE_UPGRADE_ID).reason, "craft_only");
  assert.deepEqual(digSystem.getResourceTotals(), resourcesBefore);
}

console.log(
  "CraftingSystem contract passed: exact recipes, permanent progression gates, atomic spend/grant rollback, conflict warnings, and craft-only ownership.",
);
