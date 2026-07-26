import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { GEM_POWER_CONFIG } from "../values/gemPower.js";
import { computeAbilityStats, getDefaultAbilityStats } from "../values/constellationBuffs.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { HARD_RESOURCE_TILE_TYPES, tileTypeToResource } from "../values/resourceTypes.js";
import { isProtectedSecondWorldDividerTile } from "../values/secondWorldConfig.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  getThunderStrikeStage,
} from "../values/thunderStrikeChain.js";
import { getPlayerBodyTileSpan } from "./playerDirectionalTargets.js";

export class PlayerAbilities {
  constructor(sprite, worldModel, config, upgradeSystem = null, physicsBody = null, playerLevelSystem = null, comboSystem = null) {
    this.sprite = sprite;
    this.worldModel = worldModel;
    this.config = config;
    this.upgradeSystem = upgradeSystem;
    this.body = physicsBody;
    this.playerLevelSystem = playerLevelSystem;
    this.comboSystem = comboSystem;

    // Gem power
    this.gemPower = 0;
    this._baseGemPowerMax = GEM_POWER_CONFIG.baseMax || 100;
    this._progressionGemPowerMaxBonus = 0;
    this._gemPowerMax = this._baseGemPowerMax;
    this._gemPowerRegenRate = GEM_POWER_CONFIG.baseRegen || 2;

    // Climbing
    this._climbing = false;

    // Flying
    this._flying = false;
    this._flyToggleCooldown = 0;
    this._groundLevelY = this.body ? this.body.y + this.body.h : 0;
    this._warnedLowGemPower = false;
    this._freeFlightProvider = null;

    // Quickslash
    this._quickslashActive = false;
    this._quickslashDirection = 1;
    this._quickslashTimer = 0;
    this._constellationStats = getDefaultAbilityStats();
    this._constellationStatsSig = null;

    // Thunder strike
    this._thunderStrikeCharging = false;
    this._thunderStrikeChargeStart = 0;
    this._thunderStrikeFollowUpStageIndex = null;

    // God mode
    this._godMode = false;
  }

  setGodMode(enabled) { this._godMode = enabled; }
  setFreeFlightProvider(provider) {
    this._freeFlightProvider = typeof provider === "function" ? provider : null;
  }

  update(dt, input, isGrounded, facingRight) {
    this._refreshConstellationStats();

    if (this._godMode) {
      this.gemPower = Math.max(this.gemPower, this.getGemPowerMax());
    }

    if (isGrounded && this.body) {
      this._groundLevelY = this.body.y + this.body.h;
    }

    let usingGemPowerMovement = false;
    this._climbing = false;

    const freeFlightActive = this._isFreeFlightActive();
    const flightAvailable = this._godMode
      || this._flying
      || freeFlightActive
      || this.upgradeSystem?.isGemPowerUnlocked?.();
    const flyHeld = input.getFlyInput();
    const flyDownHeld = input.getFlyDownInput?.() === true;

    if (flightAvailable && flyHeld && this.body) {
      const canStartFlying = !this._flying
        && (this._godMode || freeFlightActive || this.gemPower >= this._getFlyStartCost());
      const canContinueFlying = this._flying
        && (this._godMode || freeFlightActive || this.gemPower > 0);

      if (canStartFlying || canContinueFlying) {
        if (canStartFlying && !this._godMode && !freeFlightActive) {
          this.consumeGemPower(this._getFlyStartCost());
        }
        const flightDirection = (!isGrounded && flyDownHeld) ? 1 : -1;
        this.body.vy = this._getClimbSpeed() * flightDirection;
        this._flying = true;
        this._climbing = true;
        usingGemPowerMovement = true;
        if (!freeFlightActive) {
          this.consumeGemPower(this._getGemPowerDrain() * dt);
        } else {
          this._warnedLowGemPower = false;
        }

        if (
          !freeFlightActive
          && this.gemPower < GEM_POWER_CONFIG.lowGpWarningThreshold
          && !this._warnedLowGemPower
        ) {
          this.sprite?.scene?.hudSystem?.flashStatus?.(
            "Low Gem Power!",
            "#ff6600",
            GEM_POWER_CONFIG.lowGpFlashMs
          );
          this._warnedLowGemPower = true;
        }
      } else if (this.gemPower <= 0) {
        this._flying = false;
        if (!this._warnedLowGemPower) {
          this.sprite?.scene?.hudSystem?.flashStatus?.(
            "No Gem Power!",
            "#ff4444",
            GEM_POWER_CONFIG.lowGpFlashMs
          );
          this._warnedLowGemPower = true;
        }
      }
    } else {
      this._flying = false;
      this._warnedLowGemPower = false;
    }

    if (!usingGemPowerMovement) {
      this._updateClimbing(input, isGrounded);
      this._updateGemPower(dt);
    }

    this._updateQuickslash(input, facingRight);

    if (this.body) this.body.setClimbing(this._climbing);
  }

  _updateQuickslash(input, facingRight) {
    const wantsQuickslash = input?.getQuickslashInput?.() === true;
    if (!wantsQuickslash || !PLAYER_ABILITIES_CONFIG.quickslashEnabled || !this._isQuickslashUnlocked()) {
      this._quickslashActive = false;
      return;
    }

    if (!this._godMode && !this.canPayQuickslashCost()) {
      this._quickslashActive = false;
      return;
    }

    if (!this._quickslashActive) {
      this._quickslashDirection = facingRight ? 1 : -1;
    }
    this._quickslashActive = true;
    if (this.body) {
      const dir = this._quickslashDirection;
      const burstSpeed = Math.max(0, this.getConstellationStats().quickslashBurstSpeed || 0);
      if (burstSpeed > 0) {
        this.body.vx = dir * Math.max(Math.abs(this.body.vx || 0), burstSpeed);
      }
    }
  }

  _updateClimbing(input, isGrounded) {
    if (!input.isUp() || !this.worldModel || isGrounded || !this.body) {
      this._climbing = false;
      return;
    }

    const playerTile = {
      tx: Math.floor((this.body.x + this.body.w / 2) / this.config.tileSize),
      ty: Math.floor((this.body.y + this.body.h) / this.config.tileSize),
    };
    const isAgainstWall = this.worldModel.isSolid(playerTile.tx - 1, playerTile.ty) ||
      this.worldModel.isSolid(playerTile.tx + 1, playerTile.ty);
    this._climbing = isAgainstWall;
    if (this._climbing) {
      this.body.vy = -this._getClimbSpeed();
    }
  }

  _updateGemPower(dt) {
    if (
      !this._godMode
      && !this._isFreeFlightActive()
      && this.upgradeSystem?.isGemPowerUnlocked?.() !== true
    ) {
      return;
    }
    const maxGP = this.getGemPowerMax();
    if (maxGP <= 0) return;
    this.gemPower = Math.min(maxGP, this.gemPower + this._getGemPowerRegen() * dt);
  }

  resetFlyingState() { this._flying = false; }
  isFlying() { return this._flying; }
  isClimbing() { return this._climbing; }

  isQuickslashActive() { return this._quickslashActive; }
  getQuickslashDirection() { return this._quickslashDirection || 1; }

  _isQuickslashUnlocked() {
    if (this._godMode) return true;
    if (this.upgradeSystem?.isQuickslashUnlocked) return this.upgradeSystem.isQuickslashUnlocked();
    const effects = this.upgradeSystem?.getUpgradeEffects?.() ?? {};
    return (effects.unlockQuickslash || 0) > 0;
  }

  isQuickslashUnlocked() {
    return this._isQuickslashUnlocked();
  }

  _isThunderStrikeUnlocked() {
    if (this._godMode) return true;
    if (this.upgradeSystem?.isThunderStrikeUnlocked) return this.upgradeSystem.isThunderStrikeUnlocked();
    const effects = this.upgradeSystem?.getUpgradeEffects?.() ?? {};
    return (effects.unlockThunderStrike || 0) > 0;
  }

  isThunderStrikeUnlocked() {
    return this._isThunderStrikeUnlocked();
  }

  _refreshConstellationStats() {
    const unlocked = this.sprite?.scene?.floatingTextSystem?.getUnlockedConstellations?.() || [];
    const sig = unlocked.join(',');
    if (sig === this._constellationStatsSig) return;
    this._constellationStatsSig = sig;
    this._constellationStats = computeAbilityStats(unlocked);
  }

  getConstellationStats() {
    this._refreshConstellationStats();
    return this._constellationStats || getDefaultAbilityStats();
  }

  getQuickslashCost() {
    const stats = this.getConstellationStats();
    return Math.max(0, (PLAYER_ABILITIES_CONFIG.quickslashCost || 10) - (stats.quickslashCostReduction || 0));
  }

  canPayQuickslashCost() {
    if (this._godMode) return true;
    const stats = this.getConstellationStats();
    if ((stats.quickslashFreeAbovePct || 0) > 0 && this.getGemPowerPercent() >= stats.quickslashFreeAbovePct * 100) {
      return true;
    }
    return this.gemPower >= this.getQuickslashCost();
  }

  spendQuickslashCost() {
    if (this._godMode) return 0;
    const stats = this.getConstellationStats();
    if ((stats.quickslashFreeAbovePct || 0) > 0 && this.getGemPowerPercent() >= stats.quickslashFreeAbovePct * 100) {
      return 0;
    }
    return this.consumeGemPower(this.getQuickslashCost());
  }

  startThunderStrikeCharge(nowMs = this.sprite?.scene?.time?.now ?? Date.now()) {
    this.cancelThunderStrikeChain();
    if (!this._isThunderStrikeUnlocked()) {
      return false;
    }
    if (this.gemPower >= this.getThunderStrikeCost() || this._godMode) {
      this._thunderStrikeCharging = true;
      this._thunderStrikeChargeStart = Number.isFinite(nowMs) ? nowMs : 0;
      return true;
    }
    return false;
  }

  isThunderStrikeCharging() { return this._thunderStrikeCharging; }

  updateThunderStrikeCharge(nowMs = this.sprite?.scene?.time?.now ?? Date.now()) {
    const chargeDuration = Math.max(0, (Number.isFinite(nowMs) ? nowMs : 0) - this._thunderStrikeChargeStart);
    const configuredChargeTimeMs = Number.isFinite(PLAYER_ABILITIES_CONFIG.thunderStrikeChargeTimeMs)
      ? PLAYER_ABILITIES_CONFIG.thunderStrikeChargeTimeMs
      : 1000;
    const chargeTimeMs = Math.max(1000, configuredChargeTimeMs);

    if (chargeDuration >= chargeTimeMs) {
      return { complete: true };
    }
    return { complete: false };
  }

  armThunderStrikeFollowUp(stageIndex) {
    const normalizedStageIndex = Math.trunc(stageIndex);
    if (normalizedStageIndex <= 0 || normalizedStageIndex >= THUNDER_STRIKE_CHAIN_CONFIG.stages.length) {
      return false;
    }
    this._thunderStrikeCharging = false;
    this._thunderStrikeFollowUpStageIndex = normalizedStageIndex;
    return true;
  }

  cancelThunderStrikeChain() {
    this._thunderStrikeCharging = false;
    this._thunderStrikeFollowUpStageIndex = null;
  }

  executeThunderStrike(stageIndex = 0) {
    const normalizedStageIndex = Math.trunc(stageIndex);
    const initialSlam = normalizedStageIndex === 0;
    if (initialSlam) {
      if (!this._thunderStrikeCharging) return { success: false, reason: "not-charging" };
      this._thunderStrikeCharging = false;
      const cost = this.getThunderStrikeCost();
      if (!this._godMode && this.gemPower < cost) return { success: false, reason: "no-gp" };
      if (!this._godMode) this.gemPower -= cost;
    } else {
      if (this._thunderStrikeFollowUpStageIndex !== normalizedStageIndex) {
        return { success: false, reason: "follow-up-not-armed" };
      }
      this._thunderStrikeFollowUpStageIndex = null;
    }
    const chainStage = getThunderStrikeStage(normalizedStageIndex);

    const bodyTileSpan = getPlayerBodyTileSpan(this.body, this.config.tileSize);
    const strikeOrigin = bodyTileSpan
      ? { tx: bodyTileSpan.centerX, ty: bodyTileSpan.bottom + 1 }
      : {
          tx: Math.floor((this.body.x + this.body.w / 2) / this.config.tileSize),
          ty: Math.floor((this.body.y + this.body.h) / this.config.tileSize),
        };
    const results = [];
    const stats = this.getConstellationStats();
    const strikeRange = Math.max(
      1,
      (this.upgradeSystem ? this.upgradeSystem.getUpgradeLevel("thunderStrikeAbility") + 5 : 5)
        + (stats.thunderstrikeRange || 0)
    );
    const normalDamageMultiplier = Number.isFinite(PLAYER_ABILITIES_CONFIG.thunderStrikeNormalDamageMultiplier)
      ? PLAYER_ABILITIES_CONFIG.thunderStrikeNormalDamageMultiplier
      : 1.5;
    const thunderStrikeBonusMultiplier = 1 + (stats.thunderstrikeDamageMult || 0);
    const falloff = Math.max(
      0,
      (PLAYER_ABILITIES_CONFIG.thunderStrikeDamageFalloff || 0) - (stats.thunderstrikeFalloffReduction || 0)
    );
    let bedrockBreachesLeft = Math.max(0, stats.thunderstrikeBedrockBreach || 0);

    for (let distance = 0; distance < strikeRange; distance++) {
      const checkTy = strikeOrigin.ty + distance;
      if (checkTy >= this.worldModel.depth) break;
      if (this.worldModel.isDiggable(strikeOrigin.tx, checkTy)) {
        const tileType = this.worldModel.getTileType(strikeOrigin.tx, checkTy);
        const tileBaseDamage = this._getNormalMiningDamageForTile(tileType);
        const tileDamage = tileBaseDamage
          * normalDamageMultiplier
          * thunderStrikeBonusMultiplier
          * chainStage.damageMultiplier;
        const dmg = Math.max(1, Math.round(tileDamage * Math.max(0.2, 1 - falloff * distance)));
        const dmgResult = this.worldModel.damageTile(strikeOrigin.tx, checkTy, dmg);
        results.push({
          tx: strikeOrigin.tx,
          ty: checkTy,
          damage: dmg,
          destroyed: dmgResult.destroyed,
          tileType: dmgResult.typeBeforeDamage,
          wasRubble: dmgResult.wasRubble,
          hpBefore: dmgResult.hpBefore,
          maxHp: dmgResult.maxHp,
          overkillDamage: dmgResult.overkillDamage || 0,
        });
      } else if (
        bedrockBreachesLeft > 0
        && this.worldModel.getTileType(strikeOrigin.tx, checkTy) === TILE_TYPES.BEDROCK
        && !isProtectedSecondWorldDividerTile(strikeOrigin.tx, checkTy)
      ) {
        const tileType = this.worldModel.getTileType(strikeOrigin.tx, checkTy);
        const tileBaseDamage = this._getNormalMiningDamageForTile(tileType);
        const tileDamage = tileBaseDamage
          * normalDamageMultiplier
          * thunderStrikeBonusMultiplier
          * chainStage.damageMultiplier;
        bedrockBreachesLeft -= 1;
        this.worldModel.setTile(strikeOrigin.tx, checkTy, TILE_TYPES.AIR, 0);
        results.push({ tx: strikeOrigin.tx, ty: checkTy, damage: Math.max(1, Math.round(tileDamage)), destroyed: true, tileType: TILE_TYPES.BEDROCK, wasRubble: false, breachedBedrock: true });
      }
    }
    return {
      success: true,
      results,
      chainStageIndex: normalizedStageIndex,
      chainStageNumber: chainStage.number,
      chainDamageMultiplier: chainStage.damageMultiplier,
      followUpCost: THUNDER_STRIKE_CHAIN_CONFIG.followUpCost,
    };
  }

  getThunderStrikePreview() {
    if (!this._isThunderStrikeUnlocked() || !this.body) return null;
    const bodyTileSpan = getPlayerBodyTileSpan(this.body, this.config.tileSize);
    const origin = bodyTileSpan
      ? { tx: bodyTileSpan.centerX, ty: bodyTileSpan.bottom + 1 }
      : {
          tx: Math.floor((this.body.x + this.body.w / 2) / this.config.tileSize),
          ty: Math.floor((this.body.y + this.body.h) / this.config.tileSize),
        };
    const stats = this.getConstellationStats();
    const range = Math.max(
      1,
      (this.upgradeSystem ? this.upgradeSystem.getUpgradeLevel("thunderStrikeAbility") + 5 : 5)
        + (stats.thunderstrikeRange || 0)
    );
    const entries = [];
    for (let distance = 0; distance < range; distance += 1) {
      const ty = origin.ty + distance;
      if (!this.worldModel.inBounds(origin.tx, ty)) break;
      entries.push({
        tx: origin.tx,
        ty,
        solid: this.worldModel.isSolid(origin.tx, ty),
      });
    }
    return {
      origin,
      entries,
      range: entries.length,
      cost: this.getThunderStrikeCost(),
    };
  }

  _getBaseDamageForTile(tileType) {
    return HARD_RESOURCE_TILE_TYPES.has(tileType)
      ? (MINING_CONFIG.baseDamageHard || 8)
      : (MINING_CONFIG.baseDamage || 16);
  }

  _getSpecialBlockDamageMultiplier() {
    const sceneManager = this.sprite?.scene?.specialBlockEffectsManager;
    if (sceneManager?.getDamageMultiplier) {
      const sceneMultiplier = sceneManager.getDamageMultiplier();
      if (Number.isFinite(sceneMultiplier)) {
        return sceneMultiplier;
      }
    }
    return 1.0;
  }

  _getNormalMiningDamageForTile(tileType) {
    const baseDamage = this._getBaseDamageForTile(tileType);
    let damage = baseDamage;

    const effects = this.upgradeSystem?.getUpgradeEffects?.() || {};
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

    const damageMultiplier = this._getSpecialBlockDamageMultiplier();
    if (damageMultiplier > 1.0) {
      damage *= damageMultiplier;
    }

    if (!Number.isFinite(damage)) {
      return Math.max(1, baseDamage);
    }
    return Math.max(1, Math.round(damage));
  }

  getThunderStrikeCost() {
    const stats = this.getConstellationStats();
    return Math.max(
      0,
      (PLAYER_ABILITIES_CONFIG.thunderStrikeCost || 100)
        * THUNDER_STRIKE_CHAIN_CONFIG.upfrontCostMultiplier
        - (stats.thunderstrikeCostReduction || 0),
    );
  }

  getGemPowerPercent() {
    const max = this.getGemPowerMax();
    return max > 0 ? (this.gemPower / max) * 100 : 0;
  }

  getGemPowerRaw() { return Math.floor(this.gemPower); }

  setProgressionGemPowerMaxBonus(bonus) {
    const nextBonus = Math.max(0, Math.floor(Number.isFinite(bonus) ? bonus : 0));
    if (nextBonus === this._progressionGemPowerMaxBonus) return;
    this._progressionGemPowerMaxBonus = nextBonus;
    this._gemPowerMax = this._baseGemPowerMax + nextBonus;
    this.gemPower = Math.min(this.gemPower, this.getGemPowerMax());
  }

  getGemPowerMax() {
    if (this.upgradeSystem?.getEffectiveGemPowerMax) {
      return this.upgradeSystem.getEffectiveGemPowerMax(this._gemPowerMax);
    }
    let max = this._gemPowerMax;
    if (this.upgradeSystem) max += this.upgradeSystem.getUpgradeEffects().gemPowerMax || 0;
    return max;
  }

  hasGemPower() { return this.gemPower > 0; }
  fillGemPower() {
    const previous = this.gemPower;
    this.gemPower = this.getGemPowerMax();
    return Math.max(0, this.gemPower - previous);
  }
  restoreGemPower(amount) {
    const requested = Math.max(0, Number.isFinite(amount) ? amount : 0);
    const previous = this.gemPower;
    this.gemPower = Math.min(this.getGemPowerMax(), this.gemPower + requested);
    return Math.max(0, this.gemPower - previous);
  }
  consumeGemPower(amount) {
    if (this._godMode) return Math.max(0, Number.isFinite(amount) ? amount : 0);
    const requested = Math.max(0, Number.isFinite(amount) ? amount : 0);
    const consumed = Math.min(this.gemPower, requested);
    this.gemPower = Math.max(0, this.gemPower - consumed);
    return consumed;
  }
  drainAllGemPower() { const d = this.gemPower; this.gemPower = 0; return d; }

  getFlightHeightTiles() {
    if (!this.body) return 0;
    const heightFromGroundPx = this._groundLevelY - (this.body.y + this.body.h);
    return Math.max(0, Math.min(this.getMaxFlightHeightTiles(), heightFromGroundPx / this.config.tileSize));
  }

  getMaxFlightHeightTiles() {
    const raw = this.gemPower * GEM_POWER_CONFIG.flightHeightMultiplier;
    return Math.min(raw, GEM_POWER_CONFIG.maxFlightHeightTiles);
  }

  _getGemPowerRegen() {
    if (this.upgradeSystem?.getEffectiveGemPowerRegen) {
      return this.upgradeSystem.getEffectiveGemPowerRegen(this._gemPowerRegenRate, 0);
    }
    const effects = this.upgradeSystem?.getUpgradeEffects?.() ?? {};
    return this._gemPowerRegenRate + (effects.gemPowerRegenIncrease || 0);
  }

  _getGemPowerDrain() {
    const baseDrain = GEM_POWER_CONFIG.baseDrain || 15;
    if (this.upgradeSystem?.getEffectiveGemPowerDrain) {
      return this.upgradeSystem.getEffectiveGemPowerDrain(baseDrain);
    }
    const effects = this.upgradeSystem?.getUpgradeEffects?.() ?? {};
    return Math.max(0, baseDrain - (effects.gemPowerDrainReduction || 0));
  }

  _getClimbSpeed() {
    if (this.upgradeSystem?.getEffectiveLevitationSpeed) {
      return this.upgradeSystem.getEffectiveLevitationSpeed(this.config.climbSpeedPxPerSec || 252);
    }
    return this.config.climbSpeedPxPerSec || 252;
  }

  _getFlyStartCost() {
    const startCost = GEM_POWER_CONFIG.flightStartCost;
    return Number.isFinite(startCost) ? Math.max(0, startCost) : 0;
  }

  _isFreeFlightActive() {
    return this._freeFlightProvider?.() === true;
  }

  getDashCooldownMs() { return 0; }
}
