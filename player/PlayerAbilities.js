import { GAME_CONFIG } from "../values/gameConfig.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { GEM_VISION_CONFIG } from "../values/gemVision.js";

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
    this._gemPowerMax = PLAYER_ABILITIES_CONFIG.gemPowerMax || 100;
    this._gemPowerRegenRate = PLAYER_ABILITIES_CONFIG.gemPowerRegenRate || 5;
    this._gemPowerRegenInterval = PLAYER_ABILITIES_CONFIG.gemPowerRegenInterval || 1000;
    this._lastGemPowerRegen = 0;

    // Gem vision
    this._gemVisionActive = false;
    this._gemVisionToggleCooldown = 0;

    // Climbing
    this._climbing = false;

    // Flying
    this._flying = false;
    this._flyToggleCooldown = 0;

    // Quickslash
    this._quickslashActive = false;
    this._quickslashTimer = 0;

    // Thunder strike
    this._thunderStrikeCharging = false;
    this._thunderStrikeChargeStart = 0;

    // God mode
    this._godMode = false;
  }

  setGodMode(enabled) { this._godMode = enabled; }

  update(dt, input, isGrounded, facingRight) {
    this._updateGemPower(dt);
    // Climbing detection
    if (input.isUp() && this.worldModel && !isGrounded) {
      // Check if touching a wall
      const playerTile = { tx: Math.floor((this.body.x + this.body.w / 2) / this.config.tileSize),
                           ty: Math.floor((this.body.y + this.body.h) / this.config.tileSize) };
      const leftTile = this.worldModel.getTileType(playerTile.tx - 1, playerTile.ty);
      const rightTile = this.worldModel.getTileType(playerTile.tx + 1, playerTile.ty);
      const isAgainstWall = this.worldModel.isSolid(playerTile.tx - 1, playerTile.ty) ||
                           this.worldModel.isSolid(playerTile.tx + 1, playerTile.ty);
      this._climbing = isAgainstWall && (input.isUp());
    } else if (isGrounded) {
      this._climbing = false;
    }

    // Flying / Levitation (SHIFT key)
    // Only available when Gem of Great Power is unlocked
    const gemPowerUnlocked = this.upgradeSystem && this.upgradeSystem.isGemPowerUnlocked();
    if (!isGrounded && gemPowerUnlocked && input.getFlyInput() && this.gemPower > 0) {
      const flySpeed = this.config.playerFlySpeed || 180;
      const flyDrainRate = this.config.playerFlyDrainPerSec || 15;
      if (this.body) {
        // Apply upward velocity while flying
        this.body.setVelocityY(-flySpeed);
      }
      // Drain gem power over time
      this.gemPower = Math.max(0, this.gemPower - flyDrainRate * dt);
      // If we ran out, stop flying
      if (this.gemPower <= 0) {
        this._flying = false;
      } else {
        this._flying = true;
      }
    } else if (!input.getFlyInput() || isGrounded || this.gemPower <= 0) {
      this._flying = false;
    }

    if (this.body) this.body.setClimbing(this._climbing);
  }

  _updateGemPower(dt) {
    const maxGP = this.getGemPowerMax();
    if (maxGP <= 0) return;
    this._lastGemPowerRegen += dt * 1000;
    if (this._lastGemPowerRegen >= this._gemPowerRegenInterval) {
      this._lastGemPowerRegen = 0;
      this.gemPower = Math.min(maxGP, this.gemPower + this._gemPowerRegenRate);
    }
  }

  resetFlyingState() { this._flying = false; }
  isFlying() { return this._flying; }

  isGemVisionActive() { return this._gemVisionActive; }

  isQuickslashActive() { return this._quickslashActive; }
  getQuickslashDirection() { return this.sprite && !this.sprite.flipX ? 1 : -1; }

  startThunderStrikeCharge() {
    if (this.gemPower >= (PLAYER_ABILITIES_CONFIG.thunderStrikeCost || 30)) {
      this._thunderStrikeCharging = true;
      this._thunderStrikeChargeStart = Date.now();
      return true;
    }
    return false;
  }

  isThunderStrikeCharging() { return this._thunderStrikeCharging; }

  updateThunderStrikeCharge() {
    const chargeDuration = Date.now() - this._thunderStrikeChargeStart;
    if (chargeDuration >= (PLAYER_ABILITIES_CONFIG.thunderStrikeChargeTime || 600)) {
      return { complete: true };
    }
    return { complete: false };
  }

  executeThunderStrike() {
    if (!this._thunderStrikeCharging) return { success: false, reason: 'not-charging' };
    this._thunderStrikeCharging = false;
    const cost = PLAYER_ABILITIES_CONFIG.thunderStrikeCost || 30;
    if (!this._godMode && this.gemPower < cost) return { success: false, reason: 'no-gp' };
    if (!this._godMode) this.gemPower -= cost;

    const playerTile = { tx: Math.floor((this.body.x + this.body.w / 2) / this.config.tileSize),
                         ty: Math.floor((this.body.y + this.body.h) / this.config.tileSize) };
    const results = [];
    const strikeRange = this.upgradeSystem ? this.upgradeSystem.getUpgradeLevel('thunderStrike') + 5 : 5;
    for (let i = 1; i <= strikeRange; i++) {
      const checkTy = playerTile.ty + i;
      if (checkTy >= this.worldModel.depth) break;
      if (this.worldModel.isDiggable(playerTile.tx, checkTy)) {
        const dmg = PLAYER_ABILITIES_CONFIG.thunderStrikeBaseDamage || 50;
        const dmgResult = this.worldModel.damageTile(playerTile.tx, checkTy, dmg);
        results.push({ tx: playerTile.tx, ty: checkTy, damage: dmg, destroyed: dmgResult.destroyed, tileType: dmgResult.typeBeforeDamage, wasRubble: dmgResult.wasRubble });
      }
    }
    return { success: true, results };
  }

  getGemPowerPercent() {
    const max = this.getGemPowerMax();
    return max > 0 ? (this.gemPower / max) * 100 : 0;
  }

  getGemPowerRaw() { return Math.floor(this.gemPower); }
  getGemPowerMax() {
    let max = this._gemPowerMax;
    if (this.upgradeSystem) max += this.upgradeSystem.getUpgradeEffects().gemPowerMaxBonus || 0;
    return max;
  }

  hasGemPower() { return this.gemPower > 0; }
  consumeGemPower(amount) { this.gemPower = Math.max(0, this.gemPower - amount); return this.gemPower; }
  drainAllGemPower() { const d = this.gemPower; this.gemPower = 0; return d; }

  getDashCooldownMs() { return 0; }
}