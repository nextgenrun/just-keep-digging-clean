/**
 * Custom physics body for player
 * Replaces Phaser's Arcade Physics body with custom tile-based physics
 * Supports gravity and collision resolution
 */
export class PlayerPhysicsBody {
  constructor(config, x, y) {
    // Physics properties
    this.x = x;
    this.y = y;
    
    // Hitbox dimensions (slightly smaller than sprite for smoother movement)
    this.w = config.playerBodyWidthPx;
    this.h = config.playerBodyHeightPx;
    
    // Velocity
    this.vx = 0;
    this.vy = 0;
    
    // Gravity
    this.gravity = config.gravityY;
    
    this.maxFallSpeed = config.maxFallSpeedPxPerSec;
    this.walkSpeed = config.walkSpeedPxPerSec;
    
    // Ground detection
    this.onGround = false;
    
    // Just jumped state (for animation) - kept for backward compatibility
    this.justJumped = false;
    
    // Climbing state
    this.isClimbing = false;
  }

  /**
   * Update physics - apply gravity and cap velocities
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Apply gravity if not climbing
    if (!this.isClimbing) {
      this.vy += this.gravity * dt;
    }
    
    // Cap fall speed to prevent tunneling
    this.vy = Math.min(this.vy, this.maxFallSpeed);
    
    // Note: Horizontal velocity is NOT capped here anymore
    // The walkSpeed can be increased by agility upgrades
    // PlayerMovement._enforceMaximumVelocity() handles the absolute velocity cap
    // applyHorizontalMovement() sets vx directly to the current walk speed
  }

  /**
   * Apply horizontal movement
   * @param {number} speed - Speed multiplier
   * @param {boolean} moveLeft - Moving left
   * @param {boolean} moveRight - Moving right
   */
  applyHorizontalMovement(speed, moveLeft, moveRight) {
    if (moveLeft) {
      this.vx = -speed;
    } else if (moveRight) {
      this.vx = speed;
    } else {
      this.vx = 0;
    }
  }

  /**
   * Set climbing state
   * @param {boolean} climbing - Whether player is climbing
   */
  setClimbing(climbing) {
    this.isClimbing = climbing;
  }

  /**
   * Check if player just jumped this frame
   * @returns {boolean}
   */
  isJustJumped() {
    return this.justJumped;
  }

  /**
   * Reset just jumped state
   */
  resetJustJumped() {
    this.justJumped = false;
  }

  /**
   * Get the AABB bounds of this body (used by tile collision).
   * @returns {{ left: number, right: number, top: number, bottom: number }}
   */
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.w,
      top: this.y,
      bottom: this.y + this.h,
    };
  }

  /**
   * Get horizontal center of the body.
   * @returns {number}
   */
  getCenterX() {
    return this.x + this.w / 2;
  }

  /**
   * Get current position as center point
   * @returns {Object} {x, y} center coordinates
   */
  getCenter() {
    return {
      x: this.x + this.w / 2,
      y: this.y + this.h / 2
    };
  }

  /**
   * Get current position as top-left point
   * @returns {Object} {x, y} top-left coordinates
   */
  getPosition() {
    return {
      x: this.x,
      y: this.y
    };
  }

  /**
   * Set position
   * @param {number} x - X position (top-left)
   * @param {number} y - Y position (top-left)
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Reset velocity
   */
  resetVelocity() {
    this.vx = 0;
    this.vy = 0;
  }
}