import { PLAYER_COLLISION_CONFIG } from "../../values/playerCollision.js";

/**
 * Custom tile-based collision system for Phaser
 * Replaces Arcade Physics with deterministic grid collision
 * Perfect for Motherload-style digging games
 */
export class TileCollisionSystem {
  constructor(worldModel, config, collisionConfig = PLAYER_COLLISION_CONFIG) {
    this.worldModel = worldModel;
    this.config = config;
    this.tileSize = config.tileSize;
    this.collisionConfig = collisionConfig;
    this.skinPx = collisionConfig.skinPx;
    this.groundProbePx = collisionConfig.groundProbePx;
    this.maxStepPx = this.tileSize * collisionConfig.maxStepTiles;
  }

  _bodyTileBounds(entity, offsetX = 0, offsetY = 0) {
    const skin = Math.min(this.skinPx, entity.w * 0.25, entity.h * 0.25);
    const left = entity.x + offsetX;
    const top = entity.y + offsetY;
    return {
      left: this.worldToTile(left + skin),
      right: this.worldToTile(left + entity.w - skin),
      top: this.worldToTile(top + skin),
      bottom: this.worldToTile(top + entity.h - skin),
    };
  }

  getOverlappingSolidTiles(entity) {
    if (!entity || !Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return [];
    if (!(entity.w > 0) || !(entity.h > 0)) return [];
    const bounds = this._bodyTileBounds(entity);
    const overlaps = [];
    for (let ty = bounds.top; ty <= bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
        if (this.isSolidAtTile(tx, ty)) overlaps.push({ tx, ty });
      }
    }
    return overlaps;
  }

  isBodyOverlappingSolid(entity) {
    return this.getOverlappingSolidTiles(entity).length > 0;
  }

  resolveBodyOverlap(entity) {
    const overlaps = this.getOverlappingSolidTiles(entity);
    if (overlaps.length === 0) return true;
    if (this.collisionConfig.recoverOverlaps !== true) return false;

    const originalX = entity.x;
    const originalY = entity.y;
    const candidates = [];
    for (const tile of overlaps) {
      const tileLeft = tile.tx * this.tileSize;
      const tileRight = tileLeft + this.tileSize;
      const tileTop = tile.ty * this.tileSize;
      const tileBottom = tileTop + this.tileSize;
      candidates.push(
        { axis: "y", amount: tileTop - (originalY + entity.h), priority: 0 },
        { axis: "x", amount: tileLeft - (originalX + entity.w), priority: 1 },
        { axis: "x", amount: tileRight - originalX, priority: 1 },
        { axis: "y", amount: tileBottom - originalY, priority: 2 },
      );
    }
    candidates.sort((left, right) => (
      Math.abs(left.amount) - Math.abs(right.amount) || left.priority - right.priority
    ));

    for (const candidate of candidates) {
      entity.x = originalX + (candidate.axis === "x" ? candidate.amount : 0);
      entity.y = originalY + (candidate.axis === "y" ? candidate.amount : 0);
      if (this.isBodyOverlappingSolid(entity)) continue;
      if (candidate.axis === "x") entity.vx = 0;
      if (candidate.axis === "y") {
        entity.vy = 0;
        entity.onGround = candidate.amount < 0;
      }
      return true;
    }

    entity.x = originalX;
    entity.y = originalY;
    return false;
  }

  _moveInSteps(amount, moveStep) {
    if (!Number.isFinite(amount) || Math.abs(amount) <= this.skinPx) return false;
    let remaining = amount;
    while (Math.abs(remaining) > this.skinPx) {
      const step = Math.sign(remaining) * Math.min(Math.abs(remaining), this.maxStepPx);
      if (moveStep(step)) return true;
      remaining -= step;
    }
    return false;
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
    return this._moveInSteps(amount, (step) => {
      entity.x += step;
      const bounds = this._bodyTileBounds(entity);
      const leadingColumn = step > 0 ? bounds.right : bounds.left;
      for (let ty = bounds.top; ty <= bounds.bottom; ty += 1) {
        if (!this.isSolidAtTile(leadingColumn, ty)) continue;
        entity.x = step > 0
          ? leadingColumn * this.tileSize - entity.w
          : (leadingColumn + 1) * this.tileSize;
        entity.vx = 0;
        return true;
      }
      return false;
    });
  }

  /**
   * Move entity vertically and resolve collisions
   * @param {Object} entity - Entity with x, y, w, h, vy, onGround properties
   * @param {number} amount - Amount to move (can be positive or negative)
   */
  moveAndCollideY(entity, amount) {
    entity.onGround = false;
    return this._moveInSteps(amount, (step) => {
      entity.y += step;
      const bounds = this._bodyTileBounds(entity);
      const leadingRow = step > 0 ? bounds.bottom : bounds.top;
      for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
        if (!this.isSolidAtTile(tx, leadingRow)) continue;
        entity.y = step > 0
          ? leadingRow * this.tileSize - entity.h
          : (leadingRow + 1) * this.tileSize;
        entity.vy = 0;
        entity.onGround = step > 0;
        return true;
      }
      return false;
    });
  }

  /**
   * Check if entity is currently on ground
   * @param {Object} entity - Entity with x, y, w, h properties
   * @returns {boolean} True if entity is on solid ground
   */
  isOnGround(entity) {
    const bounds = this._bodyTileBounds(entity, 0, this.groundProbePx);

    for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
      if (this.isSolidAtTile(tx, bounds.bottom)) {
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
    const bounds = this._bodyTileBounds(entity, 0, -this.groundProbePx);

    for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
      if (this.isSolidAtTile(tx, bounds.top)) {
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
