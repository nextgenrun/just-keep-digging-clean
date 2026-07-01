import { TILE_TYPES } from "../../values/tileTypes.js";
import { RESOURCE_PRICES_CONFIG } from "../../values/resourcePrices.js";
import { MINING_CONFIG } from "../../values/miningConfig.js";
import { PLAYER_ABILITIES_CONFIG } from "../../values/playerAbilities.js";
import { COMBO_CONFIG } from "../../values/comboConfig.js";
import { getBlockEffect } from "../../values/specialBlocks.js";
import { getResourceYieldMultiplier, getResourceHpMultiplier } from "../../values/dynamicSoil.js";

const EMPTY_RESOURCES = Object.freeze({
  dirt: 0,
  stone: 0,
  copper: 0,
  darkDirtNormal: 0,
  darkDirtStrong: 0,
  steel: 0,
  iron: 0,
  bronze: 0,
  silver: 0,
  gold: 0,
});

function sanitizeResourceTotals(resources) {
  return {
    dirt: Math.max(0, Number.isFinite(resources?.dirt) ? Math.floor(resources.dirt) : 0),
    stone: Math.max(0, Number.isFinite(resources?.stone) ? Math.floor(resources.stone) : 0),
    copper: Math.max(0, Number.isFinite(resources?.copper) ? Math.floor(resources.copper) : 0),
    darkDirtNormal: Math.max(0, Number.isFinite(resources?.darkDirtNormal) ? Math.floor(resources.darkDirtNormal) : 0),
    darkDirtStrong: Math.max(0, Number.isFinite(resources?.darkDirtStrong) ? Math.floor(resources.darkDirtStrong) : 0),
    steel: Math.max(0, Number.isFinite(resources?.steel) ? Math.floor(resources.steel) : 0),
    iron: Math.max(0, Number.isFinite(resources?.iron) ? Math.floor(resources.iron) : 0),
    bronze: Math.max(0, Number.isFinite(resources?.bronze) ? Math.floor(resources.bronze) : 0),
    silver: Math.max(0, Number.isFinite(resources?.silver) ? Math.floor(resources.silver) : 0),
    gold: Math.max(0, Number.isFinite(resources?.gold) ? Math.floor(resources.gold) : 0),
  };
}

function tileTypeToResource(tileType) {
  switch (tileType) {
    case TILE_TYPES.DIRT:
      return "dirt";
    case TILE_TYPES.DARK_DIRT_NORMAL:
      return "darkDirtNormal";
    case TILE_TYPES.DARK_DIRT_STRONG:
      return "darkDirtStrong";
    case TILE_TYPES.STONE:
      return "stone";
    case TILE_TYPES.COPPER:
      return "copper";
    case TILE_TYPES.STEEL:
      return "steel";
    case TILE_TYPES.IRON:
      return "iron";
    case TILE_TYPES.BRONZE:
      return "bronze";
    case TILE_TYPES.SILVER:
      return "silver";
    case TILE_TYPES.GOLD:
      return "gold";
    default:
      return null;
  }
}

export class DigSystem {
  constructor(worldModel, worldRenderer, config, upgradeSystem = null, playerLevelSystem = null, floatingTextSystem = null, comboSystem = null, specialBlockEffectsManager = null) {
    this.worldModel = worldModel;
    this.worldRenderer = worldRenderer;
    this.config = config;
    this.upgradeSystem = upgradeSystem;
    this.playerLevelSystem = playerLevelSystem;
    this.floatingTextSystem = floatingTextSystem;
    this.comboSystem = comboSystem;
    this.specialBlockEffectsManager = specialBlockEffectsManager;

    this.lastMineTime = -Infinity;
    this.tilesBroken = 0;
    this.resources = { ...EMPTY_RESOURCES };
  }

  setPlayerLevelSystem(playerLevelSystem) {
    this.playerLevelSystem = playerLevelSystem;
  }

  setUpgradeSystem(upgradeSystem) {
    this.upgradeSystem = upgradeSystem;
  }

  setFloatingTextSystem(floatingTextSystem) {
    this.floatingTextSystem = floatingTextSystem;
  }

  _getNativeYield(tileType, tx, ty) {
    const depthTiles = ty - this.config.topAirRows;
    return getResourceYieldMultiplier(tileType, tx, ty, depthTiles, this.config.seed);
  }

  _rollLuckyDrop() {
    let luckyChance = 0;
    if (this.upgradeSystem) luckyChance += this.upgradeSystem.getUpgradeEffects().luckyCollector || 0;
    const levelLucky = this.playerLevelSystem ? this.playerLevelSystem.checkResourceLuck() : false;
    return levelLucky || (luckyChance > 0 && Math.random() < luckyChance);
  }

  _getSkyTileRewardMultiplier(rarity = 0, resourceType = null) {
    const rarities = this.worldModel.config.skyTileRarities;
    const baseMultiplier = rarities?.[rarity]?.multiplier
      || this.worldModel.config.skyTileBonusMultiplier
      || 2;
    const unlocked = this.floatingTextSystem?.getUnlockedConstellations?.() || [];
    const passiveBonus = !!resourceType && unlocked.includes(resourceType);

    return {
      multiplier: baseMultiplier + (passiveBonus ? 1 : 0),
      passiveBonus,
    };
  }

  setComboSystem(comboSystem) {
    this.comboSystem = comboSystem;
  }

  setSpecialBlockEffectsManager(specialBlockEffectsManager) {
    this.specialBlockEffectsManager = specialBlockEffectsManager;
  }

  setCampfireSystem(campfireSystem) {
    this.campfireSystem = campfireSystem;
  }

  _getCooldown(playerAbilities = null) {
    let cooldown = this.config.mineCooldownMs;
    
    if (this.upgradeSystem) {
      cooldown = this.upgradeSystem.getEffectiveMineCooldown(cooldown);
    }
    
    // Apply level-based mining speed bonus
    if (this.playerLevelSystem) {
      let speedBonus = this.playerLevelSystem.getMiningSpeedBonus();
      // Add campfire mining speed bonus
      if (this.campfireSystem) {
        speedBonus += this.campfireSystem.getMiningSpeedBonus();
      }
      cooldown = cooldown * (1 - speedBonus);
    }
    
    // Apply special block mining speed boost (e.g., Speed Block)
    if (this.specialBlockEffectsManager) {
      const speedMult = this.specialBlockEffectsManager.getMiningSpeedMultiplier();
      if (speedMult > 1.0) {
        cooldown = cooldown / speedMult;
      }
    }
    
    // Apply quickslash multiplier if active
    if (playerAbilities && playerAbilities.isQuickslashActive && playerAbilities.isQuickslashActive()) {
      cooldown = cooldown / PLAYER_ABILITIES_CONFIG.quickslashSpeedMultiplier;
      const stats = playerAbilities.getConstellationStats?.() || {};
      const speedBonus = Math.max(0, stats.quickslashSpeedBonus || 0);
      if (speedBonus > 0) {
        cooldown = cooldown / (1 + speedBonus);
      }
    }
    
    return cooldown;
  }

  _getDamage(baseDamage, tileType) {
    let damage = baseDamage;
    
    if (this.upgradeSystem) {
      const effects = this.upgradeSystem.getUpgradeEffects();
      
      const pickaxeDamage = effects.pickaxeDamage || 0;
      const pickaxeMultipliers = effects.pickaxeMultipliers || {};
      
      const tileTypeName = tileTypeToResource(tileType);
      
      const multiplier = pickaxeMultipliers[tileTypeName] || pickaxeMultipliers.default || 1.0;
      
      const strengthBonus = effects.digDamageAdditive || 0;

      const levelFlatBonus = this.playerLevelSystem
        ? this.playerLevelSystem.getMiningFlatDamageBonus()
        : 0;

      if (this.playerLevelSystem) {
        const levelMultiplier = this.playerLevelSystem.getMiningDamageMultiplier();
        if (pickaxeDamage > 0) {
          damage = pickaxeDamage * multiplier * levelMultiplier;
        } else {
          damage = baseDamage * levelMultiplier;
        }
      } else {
        if (pickaxeDamage > 0) {
          damage = pickaxeDamage * multiplier;
        } else {
          damage = baseDamage;
        }
      }

      damage += strengthBonus + levelFlatBonus;
    }
    
    // Apply special block damage boost (e.g., Berserk Block)
    if (this.specialBlockEffectsManager) {
      const dmgMult = this.specialBlockEffectsManager.getDamageMultiplier();
      if (dmgMult > 1.0) {
        damage = damage * dmgMult;
      }
    }
    
    // Guard against NaN propagation — if damage isn't finite, default to baseDamage
    if (!Number.isFinite(damage)) {
      return Math.max(1, baseDamage);
    }
    return Math.max(1, Math.round(damage));
  }

  tryMine(targetTile, nowMs, aimDirection = null, playerAbilities = null) {
    if (nowMs - this.lastMineTime < this._getCooldown(playerAbilities)) {
      return {
        success: false,
        reason: "cooldown",
      };
    }

    this.lastMineTime = nowMs;

    if (!targetTile || !this.worldModel.inBounds(targetTile.tx, targetTile.ty)) {
      return {
        success: false,
        reason: "no-target",
      };
    }

    if (!this.worldModel.isSolid(targetTile.tx, targetTile.ty)) {
      return {
        success: false,
        reason: "no-target",
      };
    }

    if (!this.worldModel.isDiggable(targetTile.tx, targetTile.ty)) {
      // Show hint for GEODE_WALL (requires Heavy Punch upgrade)
      const tileType = this.worldModel.getTileType(targetTile.tx, targetTile.ty);
      if (tileType === TILE_TYPES.GEODE_WALL && this.floatingTextSystem) {
        const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
        const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
        const hasHeavyPunch = this.upgradeSystem && this.upgradeSystem.getUpgradeLevel('heavyPunch') > 0;
        if (hasHeavyPunch) {
          // Player has heavy punch but the target is the wall itself (not behind it)
          // Show hint about aiming through the wall
          this.floatingTextSystem.showFloatingText(
            worldX, worldY - 12,
            "⚡ Heavy Punch through wall!",
            "#ff8800",
            1000,
            16
          );
        } else {
          // Player has NOT unlocked heavy punch — show upgrade hint
          this.floatingTextSystem.showFloatingText(
            worldX, worldY - 12,
            "⚠ Needs Heavy Punch!",
            "#ff4444",
            1500,
            18
          );
        }
      }
      return {
        success: false,
        reason: "blocked",
      };
    }

    const tileType = this.worldModel.getTileType(targetTile.tx, targetTile.ty);

    if (playerAbilities?.isQuickslashActive?.()) {
      if (!playerAbilities.canPayQuickslashCost?.()) {
        return {
          success: false,
          reason: "no-gp",
        };
      }
      playerAbilities.spendQuickslashCost?.();
    }

    // Use baseDamageHard for mineral/ore tiles, baseDamage for dirt/soft tiles
    const HARD_TILE_TYPES = new Set([TILE_TYPES.STONE, TILE_TYPES.COPPER, TILE_TYPES.STEEL, TILE_TYPES.IRON, TILE_TYPES.BRONZE, TILE_TYPES.SILVER, TILE_TYPES.GOLD]);
    const isHardTile = HARD_TILE_TYPES.has(tileType);
    let baseDamage = isHardTile ? (MINING_CONFIG.baseDamageHard || 4) : (MINING_CONFIG.baseDamage || 8);
    let specialBlockEffect = null;
    let specialBlockDestroyed = false;
    let gemPowerRestored = 0;
    let levelsGained = 0;

    let isCriticalHit = false;
    {
      let critChance = 0;
      if (this.upgradeSystem) {
        critChance += this.upgradeSystem.getUpgradeEffects().critChance || 0;
      }
      if (this.playerLevelSystem) {
        critChance += this.playerLevelSystem.calculatedBonuses.criticalHitChance || 0;
      }
      // Guaranteed crit from special blocks (e.g., Crit Block)
      if (this.specialBlockEffectsManager && this.specialBlockEffectsManager.isGuaranteedCritActive()) {
        isCriticalHit = true;
      }
      else if (critChance > 0 && Math.random() < critChance) {
        isCriticalHit = true;
      }
    }

    let damage = this._getDamage(baseDamage, tileType);

    if (playerAbilities?.isQuickslashActive?.()) {
      const stats = playerAbilities.getConstellationStats?.() || {};
      damage += Math.max(0, stats.quickslashFlatDamage || 0);
    }
    
    if (this.comboSystem && typeof this.comboSystem.getMultiplier === 'function') {
      const comboMult = this.comboSystem.getMultiplier();
      if (Number.isFinite(comboMult) && comboMult > 0) {
        damage = Math.floor(damage * comboMult);
      }
    }
    
    if (isCriticalHit) {
      const critMultiplier = this.playerLevelSystem
        ? this.playerLevelSystem.getCriticalHitDamageMultiplier()
        : 2;
      if (Number.isFinite(critMultiplier) && critMultiplier > 0) {
        damage = Math.max(1, Math.floor(damage * critMultiplier));
      }
      // If critMultiplier is invalid, keep damage as-is (already applied)
    }

    const result = this.worldModel.damageTile(targetTile.tx, targetTile.ty, damage);

    if (!result.success) {
      return {
        success: false,
        reason: result.reason ?? "invalid",
      };
    }

    this.worldRenderer.applyTileUpdate(targetTile.tx, targetTile.ty);

    // Handle special block effects and apply returned values to outer scope
    if (!result.wasRubble) {
      const specialBlockResult = this._handleSpecialBlockEffects(result, targetTile);
      ({ specialBlockEffect, specialBlockDestroyed, gemPowerRestored, levelsGained } = specialBlockResult);
    }

    // Increment combo only on tile destruction
    if (result.destroyed && !result.wasRubble && this.comboSystem && typeof this.comboSystem.incrementCombo === 'function') {
      this.comboSystem.incrementCombo(nowMs);
    }

    // Heavy Punch
    let heavyPunchHit = false;
    let heavyPunchTile = null;
    let behindDestroyed = false;
    let behindResourceType = null;
    let behindResourceAmount = 0;
    let behindIsLuckyDrop = false;
    let behindDamage = 0;
      if (aimDirection && this.upgradeSystem) {
      const effects = this.upgradeSystem.getUpgradeEffects();
      if (effects.heavyPunchDamage > 0) {
        const heavyPunchLevel = this.upgradeSystem.getUpgradeLevel('heavyPunch');
        let heavyPunchFraction = 0;
        
        if (heavyPunchLevel <= 10) {
          heavyPunchFraction = heavyPunchLevel * 0.025;
        } else {
          heavyPunchFraction = 0.25 + (heavyPunchLevel - 10) * 0.00167;
        }
        
        behindDamage = Math.max(1, Math.floor(damage * heavyPunchFraction));
        const dirMap = { LEFT: [-1, 0], RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1] };
        const dir = dirMap[aimDirection];
        if (dir) {
          // First behind tile
          let bx = targetTile.tx + dir[0];
          let by = targetTile.ty + dir[1];

          // Check if the behind tile is GEODE_WALL — if so, pass through it and target the next tile
          // This allows heavy punch to reach GEODE_INTERIOR inside geodes
          const behindType = this.worldModel.inBounds(bx, by) ? this.worldModel.getTileType(bx, by) : null;
          if (behindType === TILE_TYPES.GEODE_WALL) {
            // Skip the wall, aim one tile further
            bx += dir[0];
            by += dir[1];
          }

          if (this.worldModel.inBounds(bx, by) && this.worldModel.isDiggable(bx, by)) {
            const behindResult = this.worldModel.damageTile(bx, by, behindDamage);
            if (behindResult.success) {
              this.worldRenderer.applyTileUpdate(bx, by);
              heavyPunchHit = true;
              heavyPunchTile = { tx: bx, ty: by };
              behindDestroyed = behindResult.destroyed;
              if (behindResult.destroyed) {
                this.tilesBroken += 1;
                if (!behindResult.wasRubble) {
                  behindResourceType = tileTypeToResource(behindResult.typeBeforeDamage);
                  if (behindResourceType) {
                    behindResourceAmount = this._getNativeYield(behindResult.typeBeforeDamage, bx, by);
                    if (this._rollLuckyDrop()) {
                      behindResourceAmount += 1;
                      behindIsLuckyDrop = true;
                    }
                    this.resources[behindResourceType] += behindResourceAmount;
                    if (this.playerLevelSystem) {
                      this.playerLevelSystem.gainXP(behindResourceType);
                    }
                  }

                  this._handleSpecialBlockEffects(
                    { destroyed: true, typeBeforeDamage: behindResult.typeBeforeDamage },
                    heavyPunchTile
                  );
                }
              }
            }
          }
        }
      }
    }

    let resourceType = null;
    let resourceAmount = 0;
    let xpGained = 0;
    let levelUp = false;
    let newLevel = null;
    let hasChoice = false;
    let rewards = null;
    let isLuckyDrop = false;
    let isSkyTileBonus = false;
    let skyTileMultiplier = 1;
    let skyTilePassiveBonus = false;

    if (result.destroyed) {
      this.tilesBroken += 1;

      if (!result.wasRubble) {
        let skyTileRarity = 0;
        let rewardTileType = result.typeBeforeDamage;
        if (result.typeBeforeDamage === TILE_TYPES.SKY_TILE) {
          const originalType = this.worldModel.getSkyTileOriginalType(targetTile.tx, targetTile.ty);
          rewardTileType = originalType;
          resourceType = tileTypeToResource(originalType);
          skyTileRarity = this.worldModel.getSkyTileRarity(targetTile.tx, targetTile.ty);
          isSkyTileBonus = true;
        } else {
          resourceType = tileTypeToResource(result.typeBeforeDamage);
        }

        if (resourceType) {
          resourceAmount = this._getNativeYield(rewardTileType, targetTile.tx, targetTile.ty);

          if (isSkyTileBonus) {
            const skyReward = this._getSkyTileRewardMultiplier(skyTileRarity, resourceType);
            skyTileMultiplier = skyReward.multiplier;
            skyTilePassiveBonus = skyReward.passiveBonus;
            resourceAmount *= skyTileMultiplier;
          }

          if (this._rollLuckyDrop()) {
            resourceAmount += 1;
            isLuckyDrop = true;
          }

          this.resources[resourceType] += resourceAmount;

          if (this.playerLevelSystem) {
            const xpMultiplier = isSkyTileBonus ? 2 : 1;
            const xpResult = this.playerLevelSystem.gainXP(resourceType);
            xpGained = xpResult.xpGained * xpMultiplier;
            levelUp = xpResult.levelUp;
            newLevel = xpResult.newLevel;
            hasChoice = xpResult.hasChoice;
            rewards = xpResult.rewards;
          }

          if (isSkyTileBonus && this.floatingTextSystem) {
            const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
            const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
            this.floatingTextSystem.showSkyTileDestruction(
              worldX,
              worldY,
              resourceType,
              skyTileRarity,
              skyTileMultiplier,
              skyTilePassiveBonus
            );
            this.floatingTextSystem.spawnSkyTownStar(
              skyTileRarity,
              worldX,
              worldY,
              resourceType
            );
          }
        }
      }
    }

    return {
      success: true,
      tileType,
      destroyed: result.destroyed,
      hp: result.hp,
      damage,
      resourceType,
      resourceAmount,
      resource: resourceType,
      xpGained,
      levelUp,
      newLevel,
      hasChoice,
      rewards,
      isCriticalHit,
      isLuckyDrop,
      heavyPunchHit,
      heavyPunchTile,
      behindDestroyed,
      behindResourceType,
      behindResourceAmount,
      behindIsLuckyDrop,
      behindDamage,
      specialBlockEffect,
      specialBlockDestroyed,
      gemPowerRestored,
      levelsGained,
      skyTileMultiplier,
      skyTilePassiveBonus,
    };
  }

  getEffectiveCooldownMs() {
    return this._getCooldown();
  }

  getTilesBroken() {
    return this.tilesBroken;
  }

  getResourceTotals() {
    return {
      dirt: this.resources.dirt,
      stone: this.resources.stone,
      copper: this.resources.copper,
      darkDirtNormal: this.resources.darkDirtNormal,
      darkDirtStrong: this.resources.darkDirtStrong,
      steel: this.resources.steel,
      iron: this.resources.iron,
      bronze: this.resources.bronze,
      silver: this.resources.silver,
      gold: this.resources.gold,
    };
  }

  setResourceTotals(resources) {
    this.resources = sanitizeResourceTotals(resources);
  }

  getCopperCollected() {
    return this.resources.copper;
  }

  /**
   * Process rewards for a destroyed tile (used by Thunder Strike and other abilities
   * that bypass tryMine but still need to grant resources, XP, and special block effects).
   * @param {number} tx - Tile X
   * @param {number} ty - Tile Y
   * @param {number} tileType - The tile type that was destroyed
   * @param {number} nowMs - Current timestamp
   * @param {boolean} addComboPoints - Whether to add combo points (default: false to prevent infinite loops)
   * @returns {Object} { resourceType, resourceAmount, xpGained, levelUp, newLevel, hasChoice, rewards, specialBlockEffect }
   */
  processDestroyedTile(tx, ty, tileType, nowMs, addComboPoints = false, wasRubble = false) {
    const result = {
      resourceType: null,
      resourceAmount: 0,
      xpGained: 0,
      levelUp: false,
      newLevel: null,
      hasChoice: false,
      rewards: [],
      specialBlockEffect: null,
    };

    this.tilesBroken += 1;

    if (wasRubble) {
      return result;
    }

    // Grant resource
    let rewardTileType = tileType;
    let resourceType = tileTypeToResource(tileType);
    let skyMultiplier = 1;
    let skyTileRarity = 0;
    let skyTilePassiveBonus = false;
    if (tileType === TILE_TYPES.SKY_TILE) {
      rewardTileType = this.worldModel.getSkyTileOriginalType(tx, ty);
      resourceType = tileTypeToResource(rewardTileType);
      skyTileRarity = this.worldModel.getSkyTileRarity(tx, ty);
      const skyReward = this._getSkyTileRewardMultiplier(skyTileRarity, resourceType);
      skyMultiplier = skyReward.multiplier;
      skyTilePassiveBonus = skyReward.passiveBonus;
    }
    if (resourceType) {
      result.resourceType = resourceType;
      result.resourceAmount = this._getNativeYield(rewardTileType, tx, ty) * skyMultiplier;
      if (this._rollLuckyDrop()) {
        result.resourceAmount += 1;
        result.isLuckyDrop = true;
      }
      this.resources[resourceType] += result.resourceAmount;
    }

    if (tileType === TILE_TYPES.SKY_TILE && resourceType && this.floatingTextSystem) {
      const worldX = tx * this.config.tileSize + this.config.tileSize / 2;
      const worldY = ty * this.config.tileSize + this.config.tileSize / 2;
      this.floatingTextSystem.showSkyTileDestruction(
        worldX,
        worldY,
        resourceType,
        skyTileRarity,
        skyMultiplier,
        skyTilePassiveBonus
      );
      this.floatingTextSystem.spawnSkyTownStar(skyTileRarity, worldX, worldY, resourceType);
      result.skyTileMultiplier = skyMultiplier;
      result.skyTilePassiveBonus = skyTilePassiveBonus;
    }

    // Grant XP
    if (this.playerLevelSystem && resourceType) {
      const xpResult = this.playerLevelSystem.gainXP(resourceType);
      result.xpGained = xpResult.xpGained;
      result.levelUp = xpResult.levelUp;
      result.newLevel = xpResult.newLevel;
      result.hasChoice = xpResult.hasChoice || false;
      result.rewards = xpResult.rewards || [];
    }

    // Handle special block effects (XP block, berserk, speed, combo, etc.)
    if (this.specialBlockEffectsManager) {
      const specialResult = this._handleSpecialBlockEffects(
        { destroyed: true, typeBeforeDamage: tileType },
        { tx, ty }
      );
      result.specialBlockEffect = specialResult.specialBlockEffect;
      if (specialResult.levelsGained) {
        result.levelUp = true;
        result.newLevel = this.playerLevelSystem ? this.playerLevelSystem.level : null;
      }
    }

    // Add combo points only if explicitly requested (prevents infinite combo loops)
    // Thunder Strike and abilities should NOT add combo points to avoid feedback loops
    if (addComboPoints && this.comboSystem) {
      this.comboSystem.addCombo(nowMs);
    }

    return result;
  }

  spendResource(resourceType, amount) {
    if (!this.resources[resourceType] || this.resources[resourceType] < amount) {
      return false;
    }
    this.resources[resourceType] -= amount;
    return true;
  }

  _handleSpecialBlockEffects(result, targetTile) {
    if (!result.destroyed) return {
      specialBlockEffect: null,
      specialBlockDestroyed: false,
      gemPowerRestored: 0,
      levelsGained: 0
    };

    const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
    const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
    
    // Local variables to track special block effects
    let specialBlockEffect = null;
    let specialBlockDestroyed = false;
    let gemPowerRestored = 0;
    let levelsGained = 0;
    
    // Hoist scene reference so all cases share it
    const scene = this.scene || (this.worldRenderer?.scene);

    switch (result.typeBeforeDamage) {
      case TILE_TYPES.GEM_POWER_BLOCK:
        // GEM_POWER_BLOCK restores gem power to maximum
        // Gem power is managed by PlayerAbilities, not PlayerLevelSystem
        // Get scene to access player abilities
        if (scene && scene.playerController && scene.playerController.abilities) {
          const abilities = scene.playerController.abilities;
          const maxGP = abilities.getGemPowerMax();
          const currentGP = abilities.getGemPowerRaw();
          const gpToRestore = maxGP;
          
          // Restore gem power by setting it to max
          abilities.gemPower = maxGP;
          
          specialBlockEffect = 'gemPowerRestored';
          gemPowerRestored = gpToRestore;
        } else {
          console.warn('[DigSystem] GEM_POWER_BLOCK effect requires playerController.abilities');
        }
        specialBlockDestroyed = true;
        if (this.floatingTextSystem) {
          this.floatingTextSystem.showFloatingText(worldX, worldY, '💎 GEM POWER RESTORED!', '#9900FF', 2000);
        }
        break;

      case TILE_TYPES.SPEED_BLOCK:
        if (this.specialBlockEffectsManager && typeof this.specialBlockEffectsManager.applyEffect === 'function') {
          this.specialBlockEffectsManager.applyEffect('speedBlock');
          specialBlockEffect = 'speedBoost';
        } else {
          console.warn('[DigSystem] SPEED_BLOCK effect requires specialBlockEffectsManager with applyEffect method');
        }
        specialBlockDestroyed = true;
        if (this.floatingTextSystem) {
          this.floatingTextSystem.showFloatingText(worldX, worldY, '⚡ SPEED BOOST! +50%', '#FFD700', 2000);
        }
        break;

      case TILE_TYPES.XP_BLOCK:
        if (this.playerLevelSystem && typeof this.playerLevelSystem.gainLevel === 'function') {
          this.playerLevelSystem.gainLevel();
          levelsGained = 1;
          specialBlockEffect = 'levelUp';
        } else {
          console.warn('[DigSystem] XP_BLOCK effect requires playerLevelSystem with gainLevel method');
        }
        specialBlockDestroyed = true;
        if (this.floatingTextSystem) {
          this.floatingTextSystem.showFloatingText(worldX, worldY, '✨ LEVEL UP! +1', '#FFFF00', 2000);
        }
        break;

      case TILE_TYPES.CRIT_BLOCK:
        if (this.specialBlockEffectsManager && typeof this.specialBlockEffectsManager.applyEffect === 'function') {
          this.specialBlockEffectsManager.applyEffect('critBlock');
          specialBlockEffect = 'critBoost';
        } else {
          console.warn('[DigSystem] CRIT_BLOCK effect requires specialBlockEffectsManager with applyEffect method');
        }
        specialBlockDestroyed = true;
        if (this.floatingTextSystem) {
          this.floatingTextSystem.showFloatingText(worldX, worldY, '💥 CRITICAL HITS! 20s', '#FF0000', 2000);
        }
        break;

      case TILE_TYPES.BERSERK_BLOCK:
        if (this.specialBlockEffectsManager && typeof this.specialBlockEffectsManager.applyEffect === 'function') {
          this.specialBlockEffectsManager.applyEffect('berserkBlock');
          specialBlockEffect = 'damageBoost';
        } else {
          console.warn('[DigSystem] BERSERK_BLOCK effect requires specialBlockEffectsManager with applyEffect method');
        }
        specialBlockDestroyed = true;
        if (this.floatingTextSystem) {
          this.floatingTextSystem.showFloatingText(worldX, worldY, '💪 BERSERK! +50% DMG 20s', '#DC143C', 2000);
        }
        break;

      case TILE_TYPES.COMBO_BLOCK:
        if (this.comboSystem && typeof this.comboSystem.addCombo === 'function') {
          const nowMs = scene ? scene.time.now : Date.now();
          this.comboSystem.addCombo(50, nowMs);
          specialBlockEffect = 'comboBoost';
        } else {
          console.warn('[DigSystem] COMBO_BLOCK effect requires comboSystem with addCombo method');
        }
        specialBlockDestroyed = true;
        if (this.floatingTextSystem) {
          this.floatingTextSystem.showFloatingText(worldX, worldY, '🎯 COMBO +50!', '#FF8800', 2000);
        }
        break;

      case TILE_TYPES.LEGEND_BLOCK:
        if (this.playerLevelSystem && typeof this.playerLevelSystem.gainLevel === 'function') {
          // Skip level-up choice dialog — auto-apply +5 levels with no prompts
          for (let i = 0; i < 5; i++) {
            this.playerLevelSystem.gainLevel();
          }
          levelsGained = 5;
          specialBlockEffect = 'legendLevelUp';
        } else {
          console.warn('[DigSystem] LEGEND_BLOCK effect requires playerLevelSystem with gainLevel method');
        }
        specialBlockDestroyed = true;
        if (this.floatingTextSystem) {
          // Bigger, more prominent visual feedback for the king tile
          this.floatingTextSystem.showFloatingText(worldX, worldY - 30, '👑 KING TILE!', '#FFD700', 4000);
          this.floatingTextSystem.showFloatingText(worldX, worldY + 10, '⚡ +5 LEVELS!', '#FFAA00', 3500);
        }
        // Add gold sparkle particles around the area (visual feedback)
        if (scene) {
          scene.shakeSystem?.shake("misc.legendBlock");
          // Crown particle burst: golden circles radiating outward
          const ts = this.config.tileSize;
          for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const dist = 40 + Math.random() * 80;
            const px = worldX + Math.cos(angle) * dist;
            const py = worldY + Math.sin(angle) * dist;
            const particle = scene.add.circle(px, py, 3 + Math.random() * 3, 0xFFD700, 1);
            particle.setDepth(40);
            scene.tweens.add({
              targets: particle,
              alpha: 0,
              scaleX: 0.1,
              scaleY: 0.1,
              y: py - 60 - Math.random() * 40,
              duration: 600 + Math.random() * 400,
              ease: 'Power2.out',
              onComplete: () => particle.destroy(),
            });
          }
        }
        break;
    }

    // Return special block effects
    return {
      specialBlockEffect,
      specialBlockDestroyed,
      gemPowerRestored,
      levelsGained
    };
  }
}
