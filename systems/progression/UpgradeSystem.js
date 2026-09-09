import { UPGRADES, getUpgradeCost, getUpgradeEffect, calculateHeavyPunchEffect } from "../../values/upgradeFormulas.js";
import { UPGRADE_PROGRESSION_VERSION } from "../../values/upgradeDefinitions.js";
import { isCraftOnlyUpgrade } from "../../values/craftingRecipes.js";
import { EARTHQUAKE_SUPPRESSION_UPGRADE } from "../../values/earthquakes.js";
import { resolveFirstFiveMinutesEnabled } from "../../values/firstFiveMinutes.js";
import { resolveDepthEconomyEnabled } from "../../values/resourceEconomy.js";
import { roundResourceCurrency } from "../../values/resourcePrices.js";
import { validateMoney } from "../../values/progressionInvariants.js";
import { GOD_MODE_CONFIG } from "../../values/godMode.js";
import { reportProgressionInvariantFailure } from "../health/progressionInvariantReporter.js";
import { resolveMovementSpeed } from "./ResolvedPlayerStats.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
  isGameplayUpgradeEnabled,
} from "../../values/gameplayDevFlags.js";
import { RUNTIME_GAMEPLAY_CAPABILITIES } from "../../values/gameplayCapabilities.js";
import {
  clampUpgradeLevel,
  normalizeUpgradeLevels,
  resolveUpgradeSaveState,
} from "./upgradeSaveState.js";

export class UpgradeSystem {
  constructor(digSystem = null, playerLevelSystem = null, options = {}) {
    this.firstFiveEnabled = options.firstFiveEnabled
      ?? resolveFirstFiveMinutesEnabled();
    this.depthEconomyEnabled = options.depthEconomyEnabled
      ?? resolveDepthEconomyEnabled();
    this.gameplayCapabilities = options.gameplayCapabilities
      || RUNTIME_GAMEPLAY_CAPABILITIES;
    this.upgradeLevels = {}; // Maps upgradeId -> level
    this.money = 0;
    this.ownedPickaxe = null; // Currently equipped pickaxe
    this.digSystem = digSystem; // Reference to DigSystem for resource tracking
    this.playerLevelSystem = playerLevelSystem; // Reference to PlayerLevelSystem for level requirements
    
    this.initializeUpgrades();
    this._cachedEffects = null;
    this._effectsCacheTime = 0;
    this._CACHE_DURATION_MS = 100; // Refresh every 100ms

    this.godModeActive = false;
    this.progressionStateProvider = null;
    this.upgradeAvailabilityProvider = null;
  }

  initializeUpgrades() {
    for (const upgradeId in UPGRADES) {
      this.upgradeLevels[upgradeId] = 0;
    }
  }

  getMoney() {
    return this.money;
  }

  setMoney(amount) {
    const validation = validateMoney(amount);
    if (!validation.ok) {
      reportProgressionInvariantFailure({ authority: "money", reason: validation.reason, value: amount });
      return this.money;
    }
    this.money = roundResourceCurrency(validation.value);
    return this.money;
  }

  addMoney(amount) {
    const delta = validateMoney(amount);
    const total = validateMoney(this.money + amount);
    if (!delta.ok || !total.ok) {
      const failure = !delta.ok ? delta : total;
      reportProgressionInvariantFailure({ authority: "money", reason: failure.reason, value: amount });
      return this.money;
    }
    this.money = roundResourceCurrency(total.value);
    return this.money;
  }

  spendMoney(amount) {
    const validation = validateMoney(amount);
    if (!validation.ok) {
      reportProgressionInvariantFailure({ authority: "money-spend", reason: validation.reason, value: amount });
      return false;
    }
    if (this.money >= validation.value) {
      this.money = roundResourceCurrency(this.money - validation.value);
      return true;
    }
    return false;
  }

  getUpgradeLevel(upgradeId) {
    if (!upgradeId || typeof upgradeId !== 'string' || !Object.hasOwn(UPGRADES, upgradeId)) {
      console.warn(`Invalid upgrade ID: ${upgradeId}`);
      return 0;
    }
    if (!isGameplayUpgradeEnabled(upgradeId, this.gameplayCapabilities)) return 0;
    return this.upgradeLevels[upgradeId] || 0;
  }

  getUpgradeLevels() {
    return { ...this.upgradeLevels };
  }

  setUpgradeLevels(levels) {
    this.upgradeLevels = normalizeUpgradeLevels(levels);
    this.invalidateEffectsCache();
  }

  setProgressionStateProvider(provider) {
    this.progressionStateProvider = typeof provider === "function" ? provider : null;
  }

  setUpgradeAvailabilityProvider(provider) {
    this.upgradeAvailabilityProvider = typeof provider === "function" ? provider : null;
  }

  isDepthGateAccepted(threshold) {
    const state = this.progressionStateProvider?.();
    if (!state) return false;
    if (typeof state.isDepthGateAccepted === "function") {
      return state.isDepthGateAccepted(threshold) === true;
    }
    const accepted = state.acceptedDepthGates;
    if (accepted instanceof Set) return accepted.has(threshold);
    if (Array.isArray(accepted)) return accepted.includes(threshold);
    return false;
  }

  grantUpgrade(upgradeId, level = 1) {
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) {
      return { success: false, reason: "invalid_upgrade" };
    }
    if (!isGameplayUpgradeEnabled(upgradeId, this.gameplayCapabilities)) {
      return { success: false, reason: "gameplay_mode_disabled" };
    }

    const currentLevel = this.getUpgradeLevel(upgradeId);
    const requestedLevel = upgrade.oneTimePurchase
      ? Math.max(currentLevel, 1)
      : Math.max(currentLevel, Math.floor(level));
    const nextLevel = clampUpgradeLevel(upgradeId, requestedLevel);
    this.upgradeLevels[upgradeId] = nextLevel;
    if (upgrade.category === "pickaxes") {
      this.ownedPickaxe = upgradeId;
    }
    this.invalidateEffectsCache();
    return { success: true, level: nextLevel };
  }

  getOwnedUpgrades() {
    return Object.keys(this.upgradeLevels).filter(id => (
      isGameplayUpgradeEnabled(id, this.gameplayCapabilities) && this.upgradeLevels[id] > 0
    ));
  }

  canPurchaseUpgrade(upgradeId) {
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) {
      return { canPurchase: false, reason: "invalid_upgrade" };
    }
    if (!isGameplayUpgradeEnabled(upgradeId, this.gameplayCapabilities)) {
      return { canPurchase: false, reason: "gameplay_mode_disabled" };
    }
    if (upgrade.firstFiveOnly && !this.firstFiveEnabled) {
      return { canPurchase: false, reason: "feature_disabled" };
    }
    if (upgrade.depthEconomyOnly && !this.depthEconomyEnabled) {
      return { canPurchase: false, reason: "feature_disabled" };
    }
    if (isCraftOnlyUpgrade(upgradeId)) {
      return { canPurchase: false, reason: "craft_only" };
    }

    const availability = this.upgradeAvailabilityProvider?.(upgradeId, upgrade);
    if (availability?.available === false) {
      return {
        canPurchase: false,
        reason: "progression_locked",
        required: availability.feature,
        unlock: availability,
      };
    }

    const currentLevel = this.getUpgradeLevel(upgradeId);
    
    if (upgrade.oneTimePurchase && currentLevel > 0) {
      return { canPurchase: false, reason: "max_level" };
    }
    
    if (upgrade.acquisitionMode === "signal") {
      return { canPurchase: false, reason: "requires_signal_rescue" };
    }

    if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) {
      return { canPurchase: false, reason: "max_level" };
    }
    
    if (upgrade.requiresLevel) {
      const playerLevel = this.playerLevelSystem ? this.playerLevelSystem.level : 1;
      if (playerLevel < upgrade.requiresLevel) {
        return { 
          canPurchase: false, 
          reason: "requires_player_level", 
          required: upgrade.requiresLevel,
          current: playerLevel
        };
      }
    }

    if (upgrade.requiresDepthGateAccepted) {
      const requiredThreshold = upgrade.requiresDepthGateAccepted;
      if (!this.isDepthGateAccepted(requiredThreshold)) {
        return {
          canPurchase: false,
          reason: "requires_depth_gate",
          required: requiredThreshold
        };
      }
    }
    
    if (upgrade.requires) {
      const requiredLevel = this.getUpgradeLevel(upgrade.requires);
      if (requiredLevel === 0) {
        return { canPurchase: false, reason: "requires_upgrade", required: upgrade.requires };
      }
    }

    const goldCost = getUpgradeCost(upgradeId, currentLevel);
    if (this.money < goldCost) {
      return { canPurchase: false, reason: "not_enough_money", needed: goldCost - this.money };
    }
    
    if (upgrade.resources) {
      if (!this.digSystem?.getResourceTotals) {
        return { canPurchase: false, reason: "resource_system_unavailable" };
      }
      const resources = this.digSystem.getResourceTotals();
      for (const [resourceType, amount] of Object.entries(upgrade.resources)) {
        if (!resources[resourceType] || resources[resourceType] < amount) {
          return { 
            canPurchase: false, 
            reason: "not_enough_resources", 
            resourceType,
            needed: amount,
            have: resources[resourceType] || 0
          };
        }
      }
    }
    
    return { canPurchase: true, cost: goldCost };
  }

  purchaseUpgrade(upgradeId) {
    const canPurchase = this.canPurchaseUpgrade(upgradeId);
    if (!canPurchase.canPurchase) {
      return { success: false, ...canPurchase };
    }
    
    const cost = canPurchase.cost;
    const moneyBeforePurchase = this.money;
    if (!this.spendMoney(cost)) {
      return { success: false, reason: "not_enough_money" };
    }
    
    const upgrade = UPGRADES[upgradeId];
    if (upgrade.resources) {
      const resourceResult = this.digSystem?.trySpendResources?.(upgrade.resources);
      if (!resourceResult?.success) {
        this.setMoney(moneyBeforePurchase);
        return {
          success: false,
          reason: resourceResult?.reason || "resource_transaction_unavailable",
          ...(resourceResult || {}),
        };
      }
    }
    
    const currentLevel = this.upgradeLevels[upgradeId] || 0;
    this.upgradeLevels[upgradeId] = currentLevel + 1;
    
    this.invalidateEffectsCache();
    
    if (upgrade.category === "pickaxes") {
      this.ownedPickaxe = upgradeId;
    }
    
    const newLevel = this.upgradeLevels[upgradeId];
    const effect = getUpgradeEffect(upgradeId, newLevel);
    
    return { success: true, level: newLevel, effect, cost };
  }

  getUpgradeEffects() {
    const now = performance.now();
    if (this._cachedEffects && now - this._effectsCacheTime < this._CACHE_DURATION_MS) {
      return this._cachedEffects;
    }

    const effects = {
      gemPowerMax: 0,
      gemPowerDrainReduction: 0,
      gemPowerCostReduction: 0,
      gemPowerRegenIncrease: 0,
      torchDrainReduction: 0,
      torchBonusRadius: 0,
      noTorchMinVisibilityRadius: 0,
      caveEyesPanicReduction: 0,
      gemLevitation: 0,
      levitationSpeed: 0,
      walkSpeed: 0,
      digDamageAdditive: 0,
      digDamageMultiplier: 0,
      mineCooldownReduction: 0,
      pickaxeDamage: 0,
      pickaxeId: this.ownedPickaxe,
      sellAllUnlocked: 0,
      startResourceBonus: 0,
      nextResourceBonus: 0,
      deepResourceBonus: 0,
      marketBonus: 0,
      marketReports: 0,
      depthEconomyEnabled: this.depthEconomyEnabled,
      heavyPunchDamage: 0,
      unlockQuickslash: 0,
      unlockThunderStrike: 0,
      [EARTHQUAKE_SUPPRESSION_UPGRADE.effectType]: 0,
    };

    const pickaxeUpgrades = {};

    for (const upgradeId in this.upgradeLevels) {
      const level = this.upgradeLevels[upgradeId];
      if (level === 0) continue;
      if (!isGameplayUpgradeEnabled(upgradeId, this.gameplayCapabilities)) continue;
      
      const upgrade = UPGRADES[upgradeId];
      // Retired upgrade ids can remain in old saves; they have no live effect.
      if (!upgrade) continue;
      if (upgrade.firstFiveOnly && !this.firstFiveEnabled) continue;
      if (upgrade.depthEconomyOnly && !this.depthEconomyEnabled) continue;
      
      if (upgrade.category === "pickaxes" && upgrade.metalTier) {
        if (!pickaxeUpgrades[upgrade.metalTier]) {
          pickaxeUpgrades[upgrade.metalTier] = {
            baseDamage: upgrade.baseDamage,
            damageMultipliers: upgrade.damageMultipliers
          };
        }
        continue;
      }
      
      const effect = getUpgradeEffect(upgradeId, level);
      
      if (Object.hasOwn(effects, upgrade.effectType)) {
        if (upgrade.effectType === "heavyPunchDamage" && upgrade.softcapLevel) {
          effects[upgrade.effectType] = calculateHeavyPunchEffect(
            upgrade.softcapValue,
            upgrade.maxValue,
            level,
            upgrade.softcapLevel,
            upgrade.maxLevel
          );
        } else {
          effects[upgrade.effectType] += effect;
        }
      }
      if (upgrade.hardcorePanicReductionPerLevel) {
        effects.caveEyesPanicReduction += Math.min(
          upgrade.hardcorePanicReductionMax || 1,
          level * upgrade.hardcorePanicReductionPerLevel,
        );
      }
    }

    let highestPickaxeTier = 0;
    for (const tier in pickaxeUpgrades) {
      if (parseInt(tier) > highestPickaxeTier) {
        highestPickaxeTier = parseInt(tier);
      }
    }
    if (highestPickaxeTier > 0) {
      effects.pickaxeDamage = pickaxeUpgrades[highestPickaxeTier].baseDamage;
      effects.pickaxeMultipliers = pickaxeUpgrades[highestPickaxeTier].damageMultipliers;
    }

    this._cachedEffects = effects;
    this._effectsCacheTime = now;

    return effects;
  }

  getProjectedUpgradeEffects(upgradeId) {
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) return this.getUpgradeEffects();
    if (!isGameplayUpgradeEnabled(upgradeId, this.gameplayCapabilities)) return this.getUpgradeEffects();
    const currentLevel = this.getUpgradeLevel(upgradeId);
    if (upgrade.oneTimePurchase && currentLevel > 0) return this.getUpgradeEffects();
    if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) return this.getUpgradeEffects();

    const projected = new UpgradeSystem(this.digSystem, this.playerLevelSystem, {
      firstFiveEnabled: this.firstFiveEnabled,
      depthEconomyEnabled: this.depthEconomyEnabled,
      gameplayCapabilities: this.gameplayCapabilities,
    });
    projected.setUpgradeLevels({
      ...this.upgradeLevels,
      [upgradeId]: currentLevel + 1,
    });
    projected.ownedPickaxe = upgrade.category === "pickaxes"
      ? upgradeId
      : this.ownedPickaxe;
    return projected.getUpgradeEffects();
  }

  invalidateEffectsCache() {
    this._cachedEffects = null;
    this._effectsCacheTime = 0;
  }

  setGodMode(active) {
    this.godModeActive = active === true
      && isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.GOD_MODE, this.gameplayCapabilities);
    this.invalidateEffectsCache();
  }

  isGodModeActive() {
    return this.godModeActive;
  }

  getEffectiveGemPowerMax(baseMax) {
    const effects = this.getUpgradeEffects();
    return baseMax + effects.gemPowerMax;
  }

  getEffectiveGemPowerDrain(baseDrain) {
    const effects = this.getUpgradeEffects();
    const drainAfterLevitation = Math.max(
      0,
      baseDrain - effects.gemPowerDrainReduction - effects.gemLevitation,
    );
    return this.getEffectiveGemPowerCost(drainAfterLevitation);
  }

  getGemPowerCostMultiplier() {
    const reduction = Math.max(
      0,
      Math.min(0.80, this.getUpgradeEffects().gemPowerCostReduction || 0),
    );
    return 1 - reduction;
  }

  getEffectiveGemPowerCost(baseCost) {
    const cost = Number(baseCost);
    if (!Number.isFinite(cost) || cost <= 0) return 0;
    return cost * this.getGemPowerCostMultiplier();
  }

  getEffectiveGemPowerRegen(baseRegen, depthRatio) {
    const effects = this.getUpgradeEffects();
    const regenIncrease = effects.gemPowerRegenIncrease;
    return baseRegen + regenIncrease;
  }

  getEffectiveFlightSpeed(baseSpeed) {
    const effects = this.getUpgradeEffects();
    // Double the base flight speed once the Gem of Great Power is unlocked.
    // levitationSpeed upgrades then stack additively on top of the doubled base.
    const unlockBonus = this.isGemPowerUnlocked() ? baseSpeed : 0;
    return baseSpeed + unlockBonus + effects.levitationSpeed;
  }

  getEffectiveWalkSpeed(baseSpeed) {
    const effects = this.getUpgradeEffects();
    return resolveMovementSpeed({
      baseSpeed,
      flatBonus: effects.walkSpeed,
      override: this.godModeActive ? GOD_MODE_CONFIG.movementSpeedPxPerSec : null,
    });
  }

  isGemPowerUnlocked() {
    return this.godModeActive || (this.upgradeLevels['gemPowerUnlock'] || 0) > 0;
  }





  isQuickslashUnlocked() {
    return this.godModeActive || (this.upgradeLevels['quickslashAbility'] || 0) > 0;
  }

  isThunderStrikeUnlocked() {
    return this.godModeActive || (this.upgradeLevels['thunderStrikeAbility'] || 0) > 0;
  }

  getEffectiveDigDamageMultiplier(baseDamage) {
    if (this.godModeActive) return GOD_MODE_CONFIG.miningDamage;
    const effects = this.getUpgradeEffects();
    const additiveDamage = effects.digDamageAdditive;
    const pickaxeMultiplier = 1 + effects.pickaxeDamage;
    return (baseDamage + additiveDamage) * pickaxeMultiplier;
  }

  getEffectiveMineCooldown(baseCooldown) {
    if (this.godModeActive) {
      return baseCooldown * (1 - GOD_MODE_CONFIG.mineCooldownReduction);
    }
    const effects = this.getUpgradeEffects();
    const reduction = Math.min(effects.mineCooldownReduction, 0.30); // Max 30% reduction
    return baseCooldown * (1 - reduction);
  }

  toJSON() {
    return {
      upgradeProgressionVersion: UPGRADE_PROGRESSION_VERSION,
      upgradeLevels: this.upgradeLevels,
      money: this.money,
      ownedPickaxe: this.ownedPickaxe
    };
  }

  fromJSON(data) {
    const resolvedSave = resolveUpgradeSaveState(data);
    if (resolvedSave) {
      this.setUpgradeLevels(resolvedSave.upgradeLevels);
    }
    if (typeof data.money === 'number') {
      this.setMoney(data.money);
    }
    if (data.ownedPickaxe) {
      this.ownedPickaxe = data.ownedPickaxe;
    }
  }

  reset() {
    this.initializeUpgrades();
    this.money = 0;
    this.ownedPickaxe = null;
  }
}
