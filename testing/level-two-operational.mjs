import assert from "node:assert/strict";
import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { SurfaceTunnelDoorSystem } from "../systems/environment/SurfaceTunnelDoorSystem.js";
import { ArcCoreVehicleSystem } from "../systems/vehicles/ArcCoreVehicleSystem.js";
import { resolveArcCoreDigFootprint } from "../systems/vehicles/arcCoreDigFootprint.js";
import { ShopOverlay } from "../ui/overlays/ShopOverlay.js";
import { NPCManager } from "../world/playScene/NPCManager.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import {
  ARC_CORE_CONFIG,
  ARC_CORE_UPGRADE_ID,
  LEVEL_TWO_MERCHANT_ID,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../values/arcCoreConfig.js";
import { CRAFTING_RECIPE_IDS } from "../values/craftingRecipes.js";
import {
  MONEY_MONSTER_RESOURCE_KEYS,
  SECOND_WORLD_RESOURCE_KEYS,
} from "../values/resourceTypes.js";
import { RESOURCE_PRICES_CONFIG } from "../values/resourcePrices.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { SURFACE_TUNNEL_DOOR_CONFIG } from "../values/surfaceTunnelDoorConfig.js";

globalThis.Phaser = {
  Input: { Keyboard: { JustDown: key => key?.justDown === true } },
};

function chainedVisual(extra = {}) {
  return {
    x: 0,
    y: 0,
    visible: true,
    text: "",
    ...extra,
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setText(value) { this.text = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setTint(value) { this.tint = value; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
  };
}

function attachLegacyArcVisualFixture(arc) {
  const sprite = chainedVisual();
  arc.sprite = sprite;
  arc.visuals.enabled = false;
  arc.visuals.legacySprite = sprite;
  return sprite;
}

function createArcScene({ unlocked = true, omegaUnlocked = false, godMode = false } = {}) {
  const player = chainedVisual();
  const bodyLanguage = { enabled: true, setEnabled(value) { this.enabled = value; } };
  const messages = [];
  return {
    config: { tileSize: 64 },
    player,
    playerBodyLanguage: bodyLanguage,
    playerController: { physicsBody: { x: 100, y: 200, w: 20, h: 40 } },
    upgradeSystem: {
      godModeActive: godMode,
      getUpgradeLevel: upgradeId => (
        upgradeId === OMEGA_ARC_CORE_UPGRADE_ID
          ? (omegaUnlocked ? 1 : 0)
          : (unlocked ? 1 : 0)
      ),
    },
    hudSystem: { flashStatus: message => messages.push(message) },
    messages,
  };
}

// Arc ownership, repeated enter/exit, player visibility, follow position, and godmode.
{
  const scene = createArcScene();
  const arc = new ArcCoreVehicleSystem(scene);
  attachLegacyArcVisualFixture(arc);
  arc.prompt = chainedVisual();
  const parking = { tx: ARC_CORE_CONFIG.parking.tileX, ty: ARC_CORE_CONFIG.parking.tileY };
  const vehicleInput = { arcCoreVehicle: { justDown: true } };

  assert.equal(arc.update(parking, vehicleInput), true);
  assert.equal(arc.isActive(), true);
  assert.equal(scene.player.visible, false);
  assert.equal(scene.playerBodyLanguage.enabled, false);

  assert.equal(arc.update(parking, { arcCoreVehicle: { justDown: false } }), false);
  assert.deepEqual([arc.sprite.x, arc.sprite.y], [110, 240]);
  assert.match(arc.prompt.text, /Exit Arc Core/);

  assert.equal(arc.update(parking, vehicleInput), true);
  assert.equal(arc.isActive(), false);
  assert.equal(scene.player.visible, true);
  assert.equal(scene.playerBodyLanguage.enabled, true);

  arc.update(parking, { arcCoreVehicle: { justDown: false } });
  assert.deepEqual(
    [arc.sprite.x, arc.sprite.y],
    [(ARC_CORE_CONFIG.parking.tileX + 0.5) * 64, (ARC_CORE_CONFIG.parking.tileY + 1) * 64],
  );
  assert.equal(arc.update(parking, vehicleInput), true);
  assert.equal(arc.isActive(), true, "Arc must support immediate re-entry after a clean exit");
  assert.equal(arc.resolveDigTargets({ tx: 20, ty: 30 }, "RIGHT").length, 4);
}

{
  const omegaScene = createArcScene({ unlocked: false, omegaUnlocked: true });
  const omegaArc = new ArcCoreVehicleSystem(omegaScene);
  attachLegacyArcVisualFixture(omegaArc);
  omegaArc.prompt = chainedVisual();
  omegaArc.syncOwnership();
  omegaArc.updateVisualPresentation();
  assert.equal(omegaArc.isUnlocked(), true, "Omega ownership must imply base vehicle access");
  assert.equal(omegaArc.isOmegaUnlocked(), true);
  assert.equal(omegaArc.sprite.displayWidth, 64 * ARC_CORE_CONFIG.omega.displaySizeTiles);
  assert.equal(omegaArc.resolveDigTargets({ tx: 20, ty: 30 }, "DOWN").length, 64);
}

{
  const lockedScene = createArcScene({ unlocked: false });
  const lockedArc = new ArcCoreVehicleSystem(lockedScene);
  attachLegacyArcVisualFixture(lockedArc);
  lockedArc.prompt = chainedVisual();
  const parking = { tx: ARC_CORE_CONFIG.parking.tileX, ty: ARC_CORE_CONFIG.parking.tileY };
  assert.equal(lockedArc.update(parking, { arcCoreVehicle: { justDown: true } }), true);
  assert.equal(lockedArc.isActive(), false);
  assert.match(lockedScene.messages.at(-1), /forge this Arc Core with the Molten Money Monster/);

  const godScene = createArcScene({ unlocked: false, godMode: true });
  const godArc = new ArcCoreVehicleSystem(godScene);
  attachLegacyArcVisualFixture(godArc);
  godArc.prompt = chainedVisual();
  assert.equal(godArc.update(parking, { arcCoreVehicle: { justDown: true } }), true);
  assert.equal(godArc.isActive(), true, "godmode must grant immediate Arc access");
  assert.equal(godArc.isOmegaUnlocked(), true, "godmode must grant immediate Omega Arc access");
  assert.equal(godArc.resolveDigTargets({ tx: 20, ty: 30 }, "RIGHT").length, 64);
}

// Godmode and the purchased door upgrade both remove the physical door tiles.
{
  const tiles = new Map();
  let godModeActive = false;
  let tunnelAccessLevel = 0;
  const scene = {
    upgradeSystem: {
      get godModeActive() { return godModeActive; },
      getUpgradeLevel: upgradeId => (upgradeId === "worldTwoTunnelAccess" ? tunnelAccessLevel : 0),
    },
    worldModel: {
      getTileType: (tx, ty) => tiles.get(`${tx},${ty}`),
      setTile: (tx, ty, type) => tiles.set(`${tx},${ty}`, type),
    },
    worldRenderer: { applyTileUpdate() {} },
  };
  const divider = SECOND_WORLD_CONFIG.levelDivider;
  const door = new SurfaceTunnelDoorSystem(scene);

  assert.equal(door.tx, divider.tileX);
  assert.equal(door.tx, SURFACE_TUNNEL_DOOR_CONFIG.tileX);
  assert.equal(door.topTy, divider.gateTopTileY);
  assert.equal(door.heightTiles, divider.gateHeightTiles);
  assert.equal(door.isUnlocked(), false);
  door.syncFromUpgrade();
  assert.equal(tiles.get(`${divider.tileX},${divider.gateTopTileY}`), TILE_TYPES.BEDROCK);

  tunnelAccessLevel = 1;
  assert.equal(door.isUnlocked(), true);
  door.syncFromUpgrade();
  assert.equal(tiles.get(`${divider.tileX},${divider.gateTopTileY}`), TILE_TYPES.AIR);

  tunnelAccessLevel = 0;
  godModeActive = true;
  assert.equal(door.isUnlocked(), true);
  door.syncFromUpgrade();
  assert.equal(tiles.get(`${divider.tileX},${divider.gateTopTileY}`), TILE_TYPES.AIR);
}

// Thunder Strike can breach ordinary bedrock, but never the protected Level 1/2 divider.
{
  const divider = SECOND_WORLD_CONFIG.levelDivider;
  const protectedStartTileY = divider.undergroundStartTileY;
  const tileSize = 64;
  const tiles = new Map();
  for (let ty = protectedStartTileY; ty < protectedStartTileY + 4; ty += 1) {
    tiles.set(`${divider.tileX},${ty}`, TILE_TYPES.BEDROCK);
  }
  const worldModel = {
    depth: 500,
    isDiggable: () => false,
    getTileType: (tx, ty) => tiles.get(`${tx},${ty}`) ?? TILE_TYPES.AIR,
    setTile: (tx, ty, type) => tiles.set(`${tx},${ty}`, type),
  };
  const abilities = Object.create(PlayerAbilities.prototype);
  Object.assign(abilities, {
    _thunderStrikeCharging: true,
    _godMode: true,
    gemPower: 0,
    body: {
      x: divider.tileX * tileSize,
      y: (protectedStartTileY - 1) * tileSize,
      w: tileSize,
      h: 0,
    },
    config: { tileSize },
    worldModel,
    upgradeSystem: { getUpgradeLevel: () => 0 },
    getThunderStrikeCost: () => 0,
    getConstellationStats: () => ({ thunderstrikeDamageMult: 0.10 }),
    _getNormalMiningDamageForTile: () => 1,
  });

  const strike = abilities.executeThunderStrike();
  assert.equal(strike.success, true);
  assert.equal(strike.results.length, 0);
  for (let ty = protectedStartTileY; ty < protectedStartTileY + 4; ty += 1) {
    assert.equal(tiles.get(`${divider.tileX},${ty}`), TILE_TYPES.BEDROCK);
  }
}

// Arc upgrades are craft-only, while granted ownership remains save/load persistent.
{
  const resources = { silver: 360, gold: 540 };
  const digSystem = {
    getResourceTotals: () => ({ ...resources }),
    spendResource(resource, amount) { resources[resource] -= amount; },
  };
  const upgrades = new UpgradeSystem(digSystem);
  upgrades.grantUpgrade("worldTwoTunnelAccess");
  assert.equal(upgrades.purchaseUpgrade(OMEGA_ARC_CORE_UPGRADE_ID).reason, "craft_only");
  assert.equal(upgrades.purchaseUpgrade(ARC_CORE_UPGRADE_ID).reason, "craft_only");
  assert.deepEqual(resources, { silver: 360, gold: 540 });
  assert.equal(upgrades.grantUpgrade(ARC_CORE_UPGRADE_ID).success, true);
  assert.equal(upgrades.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 1);
  assert.equal(upgrades.grantUpgrade(OMEGA_ARC_CORE_UPGRADE_ID).success, true);
  assert.deepEqual(resources, { silver: 360, gold: 540 });
  assert.equal(upgrades.getUpgradeLevel(OMEGA_ARC_CORE_UPGRADE_ID), 1);

  const restored = new UpgradeSystem(digSystem);
  restored.fromJSON(upgrades.toJSON());
  assert.equal(restored.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 1);
  assert.equal(restored.getUpgradeLevel(OMEGA_ARC_CORE_UPGRADE_ID), 1);
}

// Godmode grants both persisted Arc upgrade IDs and refreshes the live vehicle.
{
  const gameplay = {};
  setupGameplayMethods(gameplay);
  const granted = [];
  const resources = {};
  let ownershipSyncs = 0;
  gameplay.activateDevCheat.call({
    digSystem: {
      setResourceTotals(next) { Object.assign(resources, next); },
      getResourceTotals: () => ({ ...resources }),
    },
    upgradeSystem: {
      addMoney() {},
      setGodMode(value) { this.godModeActive = value; },
      grantUpgrade(upgradeId) { granted.push(upgradeId); },
      getMoney: () => 50000,
    },
    playerController: { abilities: { setGodMode() {} } },
    surfaceTunnelDoorSystem: { syncFromUpgrade() {} },
    arcCoreVehicleSystem: { syncOwnership() { ownershipSyncs += 1; } },
    uiResourceBar: { setResources() {}, setMoney() {} },
    uiInventoryPopup: { setResources() {}, setMoney() {} },
    hudSystem: { flashStatus() {} },
  });
  assert.deepEqual(granted, ["worldTwoTunnelAccess", ARC_CORE_UPGRADE_ID, OMEGA_ARC_CORE_UPGRADE_ID]);
  assert.equal(ownershipSyncs, 1);
}

// The visible three-tile merchant prompt and the actual interaction use the same range.
{
  let openedMerchant = null;
  const manager = Object.create(NPCManager.prototype);
  manager.npcDefs = [{ merchantId: "magmaMoneyMonster", tx: 10, ty: 20 }];
  manager.activitySystem = { settleMerchant() {} };
  manager.scene = {
    playerController: { state: { getPlayerTile: () => ({ tx: 13, ty: 20 }) } },
    interactKey: { justDown: true },
    soundSystem: { playNPCVoiceLine() {} },
    shopOverlay: { show: merchant => { openedMerchant = merchant; } },
  };
  manager.checkNPCInteraction();
  assert.equal(openedMerchant, "magmaMoneyMonster");
}

// Both Arc schematics appear in the Forge and are absent from the money-purchase catalog.
{
  const catalog = { _render() {} };
  ShopOverlay.prototype.populateUpgrades.call(catalog, LEVEL_TWO_MERCHANT_ID);
  assert.deepEqual(catalog.allUpgrades, []);
  assert.deepEqual(
    catalog.forgeRecipes.map(recipe => recipe.id),
    [CRAFTING_RECIPE_IDS.ARC_CORE, CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE],
  );
}

// Level 2 merchant opens on FORGE; E acts; SELL mode still supports F stack sales.
{
  const shown = {
    _destroyed: false,
    scene: { setShopOpen(value) { this.open = value; } },
    shell: { show() { this.visible = true; } },
    soundSystem: { playUiSelect() {} },
    _syncMerchantChrome() {},
    populateUpgrades(merchant) { this.populatedMerchant = merchant; },
    _layoutChrome() {},
  };
  ShopOverlay.prototype.show.call(shown, "magmaMoneyMonster");
  assert.equal(shown.moneyMonsterMode, "craft");
  assert.equal(shown.populatedMerchant, "magmaMoneyMonster");
  assert.equal(shown.scene.open, true);

  let eActions = 0;
  let stackActions = 0;
  const keyboardOverlay = {
    isVisible: true,
    _destroyed: false,
    moneyMonsterMode: "sell",
    scene: { interactKey: { justDown: true } },
    keys: {
      escape: {}, tab: {}, up: {}, arrowUp: {}, down: {}, arrowDown: {},
      left: {}, arrowLeft: {}, right: {}, arrowRight: {}, previous: {},
      confirm: {}, space: {}, action: {},
    },
    purchaseSelected: () => { eActions += 1; },
    sellSelectedStack: () => { stackActions += 1; },
  };
  ShopOverlay.prototype.update.call(keyboardOverlay);
  assert.equal(eActions, 1, "the configured interact key must perform the shop action");
  keyboardOverlay.scene.interactKey.justDown = false;
  keyboardOverlay.keys.action.justDown = true;
  ShopOverlay.prototype.update.call(keyboardOverlay);
  assert.equal(stackActions, 1, "F must sell the selected resource stack");
}

function createSellerOverlay(merchantId) {
  const resources = {};
  for (const resource of MONEY_MONSTER_RESOURCE_KEYS) resources[resource] = 2;
  for (const resource of SECOND_WORLD_RESOURCE_KEYS) resources[resource] = 3;
  const digSystem = {
    getResourceTotals: () => ({ ...resources }),
    setResourceTotals(next) { Object.assign(resources, next); },
  };
  const wallet = { money: 0 };
  const overlay = Object.create(ShopOverlay.prototype);
  Object.assign(overlay, {
    currentMerchant: merchantId,
    scene: { digSystem, uiResourceBar: { setResources() {} } },
    upgradeSystem: {
      addMoney(amount) { wallet.money += amount; },
      getUpgradeEffects: () => ({}),
    },
    soundSystem: { playUiConfirm() {} },
    _notify() {},
    _render() {},
  });
  return { overlay, resources, wallet };
}

// Each Money Monster sells only its own world's resources.
{
  const levelOne = createSellerOverlay("moneyMonster");
  levelOne.overlay.sellAllResources();
  for (const resource of MONEY_MONSTER_RESOURCE_KEYS) assert.equal(levelOne.resources[resource], 0);
  for (const resource of SECOND_WORLD_RESOURCE_KEYS) assert.equal(levelOne.resources[resource], 3);

  const levelTwo = createSellerOverlay("magmaMoneyMonster");
  levelTwo.overlay.sellAllResources();
  for (const resource of MONEY_MONSTER_RESOURCE_KEYS) assert.equal(levelTwo.resources[resource], 2);
  for (const resource of SECOND_WORLD_RESOURCE_KEYS) assert.equal(levelTwo.resources[resource], 0);
  const expected = SECOND_WORLD_RESOURCE_KEYS.reduce(
    (total, resource) => total + RESOURCE_PRICES_CONFIG.basePrices[resource] * 3,
    0,
  );
  assert.equal(levelTwo.wallet.money, expected);
}

// Normal Arc mining and Quickslash both resolve four unique cells. Quickslash
// charges once, while Heavy Punch scales only the second row of the 2x2 hit.
{
  const dig = Object.create(DigSystem.prototype);
  dig.lastMineTime = 0;
  dig._getCooldown = () => 100;
  dig._getHeavyPunchFraction = () => 0.5;
  dig.worldModel = {
    inBounds: () => true,
    isDiggable: () => true,
    getTileType: () => TILE_TYPES.DIRT,
  };
  const calls = [];
  dig.tryMine = (entry, _time, _aim, abilities, options) => {
    calls.push({ entry, options });
    if (!options.skipAbilityCost) abilities.spendQuickslashCost();
    return { success: true, destroyed: true };
  };
  let costs = 0;
  const quickslash = {
    isQuickslashActive: () => true,
    canPayQuickslashCost: () => true,
    spendQuickslashCost: () => { costs += 1; },
  };
  const targets = resolveArcCoreDigFootprint({ tx: 20, ty: 30 }, "RIGHT");
  const result = dig.tryMineArea(targets, 1000, "RIGHT", quickslash);
  assert.equal(result.hits.length, 4);
  assert.equal(new Set(result.hits.map(hit => `${hit.tx},${hit.ty}`)).size, 4);
  assert.equal(costs, 1);
  assert.deepEqual(calls.map(call => call.options.damageMultiplier), [1, 1, 1.5, 1.5]);
}

// Pickaxe, strength, level, special-block, mining-speed, and Quickslash
// modifiers remain the same sources used by ordinary player mining.
{
  const dig = Object.create(DigSystem.prototype);
  dig.config = { mineCooldownMs: 1000 };
  dig.upgradeSystem = {
    getEffectiveMineCooldown: base => base * 0.8,
    getUpgradeEffects: () => ({
      pickaxeDamage: 20,
      pickaxeMultipliers: { default: 1.5 },
      digDamageAdditive: 5,
    }),
  };
  dig.playerLevelSystem = {
    getMiningSpeedBonus: () => 0.1,
    getMiningFlatDamageBonus: () => 3,
    getMiningDamageMultiplier: () => 2,
  };
  dig.specialBlockEffectsManager = {
    getMiningSpeedMultiplier: () => 2,
    getDamageMultiplier: () => 1.25,
  };
  dig.comboSystem = { getComboCount: () => 0 };
  assert.equal(dig._getDamage(8, TILE_TYPES.DIRT), 85);
  const ordinaryCooldown = dig._getCooldown();
  const quickCooldown = dig._getCooldown({
    isQuickslashActive: () => true,
    getConstellationStats: () => ({ quickslashSpeedBonus: 0.25 }),
  });
  assert.equal(ordinaryCooldown, 360);
  assert.ok(quickCooldown < ordinaryCooldown);

  const thunder = Object.create(PlayerAbilities.prototype);
  thunder.upgradeSystem = dig.upgradeSystem;
  thunder.playerLevelSystem = dig.playerLevelSystem;
  thunder._getSpecialBlockDamageMultiplier = () => 1.25;
  assert.equal(thunder._getNormalMiningDamageForTile(TILE_TYPES.DIRT), 85);
}

console.log("level-two-operational: ok");
