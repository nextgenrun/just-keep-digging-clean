/**
 * Player State Handler
 * Manages ground detection and state validation
 * Updated to work with custom PlayerPhysicsBody instead of Phaser Arcade Physics
 */
export class PlayerState {
  constructor(physicsBody, worldModel, config, upgradeSystem) {
    this.physicsBody = physicsBody;
    this.worldModel = worldModel;
    this.config = config;
    this.upgradeSystem = upgradeSystem;
    
    // Ground state (mirrored from physics body)
    this.onGround = false;
    
    // Motion state
    this.motionState = "idle";
    
    // Climbing state (internal, use isClimbing() getter)
    this._isClimbing = false;
  }
  
  /**
   * Update all state
   * @param {number} dt - Delta time
   * @param {Object} input - Player input instance
   * @param {Object} abilities - Player abilities instance
   */
  update(dt, input, abilities) {
    if (!this.physicsBody) return;
    
    // Climbing state is managed by PlayerAbilities.update() - do NOT reset here
    
    // Update ground detection using custom collision system (authoritative source)
    this._updateGroundDetection();
    
    // Update motion state
    this._updateMotionState(input, abilities);
  }
  
  /**
   * Update ground detection using custom collision system
   * @private
   */
  _updateGroundDetection() {
    if (!this.physicsBody || !this.worldModel) return;
    
    // Check tile below player's feet using worldModel directly
    const ts = this.config.tileSize;
    const feetY = this.physicsBody.y + this.physicsBody.h;
    const centerX = this.physicsBody.x + this.physicsBody.w / 2;
    const tx = Math.floor(centerX / ts);
    const ty = Math.floor(feetY / ts);
    this.onGround = this.worldModel.isSolid(tx, ty) || this.worldModel.isSolid(tx + 1, ty);
  }
  
  /**
   * Update motion state
   * @param {Object} input - Player input instance
   * @param {Object} abilities - Player abilities instance
   * @private
   */
  _updateMotionState(input, abilities) {
    if (this.isClimbing()) {
      this.motionState = "climb";
      return;
    }

    if (!this.onGround) {
      this.motionState = "airborne";
      return;
    }

    const horizMove = input.getHorizontalMovement();
    if (horizMove.left) {
      this.motionState = "walk-left";
      return;
    }

    if (horizMove.right) {
      this.motionState = "walk-right";
      return;
    }

    this.motionState = "idle";
  }
  
  /**
   * Get player tile position
   * @returns {Object} { tx: number, ty: number }
   */
  getPlayerTile() {
    if (!this.physicsBody) return { tx: 0, ty: 0 };
    
    const center = this.physicsBody.getCenter();
    // Guard against NaN position
    const x = isFinite(center.x) ? center.x : 0;
    const y = isFinite(center.y) ? center.y : 0;
    return this.worldModel.worldToTile(x, y);
  }
  
  /**
   * Get whether player is on ground
   * @returns {boolean}
   */
  isGrounded() {
    return this.onGround;
  }
  
  /**
   * Get motion state
   * @returns {string}
   */
  getMotionState() {
    return this.motionState;
  }
  
  /**
   * Get whether player is climbing
   * @returns {boolean}
   */
  isClimbing() {
    return this._isClimbing;
  }
  
  /**
   * Set climbing state
   * @param {boolean} climbing
   */
  setClimbing(climbing) {
    if (typeof climbing !== 'boolean') {
      console.error('[PlayerState Error] Invalid climbing state value:', climbing, '- must be boolean');
      this._isClimbing = false;
      return;
    }
    
    this._isClimbing = climbing;
    if (this.physicsBody) {
      this.physicsBody.setClimbing(climbing);
    }
  }
  
  /**
   * Reset all state - used when controls disabled or game state changes
   * Prevents getting stuck in various states
   */
  resetAllState() {
    this._isClimbing = false;
    this.onGround = false;
    this.motionState = "idle";
    
    if (this.physicsBody) {
      this.physicsBody.resetVelocity();
      this.physicsBody.setClimbing(false);
    }
  }
}
