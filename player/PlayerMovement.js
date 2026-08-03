import { PLAYER_COLLISION_CONFIG } from "../values/playerCollision.js";
import {
  PLAYER_GROUND_MOTION_CONFIG,
  resolvePlayerGroundMotionEnabled,
} from "../values/playerGroundMotion.js";
import { resolveGroundHorizontalVelocity } from "./playerGroundMotion.js";

/**
 * PlayerMovement — Handles player movement, facing direction, and speed.
 * Uses TileCollisionSystem for deterministic grid-based collision resolution.
 */
export class PlayerMovement {
  constructor(physicsBody, config, groundMotionConfig = PLAYER_GROUND_MOTION_CONFIG) {
    this.body = physicsBody;
    this.config = config;
    this.groundMotionConfig = groundMotionConfig;
    this.groundMotionEnabled = resolvePlayerGroundMotionEnabled(
      globalThis.location?.search || "",
      groundMotionConfig,
    );
    this._reversalTargetSign = 0;
    this._facingRight = true;
    this._walkSpeed = config.walkSpeedPxPerSec || 200;
    // Maximum velocity hard cap to prevent extreme tunneling
    this.MAX_ABSOLUTE_VELOCITY = config.tileSize * PLAYER_COLLISION_CONFIG.maxVelocityTilesPerSecond;
  }

  setWalkSpeed(speed) { this._walkSpeed = speed; }

  isFacingRight() { return this._facingRight; }
  setFacingRight(facingRight) { this._facingRight = facingRight === true; }

  /**
   * Update physics with collision resolution
   * @param {number} dt - Delta time in seconds
   * @param {TileCollisionSystem} collisionSystem - Custom collision system
   * @param {boolean} isFlightActive - Whether powered flight is active
   */
  update(dt, collisionSystem, isFlightActive) {
    if (!this.body) return;
    if (collisionSystem && !collisionSystem.resolveBodyOverlap(this.body)) {
      this.resetGroundMotionState();
      this.body.resetVelocity();
      return;
    }
    
    // Update physics body (gravity, velocity caps)
    this.body.update(dt);
    
    // Enforce maximum velocity hard cap
    this._enforceMaximumVelocity();
    
    // Resolve collisions using custom tile system
    // Move X first, then Y (axis-separated collision)
    if (collisionSystem) {
      const moveX = this.body.vx * dt;
      const moveY = this.body.vy * dt;
      
      // Resolve horizontal collision
      collisionSystem.moveAndCollideX(this.body, moveX);
      
      // Resolve vertical collision
      collisionSystem.moveAndCollideY(this.body, moveY);
      
      // Sync flight state to physics body
      this.body.setFlightActive(isFlightActive);
    }
  }

  /**
   * Enforce maximum velocity hard cap to prevent extreme tunneling
   * @private
   */
  _enforceMaximumVelocity() {
    if (this.body.vy > this.MAX_ABSOLUTE_VELOCITY) {
      this.body.vy = this.MAX_ABSOLUTE_VELOCITY;
    }
    if (this.body.vy < -this.MAX_ABSOLUTE_VELOCITY) {
      this.body.vy = -this.MAX_ABSOLUTE_VELOCITY;
    }
    if (this.body.vx > this.MAX_ABSOLUTE_VELOCITY) {
      this.body.vx = this.MAX_ABSOLUTE_VELOCITY;
    }
    if (this.body.vx < -this.MAX_ABSOLUTE_VELOCITY) {
      this.body.vx = -this.MAX_ABSOLUTE_VELOCITY;
    }
  }

  applyHorizontalMovement(speed, left, right, deltaSeconds = null, smoothGroundMotion = false) {
    if (!this.body) return;
    let targetVelocity = 0;
    if (left) {
      targetVelocity = -speed;
      this._facingRight = false;
    } else if (right) {
      targetVelocity = speed;
      this._facingRight = true;
    }

    const canSmooth = smoothGroundMotion
      && this.groundMotionEnabled
      && Number.isFinite(deltaSeconds)
      && deltaSeconds > 0;
    if (!canSmooth) {
      this._reversalTargetSign = 0;
      this.body.vx = targetVelocity;
      return;
    }

    const targetSign = Math.sign(targetVelocity);
    const currentSign = Math.sign(this.body.vx);
    if (targetSign === 0) {
      this._reversalTargetSign = 0;
    } else if (currentSign !== 0 && currentSign !== targetSign) {
      this._reversalTargetSign = targetSign;
    } else if (this._reversalTargetSign !== 0 && this._reversalTargetSign !== targetSign) {
      this._reversalTargetSign = 0;
    }
    this.body.vx = resolveGroundHorizontalVelocity({
      currentVelocity: this.body.vx,
      targetVelocity,
      effectiveMaxSpeed: speed,
      deltaSeconds,
      config: this.groundMotionConfig,
      reversing: this._reversalTargetSign === targetSign,
    });
    if (this.body.vx === targetVelocity) this._reversalTargetSign = 0;
  }

  applyVerticalMovement(speed, up, down) {
    if (up) this.body.vy = -speed;
    else if (down) this.body.vy = speed;
    else this.body.vy = 0;
  }

  /**
   * Stop all movement
   */
  stopMovement() {
    if (!this.body) return;
    this.resetGroundMotionState();
    this.body.resetVelocity();
  }

  resetGroundMotionState() {
    this._reversalTargetSign = 0;
  }

  /**
   * Get current velocity
   * @returns {Object} { x: number, y: number }
   */
  getVelocity() {
    if (!this.body) return { x: 0, y: 0 };
    return {
      x: this.body.vx,
      y: this.body.vy
    };
  }

  getSpeed() { return this._walkSpeed; }
}
