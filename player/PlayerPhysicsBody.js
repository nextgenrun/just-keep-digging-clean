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
    
    // Profile-measured upright silhouette used as the authoritative body AABB.
    this.w = config.playerBodyWidthPx;
    this.h = config.playerBodyHeightPx;
    this.collisionKind = "rect";
    this.collisionRadiusPx = null;
    this.collisionProfileId = "upright";
    this.visualAnchorOffsetYPx = 0;
    
    // Velocity
    this.vx = 0;
    this.vy = 0;
    
    // Gravity
    this.gravity = config.gravityY;
    
    this.maxFallSpeed = config.maxFallSpeedPxPerSec;
    this.walkSpeed = config.walkSpeedPxPerSec;
    
    // Ground detection
    this.onGround = false;
    this.surfaceDropThroughRow = null;
    this.oneWayPlatformDropId = null;
    this.oneWayPlatformDropIds = null;

    // Collision rollback state is refreshed only after a collision-clean commit.
    this._collisionValidator = null;
    this._lastCollisionSafeState = null;
    
    // Flight state; flight suspends gravity while Shift is held.
    this.isFlightActive = false;
  }

  /**
   * Update physics - apply gravity and cap velocities
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Apply gravity when the player is not flying.
    if (!this.isFlightActive) {
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
   * Set flight state.
   * @param {boolean} active - Whether powered flight is active
   */
  setFlightActive(active) {
    this.isFlightActive = active === true;
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

  /** Visible bottom-center anchor shared by every rectangular pose profile. */
  getVisualAnchor() {
    return {
      x: this.getCenterX(),
      y: this.y + this.h + (Number(this.visualAnchorOffsetYPx) || 0),
    };
  }

  getCollisionProfileSnapshot() {
    return {
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h,
      collisionKind: this.collisionKind,
      collisionRadiusPx: this.collisionRadiusPx,
      collisionProfileId: this.collisionProfileId,
      visualAnchorOffsetYPx: this.visualAnchorOffsetYPx,
    };
  }

  restoreCollisionProfileSnapshot(snapshot) {
    if (!snapshot) return false;
    this.x = snapshot.x;
    this.y = snapshot.y;
    this.w = snapshot.w;
    this.h = snapshot.h;
    this.collisionKind = snapshot.collisionKind;
    this.collisionRadiusPx = snapshot.collisionRadiusPx;
    this.collisionProfileId = snapshot.collisionProfileId;
    this.visualAnchorOffsetYPx = snapshot.visualAnchorOffsetYPx;
    return true;
  }

  captureCollisionSafeState() {
    this._lastCollisionSafeState = {
      profile: this.getCollisionProfileSnapshot(),
      onGround: this.onGround === true,
      surfaceDropThroughRow: this.surfaceDropThroughRow,
      oneWayPlatformDropId: this.oneWayPlatformDropId,
      oneWayPlatformDropIds: Array.isArray(this.oneWayPlatformDropIds)
        ? [...this.oneWayPlatformDropIds]
        : null,
    };
    return true;
  }

  restoreCollisionSafeState() {
    const snapshot = this._lastCollisionSafeState;
    if (!snapshot || !this.restoreCollisionProfileSnapshot(snapshot.profile)) return false;
    this.onGround = snapshot.onGround;
    this.surfaceDropThroughRow = snapshot.surfaceDropThroughRow;
    this.oneWayPlatformDropId = snapshot.oneWayPlatformDropId;
    this.oneWayPlatformDropIds = Array.isArray(snapshot.oneWayPlatformDropIds)
      ? [...snapshot.oneWayPlatformDropIds]
      : null;
    this.resetVelocity();
    return true;
  }

  getCollisionSafeStateSnapshot() {
    const snapshot = this._lastCollisionSafeState;
    if (!snapshot) return null;
    return {
      ...snapshot,
      profile: { ...snapshot.profile },
      oneWayPlatformDropIds: Array.isArray(snapshot.oneWayPlatformDropIds)
        ? [...snapshot.oneWayPlatformDropIds]
        : null,
    };
  }

  setCollisionValidator(validator) {
    this._collisionValidator = typeof validator === "function" ? validator : null;
  }

  forceRectProfile(profileId, profile, { preserveVisualAnchor = true } = {}) {
    if (!(profile?.widthPx > 0) || !(profile?.heightPx > 0)) return false;
    const centerX = this.getCenterX();
    const bottom = this.y + this.h;
    const visualAnchorY = this.getVisualAnchor().y;
    this.w = profile.widthPx;
    this.h = profile.heightPx;
    this.collisionKind = "rect";
    this.collisionRadiusPx = null;
    this.collisionProfileId = profileId;
    this.visualAnchorOffsetYPx = Number(profile.visualAnchorOffsetYPx) || 0;
    this.x = centerX - this.w / 2;
    this.y = (preserveVisualAnchor ? visualAnchorY - this.visualAnchorOffsetYPx : bottom) - this.h;
    return true;
  }

  tryRectProfile(profileId, profile, collisionSystem, { allowBottomFallback = false } = {}) {
    if (this.collisionKind !== "rect") return false;
    if (this.collisionProfileId === profileId) return true;
    const snapshot = this.getCollisionProfileSnapshot();
    const attempts = [true, ...(allowBottomFallback ? [false] : [])];
    for (const preserveVisualAnchor of attempts) {
      this.restoreCollisionProfileSnapshot(snapshot);
      this.forceRectProfile(profileId, profile, { preserveVisualAnchor });
      if (collisionSystem?.isBodyOverlappingSolid?.(this) !== true) return true;
    }
    this.restoreCollisionProfileSnapshot(snapshot);
    return false;
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
   * @returns {boolean} Whether the requested position committed safely
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this._collisionValidator?.(this) !== false;
  }

  /**
   * Reset velocity
   */
  resetVelocity() {
    this.vx = 0;
    this.vy = 0;
  }

  clearSurfaceDropThrough() {
    this.surfaceDropThroughRow = null;
  }

  clearOneWayPlatformDropThrough() {
    this.oneWayPlatformDropId = null;
    this.oneWayPlatformDropIds = null;
  }
}
