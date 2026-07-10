import { GAME_CONFIG } from "../values/gameConfig.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { GEM_POWER_CONFIG } from "../values/gemPower.js";
import { computeAbilityStats, getDefaultAbilityStats } from "../values/constellationBuffs.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { HARD_RESOURCE_TILE_TYPES, tileTypeToResource } from "../values/resourceTypes.js";

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

    // Quickslash
    this._quickslashActive = false;
    this._quickslashDirection = 1;
    this._quickslashTimer = 0;
    this._constellationStats = getDefaultAbilityStats();
    this._constellationStatsSig = null;

    // Thunder strike
    this._thunderStrikeCharging = false;
    this._thunderStrikeChargeStart = 0;

    // God mode
    this._godMode = false;
  }

  setGodMode(enabled) { this._godMode = enabled; }

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

    const flightAvailable = this._godMode
      || this._flying
      || this.gemPower > 0
      || this.upgradeSystem?.isGemPowerUnlocked?.();
    const flyHeld = input.getFlyInput();
    const flyDownHeld = input.getFlyDownInput?.() === true;

    if (flightAvailable && flyHeld && this.body) {
      const canStartFlying = !this._flying && (this._godMode || this.gemPower >= this._getFlyStartCost());
      const canContinueFlying = this._flying && this.gemPower > 0;

      if (canStartFlying || canContinueFlying) {
        if (canStartFlying && !this._godMode) {
          this.consumeGemPower(this._getFlyStartCost());
        }
        const flightDirection = (!isGrounded && flyDownHeld) ? 1 : -1;
        this.body.vy = this._getClimbSpeed() * flightDirection;
        this._flying = true;
        this._climbing = true;
        usingGemPowerMovement = true;
        this.consumeGemPower(this._getGemPowerDrain() * dt);

        if (this.gemPower < GEM_POWER_CONFIG.lowGpWarningThreshold && !this._warnedLowGemPower) {
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

  _isThunderStrikeUnlocked() {
    if (this._godMode) return true;
    if (this.upgradeSystem?.isThunderStrikeUnlocked) return this.upgradeSystem.isThunderStrikeUnlocked();
    const effects = this.upgradeSystem?.getUpgradeEffects?.() ?? {};
    return (effects.unlockThunderStrike || 0) > 0;
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

  startThunderStrikeCharge() {
    if (!this._isThunderStrikeUnlocked()) {
      this._thunderStrikeCharging = false;
      return false;
    }
    if (this.gemPower >= this.getThunderStrikeCost() || this._godMode) {
      this._thunderStrikeCharging = true;
      this._thunderStrikeChargeStart = Date.now();
      return true;
    }
    return false;
  }

  isThunderStrikeCharging() { return this._thunderStrikeCharging; }

  updateThunderStrikeCharge() {
    const chargeDuration = Date.now() - this._thunderStrikeChargeStart;
    const configuredChargeTimeMs = Number.isFinite(PLAYER_ABILITIES_CONFIG.thunderStrikeChargeTimeMs)
      ? PLAYER_ABILITIES_CONFIG.thunderStrikeChargeTimeMs
      : 1000;
    const chargeTimeMs = Math.max(1000, configuredChargeTimeMs);

    if (chargeDuration >= chargeTimeMs) {
      return { complete: true };
    }
    return { complete: false };
  }

  executeThunderStrike() {
    if (!this._thunderStrikeCharging) return { success: false, reason: 'not-charging' };
    this._thunderStrikeCharging = false;
    const cost = this.getThunderStrikeCost();
    if (!this._godMode && this.gemPower < cost) return { success: false, reason: 'no-gp' };
    if (!this._godMode) this.gemPower -= cost;

    const playerTile = { tx: Math.floor((this.body.x + this.body.w / 2) / this.config.tileSize),
                         ty: Math.floor((this.body.y + this.body.h) / this.config.tileSize) };
    const results = [];
    const stats = this.getConstellationStats();
    const strikeRange = Math.max(
      1,
      (this.upgradeSystem ? this.upgradeSystem.getUpgradeLevel('thunderStrike') + 5 : 5)
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

    for (let i = 1; i <= strikeRange; i++) {
      const checkTy = playerTile.ty + i;
      if (checkTy >= this.worldModel.depth) break;
      if (this.worldModel.isDiggable(playerTile.tx, checkTy)) {
        const tileType = this.worldModel.getTileType(playerTile.tx, checkTy);
        const tileBaseDamage = this._getNormalMiningDamageForTile(tileType);
        const tileDamage = tileBaseDamage * normalDamageMultiplier * thunderStrikeBonusMultiplier;
        const dmg = Math.max(1, Math.round(tileDamage * Math.max(0.2, 1 - falloff * (i - 1))));
        const dmgResult = this.worldModel.damageTile(playerTile.tx, checkTy, dmg);
        results.push({ tx: playerTile.tx, ty: checkTy, damage: dmg, destroyed: dmgResult.destroyed, tileType: dmgResult.typeBeforeDamage, wasRubble: dmgResult.wasRubble });
      } else if (bedrockBreachesLeft > 0 && this.worldModel.getTileType(playerTile.tx, checkTy) === TILE_TYPES.BEDROCK) {
        const tileType = this.worldModel.getTileType(playerTile.tx, checkTy);
        const tileBaseDamage = this._getNormalMiningDamageForTile(tileType);
        const tileDamage = tileBaseDamage * normalDamageMultiplier * thunderStrikeBonusMultiplier;
        bedrockBreachesLeft -= 1;
        this.worldModel.setTile(playerTile.tx, checkTy, TILE_TYPES.AIR, 0);
        results.push({ tx: playerTile.tx, ty: checkTy, damage: Math.max(1, Math.round(tileDamage)), destroyed: true, tileType: TILE_TYPES.BEDROCK, wasRubble: false, breachedBedrock: true });
      }
    }
    return { success: true, results };
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
    return Math.max(0, (PLAYER_ABILITIES_CONFIG.thunderStrikeCost || 100) - (stats.thunderstrikeCostReduction || 0));
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

  getDashCooldownMs() { return 0; }
}
