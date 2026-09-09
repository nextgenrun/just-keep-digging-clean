import { PlayerInput } from './PlayerInput.js';
import { PlayerMovement } from './PlayerMovement.js';
import { PlayerAbilities } from './PlayerAbilities.js';
import { PlayerState } from './PlayerState.js';
import { PlayerPhysicsBody } from './PlayerPhysicsBody.js';
import { PlayerSurfaceDropController } from './PlayerSurfaceDropController.js';
import { PlayerFlightMotion } from './PlayerFlightMotion.js';
import { PlayerJumpMotion } from './PlayerJumpMotion.js';
import { PlayerLedgeAssist } from './PlayerLedgeAssist.js';
import { MovingSideDigStandOffController } from './MovingSideDigStandOffController.js';
import { GAME_CONFIG } from '../values/gameConfig.js';
import { PLAYER_STATS_CONFIG } from '../values/playerStats.js';
import { PLAYER_ABILITIES_CONFIG } from '../values/playerAbilities.js';
import { PLAYER_MOTION_POLISH_CONFIG } from '../values/playerMotionPolish.js';
import { PLAYER_KINEMATIC_MOTION_CONFIG } from '../values/playerKinematicMotion.js';
import { PLAYER_RUNNING_CONFIG } from '../values/playerRunning.js';
import { GOD_MODE_CONFIG } from '../values/godMode.js';
import {
  PLAYER_COLLISION_CONFIG,
  PLAYER_COLLISION_POLISH_V2,
  resolvePlayerCollisionPolishV2Enabled,
} from '../values/playerCollision.js';
import { resolvePlayerVisualOrigin } from '../values/playerAssetProfiles.js?rev=20260821-moving-complex-dig-v1';
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
    this.physicsBody.setCollisionValidator((body) => (
      this.collisionSystem?.resolveBodyOverlap?.(body)
      ?? body.captureCollisionSafeState?.()
      ?? true
    ));
    this.collisionSystem?.resolveBodyOverlap?.(this.physicsBody);
    this.collisionPolishV2Enabled = resolvePlayerCollisionPolishV2Enabled(
      scene?.playerAssetProfile,
    );
    this._collisionCrouchForced = false;
    
    // Initialize subsystems
    this.input = new PlayerInput(scene, inputHandler);
    this.movement = new PlayerMovement(this.physicsBody, config);
    this.flightMotion = new PlayerFlightMotion(this.physicsBody, config);
    this.jumpMotion = new PlayerJumpMotion(this.physicsBody, config);
    this.ledgeAssist = new PlayerLedgeAssist(
      this.physicsBody,
      worldModel,
      collisionSystem,
      config.tileSize,
    );
    this.traversalActionLockProvider = null;
    this.abilities = new PlayerAbilities(sprite, worldModel, config, upgradeSystem, this.physicsBody, playerLevelSystem, comboSystem);
    this.abilities.setGemPowerChangeListener((event) => {
      this.scene?.handlePlayerGemPowerChanged?.(event);
    });
    this.state = new PlayerState(this.physicsBody, worldModel, config, upgradeSystem);
    this.surfaceDrop = new PlayerSurfaceDropController(this.input, collisionSystem, this.physicsBody, config.topAirRows);
    const movingSideDigStandOffConfig = scene?.playerAssetProfile
      ?.movingSideDigConfig?.movement?.tileFaceStandOff;
    const collisionPolishedStandOffConfig = this.collisionPolishV2Enabled
      && movingSideDigStandOffConfig
      ? {
        ...movingSideDigStandOffConfig,
        ...PLAYER_COLLISION_POLISH_V2.movingSideDigStandOff,
      }
      : movingSideDigStandOffConfig;
    this.movingSideDigStandOff = new MovingSideDigStandOffController(
      this.physicsBody,
      worldModel,
      config.tileSize,
      collisionPolishedStandOffConfig,
    );
  }

  teleportToTile(tx, ty) {
    this.ledgeAssist?.cancel();
    this.surfaceDrop.reset();
    this.movingSideDigStandOff.end();
    this._forceCollisionPolishProfile("upright");
    const bodyPos = this._bodyPositionForStandingTile(tx, ty);
    const placed = this.physicsBody.setPosition(bodyPos.x, bodyPos.y);
    this.physicsBody.resetVelocity();
    this.movement.resetGroundMotionState();
    this.flightMotion?.reset();
    this.jumpMotion?.reset();
    this._syncSpriteWithPhysics();
    if (placed === false) return false;
    this.scene?.playTeleportInAnimation?.();
    return true;
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
      this.ledgeAssist?.cancel();
      this.surfaceDrop.reset();
      this.movingSideDigStandOff.end();
      this.physicsBody.resetVelocity();
      this.movement.resetGroundMotionState();
      this.flightMotion?.reset();
      this.jumpMotion?.reset();
      // Clear flying state to prevent getting stuck
      this.abilities.resetFlyingState();
      // Reset flight state to prevent getting stuck
      this.state.setFlightActive(false);
      this.physicsBody.setFlightActive(false);
    }
  }

  _resolveMovementStats(includeTemporary = true) {
    const effects = this.upgradeSystem?.getUpgradeEffects?.() || {};
    const levelMultiplier = this.playerLevelSystem?.getMovementSpeedMultiplier?.() ?? 1;
    const quickslashActive = this.abilities?.isQuickslashActive?.() === true;
    const actionBonus = includeTemporary && quickslashActive
      ? this.abilities.getQuickslashMovementBonus?.()
        ?? (
          PLAYER_ABILITIES_CONFIG.quickslashMovementBonusPxPerSec
            + (this.abilities.getConstellationStats?.().quickslashBurstSpeed || 0)
        )
      : 0;
    return createResolvedMovementSnapshot({
      baseSpeed: this.config.walkSpeedPxPerSec,
      flatBonus: effects.walkSpeed || 0,
      multiplier: levelMultiplier,
      actionBonus,
      override: this.upgradeSystem?.isGodModeActive?.()
        ? GOD_MODE_CONFIG.movementSpeedPxPerSec
        : null,
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

  _getGroundTravelSpeed() {
    const walkSpeed = this._getWalkSpeed();
    return this.isRunning()
      ? walkSpeed * PLAYER_RUNNING_CONFIG.speedMultiplier
      : walkSpeed;
  }

  getWalkSpeedRatio() {
    const baseSpeed = this.config.walkSpeedPxPerSec || PLAYER_STATS_CONFIG.walkSpeedPxPerSec || 200;
    return this._getGroundTravelSpeed() / baseSpeed;
  }

  isRunning() { return this.abilities?.isRunning?.() === true; }


  beginMovingSideDigStandOff(options) {
    const active = this.movingSideDigStandOff.begin(options);
    if (active) this._syncSpriteWithPhysics();
    return active;
  }

  endMovingSideDigStandOff() {
    return this.movingSideDigStandOff.end();
  }

  setTraversalActionLockProvider(provider) {
    this.traversalActionLockProvider = typeof provider === 'function' ? provider : null;
  }

  _isTraversalActionLocked() {
    return this.traversalActionLockProvider?.() === true
      || this.scene?.isDigAnimating === true
      || this.scene?._teleportInAnimating === true;
  }

  _forceCollisionPolishProfile(profileId) {
    if (!this.collisionPolishV2Enabled || this.physicsBody?.collisionKind !== "rect") return false;
    const profile = PLAYER_COLLISION_POLISH_V2.profiles[profileId];
    if (!profile) return false;
    const applied = this.physicsBody.forceRectProfile(profileId, profile);
    if (applied && profileId !== "crouch") this._collisionCrouchForced = false;
    return applied;
  }

  _resolveCollisionPolishProfileId(ledgeActive = false) {
    if (ledgeActive) return "upright";
    if (this.state.isFlightActive()) return "flight";
    if (!this.state.isGrounded()) return "airborne";
    const motionState = this.state.getMotionState();
    const verticalAim = this.input.getVerticalAim?.() || { down: false };
    if (motionState === "idle" && verticalAim.down === true) return "crouch";
    if (Math.abs(this.physicsBody?.vx || 0)
      >= PLAYER_COLLISION_POLISH_V2.locomotionMinHorizontalSpeedPxPerSec) {
      return "locomotion";
    }
    return "upright";
  }

  _updateCollisionPolishProfile(ledgeActive = false) {
    const body = this.physicsBody;
    if (!this.collisionPolishV2Enabled || !body || body.collisionKind !== "rect") return false;
    const profileId = this._resolveCollisionPolishProfileId(ledgeActive);
    const profile = PLAYER_COLLISION_POLISH_V2.profiles[profileId];
    if (!profile) return false;
    const currentProfile = PLAYER_COLLISION_POLISH_V2.profiles[body.collisionProfileId];
    const expandingFromCrouch = body.collisionProfileId === "crouch"
      && profileId !== "crouch"
      && profile.heightPx > (currentProfile?.heightPx || 0);
    const applied = body.tryRectProfile(profileId, profile, this.collisionSystem, {
      allowBottomFallback: body.collisionProfileId === "flight" && profileId !== "flight",
    });
    if (applied) {
      if (profileId !== "crouch") this._collisionCrouchForced = false;
      return true;
    }
    if (expandingFromCrouch && this.state.isGrounded()) {
      this._collisionCrouchForced = true;
    }
    return false;
  }

  requiresCrouchVisual() {
    return this.collisionPolishV2Enabled
      && this.physicsBody?.collisionProfileId === "crouch"
      && (this._collisionCrouchForced || this.input.getVerticalAim?.()?.down === true);
  }

  _validateCollisionSafety() {
    const body = this.physicsBody;
    if (!body) return false;
    const safe = this.collisionSystem?.resolveBodyOverlap?.(body)
      ?? body.captureCollisionSafeState?.()
      ?? true;
    if (safe) return true;
    this.ledgeAssist?.cancel();
    this.movingSideDigStandOff?.end();
    this.movement?.resetGroundMotionState();
    this.flightMotion?.reset();
    this.jumpMotion?.reset();
    body.resetVelocity();
    this.state?.refreshAfterPhysics?.(this.input, this.abilities, this.collisionSystem);
    return false;
  }

  update(delta = 16.67) {
    if (!this.physicsBody) return;
    this._validateCollisionSafety();
    const dt = Math.min(delta / 1000, PLAYER_COLLISION_CONFIG.maxDeltaSeconds);
    this.ledgeAssist?.updateCooldown(delta);
    const ledgeWasActive = this.ledgeAssist?.isActive() === true;
    if (!ledgeWasActive) this.surfaceDrop.update();
    this.externalKnockbackMs = Math.max(0, (this.externalKnockbackMs || 0) - delta);
    
    // Update state (ground detection, coyote time, etc.)
    this.state.update(dt, this.input, this.abilities, this.collisionSystem);

    const runMovement = this.input.getHorizontalMovement();
    const groundRunRequested = this.externalKnockbackMs <= 0
      && !ledgeWasActive
      && this.state.isGrounded()
      && this.input.getRunInput()
      && runMovement.left !== runMovement.right;
    
    // Update abilities (flight, gem power regen)
    this.abilities.update(
      dt,
      this.input,
      this.state.isGrounded(),
      this.movement.isFacingRight(),
      { actionLocked: ledgeWasActive, groundRunRequested },
    );
    this.state.setFlightActive(this.abilities.isFlying?.() === true);
    this._updateCollisionPolishProfile(ledgeWasActive);

    if (ledgeWasActive) {
      const ledgeResult = this.ledgeAssist.updateActive(delta, this.input, {
        flightActive: this.state.isFlightActive(),
      });
      this.state.setFlightActive(false);
      this.physicsBody.setFlightActive(false);
      this.flightMotion?.reset();
      this.jumpMotion?.reset();
      this.movement.resetGroundMotionState();
      this.state.refreshAfterPhysics(this.input, this.abilities, this.collisionSystem);
      this._validateCollisionSafety();
      this.input.updateAim();
      this._syncSpriteWithPhysics();
      if (ledgeResult !== 'released') return;
    }

    // Apply this frame's horizontal input before collision integration.
    if (this.externalKnockbackMs <= 0) {
      const horizMove = this.input.getHorizontalMovement();
      const flightActive = this.state.isFlightActive();
      // Consume Space in powered frames too; it must not become a delayed
      // jump when Flight ends or runs out of GP.
      const jumpStarted = this.jumpMotion.tryStart(this.input, this.state.isGrounded(), flightActive);
      if (flightActive) {
        this.jumpMotion.reset();
        this.flightMotion.updatePowered(
          dt,
          this.input,
          this.state.isGrounded(),
          this.abilities.getEffectiveFlightSpeed(),
        );
      } else {
        const walkSpeed = this._getWeatherAdjustedWalkSpeed();
        const coasting = this.flightMotion.updateUnpowered(
          dt,
          this.input,
          this.state.isGrounded(),
          walkSpeed,
        );
        if (coasting) this.jumpMotion.reset();
        if (!coasting) {
          const smoothGroundMotion = this.state.isGrounded() && !jumpStarted;
          const jumpMomentumHandled = jumpStarted || this.jumpMotion.updateAirborneHorizontal(
            dt,
            horizMove,
            smoothGroundMotion,
            flightActive,
            walkSpeed,
          );
          const landingMomentumHandled = !jumpMomentumHandled && this.jumpMotion.updateGroundedHorizontal(
            dt, horizMove, smoothGroundMotion, flightActive, walkSpeed,
          );
          if (jumpMomentumHandled || landingMomentumHandled) {
            if (horizMove.left !== horizMove.right) {
              this.movement.setFacingRight(horizMove.right);
            }
          } else {
            this.movement.applyHorizontalMovement(
              walkSpeed,
              horizMove.left,
              horizMove.right,
              dt,
              smoothGroundMotion,
            );
          }
        }
      }
    } else {
      this.input.consumeJumpInput();
    }

    // Integrate and resolve against authoritative tile collision.
    this.movement.update(dt, this.collisionSystem, this.state.isFlightActive());
    this.movingSideDigStandOff.update();
    this.state.refreshAfterPhysics(this.input, this.abilities, this.collisionSystem);
    this._updateCollisionPolishProfile(false);

    const grabbedLedge = this.externalKnockbackMs <= 0 && this.ledgeAssist?.tryGrab({
      input: this.input,
      grounded: this.state.isGrounded(),
      flightActive: this.state.isFlightActive(),
      facingRight: this.movement.isFacingRight(),
      actionLocked: this._isTraversalActionLocked(),
    });
    if (grabbedLedge) {
      this.surfaceDrop.reset();
      this.movingSideDigStandOff.end();
      this.flightMotion?.reset();
      this.jumpMotion?.reset();
      this.movement.resetGroundMotionState();
      this.state.setFlightActive(false);
      this.physicsBody.setFlightActive(false);
      this._updateCollisionPolishProfile(true);
      this.state.refreshAfterPhysics(this.input, this.abilities, this.collisionSystem);
    }

    this._validateCollisionSafety();
    
    // Update aim
    this.input.updateAim();
    
    // Sync sprite position with physics body
    this._syncSpriteWithPhysics();
    
  }

  _getWeatherAdjustedWalkSpeed() {
    const baseSpeed = this._getGroundTravelSpeed();
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
    const isAirborneVisual = motionState === 'airborne';
    const fallbackGroundedOffset = this.scene?.playerAssetProfile?.isUalNative
      ? PLAYER_KINEMATIC_MOTION_CONFIG.anchor.ualGroundedOffsetPx
      : PLAYER_KINEMATIC_MOTION_CONFIG.anchor.legacyGroundedOffsetPx;
    const groundedVisualYOffset = !isAirborneVisual && this.state.isGrounded()
      ? (this.scene?.playerKinematicMotion?.getGroundedVisualYOffset?.() ?? fallbackGroundedOffset)
      : 0;
    const visualAnchor = this.physicsBody.getVisualAnchor?.() || {
      x: this.physicsBody.x + this.physicsBody.w / 2,
      y: this.physicsBody.y + this.physicsBody.h,
    };
    this.sprite.x = visualAnchor.x;
    if (this.config.playerVisualOriginCenter) {
      this.sprite.y = this.physicsBody.y + this.physicsBody.h / 2;
    } else {
      this.sprite.y = visualAnchor.y + groundedVisualYOffset;
    }

    // Ledge collision snaps immediately for authority; the rendered survivor
    // eases from the pre-catch position into the authored grip pose.
    const ledgeOffset = this.ledgeAssist?.getVisualState?.()?.offset;
    if (ledgeOffset) {
      this.sprite.x += ledgeOffset.x || 0;
      this.sprite.y += ledgeOffset.y || 0;
    }

    const visualOffset = this.sprite.getData?.("visualOffset");
    if (visualOffset) {
      this.sprite.x += visualOffset.x || 0;
      this.sprite.y += visualOffset.y || 0;
    }
    
  }
  
  // Public API methods
  
  consumeMineInput() {
    if (this.ledgeAssist?.isActive()) return false;
    return this.input.getMineInput();
  }

  isLedgeAssistActive() {
    return this.ledgeAssist?.isActive() === true;
  }

  getLedgeVisualState() {
    return this.ledgeAssist?.getVisualState() || null;
  }

  getLedgeAssistSnapshot() {
    return this.ledgeAssist?.getSnapshot() || null;
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

  getEffectiveGemPowerCost(amount, context) {
    return this.abilities?.getEffectiveGemPowerCost?.(amount, context)
      ?? Math.max(0, Number(amount) || 0);
  }

  fillGemPower() {
    return this.abilities?.fillGemPower?.() ?? 0;
  }

  drainAllGemPower(context) {
    return this.abilities?.drainAllGemPower?.(context) ?? 0;
  }

  getPersistenceData() {
    const body = this.physicsBody;
    const upright = this.collisionPolishV2Enabled
      ? PLAYER_COLLISION_POLISH_V2.profiles.upright
      : null;
    const visualAnchor = body?.getVisualAnchor?.();
    return sanitizePlayerPersistenceData({
      bodyX: upright && visualAnchor ? visualAnchor.x - upright.widthPx / 2 : body?.x,
      bodyY: upright && visualAnchor ? visualAnchor.y - upright.heightPx : body?.y,
      gemPower: this.getGemPowerExact(),
      facingRight: this.isFacingRight(),
    });
  }

  restorePersistenceData(data) {
    const normalized = sanitizePlayerPersistenceData(data);
    const body = this.physicsBody;
    if (!normalized || !body || !this.worldModel) return false;
    const restoreProfile = this.collisionPolishV2Enabled
      ? PLAYER_COLLISION_POLISH_V2.profiles.upright
      : { widthPx: body.w, heightPx: body.h };
    const maxX = Math.max(0, this.worldModel.widthPx - restoreProfile.widthPx);
    const maxY = Math.max(
      0,
      this.worldModel.depthTiles * this.config.tileSize - restoreProfile.heightPx,
    );
    if (
      normalized.bodyX > maxX
      || normalized.bodyY > maxY
    ) {
      return false;
    }

    const previous = body.getCollisionProfileSnapshot?.() || { x: body.x, y: body.y };
    this.ledgeAssist?.cancel();
    this.surfaceDrop.reset();
    this.movingSideDigStandOff.end();
    this.flightMotion?.reset();
    this.jumpMotion?.reset();
    this._forceCollisionPolishProfile("upright");
    const placed = body.setPosition(normalized.bodyX, normalized.bodyY);
    body.resetVelocity();
    if (placed === false || (this.collisionSystem && !this.collisionSystem.resolveBodyOverlap(body))) {
      if (!body.restoreCollisionProfileSnapshot?.(previous)) {
        body.setPosition(previous.x, previous.y);
      }
      body.resetVelocity();
      this.collisionSystem?.resolveBodyOverlap?.(body);
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
    this.ledgeAssist?.cancel();
    this.movingSideDigStandOff.end();
    this.physicsBody.vx = Number.isFinite(vx) ? vx : 0;
    this.physicsBody.vy = Number.isFinite(vy) ? vy : 0;
    this.movement.resetGroundMotionState();
    this.flightMotion?.reset();
    this.jumpMotion?.reset();
    this.externalKnockbackMs = PLAYER_MOTION_POLISH_CONFIG.hitReaction.externalKnockbackLockMs;
    this.state?.setFlightActive(false);
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
