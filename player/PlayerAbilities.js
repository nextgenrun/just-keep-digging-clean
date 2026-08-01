import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { GEM_POWER_CONFIG } from "../values/gemPower.js";
import {
  CONSTELLATION_BUFFS,
  computeAbilityStats,
  getDefaultAbilityStats,
} from "../values/constellationBuffs.js";
import { HARD_RESOURCE_TILE_TYPES, tileTypeToResource } from "../values/resourceTypes.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  getThunderStrikeStage,
  resolveThunderStrikeDamage,
  resolveThunderStrikeEffectiveDamageMultiplier,
  resolveThunderStrikeSuccessDamageMultiplier,
} from "../values/thunderStrikeChain.js";
import {
  getPlayerBodyTileSpan,
  resolveHorizontalInputDirection,
} from "./playerDirectionalTargets.js";

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
    this._gemPowerChangeListener = null;
    this._gemPowerFloorProvider = null;

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
    this._thunderStrikeFollowUpSuccessCount = 0;

    // God mode
    this._godMode = false;
  }

  setGodMode(enabled) {
    this._godMode = enabled === true;
    this._constellationStatsSig = null;
    if (this._godMode) this.fillGemPower();
  }
  isGodModeActive() { return this._godMode; }
  setFreeFlightProvider(provider) {
    this._freeFlightProvider = typeof provider === "function" ? provider : null;
  }
  setGemPowerChangeListener(listener) {
    this._gemPowerChangeListener = typeof listener === "function" ? listener : null;
  }
  setGemPowerFloorProvider(provider) {
    this._gemPowerFloorProvider = typeof provider === "function" ? provider : null;
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
    const flightContext = { source: "flight" };
    const flightDrainRequest = freeFlightActive
      ? 0
      : this._getGemPowerDrain() * dt;
    const flightStartRequirement = this._getFlyStartCost()
      + (this.getGemPowerFloor(flightContext) > 0 ? flightDrainRequest : 0);

    if (flightAvailable && flyHeld && this.body) {
      const canStartFlying = !this._flying
        && (
          this._godMode
          || freeFlightActive
          || this.canSpendGemPower(
            flightStartRequirement,
            flightContext,
          )
        );
      const canContinueFlying = this._flying
        && (
          this._godMode
          || freeFlightActive
          || this.hasSpendableGemPower(flightContext)
        );

      if (canStartFlying || canContinueFlying) {
        if (canStartFlying && !this._godMode && !freeFlightActive) {
          this.consumeGemPower(this._getFlyStartCost(), flightContext);
        }
        let upkeepPaid = true;
        if (!freeFlightActive) {
          const consumed = this.consumeGemPower(
            flightDrainRequest,
            flightContext,
          );
          upkeepPaid = consumed + Number.EPSILON >= flightDrainRequest;
        } else {
          this._warnedLowGemPower = false;
        }

        if (upkeepPaid) {
          const flightDirection = (!isGrounded && flyDownHeld) ? 1 : -1;
          this.body.vy = this._getClimbSpeed() * flightDirection;
          this._flying = true;
          this._climbing = true;
          usingGemPowerMovement = true;
        } else {
          this._flying = false;
          this._climbing = false;
          this._warnFlightPowerUnavailable(flightContext);
        }

        if (
          upkeepPaid
          && !freeFlightActive
          && this.gemPower < GEM_POWER_CONFIG.lowGpWarningThreshold
          && !this._warnedLowGemPower
        ) {
          this.sprite?.scene?.hudSystem?.flashStatus?.(
            GEM_POWER_CONFIG.lowGpWarningText,
            GEM_POWER_CONFIG.lowGpWarningColor,
            GEM_POWER_CONFIG.lowGpFlashMs
          );
          this._warnedLowGemPower = true;
        }
      } else if (!this.hasSpendableGemPower(flightContext)) {
        this._flying = false;
        this._warnFlightPowerUnavailable(flightContext);
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
      this._quickslashDirection = resolveHorizontalInputDirection(
        input?.getHorizontalMovement?.(),
        facingRight,
      );
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
    const unlocked = this._godMode
      ? Object.keys(CONSTELLATION_BUFFS)
      : this.sprite?.scene?.floatingTextSystem?.getUnlockedConstellations?.() || [];
    const sig = `${this._godMode ? "god:" : ""}${unlocked.join(',')}`;
    if (sig === this._constellationStatsSig) return;
    this._constellationStatsSig = sig;
    this._constellationStats = computeAbilityStats(unlocked);
  }

  getConstellationStats() {
    this._refreshConstellationStats();
    return this._constellationStats || getDefaultAbilityStats();
  }

  getQuickslashCost() {
    if (this._godMode) return 0;
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
    return this.consumeGemPower(this.getQuickslashCost(), { source: "quickslash" });
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
    const chargeTimeMs = THUNDER_STRIKE_CHAIN_CONFIG.initialImpact.chargeTimeMs;

    if (chargeDuration >= chargeTimeMs) {
      return { complete: true };
    }
    return { complete: false };
  }

  armThunderStrikeFollowUp(stageIndex, successfulContinuations = stageIndex) {
    const normalizedStageIndex = Math.trunc(stageIndex);
    if (normalizedStageIndex <= 0 || normalizedStageIndex >= THUNDER_STRIKE_CHAIN_CONFIG.stages.length) {
      return false;
    }
    this._thunderStrikeCharging = false;
    this._thunderStrikeFollowUpStageIndex = normalizedStageIndex;
    this._thunderStrikeFollowUpSuccessCount = Math.max(
      0,
      Math.min(
        normalizedStageIndex,
        Math.trunc(Number(successfulContinuations) || 0),
      ),
    );
    return true;
  }

  cancelThunderStrikeChain() {
    this._thunderStrikeCharging = false;
    this._thunderStrikeFollowUpStageIndex = null;
    this._thunderStrikeFollowUpSuccessCount = 0;
  }

  executeThunderStrike(stageIndex = 0) {
    const normalizedStageIndex = Math.trunc(stageIndex);
    const initialSlam = normalizedStageIndex === 0;
    let chainSuccessCount = 0;
    if (initialSlam) {
      if (!this._thunderStrikeCharging) return { success: false, reason: "not-charging" };
      this._thunderStrikeCharging = false;
      const cost = this.getThunderStrikeCost();
      if (!this._godMode && this.gemPower < cost) return { success: false, reason: "no-gp" };
      if (!this._godMode) this.consumeGemPower(cost, { source: "thunderStrike" });
    } else {
      if (this._thunderStrikeFollowUpStageIndex !== normalizedStageIndex) {
        return { success: false, reason: "follow-up-not-armed" };
      }
      chainSuccessCount = this._thunderStrikeFollowUpSuccessCount;
      this._thunderStrikeFollowUpStageIndex = null;
      this._thunderStrikeFollowUpSuccessCount = 0;
    }
    const chainStage = getThunderStrikeStage(normalizedStageIndex);
    const successDamageMultiplier = resolveThunderStrikeSuccessDamageMultiplier(
      chainSuccessCount,
    );

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
    for (let distance = 0; distance < strikeRange; distance++) {
      const checkTy = strikeOrigin.ty + distance;
      if (checkTy >= this.worldModel.depth) break;
      const checkTx = strikeOrigin.tx;
      if (
        this.worldModel.inBounds
        && !this.worldModel.inBounds(checkTx, checkTy)
      ) {
        continue;
      }
      if (!this.worldModel.isDiggable(checkTx, checkTy)) continue;
      const tileType = this.worldModel.getTileType(checkTx, checkTy);
      const tileBaseDamage = this._getNormalMiningDamageForTile(tileType);
      const dmg = resolveThunderStrikeDamage({
        baseDamage: tileBaseDamage,
        normalDamageMultiplier,
        bonusDamageMultiplier: thunderStrikeBonusMultiplier,
        stageDamageMultiplier: chainStage.damageMultiplier,
        successDamageMultiplier,
        falloffPerTile: falloff,
        distance,
      });
      const dmgResult = this.worldModel.damageTile(checkTx, checkTy, dmg);
      results.push({
        tx: checkTx,
        ty: checkTy,
        damage: dmg,
        destroyed: dmgResult.destroyed,
        tileType: dmgResult.typeBeforeDamage,
        wasRubble: dmgResult.wasRubble,
        hpBefore: dmgResult.hpBefore,
        maxHp: dmgResult.maxHp,
        overkillDamage: dmgResult.overkillDamage || 0,
      });
    }
    return {
      success: true,
      results,
      chainStageIndex: normalizedStageIndex,
      chainStageNumber: chainStage.number,
      chainDamageMultiplier: chainStage.damageMultiplier,
      chainSuccessCount,
      chainSuccessDamageMultiplier: successDamageMultiplier,
      chainEffectiveDamageMultiplier: resolveThunderStrikeEffectiveDamageMultiplier(
        chainStage.damageMultiplier,
        chainSuccessCount,
      ),
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
    let rows = 0;
    for (let distance = 0; distance < range; distance += 1) {
      const ty = origin.ty + distance;
      if (!this.worldModel.inBounds(origin.tx, ty)) break;
      rows += 1;
      entries.push({
        tx: origin.tx,
        ty,
        solid: this.worldModel.isSolid(origin.tx, ty),
      });
    }
    return {
      origin,
      entries,
      range: rows,
      columns: 1,
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
    if (this._godMode) return 0;
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
  getGemPowerExact() { return this.gemPower; }

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
  getGemPowerFloor(context = {}) {
    const resolved = Number(this._gemPowerFloorProvider?.(context));
    const floor = Number.isFinite(resolved) ? Math.max(0, resolved) : 0;
    return Math.min(this.gemPower, floor);
  }
  getSpendableGemPower(context = {}) {
    return Math.max(0, this.gemPower - this.getGemPowerFloor(context));
  }
  hasSpendableGemPower(context = {}) {
    return this.getSpendableGemPower(context) > Number.EPSILON;
  }
  canSpendGemPower(amount, context = {}) {
    const requested = Math.max(0, Number.isFinite(amount) ? amount : 0);
    return this.getSpendableGemPower(context) + Number.EPSILON >= requested;
  }
  fillGemPower(context = { source: "fill" }) {
    const previous = this.gemPower;
    this.gemPower = this.getGemPowerMax();
    const restored = Math.max(0, this.gemPower - previous);
    if (restored > 0) this._emitGemPowerChange(previous, context);
    return restored;
  }
  restoreGemPower(amount, context = { source: "restore" }) {
    const requested = Math.max(0, Number.isFinite(amount) ? amount : 0);
    const previous = this.gemPower;
    this.gemPower = Math.min(this.getGemPowerMax(), this.gemPower + requested);
    const restored = Math.max(0, this.gemPower - previous);
    if (restored > 0) this._emitGemPowerChange(previous, context);
    return restored;
  }
  setGemPowerExact(amount, { silent = false, source = "restore" } = {}) {
    const previous = this.gemPower;
    const requested = Math.max(0, Number.isFinite(amount) ? amount : 0);
    this.gemPower = Math.min(this.getGemPowerMax(), requested);
    if (!silent) this._emitGemPowerChange(previous, { source });
    return this.gemPower;
  }
  consumeGemPower(amount, context = {}) {
    if (this._godMode) return Math.max(0, Number.isFinite(amount) ? amount : 0);
    const requested = Math.max(0, Number.isFinite(amount) ? amount : 0);
    const previous = this.gemPower;
    const consumed = Math.min(this.getSpendableGemPower(context), requested);
    this.gemPower = Math.max(0, this.gemPower - consumed);
    if (consumed > 0) this._emitGemPowerChange(previous, context);
    return consumed;
  }
  drainAllGemPower(context = {}) {
    if (this._godMode) return 0;
    const drained = this.getSpendableGemPower(context);
    const previous = this.gemPower;
    this.gemPower = Math.max(0, this.gemPower - drained);
    if (drained > 0) this._emitGemPowerChange(previous, context);
    return drained;
  }

  _emitGemPowerChange(previous, context = {}) {
    this._gemPowerChangeListener?.({
      previous,
      current: this.gemPower,
      delta: this.gemPower - previous,
      source: String(context?.source || "unknown"),
      context,
    });
  }

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
    if (this._godMode) return 0;
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
    if (this._godMode) return 0;
    const startCost = GEM_POWER_CONFIG.flightStartCost;
    return Number.isFinite(startCost) ? Math.max(0, startCost) : 0;
  }

  _warnFlightPowerUnavailable(context) {
    if (this._warnedLowGemPower) return;
    const reserveProtected = this.gemPower > 0
      && !this.hasSpendableGemPower(context);
    this.sprite?.scene?.hudSystem?.flashStatus?.(
      reserveProtected
        ? GEM_POWER_CONFIG.protectedReserveWarningText
        : GEM_POWER_CONFIG.emptyGpWarningText,
      reserveProtected
        ? GEM_POWER_CONFIG.protectedReserveWarningColor
        : GEM_POWER_CONFIG.emptyGpWarningColor,
      GEM_POWER_CONFIG.lowGpFlashMs,
    );
    this._warnedLowGemPower = true;
  }

  _isFreeFlightActive() {
    return this._freeFlightProvider?.() === true;
  }

  getDashCooldownMs() { return 0; }
}
