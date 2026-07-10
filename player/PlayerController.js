import { PlayerInput } from './PlayerInput.js';
import { PlayerMovement } from './PlayerMovement.js';
import { PlayerAbilities } from './PlayerAbilities.js';
import { PlayerState } from './PlayerState.js';
import { PlayerPhysicsBody } from './PlayerPhysicsBody.js';
import { GAME_CONFIG } from '../values/gameConfig.js';
import { PLAYER_STATS_CONFIG } from '../values/playerStats.js';
import { PLAYER_ABILITIES_CONFIG } from '../values/playerAbilities.js';

  export class PlayerController {
  constructor(scene, sprite, worldModel, config, upgradeSystem = null, inputHandler = null, playerLevelSystem = null, comboSystem = null, collisionSystem = null) {
    this.scene = scene;
    this.sprite = sprite;
    this.worldModel = worldModel;
    this.config = config;
    this.upgradeSystem = upgradeSystem;
    this.inputHandler = inputHandler;
    this.playerLevelSystem = playerLevelSystem;
    this.comboSystem = comboSystem;
    this.collisionSystem = collisionSystem;
    
    // Create custom physics body (replaces Phaser's Arcade Physics body)
    const spawnTileX = Number.isFinite(config.playerSpawnTileX) ? config.playerSpawnTileX : config.spawnTileX;
    const spawnTileY = Number.isFinite(config.playerSpawnTileY) ? config.playerSpawnTileY : config.spawnTileY;
    const spawn = this._bodyPositionForStandingTile(spawnTileX, spawnTileY);
    const physicsX = spawn.x;
    const physicsY = spawn.y;
    this.physicsBody = new PlayerPhysicsBody(config, physicsX, physicsY);
    
    // Initialize subsystems
    this.input = new PlayerInput(scene, inputHandler);
    this.movement = new PlayerMovement(this.physicsBody, config);
    this.abilities = new PlayerAbilities(sprite, worldModel, config, upgradeSystem, this.physicsBody, playerLevelSystem, comboSystem);
    this.state = new PlayerState(this.physicsBody, worldModel, config, upgradeSystem);
  }

  teleportToTile(tx, ty) {
    const bodyPos = this._bodyPositionForStandingTile(tx, ty);
    this.physicsBody.setPosition(bodyPos.x, bodyPos.y);
    this.physicsBody.resetVelocity();
  }

  _bodyPositionForStandingTile(tx, ty) {
    const tileSize = this.config.tileSize;
    return {
      x: tx * tileSize + tileSize / 2 - this.config.playerBodyWidthPx / 2,
      y: (ty + 1) * tileSize - this.config.playerBodyHeightPx
    };
  }

  setControlsEnabled(enabled) {
    this.input.setControlsEnabled(enabled);
    
    if (!enabled && this.physicsBody) {
      this.physicsBody.resetVelocity();
      // Clear flying state to prevent getting stuck
      this.abilities.resetFlyingState();
      // Reset climbing state to prevent getting stuck
      this.state.setClimbing(false);
      this.physicsBody.setClimbing(false);
    }
  }

  _getWalkSpeed() {
    let baseSpeed = this.config.walkSpeedPxPerSec;
    
    // Apply upgrade system bonuses
    if (this.upgradeSystem) {
      baseSpeed = this.upgradeSystem.getEffectiveWalkSpeed(baseSpeed);
    }
    
    // Apply level-based movement speed bonus
    if (this.playerLevelSystem) {
      const speedMultiplier = this.playerLevelSystem.getMovementSpeedMultiplier();
      baseSpeed = baseSpeed * speedMultiplier;
    }

    if (this.abilities?.isQuickslashActive?.()) {
      const quickslashBurstSpeed = this.abilities.getConstellationStats?.().quickslashBurstSpeed || 0;
      baseSpeed += quickslashBurstSpeed;
    }
    
    return baseSpeed;
  }

  getEffectiveWalkSpeed() {
    return this._getWalkSpeed();
  }

  getWalkSpeedRatio() {
    const baseSpeed = this.config.walkSpeedPxPerSec || PLAYER_STATS_CONFIG.walkSpeedPxPerSec || 200;
    return this._getWalkSpeed() / baseSpeed;
  }

  getDashCooldownMs() {
    return this.abilities.getDashCooldownMs();
  }

  update(delta = 16.67) {
    if (!this.physicsBody) return;
    const dt = Math.min(delta / 1000, 0.05); // cap at 50ms to prevent lag-spike physics errors
    this.externalKnockbackMs = Math.max(0, (this.externalKnockbackMs || 0) - delta);
    
    // Update state (ground detection, coyote time, etc.)
    this.state.update(dt, this.input, this.abilities);
    
    // Update abilities (climbing, gem power regen)
    this.abilities.update(dt, this.input, this.state.isGrounded(), this.movement.isFacingRight());
    this.state.setClimbing(Boolean(this.abilities.isClimbing?.() || this.abilities.isFlying?.()));
    
    // Update movement (pass collision system for tile-based collision resolution)
    this.movement.update(dt, this.collisionSystem, this.state.isClimbing());
    
    // Apply horizontal movement
    if (this.externalKnockbackMs <= 0) {
      const horizMove = this.input.getHorizontalMovement();
      this.movement.applyHorizontalMovement(this._getWeatherAdjustedWalkSpeed(), horizMove.left, horizMove.right);
    }
    
    // Update aim
    this.input.updateAim();
    
    // Sync sprite position with physics body
    this._syncSpriteWithPhysics();
    
  }

  _getWeatherAdjustedWalkSpeed() {
    const baseSpeed = this._getWalkSpeed();
    const weatherState = this.scene?.weatherSystem?.getPlayerWeatherState?.();
    const penalty = weatherState?.onWetSurface
      ? (weatherState.movementWetnessPenalty || 0)
      : 0;
    return baseSpeed * Math.max(0.1, 1 - penalty);
  }
  
  /**
   * Sync sprite position with custom physics body
   * Phaser best practice: sprite origin at (0.5, 1) means bottom-center
   * Physics body tracks top-left position with padding on all sides
   * @private
   */
  _syncSpriteWithPhysics() {
    if (!this.physicsBody || !this.sprite) return;
    
    // Physics body uses top-left coordinates. Most character sheets are bottom-center
    // anchored; one-tile vehicle bodies can opt into center anchoring.
    const motionState = this.getMotionState();
    const isAirborneVisual = motionState === 'airborne' || motionState === 'climb';
    const groundedVisualYOffset = !isAirborneVisual && this.state.isGrounded() ? 6 : 0;
    this.sprite.x = this.physicsBody.x + this.physicsBody.w / 2;
    if (this.config.playerVisualOriginCenter) {
      this.sprite.y = this.physicsBody.y + this.physicsBody.h / 2;
    } else {
      this.sprite.y = this.physicsBody.y + this.physicsBody.h + groundedVisualYOffset;
    }

    const visualOffset = this.sprite.getData?.("visualOffset");
    if (visualOffset) {
      this.sprite.x += visualOffset.x || 0;
      this.sprite.y += visualOffset.y || 0;
    }
    
  }
  
  // Public API methods
  
  consumeMineInput() {
    return this.input.getMineInput();
  }

  consumeResetInput() {
    return this.input.getResetInput();
  }

  getAimLabel() {
    return this.input.getAimLabel();
  }

  getAimVector() {
    return this.input.getAimVector();
  }

  getAimTargetTile() {
    const playerTile = this.state.getPlayerTile();
    const aim = this.input.getAimVector();
    return {
      tx: playerTile.tx + aim.x,
      ty: playerTile.ty + aim.y,
    };
  }

  getMotionState() {
    return this.state.getMotionState();
  }

  isGrounded() {
    return this.state.isGrounded();
  }

  getGemPowerPercent() {
    return this.abilities.getGemPowerPercent();
  }

  getGemPowerRaw() {
    return this.abilities.getGemPowerRaw();
  }

  getGemPowerMax() {
    return this.abilities.getGemPowerMax();
  }

  setProgressionGemPowerMaxBonus(bonus) {
    this.abilities?.setProgressionGemPowerMaxBonus?.(bonus);
  }

  hasGemPower() {
    return this.abilities?.hasGemPower?.() ?? false;
  }

  consumeGemPower(amount) {
    return this.abilities?.consumeGemPower?.(amount) ?? 0;
  }

  drainAllGemPower() {
    return this.abilities?.drainAllGemPower?.() ?? 0;
  }

  applyExternalKnockback(vx, vy) {
    if (!this.physicsBody) return;
    this.physicsBody.vx = Number.isFinite(vx) ? vx : 0;
    this.physicsBody.vy = Number.isFinite(vy) ? vy : 0;
    this.externalKnockbackMs = 300;
    this.state?.setClimbing(false);
  }

  isFacingRight() {
    return this.movement.isFacingRight();
  }

  getPlayerTile() {
    return this.state.getPlayerTile();
  }

  getPlayerPosition() {
    return {
      x: this.sprite.x,
      y: this.sprite.y
    };
  }
}
