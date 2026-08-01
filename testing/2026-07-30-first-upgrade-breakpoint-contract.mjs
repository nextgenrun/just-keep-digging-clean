import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { DigSystem } from "../systems/mining/DigSystem.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { RESOURCE_PRICES_CONFIG } from "../values/resourcePrices.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";
import { getTileHealth } from "../values/tileHealth.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import {
  FIRST_FIVE_STARTER_UPGRADE_ID,
  UPGRADES,
} from "../values/upgradeDefinitions.js";

const shallowDirtHp = getTileHealth(TILE_TYPES.DIRT, -1);
assert.equal(shallowDirtHp, 45);
assert.equal(UPGRADES[FIRST_FIVE_STARTER_UPGRADE_ID].goldCost, 4);
assert.ok(
  RETENTION_CONFIG.tutorial.starterReward.money
    + RESOURCE_PRICES_CONFIG.basePrices.dirt
    >= UPGRADES[FIRST_FIVE_STARTER_UPGRADE_ID].goldCost,
  "starter money plus one sold Dirt must fund the authored upgrade",
);

const worldModel = {
  getTileMaxHp: () => shallowDirtHp,
};
const upgrades = new UpgradeSystem(null, null, { firstFiveEnabled: true });
const dig = new DigSystem(
  worldModel,
  null,
  { firstFiveEnabled: true },
  upgrades,
);

const before = dig.getHitsToBreakPreview(TILE_TYPES.DIRT, 12, 64);
assert.deepEqual(before, { damage: 16, hp: 45, hits: 3 });
upgrades.addMoney(UPGRADES[FIRST_FIVE_STARTER_UPGRADE_ID].goldCost);
const purchase = upgrades.purchaseUpgrade(FIRST_FIVE_STARTER_UPGRADE_ID);
assert.equal(purchase.success, true);
const after = dig.getHitsToBreakPreview(TILE_TYPES.DIRT, 12, 64);
assert.deepEqual(after, { damage: 24, hp: 45, hits: 2 });

const retention = new RetentionProgressSystem({ firstFiveEnabled: true });
retention.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.YES);
retention.recordTutorialMovement(2);
retention.recordMiningResult({ success: true, destroyed: true, resourceAmount: 1 });
retention.recordSale(1, 1);
retention.recordUpgrade(UPGRADES[FIRST_FIVE_STARTER_UPGRADE_ID].name, {
  upgradeId: FIRST_FIVE_STARTER_UPGRADE_ID,
  beforeHits: before.hits,
  afterHits: after.hits,
  beforeDamage: before.damage,
  afterDamage: after.damage,
});
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.COMPLETE);
assert.deepEqual(retention.consumeUpgradePayoff(), {
  upgradeName: "Miner's Grip",
  beforeHits: 3,
  afterHits: 2,
  beforeDamage: 16,
  afterDamage: 24,
});

const bronzeUpgrades = new UpgradeSystem(null, null, { firstFiveEnabled: true });
bronzeUpgrades.grantUpgrade("bronzePickaxe");
const bronzeDig = new DigSystem(
  worldModel,
  null,
  { firstFiveEnabled: true },
  bronzeUpgrades,
);
assert.equal(
  bronzeDig.getDamagePreview(TILE_TYPES.DIRT),
  16,
  "Bronze Pickaxe must not reduce starter Dirt damage below the no-pickaxe baseline",
);

const rollbackUpgrades = new UpgradeSystem(
  null,
  null,
  { firstFiveEnabled: false },
);
assert.deepEqual(
  rollbackUpgrades.canPurchaseUpgrade(FIRST_FIVE_STARTER_UPGRADE_ID),
  { canPurchase: false, reason: "feature_disabled" },
);
rollbackUpgrades.grantUpgrade(FIRST_FIVE_STARTER_UPGRADE_ID);
rollbackUpgrades.grantUpgrade("bronzePickaxe");
assert.equal(
  rollbackUpgrades.getUpgradeEffects().digDamageAdditive,
  0,
  "rollback must ignore a previously saved first-five-only level",
);
const rollbackDig = new DigSystem(
  worldModel,
  null,
  { firstFiveEnabled: false },
  rollbackUpgrades,
);
assert.equal(
  rollbackDig.getDamagePreview(TILE_TYPES.DIRT),
  12,
  "rollback must preserve the previous Bronze Pickaxe formula",
);

const shopSource = await readFile(
  new URL("../ui/overlays/ShopOverlay.js", import.meta.url),
  "utf8",
);
assert.match(shopSource, /getPreferredMerchantMode/);
assert.match(shopSource, /getFocusedUpgradeId/);
assert.match(shopSource, /getUpgradePreview/);
assert.match(shopSource, /recordUpgrade\?\.\(upgrade\.name,\s*\{/);

console.log("First-upgrade breakpoint contract passed.");
