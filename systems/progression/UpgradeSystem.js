import { UPGRADES, getUpgradeCost, getUpgradeEffect, calculateHeavyPunchEffect } from "../../values/upgradeFormulas.js";
import { GEM_VISION_CONFIG } from "../../values/gemVision.js";

export class UpgradeSystem {
  constructor(digSystem = null, playerLevelSystem = null) {
    this.upgradeLevels = {}; // Maps upgradeId -> level
    this.money = 0;
    this.ownedPickaxe = null; // Currently equipped pickaxe
    this.digSystem = digSystem; // Reference to DigSystem for resource tracking
    this.playerLevelSystem = playerLevelSystem; // Reference to PlayerLevelSystem for level requirements
    
    // Initialize all upgrades at level 0
    this.initializeUpgrades();
    
    // Performance optimization: Cache upgrade effects
    this._cachedEffects = null;
    this._effectsCacheTime = 0;
    this._CACHE_DURATION_MS = 100; // Refresh every 100ms

    // GodMode flag
    this.godModeActive = false;
    this.progressionStateProvider = null;
  }

  initializeUpgrades() {
    for (const upgradeId in UPGRADES) {
      this.upgradeLevels[upgradeId] = 0;
    }
    // Gem of Great Power is given for free at start (removed from shop)
    this.upgradeLevels['gemPowerUnlock'] = 1;
  }

  getMoney() {
    return this.money;
  }

  addMoney(amount) {
    this.money += amount;
    return this.money;
  }

  spendMoney(amount) {
    if (this.money >= amount) {
      this.money -= amount;
      return true;
    }
    return false;
  }

  getUpgradeLevel(upgradeId) {
    // Validate upgradeId exists before accessing
    if (!upgradeId || typeof upgradeId !== 'string' || !Object.hasOwn(UPGRADES, upgradeId)) {
      console.warn(`Invalid upgrade ID: ${upgradeId}`);
      return 0;
    }
    return this.upgradeLevels[upgradeId] || 0;
  }

  getUpgradeLevels() {
    return { ...this.upgradeLevels };
  }

  setUpgradeLevels(levels) {
    const nextLevels = {};
    for (const upgradeId in UPGRADES) {
      const value = levels?.[upgradeId];
      nextLevels[upgradeId] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }
    if (!Number.isFinite(nextLevels.gemPowerUnlock) || nextLevels.gemPowerUnlock <= 0) {
      nextLevels.gemPowerUnlock = 1;
    }
    this.upgradeLevels = nextLevels;
    this.invalidateEffectsCache();
  }

  setProgressionStateProvider(provider) {
    this.progressionStateProvider = typeof provider === "function" ? provider : null;
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

    const currentLevel = this.getUpgradeLevel(upgradeId);
    const nextLevel = upgrade.oneTimePurchase
      ? Math.max(currentLevel, 1)
      : Math.max(currentLevel, Math.floor(level));
    this.upgradeLevels[upgradeId] = nextLevel;
    if (upgrade.category === "pickaxes") {
      this.ownedPickaxe = upgradeId;
    }
    this.invalidateEffectsCache();
    return { success: true, level: nextLevel };
  }

  getOwnedUpgrades() {
    return Object.keys(this.upgradeLevels).filter(id => this.upgradeLevels[id] > 0);
  }

  canPurchaseUpgrade(upgradeId) {
    const currentLevel = this.getUpgradeLevel(upgradeId);
    const upgrade = UPGRADES[upgradeId];
    
    // Check if already maxed out
    if (upgrade.oneTimePurchase && currentLevel > 0) {
      return { canPurchase: false, reason: "max_level" };
    }
    
    if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) {
      return { canPurchase: false, reason: "max_level" };
    }
    
    // BALANCE OVERHAUL: Check player level requirement
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
    
    // Check gold cost
    const goldCost = getUpgradeCost(upgradeId, currentLevel);
    if (this.money < goldCost) {
      return { canPurchase: false, reason: "not_enough_money", needed: goldCost - this.money };
    }
    
    // Check resource costs (only for pickaxes)
    if (upgrade.resources && this.digSystem) {
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
    
    // Check if upgrade requires another upgrade
    if (upgrade.requires) {
      const requiredLevel = this.getUpgradeLevel(upgrade.requires);
      if (requiredLevel === 0) {
        return { canPurchase: false, reason: "requires_upgrade", required: upgrade.requires };
      }
    }
    
    return { canPurchase: true, cost: goldCost };
  }

  purchaseUpgrade(upgradeId) {
    const canPurchase = this.canPurchaseUpgrade(upgradeId);
    if (!canPurchase.canPurchase) {
      return { success: false, reason: canPurchase.reason };
    }
    
    const cost = canPurchase.cost;
    if (!this.spendMoney(cost)) {
      return { success: false, reason: "not_enough_money" };
    }
    
    // Spend resources for pickaxes
    const upgrade = UPGRADES[upgradeId];
    if (upgrade.resources && this.digSystem) {
      for (const [resourceType, amount] of Object.entries(upgrade.resources)) {
        this.digSystem.spendResource(resourceType, amount);
      }
    }
    
    const currentLevel = this.upgradeLevels[upgradeId] || 0;
    this.upgradeLevels[upgradeId] = currentLevel + 1;
    
    // Invalidate cache when upgrade changes
    this.invalidateEffectsCache();
    
    // If it's a pickaxe, set it as equipped
    if (upgrade.category === "pickaxes") {
      this.ownedPickaxe = upgradeId;
    }
    
    const newLevel = this.upgradeLevels[upgradeId];
    const effect = getUpgradeEffect(upgradeId, newLevel);
    
    return { success: true, level: newLevel, effect, cost };
  }

  getUpgradeEffects() {
    // Performance optimization: Cache effects to avoid recalculating every frame
    const now = performance.now();
    if (this._cachedEffects && now - this._effectsCacheTime < this._CACHE_DURATION_MS) {
      return this._cachedEffects;
    }

    const effects = {
      gemPowerMax: 0,
      gemPowerDrainReduction: 0,
      gemPowerRegenIncrease: 0,
      gemLevitation: 0,
      levitationSpeed: 0,
      gemDashUnlocked: 0,
      gemVisionUnlocked: 0,
      gemVisionRange: 0,
      gemVisionDeepSight: 0,
      gemVisionDrainReduction: 0,
      gemDashDistance: 0,
      gemDashCooldownReduction: 0,
      gemDashExplode: 0,
      walkSpeed: 0,
      extraJumps: 0,
      jumpSpeed: 0,
      digDamageAdditive: 0,
      digDamageMultiplier: 0,
      mineCooldownReduction: 0,
      pickaxeDamage: 0,
      pickaxeId: this.ownedPickaxe,
      // Money Monster effects
      sellAllUnlocked: 0,
      startResourceBonus: 0,
      nextResourceBonus: 0,
      marketBonus: 0,
      luckySales: 0,
      marketReports: 0,
      critChance: 0,
      heavyPunchDamage: 0,
      luckyCollector: 0,
    };

    // Track pickaxes by metal tier to only apply the highest one
    const pickaxeUpgrades = {};

    for (const upgradeId in this.upgradeLevels) {
      const level = this.upgradeLevels[upgradeId];
      if (level === 0) continue;
      
      const upgrade = UPGRADES[upgradeId];
      
      // For pickaxes, track them by tier instead of adding
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
        // FIX: Apply custom softcap for heavy punch
        if (upgrade.effectType === "heavyPunchDamage" && upgrade.softcapLevel) {
          effects[upgrade.effectType] = calculateHeavyPunchEffect(
            upgrade.softcapValue,
            upgrade.maxValue,
            level,
            upgrade.softcapLevel
          );
        } else {
          effects[upgrade.effectType] += effect;
        }
      }
    }

    // Apply only the highest-tier pickaxe
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

    // Cache the results
    this._cachedEffects = effects;
    this._effectsCacheTime = now;

    return effects;
  }

  // Invalidate cache when upgrades change (call after purchasing)
  invalidateEffectsCache() {
    this._cachedEffects = null;
    this._effectsCacheTime = 0;
  }

  setGodMode(active) {
    this.godModeActive = active;
    this.invalidateEffectsCache();
  }

  // Get effective values for game systems
  getEffectiveGemPowerMax(baseMax) {
    const effects = this.getUpgradeEffects();
    return baseMax + effects.gemPowerMax;
  }

  getEffectiveGemPowerDrain(baseDrain) {
    const effects = this.getUpgradeEffects();
    const drainReduction = effects.gemPowerDrainReduction + effects.gemLevitation;
    return Math.max(0, baseDrain - drainReduction);
  }

  getEffectiveGemPowerRegen(baseRegen, depthRatio) {
    const effects = this.getUpgradeEffects();
    const regenIncrease = effects.gemPowerRegenIncrease;
    // Apply regen increase to both surface and deep regen
    return baseRegen + regenIncrease;
  }

  getEffectiveLevitationSpeed(baseSpeed) {
    const effects = this.getUpgradeEffects();
    // Double the base climb speed once the Gem of Great Power is unlocked.
    // levitationSpeed upgrades then stack additively on top of the doubled base.
    const unlockBonus = this.isGemPowerUnlocked() ? baseSpeed : 0;
    return baseSpeed + unlockBonus + effects.levitationSpeed;
  }

  getEffectiveWalkSpeed(baseSpeed) {
    if (this.godModeActive) return 2000; // 10x normal
    const effects = this.getUpgradeEffects();
    return baseSpeed + effects.walkSpeed;
  }

  isGemPowerUnlocked() {
    return (this.upgradeLevels['gemPowerUnlock'] || 0) > 0;
  }

  isGemDashUnlocked() {
    return (this.upgradeLevels['gemDashUnlock'] || 0) > 0;
  }

  getEffectiveGemDashDistance(baseDistance) {
    const effects = this.getUpgradeEffects();
    return baseDistance + effects.gemDashDistance;
  }

  getEffectiveGemDashCooldown(baseCooldown) {
    const effects = this.getUpgradeEffects();
    return Math.max(2000, baseCooldown - effects.gemDashCooldownReduction); // Min 2 second cooldown
  }

  isGemDashExplodeUnlocked() {
    return (this.upgradeLevels['gemDashExplode'] || 0) > 0;
  }

  // Gem Vision methods
  isGemVisionUnlocked() {
    return (this.upgradeLevels['gemVisionUnlock'] || 0) > 0;
  }

  isGemVisionDeepSightUnlocked() {
    return (this.upgradeLevels['gemVisionDeepSight'] || 0) > 0;
  }

  getEffectiveGemVisionRange() {
    const effects = this.getUpgradeEffects();
    const baseRange = GEM_VISION_CONFIG.baseRange;
    const rangeBonus = effects.gemVisionRange; // Each level adds 0.1 (10% more zoom)
    const deepSightBonus = effects.gemVisionDeepSight > 0 ? GEM_VISION_CONFIG.deepSightBonus : 0;
    return Math.max(0.15, baseRange - rangeBonus - deepSightBonus); // Smaller value = more zoom out
  }

  getEffectiveGemVisionDrain() {
    const effects = this.getUpgradeEffects();
    const baseDrain = GEM_VISION_CONFIG.baseDrain;
    const drainReduction = effects.gemVisionDrainReduction;
    const deepSightBonus = effects.gemVisionDeepSight > 0 ? GEM_VISION_CONFIG.deepSightLevelDrainReduction : 0;
    
    // BALANCE OVERHAUL: Add range scaling cost - higher range = more drain
    const rangeLevel = this.getUpgradeLevel('gemVisionRange');
    const rangeCostMultiplier = 1 + (rangeLevel * 0.15); // +15% drain per vision range level
    
    return Math.max(
      GEM_VISION_CONFIG.minDrain, 
      (baseDrain - drainReduction - deepSightBonus) * rangeCostMultiplier
    );
  }

  getEffectiveExtraJumps(baseJumps) {
    const effects = this.getUpgradeEffects();
    return baseJumps + effects.extraJumps;
  }

  getEffectiveJumpSpeed(baseJumpSpeed) {
    const effects = this.getUpgradeEffects();
    return baseJumpSpeed + effects.jumpSpeed;
  }

  getEffectiveDigDamageMultiplier(baseDamage) {
    if (this.godModeActive) return 99999;
    const effects = this.getUpgradeEffects();
    // Strength adds damage additively (+2 per level)
    // Pickaxe multiplies damage multiplicatively
    const additiveDamage = effects.digDamageAdditive;
    const pickaxeMultiplier = 1 + effects.pickaxeDamage;
    return (baseDamage + additiveDamage) * pickaxeMultiplier;
  }

  getEffectiveMineCooldown(baseCooldown) {
    if (this.godModeActive) return baseCooldown * 0.25; // 75% attack speed
    const effects = this.getUpgradeEffects();
    const reduction = Math.min(effects.mineCooldownReduction, 0.30); // Max 30% reduction
    return baseCooldown * (1 - reduction);
  }

  // Serialization for save system
  toJSON() {
    return {
      upgradeLevels: this.upgradeLevels,
      money: this.money,
      ownedPickaxe: this.ownedPickaxe
    };
  }

  fromJSON(data) {
    if (data.upgradeLevels) {
      this.setUpgradeLevels(data.upgradeLevels);
    }
    if (typeof data.money === 'number') {
      this.money = data.money;
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
