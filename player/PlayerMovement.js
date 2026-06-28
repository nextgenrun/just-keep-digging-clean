/**
 * PlayerMovement — Handles player movement, facing direction, and speed.
 * Uses TileCollisionSystem for deterministic grid-based collision resolution.
 */
export class PlayerMovement {
  constructor(physicsBody, config) {
    this.body = physicsBody;
    this.config = config;
    this._facingRight = true;
    this._walkSpeed = config.walkSpeedPxPerSec || 200;
    this._climbSpeed = config.climbSpeedPxPerSec || 252;
    // Maximum velocity hard cap to prevent extreme tunneling
    this.MAX_ABSOLUTE_VELOCITY = config.tileSize * 30;
  }

  setWalkSpeed(speed) { this._walkSpeed = speed; }
  setClimbSpeed(speed) { this._climbSpeed = speed; }

  isFacingRight() { return this._facingRight; }

  /**
   * Update physics with collision resolution
   * @param {number} dt - Delta time in seconds
   * @param {TileCollisionSystem} collisionSystem - Custom collision system
   * @param {boolean} isClimbing - Whether player is climbing
   */
  update(dt, collisionSystem, isClimbing) {
    if (!this.body) return;
    
    // Climbing overrides gravity
    if (isClimbing) {
      this.body.vy = 0;
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
      
      // Sync climbing state to physics body
      this.body.setClimbing(isClimbing);
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

  applyHorizontalMovement(speed, left, right) {
    if (!this.body) return;
    
    if (left) {
      this.body.vx = -speed;
      this._facingRight = false;
    } else if (right) {
      this.body.vx = speed;
      this._facingRight = true;
    } else {
      this.body.vx = 0;
    }
  }

  applyVerticalMovement(speed, up, down) {
    if (up) this.body.vy = -speed;
    else if (down) this.body.vy = speed;
    else this.body.vy = 0;
  }

  jump(velocityY) {
    this.body.vy = velocityY;
    this.body.justJumped = true;
  }

  /**
   * Stop all movement
   */
  stopMovement() {
    if (!this.body) return;
    this.body.resetVelocity();
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
  getClimbSpeed() { return this._climbSpeed; }
}
