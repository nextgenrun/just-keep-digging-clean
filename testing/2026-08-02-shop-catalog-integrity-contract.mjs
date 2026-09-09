import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { SystemIntroductionSystem } from "../systems/onboarding/SystemIntroductionSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { ShopOverlay } from "../ui/overlays/ShopOverlay.js";
import { getUpgradeCost } from "../values/upgradeFormulas.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import {
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";

const EXPECTED_CATALOGS = Object.freeze({
  moneyMonster: Object.freeze([
    "sellAllButton",
    "startResourcePrices",
    "nextResourcePrices",
    "deepResourcePrices",
    "marketInsight",
  ]),
  gearMerchant: Object.freeze([
    "bronzePickaxe",
    "ironPickaxe",
    "steelPickaxe",
    "mithrilPickaxe",
    "adamantPickaxe",
    "runePickaxe",
    "dragonPickaxe",
  ]),
  boboMerchant: Object.freeze([
    "quickslashAbility",
    "thunderStrikeAbility",
    "torchDrainEfficiency",
    "torchRange",
    "boboCaveEyes",
    "worldTwoTunnelAccess",
    "mia",
    "boboWisdom",
  ]),
});
const EXPECTED_PRESENTED_CATALOGS = Object.freeze({
  ...EXPECTED_CATALOGS,
  // Level Two is capability-gated in this runtime profile. The definition is
  // audited above, but its purchase row is intentionally not presented.
  boboMerchant: Object.freeze(
    EXPECTED_CATALOGS.boboMerchant.filter(id => id !== "worldTwoTunnelAccess"),
  ),
});
const EXPECTED_FRESH_AVAILABLE = Object.freeze({
  moneyMonster: Object.freeze(["startResourcePrices"]),
  gearMerchant: Object.freeze([]),
  // Survival tools must precede the depth danger they solve.
  boboMerchant: Object.freeze([
    "torchDrainEfficiency",
    "torchRange",
    "boboCaveEyes",
    "mia",
    "boboWisdom",
  ]),
});

assert.equal(
  UPGRADES.worldTwoTunnelAccess?.effectType,
  "worldTwoTunnelAccess",
  "the Level-Two tunnel key must remain defined even when that capability is not presented",
);

function activeCatalogIds(merchantId) {
  return Object.entries(UPGRADES)
    .filter(([, upgrade]) => (
      upgrade.merchant === merchantId
      && !upgrade.comingSoon
      && !upgrade.hiddenFromShop
    ))
    .map(([id]) => id);
}

for (const [merchantId, expectedIds] of Object.entries(EXPECTED_CATALOGS)) {
  assert.deepEqual(
    activeCatalogIds(merchantId),
    expectedIds,
    `${merchantId} definitions must retain the complete canonical catalog`,
  );
}

const resources = {
  dirt: 100000,
  stone: 100000,
  copper: 100000,
  iron: 100000,
  bronze: 100000,
  steel: 100000,
  silver: 100000,
  gold: 100000,
};
const digSystem = {
  getResourceTotals: () => ({ ...resources }),
  trySpendResources(costs = {}) {
    for (const [resource, amount] of Object.entries(costs)) {
      if ((resources[resource] || 0) < amount) {
        return { success: false, reason: "not_enough_resources", resource };
      }
    }
    for (const [resource, amount] of Object.entries(costs)) {
      resources[resource] -= amount;
    }
    return { success: true };
  },
};
const playerLevelSystem = {
  level: 99,
  getLevel: () => 99,
};
const upgradeSystem = new UpgradeSystem(digSystem, playerLevelSystem, {
  firstFiveEnabled: true,
  depthEconomyEnabled: true,
});
upgradeSystem.setMoney(999999);

const stats = {
  bestDepth: 0,
  totalTilesBroken: 0,
  totalResources: 0,
  resourcesSold: 0,
  upgradesPurchased: 0,
  portalsActivated: 0,
  chestsOpened: 0,
  starsCollected: 0,
  earthquakesSurvived: 0,
  expeditionsCompleted: 0,
};
const journal = {
  stats,
  discoveries: { titans: [] },
  lastExpedition: null,
};
const tutorial = {
  choice: TOWN_TUTORIAL_CHOICES.YES,
  stage: TOWN_TUTORIAL_STAGES.COMPLETE,
  flightTrainingGranted: true,
};
const scene = {
  config: { resourceEconomyEnabled: true },
  upgradeSystem,
  townSquareTutorialSystem: {
    isFirstFiveEnabled: () => true,
    getFocusedUpgradeId: () => null,
    isUpgradeAvailable: () => true,
  },
};
const retention = {
  getJournalSnapshot: () => journal,
  getTutorialState: () => tutorial,
};
const pacing = new SystemIntroductionSystem(scene, retention);
scene.systemIntroductionSystem = pacing;
pacing.refresh({ announce: false });

assert.deepEqual(
  pacing.getAvailableMerchantIds(),
  TOWN_SQUARE_CONFIG.surfaceMerchantOrder,
  "all five Level-1 merchants must remain presented on a fresh save",
);
assert.equal(pacing.isMerchantUnlocked("gearMerchant"), false);
assert.equal(pacing.isMerchantUnlocked("boboMerchant"), true);
assert.equal(pacing.isMerchantAvailable("magmaMoneyMonster"), false);

function createCatalog(merchantId) {
  const overlay = Object.assign(Object.create(ShopOverlay.prototype), {
    scene,
    upgradeSystem,
    soundSystem: { playUiSelect() {} },
    currentMerchant: merchantId,
    isVisible: true,
    moneyMonsterMode: "buy",
    currentPage: 0,
    selectedIndex: 0,
    selectedSellButton: 0,
    itemsPerPage: 5,
    allUpgrades: [],
    sellItems: [],
    forgeRecipes: [],
    _render() {},
  });
  overlay.populateUpgrades(merchantId);
  return overlay;
}

const freshCatalogs = {};
for (const [merchantId, expectedIds] of Object.entries(EXPECTED_PRESENTED_CATALOGS)) {
  const overlay = createCatalog(merchantId);
  freshCatalogs[merchantId] = overlay;
  assert.deepEqual(
    overlay.allUpgrades.map(upgrade => upgrade.id),
    expectedIds,
    `${merchantId} must show locked rows instead of filtering them out`,
  );
  assert.deepEqual(
    overlay.allUpgrades
      .filter(upgrade => upgrade.availability?.available === true)
      .map(upgrade => upgrade.id),
    EXPECTED_FRESH_AVAILABLE[merchantId],
    `${merchantId} fresh-save availability must match staged disclosure`,
  );
  const lockedUpgrades = overlay.allUpgrades
    .filter(upgrade => upgrade.availability?.available === false);
  assert.ok(lockedUpgrades.length > 0, `${merchantId} must retain progression locks`);
  assert.equal(
    lockedUpgrades.every(upgrade => Boolean(upgrade.availability?.detail)),
    true,
    `${merchantId} locks must explain their unlock condition`,
  );

  const pageSize = 5;
  const pages = [];
  for (let start = 0; start < overlay.allUpgrades.length; start += pageSize) {
    pages.push(overlay.allUpgrades.slice(start, start + pageSize).map(upgrade => upgrade.id));
  }
  assert.deepEqual(pages.flat(), expectedIds);
  assert.equal(new Set(pages.flat()).size, expectedIds.length);
}

assert.deepEqual(
  freshCatalogs.moneyMonster.allUpgrades.slice(5).map(upgrade => upgrade.id),
  [],
);
assert.deepEqual(
  freshCatalogs.gearMerchant.allUpgrades.slice(5).map(upgrade => upgrade.id),
  ["runePickaxe", "dragonPickaxe"],
);
assert.deepEqual(
  freshCatalogs.boboMerchant.allUpgrades.slice(5).map(upgrade => upgrade.id),
  ["mia", "boboWisdom"],
);

const boboPages = freshCatalogs.boboMerchant;
boboPages.nextPage();
assert.equal(boboPages.currentPage, 1);
assert.equal(boboPages.selectedIndex, 5);
boboPages.nextPage();
assert.equal(boboPages.currentPage, 0);
assert.equal(boboPages.selectedIndex, 0);
boboPages.prevPage();
assert.equal(boboPages.currentPage, 1);
assert.equal(boboPages.selectedIndex, 5);
boboPages.currentPage = 0;
boboPages.selectedIndex = 4;
boboPages.navigateDown();
assert.equal(boboPages.currentPage, 1);
assert.equal(boboPages.selectedIndex, 5);
boboPages.navigateUp();
assert.equal(boboPages.currentPage, 0);
assert.equal(boboPages.selectedIndex, 4);

const originalPhaser = globalThis.Phaser;
globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown(key) {
        const down = key?.justDown === true;
        if (key) key.justDown = false;
        return down;
      },
    },
  },
};
try {
  const key = () => ({ justDown: false });
  const inputOverlay = Object.assign(Object.create(ShopOverlay.prototype), {
    isVisible: true,
    _destroyed: false,
    moneyMonsterMode: "buy",
    pageChanges: 0,
    purchases: 0,
    keys: {
      escape: key(),
      tab: key(),
      up: key(),
      down: key(),
      left: key(),
      right: key(),
      arrowUp: key(),
      arrowDown: key(),
      arrowLeft: key(),
      arrowRight: key(),
      previousPage: key(),
      nextPage: key(),
      confirm: key(),
      action: key(),
      space: key(),
    },
    scene: { interactKey: key() },
    nextPage() { this.pageChanges += 1; },
    prevPage() { this.pageChanges -= 1; },
    purchaseSelected() { this.purchases += 1; },
    navigateUp() {},
    navigateDown() {},
    navigateLeft() {},
    navigateRight() {},
    toggleMoneyMonsterMode() {},
  });

  inputOverlay.keys.nextPage.justDown = true;
  inputOverlay.update();
  assert.equal(inputOverlay.pageChanges, 1);
  assert.equal(inputOverlay.purchases, 0);

  inputOverlay.scene.interactKey.justDown = true;
  inputOverlay.update();
  assert.equal(inputOverlay.pageChanges, 1, "interact must purchase, never change pages");
  assert.equal(inputOverlay.purchases, 1);
} finally {
  globalThis.Phaser = originalPhaser;
}

const source = readFileSync(
  new URL("../ui/overlays/ShopOverlay.js", import.meta.url),
  "utf8",
);
assert.match(source, /previousPage:\s*keyboard\.addKey\(code\.PAGE_UP\)/);
assert.match(source, /nextPage:\s*keyboard\.addKey\(code\.PAGE_DOWN\)/);
assert.doesNotMatch(source, /next:\s*keyboard\.addKey\(code\.E\)/);
assert.doesNotMatch(source, /requirementLines\.slice\(/);

const dragon = freshCatalogs.gearMerchant.allUpgrades.find(
  upgrade => upgrade.id === "dragonPickaxe",
);
const dragonRequirements = freshCatalogs.gearMerchant._buildRequirementLines(
  dragon,
  getUpgradeCost(dragon.id, 0),
);
assert.equal(dragonRequirements[0].text.startsWith("Unlock  "), true);
assert.equal(
  dragonRequirements.length >= Object.keys(dragon.resources || {}).length + 2,
  true,
  "Dragon detail must retain its depth lock, money, and material rows",
);
assert.equal(
  dragonRequirements.some(line => line.text.startsWith("Player level  ")),
  false,
);

const moneyBeforeLock = upgradeSystem.getMoney();
const resourcesBeforeLock = { ...resources };
const lockedMarket = upgradeSystem.purchaseUpgrade("nextResourcePrices");
assert.equal(lockedMarket.success, false);
assert.equal(lockedMarket.reason, "progression_locked");
assert.equal(upgradeSystem.getMoney(), moneyBeforeLock);
assert.equal(upgradeSystem.getUpgradeLevel("nextResourcePrices"), 0);
assert.deepEqual(resources, resourcesBeforeLock);

const lockedPickaxe = upgradeSystem.purchaseUpgrade("ironPickaxe");
assert.equal(lockedPickaxe.success, false);
assert.equal(lockedPickaxe.reason, "progression_locked");
assert.equal(upgradeSystem.getMoney(), moneyBeforeLock);
assert.equal(upgradeSystem.getUpgradeLevel("ironPickaxe"), 0);
assert.equal(upgradeSystem.ownedPickaxe, null);
assert.deepEqual(resources, resourcesBeforeLock);

let openCalls = 0;
const showHarness = Object.assign(Object.create(ShopOverlay.prototype), {
  _destroyed: false,
  scene: {
    systemIntroductionSystem: pacing,
    townSquareTutorialSystem: { getPreferredMerchantMode: () => "buy" },
    setShopOpen() { openCalls += 1; },
  },
  shell: {
    root: { active: true },
    backdrop: { active: true },
    show() {},
  },
  soundSystem: { playUiSelect() {} },
  _syncMerchantChrome() {},
  populateUpgrades(merchantId) { this.populatedMerchant = merchantId; },
  _layoutChrome() {},
});
assert.equal(showHarness.show("magmaMoneyMonster"), false);
assert.equal(openCalls, 0);
assert.equal(showHarness.show("gearMerchant"), true);
assert.equal(showHarness.populatedMerchant, "gearMerchant");
assert.equal(openCalls, 1);

stats.expeditionsCompleted = 1;
stats.bestDepth = 40;
pacing.refresh({ announce: false });
assert.equal(pacing.isMerchantUnlocked("gearMerchant"), true);

const progressedMoney = createCatalog("moneyMonster");
const progressedGear = createCatalog("gearMerchant");
const progressedBobo = createCatalog("boboMerchant");
assert.deepEqual(progressedMoney.allUpgrades.map(upgrade => upgrade.id), EXPECTED_CATALOGS.moneyMonster);
assert.deepEqual(progressedGear.allUpgrades.map(upgrade => upgrade.id), EXPECTED_CATALOGS.gearMerchant);
assert.deepEqual(progressedBobo.allUpgrades.map(upgrade => upgrade.id), EXPECTED_PRESENTED_CATALOGS.boboMerchant);
assert.equal(
  progressedMoney.allUpgrades.find(upgrade => upgrade.id === "startResourcePrices")
    .availability.available,
  true,
);
assert.equal(
  progressedGear.allUpgrades.find(upgrade => upgrade.id === "bronzePickaxe")
    .availability.available,
  true,
);
assert.equal(
  progressedGear.allUpgrades.find(upgrade => upgrade.id === "steelPickaxe")
    .availability.available,
  false,
);
let rejectedCrossMerchant = 0;
progressedGear._notify = () => { rejectedCrossMerchant += 1; };
const moneyBeforeCrossMerchant = upgradeSystem.getMoney();
progressedGear.purchaseUpgrade("startResourcePrices");
assert.equal(rejectedCrossMerchant, 1);
assert.equal(upgradeSystem.getMoney(), moneyBeforeCrossMerchant);
assert.equal(upgradeSystem.getUpgradeLevel("startResourcePrices"), 0);

const moneyBeforeMarketPurchase = upgradeSystem.getMoney();

const marketPurchase = upgradeSystem.purchaseUpgrade("startResourcePrices");
assert.equal(marketPurchase.success, true);
assert.equal(upgradeSystem.getUpgradeLevel("startResourcePrices"), 1);
assert.equal(upgradeSystem.getMoney(), moneyBeforeMarketPurchase - getUpgradeCost("startResourcePrices", 0));

const pickaxePurchase = upgradeSystem.purchaseUpgrade("bronzePickaxe");
assert.equal(pickaxePurchase.success, true);
assert.equal(upgradeSystem.getUpgradeLevel("bronzePickaxe"), 1);
assert.equal(upgradeSystem.ownedPickaxe, "bronzePickaxe");

stats.bestDepth = 999;
pacing.refresh({ announce: false });
assert.equal(pacing.isMerchantAvailable("magmaMoneyMonster"), false);
assert.equal(showHarness.show("magmaMoneyMonster"), false);
assert.equal(openCalls, 1);

stats.bestDepth = 1000;
pacing.refresh({ announce: false });
assert.equal(pacing.isMerchantAvailable("magmaMoneyMonster"), true);
assert.equal(showHarness.show("magmaMoneyMonster"), true);
assert.equal(showHarness.populatedMerchant, "magmaMoneyMonster");
assert.equal(openCalls, 2);

console.log("Shop catalog integrity contract passed.");
