import { TILE_TYPES, isUnbreakableMiningSurface } from "../../values/tileTypes.js";
import { MINING_CONFIG } from "../../values/miningConfig.js";
import { resolveFirstFiveMinutesEnabled } from "../../values/firstFiveMinutes.js";
import { PLAYER_ABILITIES_CONFIG } from "../../values/playerAbilities.js";
import { COMBO_CONFIG } from "../../values/comboConfig.js";
import {
  getBlockEffect,
  getGemPowerBlockTier,
} from "../../values/specialBlocks.js";
import {
  CONSTELLATION_MATCHING_STAR_YIELD_BONUS,
} from "../../values/constellationBuffs.js";
import {
  getResourceRarityDescriptor,
  getResourceYieldMultiplier,
} from "../../values/dynamicSoil.js";
import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";
import { RELIC_DISCOVERY_FX_CONFIG } from "../../values/relicDiscoveryFxConfig.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { getResourceEconomyConfigHealth } from "../../values/resourceEconomy.js";
import { resolveDepthMilestoneEconomyBonuses } from "./depthEconomyBonuses.js";
import {
  capFinalResourceYield,
  isSecondWorldResourceEconomy,
  resolveDepthAdjustedResourceYield,
} from "./resourceDepthYield.js";
import {
  HARD_RESOURCE_TILE_TYPES,
  RESOURCE_KEYS,
  createZeroResourceTotals,
  sanitizeResourceTotals,
  tileTypeToResource,
} from "../../values/resourceTypes.js";
import { validateCooldownMs } from "../../values/progressionInvariants.js";
import { reportProgressionInvariantFailure } from "../health/progressionInvariantReporter.js";
import { grantResourceTotal, replaceResourceTotals } from "./ResourceTotalAuthority.js";

const RESOURCE_KEY_SET = new Set(RESOURCE_KEYS);

export class DigSystem {
  constructor(worldModel, worldRenderer, config, upgradeSystem = null, playerLevelSystem = null, floatingTextSystem = null, comboSystem = null, specialBlockEffectsManager = null) {
    this.worldModel = worldModel;
    this.worldRenderer = worldRenderer;
    this.config = config;
    this.firstFiveEnabled = config?.firstFiveEnabled
      ?? resolveFirstFiveMinutesEnabled();
    this.upgradeSystem = upgradeSystem;
    this.playerLevelSystem = playerLevelSystem;
    this.floatingTextSystem = floatingTextSystem;
    this.comboSystem = comboSystem;
    this.specialBlockEffectsManager = specialBlockEffectsManager;
    this.ancientRelicSystem = null;
    this.relicDiscoveryFxSystem = null;
    this.retentionProgressSystem = null;
    this.depthMilestoneBonusProvider = null;

    this.lastMineTime = -Infinity;
    this.tilesBroken = 0;
    this.resources = createZeroResourceTotals();
    this._celestialTransactions = new Map();
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

  setAncientRelicSystem(ancientRelicSystem) {
    this.ancientRelicSystem = ancientRelicSystem;
  }

  setRelicDiscoveryFxSystem(relicDiscoveryFxSystem) {
    this.relicDiscoveryFxSystem = relicDiscoveryFxSystem;
  }

  setRetentionProgressSystem(retentionProgressSystem) {
    this.retentionProgressSystem = retentionProgressSystem;
  }

  setDepthMilestoneBonusProvider(provider) {
    this.depthMilestoneBonusProvider = typeof provider === "function"
      ? provider
      : null;
  }

  _isDepthEconomyEnabled() {
    return this.config?.resourceEconomyEnabled !== false;
  }

  _getDepthMilestoneBonuses() {
    return resolveDepthMilestoneEconomyBonuses(
      this.depthMilestoneBonusProvider?.(),
      this._isDepthEconomyEnabled(),
    );
  }

  _getNativeYield(tileType, tx, ty) {
    const depthTiles = ty - (this.config?.topAirRows || 0);
    const enabled = this._isDepthEconomyEnabled();
    const nativeYield = getResourceYieldMultiplier(
      tileType,
      tx,
      ty,
      depthTiles,
      this.config?.seed || 0,
      enabled,
    );
    return resolveDepthAdjustedResourceYield({
      nativeYield,
      depthTiles,
      secondWorld: isSecondWorldResourceEconomy(this.config, tx),
      tileX: tx,
      tileY: ty,
      seed: this.config?.seed || 0,
      enabled,
    });
  }

  _getNativeRarity(tileType, tx, ty) {
    const depthTiles = ty - (this.config?.topAirRows || 0);
    return getResourceRarityDescriptor(
      tileType,
      tx,
      ty,
      depthTiles,
      this.config?.seed || 0,
      this._isDepthEconomyEnabled(),
    );
  }

  _capResourceYield(value) {
    return capFinalResourceYield(value, this._isDepthEconomyEnabled());
  }

  getDepthEconomyHealthSnapshot() {
    const enabled = this._isDepthEconomyEnabled();
    const configHealth = getResourceEconomyConfigHealth();
    const milestoneProviderAttached = (
      typeof this.depthMilestoneBonusProvider === "function"
    );
    const levelTwoBoundaryReady = Number.isInteger(this.config?.levelTwoLeftTile);
    return Object.freeze({
      ...configHealth,
      enabled,
      ready: !enabled || (
        configHealth.ready
        && milestoneProviderAttached
        && levelTwoBoundaryReady
      ),
      milestoneProviderAttached,
      levelTwoBoundaryReady,
    });
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
      multiplier: baseMultiplier + (
        passiveBonus ? CONSTELLATION_MATCHING_STAR_YIELD_BONUS : 0
      ),
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

  /**
   * Authoritative Celestial Engine tile transaction.
   * Visual engines can request damage, but only this bridge may mutate and reward.
   */
  applyCelestialDamage({
    activationId,
    engineId,
    hitId,
    tx,
    ty,
    nowMs = Date.now(),
  } = {}) {
    const safeActivationId = typeof activationId === "string" ? activationId : "";
    const safeHitId = typeof hitId === "string" ? hitId : "";
    if (
      !safeActivationId
      || !safeHitId
      || safeActivationId.length > CELESTIAL_ENGINE_CONFIG.damage.maxActivationIdLength
      || !Number.isInteger(tx)
      || !Number.isInteger(ty)
    ) {
      return { success: false, reason: "invalid-celestial-transaction" };
    }

    const transactionKey = `${safeActivationId}|${safeHitId}`;
    if (this._celestialTransactions.has(transactionKey)) {
      return { success: false, reason: "duplicate-celestial-transaction", duplicate: true };
    }
    this._rememberCelestialTransaction(transactionKey, { engineId, tx, ty, nowMs });

    if (!this.worldModel.inBounds(tx, ty)) {
      return { success: false, reason: "out-of-bounds", blocked: true };
    }

    const tile = this.worldModel.getTile(tx, ty);
    if (!tile.solid) return { success: false, reason: "air" };
    if (!tile.diggable) {
      return {
        success: false,
        reason: "protected",
        blocked: true,
        protected: true,
        tileType: tile.type,
      };
    }

    const damage = Math.min(
      CELESTIAL_ENGINE_CONFIG.damage.maxPerHit,
      Math.max(1, Math.ceil(tile.hp)),
    );
    const damageResult = this.worldModel.damageTile(tx, ty, damage);
    if (!damageResult.success) {
      return { success: false, reason: damageResult.reason || "damage-rejected" };
    }

    this.worldRenderer.applyTileUpdate(tx, ty);
    const reward = damageResult.destroyed
      ? this.processDestroyedTile(
          tx,
          ty,
          damageResult.typeBeforeDamage,
          nowMs,
          false,
          damageResult.wasRubble,
        )
      : null;

    return {
      success: true,
      engineId,
      tx,
      ty,
      damage,
      destroyed: Boolean(damageResult.destroyed),
      hp: damageResult.hp,
      hpBefore: damageResult.hpBefore,
      maxHp: damageResult.maxHp,
      overkillDamage: damageResult.overkillDamage || 0,
      tileType: damageResult.typeBeforeDamage,
      wasRubble: Boolean(damageResult.wasRubble),
      reward,
    };
  }

  _rememberCelestialTransaction(key, detail) {
    this._celestialTransactions.set(key, detail);
    while (
      this._celestialTransactions.size
      > CELESTIAL_ENGINE_CONFIG.damage.rememberedTransactions
    ) {
      const oldest = this._celestialTransactions.keys().next().value;
      this._celestialTransactions.delete(oldest);
    }
  }

  _awardAncientRelics(tileType, tx, ty) {
    if (tileType !== TILE_TYPES.ANCIENT_RELIC_CACHE || !this.ancientRelicSystem) return 0;

    const gained = this.ancientRelicSystem.add(ANCIENT_RELIC_CONFIG.cache.relicsPerCache);
    if (gained <= 0) return 0;

    const worldX = tx * this.config.tileSize + this.config.tileSize / 2;
    const worldY = ty * this.config.tileSize + this.config.tileSize / 2;
    const finalRelicCount = this.ancientRelicSystem.getCount();
    try {
      this.relicDiscoveryFxSystem?.playDiscovery?.({
        anchor: { x: worldX, y: worldY },
        iconAsset: ASSET_KEYS.ui.heavenblocks.ancientRelicToken,
        relicCount: finalRelicCount,
      });
    } catch (error) {
      const health = RELIC_DISCOVERY_FX_CONFIG.health;
      globalThis.__jkdHealth?.captureSystemFinding?.({
        key: health.presentationFailureCode,
        code: health.presentationFailureCode,
        severity: health.presentationFailureSeverity,
        message: "Ancient Relic awarded, but its discovery presentation failed",
        context: {
          tx,
          ty,
          relicCount: finalRelicCount,
          error: error?.message || String(error),
        },
      });
    }
    this.floatingTextSystem?.tryUnlockEligibleConstellations?.();
    const purpose = this.floatingTextSystem?.getRelicPurposeSummary?.(
      finalRelicCount
    );
    this.worldRenderer?.scene?.hudSystem?.flashStatus?.(
      `${ANCIENT_RELIC_CONFIG.displayName} found  •  ${purpose || `${finalRelicCount} total`}`,
      ANCIENT_RELIC_CONFIG.color,
      ANCIENT_RELIC_CONFIG.cache.statusDurationMs
    );
    return gained;
  }

  _getCooldown(playerAbilities = null) {
    let cooldown = this.config.mineCooldownMs;
    
    if (this.upgradeSystem) {
      cooldown = this.upgradeSystem.getEffectiveMineCooldown(cooldown);
    }
    
    if (this.playerLevelSystem) {
      const speedBonus = this.playerLevelSystem.getMiningSpeedBonus();
      cooldown = cooldown * (1 - speedBonus);
    }
    
    const milestoneBonuses = this._getDepthMilestoneBonuses();
    if (milestoneBonuses.miningSpeedReduction > 0) {
      cooldown *= 1 - milestoneBonuses.miningSpeedReduction;
    }

    if (this.specialBlockEffectsManager) {
      const speedMult = this.specialBlockEffectsManager.getMiningSpeedMultiplier();
      if (speedMult > 1.0) {
        cooldown = cooldown / speedMult;
      }
    }
    
    if (playerAbilities && playerAbilities.isQuickslashActive && playerAbilities.isQuickslashActive()) {
      cooldown = cooldown / PLAYER_ABILITIES_CONFIG.quickslashSpeedMultiplier;
      const stats = playerAbilities.getConstellationStats?.() || {};
      const speedBonus = Math.max(0, stats.quickslashSpeedBonus || 0);
      if (speedBonus > 0) {
        cooldown = cooldown / (1 + speedBonus);
      }
    }

    const momentum = COMBO_CONFIG.momentum;
    if (momentum?.enabled && this.comboSystem && typeof this.comboSystem.getComboCount === "function") {
      const combo = this.comboSystem.getComboCount();
      if (combo >= momentum.minCombo) {
        const ramp = Math.min(1, (combo - momentum.minCombo) / Math.max(1, momentum.fullEffectAtCombo - momentum.minCombo));
        cooldown = cooldown * (1 - momentum.maxCooldownReduction * ramp);
      }
    }

    const validation = validateCooldownMs(cooldown);
    if (validation.ok) return validation.value;
    reportProgressionInvariantFailure({
      authority: "mining-cooldown",
      reason: validation.reason,
      value: cooldown,
    });
    return validateCooldownMs(this.config.mineCooldownMs).ok
      ? this.config.mineCooldownMs
      : MINING_CONFIG.mineCooldownMs;
  }

  _getDamage(baseDamage, tileType, effectsOverride = null) {
    let damage = baseDamage;
    
    if (this.upgradeSystem) {
      const effects = effectsOverride || this.upgradeSystem.getUpgradeEffects();
      
      const pickaxeDamage = effects.pickaxeDamage || 0;
      const pickaxeMultipliers = effects.pickaxeMultipliers || {};
      
      const tileTypeName = tileTypeToResource(tileType);
      
      const multiplier = pickaxeMultipliers[tileTypeName] || pickaxeMultipliers.default || 1.0;
      
      const strengthBonus = effects.digDamageAdditive || 0;

      const levelFlatBonus = this.playerLevelSystem
        ? this.playerLevelSystem.getMiningFlatDamageBonus()
        : 0;
      const levelMultiplier = this.playerLevelSystem
        ? this.playerLevelSystem.getMiningDamageMultiplier()
        : 1;
      const baselineDamage = baseDamage * levelMultiplier;
      const pickaxeResult = pickaxeDamage * multiplier * levelMultiplier;
      damage = pickaxeDamage > 0
        ? (
          this.firstFiveEnabled
            ? Math.max(baselineDamage, pickaxeResult)
            : pickaxeResult
        )
        : baselineDamage;

      damage += strengthBonus + levelFlatBonus;
    }
    
    if (this.specialBlockEffectsManager) {
      const dmgMult = this.specialBlockEffectsManager.getDamageMultiplier();
      if (dmgMult > 1.0) {
        damage = damage * dmgMult;
      }
    }
    
    if (!Number.isFinite(damage)) {
      return Math.max(1, baseDamage);
    }
    return Math.max(1, Math.round(damage));
  }

  getDamagePreview(tileType, effectsOverride = null) {
    return this._getDamage(this._getBaseDamageForTile(tileType), tileType, effectsOverride);
  }

  getHitsToBreakPreview(tileType, tx, ty, effectsOverride = null) {
    const damage = this.getDamagePreview(tileType, effectsOverride);
    const hp = this.worldModel.getTileMaxHp(tx, ty, tileType);
    return {
      damage,
      hp,
      hits: Math.max(1, Math.ceil(hp / Math.max(1, damage))),
    };
  }

  getHeavyPunchPreview(targetTile, aimDirection) {
    const fraction = this._getHeavyPunchFraction();
    if (!targetTile || fraction <= 0) return null;
    const direction = {
      LEFT: [-1, 0],
      RIGHT: [1, 0],
      UP: [0, -1],
      DOWN: [0, 1],
    }[aimDirection];
    if (!direction) return null;
    const tileType = this.worldModel.getTileType(targetTile.tx, targetTile.ty);
    const damage = this.getDamagePreview(tileType);
    let tx = targetTile.tx + direction[0];
    let ty = targetTile.ty + direction[1];
    if (this.worldModel.getTileType(tx, ty) === TILE_TYPES.GEODE_WALL) {
      tx += direction[0];
      ty += direction[1];
    }
    if (!this.worldModel.inBounds(tx, ty) || !this.worldModel.isDiggable(tx, ty)) return null;
    return {
      tx,
      ty,
      damage: Math.max(1, Math.floor(damage * fraction)),
      fraction,
    };
  }

  _getBaseDamageForTile(tileType) {
    return HARD_RESOURCE_TILE_TYPES.has(tileType)
      ? (MINING_CONFIG.baseDamageHard || 4)
      : (MINING_CONFIG.baseDamage || 8);
  }

  _getHeavyPunchFraction() {
    if (!this.upgradeSystem) return 0;
    const effects = this.upgradeSystem.getUpgradeEffects?.() || {};
    return Number.isFinite(effects.heavyPunchDamage)
      ? Math.max(0, Math.min(1, effects.heavyPunchDamage))
      : 0;
  }

  _tryApplyHeavyPunchBehind(targetTile, damage, aimDirection, options = {}) {
    const heavyPunchResult = {
      heavyPunchHit: false,
      heavyPunchTile: null,
      behindDestroyed: false,
      behindResourceType: null,
      behindResourceAmount: 0,
      behindIsLuckyDrop: false,
      behindAncientRelics: 0,
      behindDamage: 0,
      behindMaxHp: 0,
      behindOverkillDamage: 0,
      behindRarityId: "normal",
      behindRarityMultiplier: 1,
      behindGemPowerRestored: 0,
      behindGemPowerTierId: null,
      behindGemPowerRestoreCapacity: 0,
    };

    if (!targetTile || !aimDirection) return heavyPunchResult;

    const heavyPunchFraction = this._getHeavyPunchFraction();
    if (heavyPunchFraction <= 0) return heavyPunchResult;

    const dirMap = { LEFT: [-1, 0], RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1] };
    const dir = dirMap[aimDirection];
    if (!dir) return heavyPunchResult;

    let bx = targetTile.tx + dir[0];
    let by = targetTile.ty + dir[1];

    if (options.skipGeodeWallBehind !== false) {
      const behindType = this.worldModel.inBounds(bx, by) ? this.worldModel.getTileType(bx, by) : null;
      if (behindType === TILE_TYPES.GEODE_WALL) {
        bx += dir[0];
        by += dir[1];
      }
    }

    if (!this.worldModel.inBounds(bx, by) || !this.worldModel.isDiggable(bx, by)) {
      return heavyPunchResult;
    }

    heavyPunchResult.behindDamage = Math.max(1, Math.floor(damage * heavyPunchFraction));
    const behindResult = this.worldModel.damageTile(bx, by, heavyPunchResult.behindDamage);
    if (!behindResult.success) return heavyPunchResult;

    this.worldRenderer.applyTileUpdate(bx, by);
    heavyPunchResult.heavyPunchHit = true;
    heavyPunchResult.heavyPunchTile = { tx: bx, ty: by };
    heavyPunchResult.behindDestroyed = behindResult.destroyed;
    heavyPunchResult.behindMaxHp = behindResult.maxHp || 0;
    heavyPunchResult.behindOverkillDamage = behindResult.overkillDamage || 0;

    if (behindResult.destroyed) {
      this.tilesBroken += 1;
      if (!behindResult.wasRubble) {
        heavyPunchResult.behindAncientRelics = this._awardAncientRelics(behindResult.typeBeforeDamage, bx, by);
        heavyPunchResult.behindResourceType = tileTypeToResource(behindResult.typeBeforeDamage);
        if (heavyPunchResult.behindResourceType) {
          const rarity = this._getNativeRarity(behindResult.typeBeforeDamage, bx, by);
          heavyPunchResult.behindRarityId = rarity.id;
          heavyPunchResult.behindRarityMultiplier = rarity.multiplier;
          heavyPunchResult.behindResourceAmount = this._getNativeYield(behindResult.typeBeforeDamage, bx, by);
          if (this._rollLuckyDrop()) {
            heavyPunchResult.behindResourceAmount += 1;
            heavyPunchResult.behindIsLuckyDrop = true;
          }
          heavyPunchResult.behindResourceAmount = this._capResourceYield(
            heavyPunchResult.behindResourceAmount,
          );
          heavyPunchResult.behindResourceAmount = grantResourceTotal(
            this.resources,
            heavyPunchResult.behindResourceType,
            heavyPunchResult.behindResourceAmount,
          );
          if (this.playerLevelSystem) {
            this.playerLevelSystem.gainXP(heavyPunchResult.behindResourceType);
          }
        }

        const behindSpecialResult = this._handleSpecialBlockEffects(
          { destroyed: true, typeBeforeDamage: behindResult.typeBeforeDamage },
          heavyPunchResult.heavyPunchTile
        );
        heavyPunchResult.behindGemPowerRestored = behindSpecialResult.gemPowerRestored;
        heavyPunchResult.behindGemPowerTierId = behindSpecialResult.gemPowerTierId;
        heavyPunchResult.behindGemPowerRestoreCapacity = behindSpecialResult.gemPowerRestoreCapacity;
      }
      this.retentionProgressSystem?.recordMiningResult?.({
        success: true,
        destroyed: true,
        resourceType: heavyPunchResult.behindResourceType,
        resourceAmount: heavyPunchResult.behindResourceAmount,
        isLuckyDrop: heavyPunchResult.behindIsLuckyDrop,
        maxHp: heavyPunchResult.behindMaxHp,
        overkillDamage: heavyPunchResult.behindOverkillDamage,
        ancientRelics: heavyPunchResult.behindAncientRelics,
      });
    }

    return heavyPunchResult;
  }

  tryMine(targetTile, nowMs, aimDirection = null, playerAbilities = null, options = {}) {
    const cooldownTimeMs = Number.isFinite(options.actionStartedAtMs)
      ? options.actionStartedAtMs
      : nowMs;
    if (!options.ignoreCooldown && !this.isMineCooldownReady(cooldownTimeMs, playerAbilities)) {
      return {
        success: false,
        reason: "cooldown",
      };
    }
    if (!options.ignoreCooldown) this.lastMineTime = cooldownTimeMs;

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

    const tileType = this.worldModel.getTileType(targetTile.tx, targetTile.ty);

    if (!this.worldModel.isDiggable(targetTile.tx, targetTile.ty)) {
      if (tileType === TILE_TYPES.GEODE_WALL) {
        const hasHeavyPunch = this._getHeavyPunchFraction() > 0;
        if (hasHeavyPunch && !options.skipHeavyPunch) {
          const baseDamage = this._getBaseDamageForTile(tileType);
          const damage = this._getDamage(baseDamage, tileType);
          const heavyPunchResult = this._tryApplyHeavyPunchBehind(targetTile, damage, aimDirection, {
            skipGeodeWallBehind: false,
          });

          if (heavyPunchResult.heavyPunchHit) {
            return {
              success: true,
              tileType,
              typeBeforeDamage: tileType,
              destroyed: false,
              hp: null,
              damage,
              resourceType: null,
              resourceAmount: 0,
              resource: null,
              xpGained: 0,
              levelUp: false,
              newLevel: null,
              hasChoice: false,
              rewards: null,
              isCriticalHit: false,
              isLuckyDrop: false,
              frontDamageApplied: false,
              ...heavyPunchResult,
              specialBlockEffect: null,
              specialBlockDestroyed: false,
              gemPowerRestored: 0,
              gemPowerTierId: null,
              gemPowerRestoreCapacity: 0,
              levelsGained: 0,
              skyTileMultiplier: 1,
              skyTilePassiveBonus: false,
            };
          }

        }
      }
      return {
        success: false,
        reason: "blocked",
        tileType,
        typeBeforeDamage: tileType,
        damage: 0,
        blockedByBedrock: isUnbreakableMiningSurface(tileType),
      };
    }

    if (!options.skipAbilityCost && playerAbilities?.isQuickslashActive?.()) {
      if (!playerAbilities.canPayQuickslashCost?.()) {
        return {
          success: false,
          reason: "no-gp",
        };
      }
      playerAbilities.spendQuickslashCost?.();
    }

    let baseDamage = this._getBaseDamageForTile(tileType);
    let specialBlockEffect = null;
    let specialBlockDestroyed = false;
    let gemPowerRestored = 0;
    let gemPowerTierId = null;
    let gemPowerRestoreCapacity = 0;
    let levelsGained = 0;
    let comboAdded = 0;
    let comboTotal = 0;
    let forcedLevelResult = null;

    let isCriticalHit = false;
    {
      let critChance = 0;
      if (this.upgradeSystem) {
        critChance += this.upgradeSystem.getUpgradeEffects().critChance || 0;
      }
      if (this.playerLevelSystem) {
        critChance += this.playerLevelSystem.getCriticalHitChance?.()
          ?? this.playerLevelSystem.calculatedBonuses.criticalHitChance
          ?? 0;
      }
      critChance += this._getDepthMilestoneBonuses().critChance;
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
    
    let critMultiplier = 1;
    if (isCriticalHit) {
      critMultiplier = this.playerLevelSystem
        ? this.playerLevelSystem.getCriticalHitDamageMultiplier()
        : 2;
      if (Number.isFinite(critMultiplier) && critMultiplier > 0) {
        damage = Math.max(1, Math.floor(damage * critMultiplier));
      }
    }

    if (Number.isFinite(options.damageMultiplier) && options.damageMultiplier > 0) {
      damage = Math.max(1, Math.floor(damage * options.damageMultiplier));
    }

    const result = this.worldModel.damageTile(targetTile.tx, targetTile.ty, damage);

    if (!result.success) {
      return {
        success: false,
        reason: result.reason ?? "invalid",
      };
    }

    this.worldRenderer.applyTileUpdate(targetTile.tx, targetTile.ty);

    if (!result.wasRubble) {
      const specialBlockResult = this._handleSpecialBlockEffects(result, targetTile);
      ({
        specialBlockEffect,
        specialBlockDestroyed,
        gemPowerRestored,
        gemPowerTierId,
        gemPowerRestoreCapacity,
        levelsGained,
        comboAdded,
        comboTotal,
        forcedLevelResult,
      } = specialBlockResult);
    }

    if (result.destroyed && !result.wasRubble && this.comboSystem && typeof this.comboSystem.incrementCombo === 'function') {
      this.comboSystem.incrementCombo(nowMs);
    }

    const heavyPunchResult = options.skipHeavyPunch
      ? this._tryApplyHeavyPunchBehind(null, damage, aimDirection)
      : this._tryApplyHeavyPunchBehind(targetTile, damage, aimDirection);
    let { heavyPunchHit, heavyPunchTile, behindDestroyed, behindResourceType, behindResourceAmount, behindIsLuckyDrop, behindDamage } = heavyPunchResult;

    let resourceType = null;
    let resourceAmount = 0;
    let xpGained = 0;
    let levelUp = false;
    let newLevel = null;
    let hasChoice = false;
    let choiceLevel = null;
    let rewards = null;
    let isLuckyDrop = false;
    let isSkyTileBonus = false;
    let skyTileMultiplier = 1;
    let skyTilePassiveBonus = false;
    let ancientRelics = 0;
    let rarityId = "normal";
    let rarityMultiplier = 1;

    if (result.destroyed) {
      this.tilesBroken += 1;

      if (!result.wasRubble) {
        ancientRelics = this._awardAncientRelics(result.typeBeforeDamage, targetTile.tx, targetTile.ty);
        let skyTileRarity = 0;
        let skyTileIdentity = 0;
        let rewardTileType = result.typeBeforeDamage;
        if (result.typeBeforeDamage === TILE_TYPES.SKY_TILE) {
          const originalType = this.worldModel.getSkyTileOriginalType(targetTile.tx, targetTile.ty);
          rewardTileType = originalType;
          resourceType = tileTypeToResource(originalType);
          skyTileRarity = this.worldModel.getSkyTileRarity(targetTile.tx, targetTile.ty);
          skyTileIdentity = this.worldModel.getSkyTileIdentity(targetTile.tx, targetTile.ty);
          isSkyTileBonus = true;
        } else {
          resourceType = tileTypeToResource(result.typeBeforeDamage);
        }

        if (resourceType) {
          const rarity = this._getNativeRarity(
            rewardTileType,
            targetTile.tx,
            targetTile.ty
          );
          rarityId = rarity.id;
          rarityMultiplier = rarity.multiplier;
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
          resourceAmount = this._capResourceYield(resourceAmount);

          resourceAmount = grantResourceTotal(this.resources, resourceType, resourceAmount);

          if (this.playerLevelSystem) {
            const xpMultiplier = isSkyTileBonus ? 2 : 1;
            const xpResult = this.playerLevelSystem.gainXP(resourceType);
            xpGained = xpResult.xpGained * xpMultiplier;
            levelUp = xpResult.levelUp;
            newLevel = xpResult.newLevel;
            hasChoice = xpResult.hasChoice;
            choiceLevel = xpResult.choiceLevel;
            rewards = xpResult.rewards;
          }

          if (isSkyTileBonus && this.floatingTextSystem) {
            const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
            const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
            this.floatingTextSystem.releaseCollectedSkyStar(
              skyTileRarity,
              worldX,
              worldY,
              resourceType,
              {
                materialMultiplier: skyTileMultiplier,
                materialAmount: resourceAmount,
                identityIndex: skyTileIdentity,
              },
            );
          }
        }
      }
    }

    if (levelsGained > 0 && this.playerLevelSystem) {
      levelUp = true;
      newLevel = this.playerLevelSystem.level;
      hasChoice = Boolean(forcedLevelResult?.hasChoice);
      choiceLevel = forcedLevelResult?.choiceLevel ?? null;
      rewards = forcedLevelResult?.rewards || [];
    }

    const miningResult = {
      success: true,
      tileType,
      destroyed: result.destroyed,
      hp: result.hp,
      hpBefore: result.hpBefore,
      maxHp: result.maxHp,
      overkillDamage: result.overkillDamage || 0,
      isFinalHit: result.destroyed,
      damage,
      resourceType,
      resourceAmount,
      resource: resourceType,
      xpGained,
      levelUp,
      newLevel,
      hasChoice,
      choiceLevel,
      rewards,
      isCriticalHit,
      critMultiplier,
      isLuckyDrop,
      heavyPunchHit,
      heavyPunchTile,
      behindDestroyed,
      behindResourceType,
      behindResourceAmount,
      behindIsLuckyDrop,
      behindDamage,
      behindMaxHp: heavyPunchResult.behindMaxHp,
      behindOverkillDamage: heavyPunchResult.behindOverkillDamage,
      behindRarityId: heavyPunchResult.behindRarityId,
      behindRarityMultiplier: heavyPunchResult.behindRarityMultiplier,
      specialBlockEffect,
      specialBlockDestroyed,
      gemPowerRestored,
      levelsGained,
      comboAdded,
      comboTotal,
      skyTileMultiplier,
      skyTilePassiveBonus,
      ancientRelics,
      rarityId,
      rarityMultiplier,
    };
    this.retentionProgressSystem?.recordMiningResult?.(miningResult);
    return miningResult;
  }

  tryMineArea(targetEntries, nowMs, aimDirection = null, playerAbilities = null) {
    if (nowMs - this.lastMineTime < this._getCooldown(playerAbilities)) {
      return { success: false, reason: "cooldown", hits: [], destroyedCount: 0 };
    }

    if (playerAbilities?.isQuickslashActive?.()) {
      if (playerAbilities.canPayQuickslashCost?.() === false) {
        return { success: false, reason: "no-gp", hits: [], destroyedCount: 0 };
      }
    }

    this.lastMineTime = nowMs;
    const seen = new Set();
    const entries = (Array.isArray(targetEntries) ? targetEntries : []).filter(entry => {
      if (!entry || !Number.isInteger(entry.tx) || !Number.isInteger(entry.ty)) return false;
      const key = `${entry.tx},${entry.ty}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const quickslashCostIndex = playerAbilities?.isQuickslashActive?.()
      ? entries.findIndex(entry => (
        this.worldModel.inBounds(entry.tx, entry.ty)
        && this.worldModel.isDiggable(entry.tx, entry.ty)
      ))
      : -1;

    const heavyPunchFraction = this._getHeavyPunchFraction();
    const hits = entries.map((entry, index) => {
      const tileType = this.worldModel.inBounds(entry.tx, entry.ty)
        ? this.worldModel.getTileType(entry.tx, entry.ty)
        : null;
      const damageMultiplier = entry.depthIndex > 0 ? 1 + heavyPunchFraction : 1;
      const result = this.tryMine(entry, nowMs, aimDirection, playerAbilities, {
        ignoreCooldown: true,
        skipAbilityCost: index !== quickslashCostIndex,
        skipHeavyPunch: true,
        damageMultiplier,
      });
      return { ...entry, tileType, result };
    });

    const successfulHits = hits.filter(hit => hit.result?.success);
    const levelUps = successfulHits.filter(hit => hit.result?.levelUp);
    const rewards = levelUps.flatMap(hit => Array.isArray(hit.result.rewards) ? hit.result.rewards : []);
    const lastLevelUp = levelUps[levelUps.length - 1]?.result || null;

    return {
      success: successfulHits.length > 0,
      reason: successfulHits.length > 0 ? null : (hits[0]?.result?.reason || "no-target"),
      hits,
      destroyedCount: successfulHits.filter(hit => hit.result.destroyed).length,
      levelUp: levelUps.length > 0,
      newLevel: lastLevelUp?.newLevel ?? null,
      hasChoice: levelUps.some(hit => hit.result.hasChoice),
      rewards,
    };
  }

  getEffectiveCooldownMs(playerAbilities = null) {
    return this._getCooldown(playerAbilities);
  }

  isMineCooldownReady(nowMs, playerAbilities = null) {
    return Number.isFinite(nowMs)
      && nowMs - this.lastMineTime >= this._getCooldown(playerAbilities);
  }

  getTilesBroken() {
    return this.tilesBroken;
  }

  getResourceTotals() {
    return sanitizeResourceTotals(this.resources);
  }

  setResourceTotals(resources) {
    if (!replaceResourceTotals(this.resources, resources)) return false;
    this.resources = sanitizeResourceTotals(resources);
    return true;
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
      success: true,
      destroyed: true,
      resourceType: null,
      resourceAmount: 0,
      xpGained: 0,
      levelUp: false,
      newLevel: null,
      hasChoice: false,
      rewards: [],
      levelsGained: 0,
      specialBlockEffect: null,
      specialBlockDestroyed: false,
      gemPowerRestored: 0,
      gemPowerTierId: null,
      gemPowerRestoreCapacity: 0,
      ancientRelics: 0,
      comboAdded: 0,
      comboTotal: 0,
      rarityId: "normal",
      rarityMultiplier: 1,
    };

    this.tilesBroken += 1;

    if (wasRubble) {
      this.retentionProgressSystem?.recordMiningResult?.(result);
      return result;
    }

    result.ancientRelics = this._awardAncientRelics(tileType, tx, ty);

    let rewardTileType = tileType;
    let resourceType = tileTypeToResource(tileType);
    let skyMultiplier = 1;
    let skyTileRarity = 0;
    let skyTileIdentity = 0;
    let skyTilePassiveBonus = false;
    if (tileType === TILE_TYPES.SKY_TILE) {
      rewardTileType = this.worldModel.getSkyTileOriginalType(tx, ty);
      resourceType = tileTypeToResource(rewardTileType);
      skyTileRarity = this.worldModel.getSkyTileRarity(tx, ty);
      skyTileIdentity = this.worldModel.getSkyTileIdentity(tx, ty);
      const skyReward = this._getSkyTileRewardMultiplier(skyTileRarity, resourceType);
      skyMultiplier = skyReward.multiplier;
      skyTilePassiveBonus = skyReward.passiveBonus;
    }
    if (resourceType) {
      const rarity = this._getNativeRarity(rewardTileType, tx, ty);
      result.rarityId = rarity.id;
      result.rarityMultiplier = rarity.multiplier;
      result.resourceType = resourceType;
      result.resourceAmount = this._getNativeYield(rewardTileType, tx, ty) * skyMultiplier;
      if (this._rollLuckyDrop()) {
        result.resourceAmount += 1;
        result.isLuckyDrop = true;
      }
      result.resourceAmount = this._capResourceYield(result.resourceAmount);
      result.resourceAmount = grantResourceTotal(this.resources, resourceType, result.resourceAmount);
    }

    if (tileType === TILE_TYPES.SKY_TILE && resourceType && this.floatingTextSystem) {
      const worldX = tx * this.config.tileSize + this.config.tileSize / 2;
      const worldY = ty * this.config.tileSize + this.config.tileSize / 2;
      this.floatingTextSystem.releaseCollectedSkyStar(
        skyTileRarity,
        worldX,
        worldY,
        resourceType,
        {
          materialMultiplier: skyMultiplier,
          materialAmount: result.resourceAmount,
          identityIndex: skyTileIdentity,
        },
      );
      result.skyTileMultiplier = skyMultiplier;
      result.skyTilePassiveBonus = skyTilePassiveBonus;
    }

    if (this.playerLevelSystem && resourceType) {
      const xpResult = this.playerLevelSystem.gainXP(resourceType);
      result.xpGained = xpResult.xpGained;
      result.levelUp = xpResult.levelUp;
      result.newLevel = xpResult.newLevel;
      result.hasChoice = xpResult.hasChoice || false;
      result.choiceLevel = xpResult.choiceLevel ?? null;
      result.rewards = xpResult.rewards || [];
    }

    const specialResult = this._handleSpecialBlockEffects(
      { destroyed: true, typeBeforeDamage: tileType },
      { tx, ty }
    );
    result.specialBlockEffect = specialResult.specialBlockEffect;
    result.specialBlockDestroyed = specialResult.specialBlockDestroyed;
    result.gemPowerRestored = specialResult.gemPowerRestored;
    result.gemPowerTierId = specialResult.gemPowerTierId;
    result.gemPowerRestoreCapacity = specialResult.gemPowerRestoreCapacity;
    result.comboAdded = specialResult.comboAdded;
    result.comboTotal = specialResult.comboTotal;
    if (specialResult.levelsGained) {
      result.levelUp = true;
      result.newLevel = this.playerLevelSystem ? this.playerLevelSystem.level : null;
      result.levelsGained = specialResult.levelsGained;
      result.hasChoice = Boolean(specialResult.forcedLevelResult?.hasChoice);
      result.choiceLevel = specialResult.forcedLevelResult?.choiceLevel ?? null;
      result.rewards = specialResult.forcedLevelResult?.rewards || [];
    }

    if (addComboPoints && this.comboSystem) {
      this.comboSystem.addCombo(nowMs);
    }

    this.retentionProgressSystem?.recordMiningResult?.(result);
    return result;
  }

  trySpendResources(costs = {}) {
    if (!costs || typeof costs !== "object" || Array.isArray(costs)) {
      return { success: false, reason: "invalid_costs" };
    }

    const entries = Object.entries(costs);
    const currentResources = this.getResourceTotals();
    const normalizedCosts = {};
    const missingResources = [];

    for (const [resourceType, amount] of entries) {
      if (!RESOURCE_KEY_SET.has(resourceType)) {
        return {
          success: false,
          reason: "invalid_resource",
          resourceType,
        };
      }
      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
        return {
          success: false,
          reason: "invalid_amount",
          resourceType,
          amount,
        };
      }

      normalizedCosts[resourceType] = amount;
      const have = currentResources[resourceType] || 0;
      if (have < amount) {
        missingResources.push({
          resourceType,
          required: amount,
          have,
          needed: amount - have,
        });
      }
    }

    if (missingResources.length > 0) {
      return {
        success: false,
        reason: "not_enough_resources",
        missingResources,
      };
    }

    const nextResources = { ...currentResources };
    for (const [resourceType, amount] of Object.entries(normalizedCosts)) {
      nextResources[resourceType] -= amount;
    }
    this.setResourceTotals(nextResources);

    return {
      success: true,
      spent: normalizedCosts,
      resources: this.getResourceTotals(),
    };
  }

  spendResource(resourceType, amount) {
    return this.trySpendResources({ [resourceType]: amount }).success;
  }

  _handleSpecialBlockEffects(result, targetTile) {
    if (!result.destroyed) return {
      specialBlockEffect: null,
      specialBlockDestroyed: false,
      gemPowerRestored: 0,
      gemPowerTierId: null,
      gemPowerRestoreCapacity: 0,
      levelsGained: 0,
      comboAdded: 0,
      comboTotal: 0,
      forcedLevelResult: null,
    };

    const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
    const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
    
    let specialBlockEffect = null;
    let specialBlockDestroyed = false;
    let gemPowerRestored = 0;
    let gemPowerTierId = null;
    let gemPowerRestoreCapacity = 0;
    let levelsGained = 0;
    let comboAdded = 0;
    let comboTotal = 0;
    let forcedLevelResult = null;
    
    const scene = this.scene || (this.worldRenderer?.scene);

    switch (result.typeBeforeDamage) {
      case TILE_TYPES.GEM_POWER_BLOCK:
        {
          const depthTiles = Math.max(
            0,
            targetTile.ty - (
              this.worldModel?.topAirRows
              ?? this.worldModel?.config?.topAirRows
              ?? this.config.topAirRows
              ?? 0
            )
          );
          const tier = getGemPowerBlockTier(depthTiles);
          gemPowerTierId = tier.id;
          gemPowerRestoreCapacity = tier.restoreAmount;
        }
        if (scene && scene.playerController && scene.playerController.abilities) {
          const abilities = scene.playerController.abilities;
          gemPowerRestored = abilities.restoreGemPower(
            gemPowerRestoreCapacity,
            {
              source: "gemPowerBlock",
              tierId: gemPowerTierId,
              restoreCapacity: gemPowerRestoreCapacity,
              tx: targetTile.tx,
              ty: targetTile.ty,
            }
          );
          specialBlockEffect = 'gemPowerRestored';
        } else {
          console.warn('[DigSystem] GEM_POWER_BLOCK effect requires playerController.abilities');
        }
        specialBlockDestroyed = true;
        if (gemPowerRestored > 0) scene?.hudSystem?.pulseGemPower?.(true);
        break;

      case TILE_TYPES.SPEED_BLOCK:
        if (this.specialBlockEffectsManager && typeof this.specialBlockEffectsManager.applyEffect === 'function') {
          this.specialBlockEffectsManager.applyEffect('speedBlock');
          specialBlockEffect = 'speedBoost';
        } else {
          console.warn('[DigSystem] SPEED_BLOCK effect requires specialBlockEffectsManager with applyEffect method');
        }
        specialBlockDestroyed = true;
        break;

      case TILE_TYPES.XP_BLOCK:
        if (this.playerLevelSystem && typeof this.playerLevelSystem.gainLevel === 'function') {
          forcedLevelResult = this.playerLevelSystem.gainLevel(1) || {};
          levelsGained = Number.isFinite(forcedLevelResult.levelsGained)
            ? forcedLevelResult.levelsGained
            : 1;
          specialBlockEffect = 'levelUp';
        } else {
          console.warn('[DigSystem] XP_BLOCK effect requires playerLevelSystem with gainLevel method');
        }
        specialBlockDestroyed = true;
        break;

      case TILE_TYPES.CRIT_BLOCK:
        if (this.specialBlockEffectsManager && typeof this.specialBlockEffectsManager.applyEffect === 'function') {
          this.specialBlockEffectsManager.applyEffect('critBlock');
          specialBlockEffect = 'critBoost';
        } else {
          console.warn('[DigSystem] CRIT_BLOCK effect requires specialBlockEffectsManager with applyEffect method');
        }
        specialBlockDestroyed = true;
        break;

      case TILE_TYPES.BERSERK_BLOCK:
        if (this.specialBlockEffectsManager && typeof this.specialBlockEffectsManager.applyEffect === 'function') {
          this.specialBlockEffectsManager.applyEffect('berserkBlock');
          specialBlockEffect = 'damageBoost';
        } else {
          console.warn('[DigSystem] BERSERK_BLOCK effect requires specialBlockEffectsManager with applyEffect method');
        }
        specialBlockDestroyed = true;
        break;

      case TILE_TYPES.COMBO_BLOCK:
        if (this.comboSystem && typeof this.comboSystem.addCombo === 'function') {
          const comboEffect = getBlockEffect('comboBlock');
          const amount = Math.max(0, Math.floor(Number(comboEffect?.value) || 0));
          const before = Number(this.comboSystem.getComboCount?.()) || 0;
          const nowMs = Number.isFinite(scene?.time?.now) ? scene.time.now : Date.now();
          this.comboSystem.addCombo(amount, nowMs);
          comboTotal = Math.max(0, Number(this.comboSystem.getComboCount?.()) || 0);
          comboAdded = Math.max(0, comboTotal - before);
          specialBlockEffect = 'comboBoost';
        } else {
          console.warn('[DigSystem] COMBO_BLOCK effect requires comboSystem with addCombo method');
        }
        specialBlockDestroyed = true;
        break;

      case TILE_TYPES.LEGEND_BLOCK:
        if (this.playerLevelSystem && typeof this.playerLevelSystem.gainLevel === 'function') {
          forcedLevelResult = this.playerLevelSystem.gainLevel(5) || {};
          levelsGained = Number.isFinite(forcedLevelResult.levelsGained)
            ? forcedLevelResult.levelsGained
            : 5;
          specialBlockEffect = 'legendLevelUp';
        } else {
          console.warn('[DigSystem] LEGEND_BLOCK effect requires playerLevelSystem with gainLevel method');
        }
        specialBlockDestroyed = true;
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

    return {
      specialBlockEffect,
      specialBlockDestroyed,
      gemPowerRestored,
      gemPowerTierId,
      gemPowerRestoreCapacity,
      levelsGained,
      comboAdded,
      comboTotal,
      forcedLevelResult,
    };
  }
}
