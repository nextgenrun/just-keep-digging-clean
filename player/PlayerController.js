import { PlayerInput } from './PlayerInput.js';
import { PlayerMovement } from './PlayerMovement.js';
import { PlayerAbilities } from './PlayerAbilities.js';
import { PlayerState } from './PlayerState.js';
import { PlayerPhysicsBody } from './PlayerPhysicsBody.js';
import { PlayerSurfaceDropController } from './PlayerSurfaceDropController.js';
import { MovingSideDigStandOffController } from './MovingSideDigStandOffController.js';
import { GAME_CONFIG } from '../values/gameConfig.js';
import { PLAYER_STATS_CONFIG } from '../values/playerStats.js';
import { PLAYER_ABILITIES_CONFIG } from '../values/playerAbilities.js';
import { PLAYER_MOTION_POLISH_CONFIG } from '../values/playerMotionPolish.js';
import { PLAYER_KINEMATIC_MOTION_CONFIG } from '../values/playerKinematicMotion.js';
import { PLAYER_COLLISION_CONFIG } from '../values/playerCollision.js';
import { resolvePlayerVisualOrigin } from '../values/playerAssetProfiles.js?rev=20260718-mesh-grounded';
import { sanitizePlayerPersistenceData } from '../values/playerPersistence.js';
import { createResolvedMovementSnapshot } from '../systems/progression/ResolvedPlayerStats.js';

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
    this.abilities.setGemPowerChangeListener((event) => {
      this.scene?.handlePlayerGemPowerChanged?.(event);
    });
    this.state = new PlayerState(this.physicsBody, worldModel, config, upgradeSystem);
    this.surfaceDrop = new PlayerSurfaceDropController(this.input, collisionSystem, this.physicsBody, config.topAirRows);
    this.movingSideDigStandOff = new MovingSideDigStandOffController(
      this.physicsBody,
      worldModel,
      config.tileSize,
      scene?.playerAssetProfile?.movingSideDigConfig?.movement?.tileFaceStandOff,
    );
  }

  teleportToTile(tx, ty) {
    this.surfaceDrop.reset();
    this.movingSideDigStandOff.end();
    const bodyPos = this._bodyPositionForStandingTile(tx, ty);
    this.physicsBody.setPosition(bodyPos.x, bodyPos.y);
    this.physicsBody.resetVelocity();
    this.collisionSystem?.resolveBodyOverlap?.(this.physicsBody);
    this._syncSpriteWithPhysics();
    this.scene?.playTeleportInAnimation?.();
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
      this.surfaceDrop.reset();
      this.movingSideDigStandOff.end();
      this.physicsBody.resetVelocity();
      // Clear flying state to prevent getting stuck
      this.abilities.resetFlyingState();
      // Reset climbing state to prevent getting stuck
      this.state.setClimbing(false);
      this.physicsBody.setClimbing(false);
    }
  }

  _resolveMovementStats(includeTemporary = true) {
    const effects = this.upgradeSystem?.getUpgradeEffects?.() || {};
    const levelMultiplier = this.playerLevelSystem?.getMovementSpeedMultiplier?.() ?? 1;
    const actionBonus = includeTemporary && this.abilities?.isQuickslashActive?.()
      ? this.abilities.getConstellationStats?.().quickslashBurstSpeed || 0
      : 0;
    return createResolvedMovementSnapshot({
      baseSpeed: this.config.walkSpeedPxPerSec,
      flatBonus: effects.walkSpeed || 0,
      multiplier: levelMultiplier,
      actionBonus,
      override: this.upgradeSystem?.isGodModeActive?.() ? 2000 : null,
    });
  }

  _getWalkSpeed(includeTemporary = true) {
    return this._resolveMovementStats(includeTemporary).movementSpeedPxPerSec;
  }

  getEffectiveWalkSpeed() {
    return this._getWalkSpeed();
  }

  getResolvedStatsSnapshot({ includeTemporary = false } = {}) {
    return this._resolveMovementStats(includeTemporary);
  }

  getWalkSpeedRatio() {
    const baseSpeed = this.config.walkSpeedPxPerSec || PLAYER_STATS_CONFIG.walkSpeedPxPerSec || 200;
    return this._getWalkSpeed() / baseSpeed;
  }

  getDashCooldownMs() {
    return this.abilities.getDashCooldownMs();
  }

  beginMovingSideDigStandOff(options) {
    const active = this.movingSideDigStandOff.begin(options);
    if (active) this._syncSpriteWithPhysics();
    return active;
  }

  endMovingSideDigStandOff() {
    return this.movingSideDigStandOff.end();
  }

  update(delta = 16.67) {
    if (!this.physicsBody) return;
    const dt = Math.min(delta / 1000, PLAYER_COLLISION_CONFIG.maxDeltaSeconds);
    this.surfaceDrop.update();
    this.externalKnockbackMs = Math.max(0, (this.externalKnockbackMs || 0) - delta);
    
    // Update state (ground detection, coyote time, etc.)
    this.state.update(dt, this.input, this.abilities, this.collisionSystem);
    
    // Update abilities (climbing, gem power regen)
    this.abilities.update(dt, this.input, this.state.isGrounded(), this.movement.isFacingRight());
    this.state.setClimbing(Boolean(this.abilities.isClimbing?.() || this.abilities.isFlying?.()));
    
    // Apply this frame's horizontal input before collision integration.
    if (this.externalKnockbackMs <= 0) {
      const horizMove = this.input.getHorizontalMovement();
      this.movement.applyHorizontalMovement(this._getWeatherAdjustedWalkSpeed(), horizMove.left, horizMove.right);
    }

    // Integrate and resolve against authoritative tile collision.
    this.movement.update(dt, this.collisionSystem, this.state.isClimbing());
    this.movingSideDigStandOff.update();
    this.state.refreshAfterPhysics(this.input, this.abilities, this.collisionSystem);
    
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

    // The physics body remains authoritative. Only the visible sheet anchor
    // changes so mixed Blender/UAL sheets share the same ground contact.
    const visualOrigin = resolvePlayerVisualOrigin(
      this.scene?.playerAssetProfile,
      this.sprite.anims?.currentAnim?.key,
      this.sprite.texture?.key,
      {
        x: 0.5,
        y: this.config.playerVisualOriginCenter ? 0.5 : 1,
      },
    );
    if (this.sprite.originX !== visualOrigin.x || this.sprite.originY !== visualOrigin.y) {
      this.sprite.setOrigin(visualOrigin.x, visualOrigin.y);
    }
    
    // Physics body uses top-left coordinates. Most character sheets are bottom-center
    // anchored; one-tile vehicle bodies can opt into center anchoring.
    const motionState = this.getMotionState();
    const isAirborneVisual = motionState === 'airborne' || motionState === 'climb';
    const fallbackGroundedOffset = this.scene?.playerAssetProfile?.isUalNative
      ? PLAYER_KINEMATIC_MOTION_CONFIG.anchor.ualGroundedOffsetPx
      : PLAYER_KINEMATIC_MOTION_CONFIG.anchor.legacyGroundedOffsetPx;
    const groundedVisualYOffset = !isAirborneVisual && this.state.isGrounded()
      ? (this.scene?.playerKinematicMotion?.getGroundedVisualYOffset?.() ?? fallbackGroundedOffset)
      : 0;
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

  getVerticalAim() {
    return this.input.getVerticalAim();
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

  getGemPowerExact() {
    return this.abilities?.getGemPowerExact?.() ?? 0;
  }

  setGemPowerExact(amount, options) {
    return this.abilities?.setGemPowerExact?.(amount, options) ?? 0;
  }

  consumeGemPower(amount, context) {
    return this.abilities?.consumeGemPower?.(amount, context) ?? 0;
  }

  setGemPowerFloorProvider(provider) {
    this.abilities?.setGemPowerFloorProvider?.(provider);
  }

  getSpendableGemPower(context) {
    return this.abilities?.getSpendableGemPower?.(context) ?? 0;
  }

  hasSpendableGemPower(context) {
    return this.abilities?.hasSpendableGemPower?.(context) ?? false;
  }

  canSpendGemPower(amount, context) {
    return this.abilities?.canSpendGemPower?.(amount, context) ?? false;
  }

  fillGemPower() {
    return this.abilities?.fillGemPower?.() ?? 0;
  }

  drainAllGemPower(context) {
    return this.abilities?.drainAllGemPower?.(context) ?? 0;
  }

  getPersistenceData() {
    return sanitizePlayerPersistenceData({
      bodyX: this.physicsBody?.x,
      bodyY: this.physicsBody?.y,
      gemPower: this.getGemPowerExact(),
      facingRight: this.isFacingRight(),
    });
  }

  restorePersistenceData(data) {
    const normalized = sanitizePlayerPersistenceData(data);
    const body = this.physicsBody;
    if (!normalized || !body || !this.worldModel) return false;
    const maxX = Math.max(0, this.worldModel.widthPx - body.w);
    const maxY = Math.max(
      0,
      this.worldModel.depthTiles * this.config.tileSize - body.h,
    );
    if (
      normalized.bodyX > maxX
      || normalized.bodyY > maxY
    ) {
      return false;
    }

    const previous = { x: body.x, y: body.y };
    this.surfaceDrop.reset();
    this.movingSideDigStandOff.end();
    body.setPosition(normalized.bodyX, normalized.bodyY);
    body.resetVelocity();
    if (this.collisionSystem && !this.collisionSystem.resolveBodyOverlap(body)) {
      body.setPosition(previous.x, previous.y);
      body.resetVelocity();
      this._syncSpriteWithPhysics();
      return false;
    }
    this.setFacingRight(normalized.facingRight);
    this.setGemPowerExact(normalized.gemPower, { silent: true, source: "restore" });
    this._syncSpriteWithPhysics();
    return true;
  }

  applyExternalKnockback(vx, vy) {
    if (!this.physicsBody) return;
    this.movingSideDigStandOff.end();
    this.physicsBody.vx = Number.isFinite(vx) ? vx : 0;
    this.physicsBody.vy = Number.isFinite(vy) ? vy : 0;
    this.externalKnockbackMs = PLAYER_MOTION_POLISH_CONFIG.hitReaction.externalKnockbackLockMs;
    this.state?.setClimbing(false);
    this.scene?.playPlayerImpactReaction?.();
  }

  isFacingRight() {
    return this.movement.isFacingRight();
  }

  setFacingRight(facingRight) {
    this.movement.setFacingRight(facingRight);
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
