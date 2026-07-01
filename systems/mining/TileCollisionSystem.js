/**
 * Custom tile-based collision system for Phaser
 * Replaces Arcade Physics with deterministic grid collision
 * Perfect for Motherload-style digging games
 */
export class TileCollisionSystem {
  constructor(worldModel, config) {
    this.worldModel = worldModel;
    this.config = config;
    this.tileSize = config.tileSize;
  }

  /**
   * Convert world coordinates to tile coordinates
   * @param {number} value - World coordinate value
   * @returns {number} Tile coordinate
   */
  worldToTile(value) {
    return Math.floor(value / this.tileSize);
  }

  /**
   * Check if a tile is solid at given tile coordinates
   * @param {number} tx - Tile X coordinate
   * @param {number} ty - Tile Y coordinate
   * @returns {boolean} True if tile is solid
   */
  isSolidAtTile(tx, ty) {
    return this.worldModel.isSolid(tx, ty);
  }

  /**
   * Move entity horizontally and resolve collisions
   * @param {Object} entity - Entity with x, y, w, h, vx properties
   * @param {number} amount - Amount to move (can be positive or negative)
   */
  moveAndCollideX(entity, amount) {
    entity.x += amount;

    const left = entity.x;
    const right = entity.x + entity.w;
    const top = entity.y;
    const bottom = entity.y + entity.h - 1; // -1 to avoid checking next tile too early

    const tileTop = this.worldToTile(top);
    const tileBottom = this.worldToTile(bottom);

    if (amount > 0) {
      // Moving right
      const tileRight = this.worldToTile(right);

      for (let ty = tileTop; ty <= tileBottom; ty++) {
        if (this.isSolidAtTile(tileRight, ty)) {
          // Collision detected - snap to left of the solid tile
          entity.x = tileRight * this.tileSize - entity.w;
          entity.vx = 0;
          break;
        }
      }
    } else if (amount < 0) {
      // Moving left
      const tileLeft = this.worldToTile(left);

      for (let ty = tileTop; ty <= tileBottom; ty++) {
        if (this.isSolidAtTile(tileLeft, ty)) {
          // Collision detected - snap to right of the solid tile
          entity.x = (tileLeft + 1) * this.tileSize;
          entity.vx = 0;
          break;
        }
      }
    }
  }

  /**
   * Move entity vertically and resolve collisions
   * @param {Object} entity - Entity with x, y, w, h, vy, onGround properties
   * @param {number} amount - Amount to move (can be positive or negative)
   */
  moveAndCollideY(entity, amount) {
    entity.onGround = false;
    entity.y += amount;

    const left = entity.x;
    const right = entity.x + entity.w - 1; // -1 to avoid checking next tile too early
    const top = entity.y;
    const bottom = entity.y + entity.h;

    const tileLeft = this.worldToTile(left);
    const tileRight = this.worldToTile(right);

    if (amount > 0) {
      // Moving down (falling)
      const tileBottom = this.worldToTile(bottom);

      for (let tx = tileLeft; tx <= tileRight; tx++) {
        if (this.isSolidAtTile(tx, tileBottom)) {
          // Collision detected - snap to top of the solid tile
          entity.y = tileBottom * this.tileSize - entity.h;
          entity.vy = 0;
          entity.onGround = true;
          break;
        }
      }
    } else if (amount < 0) {
      // Moving up
      const tileTop = this.worldToTile(top);

      for (let tx = tileLeft; tx <= tileRight; tx++) {
        if (this.isSolidAtTile(tx, tileTop)) {
          // Collision detected - snap to bottom of the solid tile
          entity.y = (tileTop + 1) * this.tileSize;
          entity.vy = 0;
          break;
        }
      }
    }
  }

  /**
   * Check if entity is currently on ground
   * @param {Object} entity - Entity with x, y, w, h properties
   * @returns {boolean} True if entity is on solid ground
   */
  isOnGround(entity) {
    const left = entity.x;
    const right = entity.x + entity.w - 1;
    const bottom = entity.y + entity.h + 1; // Check just below the entity

    const tileLeft = this.worldToTile(left);
    const tileRight = this.worldToTile(right);
    const tileBottom = this.worldToTile(bottom);

    // Check if any tile directly below is solid
    for (let tx = tileLeft; tx <= tileRight; tx++) {
      if (this.isSolidAtTile(tx, tileBottom)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if entity head is colliding with ceiling
   * @param {Object} entity - Entity with x, y, w, h properties
   * @returns {boolean} True if entity is hitting ceiling
   */
  isHittingCeiling(entity) {
    const left = entity.x;
    const right = entity.x + entity.w - 1;
    const top = entity.y - 1; // Check just above the entity

    const tileLeft = this.worldToTile(left);
    const tileRight = this.worldToTile(right);
    const tileTop = this.worldToTile(top);

    // Check if any tile directly above is solid
    for (let tx = tileLeft; tx <= tileRight; tx++) {
      if (this.isSolidAtTile(tx, tileTop)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Activate ceiling guard for specified number of frames
   * Used after fast air movement or dashes to prevent tunneling
   * @param {number} frames - Number of frames to keep guard active
   */
  activateCeilingGuard(frames = 5) {
    // This is a no-op in the new collision system
    // The deterministic collision system doesn't need ceiling guards
    // Kept for API compatibility with old code
  }
}
