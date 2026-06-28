/**
 * Custom physics body for Shadow Miner
 * Mirrors PlayerPhysicsBody but with 2x strength
 * Supports gravity and collision resolution
 */
export class ShadowMinerPhysicsBody {
  constructor(config, x, y) {
    // Physics properties
    this.x = x;
    this.y = y;
    
    // Hitbox dimensions (same as player)
    this.w = config.bodyWidthPx;
    this.h = config.bodyHeightPx;
    
    // Velocity
    this.vx = 0;
    this.vy = 0;
    
    // Gravity
    this.gravity = config.gravity;
    
    this.maxFallSpeed = config.maxFallSpeed;
    this.walkSpeed = config.walkSpeedPxPerSec;
    
    // Ground detection
    this.onGround = false;
    
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
   * @param {boolean} climbing - Whether Shadow Miner is climbing
   */
  setClimbing(climbing) {
    this.isClimbing = climbing;
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