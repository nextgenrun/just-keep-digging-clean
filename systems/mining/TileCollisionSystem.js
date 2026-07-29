import {
  PLAYER_COLLISION_CONFIG,
  resolveSurfaceDropThroughEnabled,
} from "../../values/playerCollision.js";
import {
  canBeginSurfaceDrop,
  crossesSurfacePlatform,
  ignoresSurfaceTile,
  isAtSurfacePlatform,
  refreshSurfaceDropState,
  surfacePlatformCoversBody,
} from "./surfaceDropCollision.js";
import {
  circleAxisReach,
  circleIntersectsRect,
  distanceToInterval,
  getCircleCollisionGeometry,
  isCircleCollisionBody,
} from "./collisionShapeMath.js";

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
    this.surfaceDropThroughEnabled = resolveSurfaceDropThroughEnabled(collisionConfig);
  }

  _bodyTileBounds(entity, offsetX = 0, offsetY = 0) {
    const skin = isCircleCollisionBody(entity)
      ? 0
      : Math.min(this.skinPx, entity.w * 0.25, entity.h * 0.25);
    const left = entity.x + offsetX;
    const top = entity.y + offsetY;
    return {
      left: this.worldToTile(left + skin),
      right: this.worldToTile(left + entity.w - skin),
      top: this.worldToTile(top + skin),
      bottom: this.worldToTile(top + entity.h - skin),
    };
  }

  _intersectsEntityTile(entity, tx, ty, offsetX = 0, offsetY = 0) {
    const circle = getCircleCollisionGeometry(entity, offsetX, offsetY);
    if (!circle) return true;
    const left = tx * this.tileSize;
    const top = ty * this.tileSize;
    return circleIntersectsRect(
      circle.x,
      circle.y,
      circle.radius,
      left,
      top,
      left + this.tileSize,
      top + this.tileSize,
      this.skinPx * 0.05,
    );
  }

  getOverlappingSolidTiles(entity) {
    if (!entity || !Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return [];
    if (!(entity.w > 0) || !(entity.h > 0)) return [];
    const bounds = this._bodyTileBounds(entity);
    const overlaps = [];
    for (let ty = bounds.top; ty <= bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
        if (
          this._isSolidForEntity(entity, tx, ty)
          && this._intersectsEntityTile(entity, tx, ty)
        ) {
          overlaps.push({ tx, ty });
        }
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

  _isSolidForEntity(entity, tx, ty, movementY = 0) {
    if (typeof this.worldModel.getTileType === "function"
      && ignoresSurfaceTile(
        entity,
        ty,
        this.worldModel.getTileType(tx, ty),
        this.config.topAirRows,
        this.tileSize,
        movementY,
        this.collisionConfig.surfaceDropThrough.contactTolerancePx,
      )) return false;
    return this.worldModel.isSolid(tx, ty);
  }

  tryBeginSurfaceDropThrough(entity, surfaceRow = this.config.topAirRows) {
    const drop = this.collisionConfig.surfaceDropThrough;
    if (!this.surfaceDropThroughEnabled || !entity || !Number.isInteger(surfaceRow)) return false;
    if (!canBeginSurfaceDrop(
      this.worldModel,
      entity,
      this.tileSize,
      this.skinPx,
      surfaceRow,
      drop,
    )) return false;
    entity.surfaceDropThroughRow = surfaceRow;
    entity.onGround = false;
    entity.vy = Math.max(
      entity.vy,
      drop.minimumDownVelocityTilesPerSecond * this.tileSize,
    );
    return true;
  }

  cancelSurfaceDropThrough(entity) {
    entity?.clearSurfaceDropThrough?.();
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
      const circle = getCircleCollisionGeometry(entity);
      let circleResolvedX = null;
      for (let ty = bounds.top; ty <= bounds.bottom; ty += 1) {
        if (
          !this._isSolidForEntity(entity, leadingColumn, ty)
          || !this._intersectsEntityTile(entity, leadingColumn, ty)
        ) continue;
        if (circle) {
          const tileLeft = leadingColumn * this.tileSize;
          const tileTop = ty * this.tileSize;
          const distanceY = distanceToInterval(
            circle.y,
            tileTop,
            tileTop + this.tileSize,
          );
          const reach = circleAxisReach(circle.radius, distanceY);
          const candidateX = step > 0
            ? tileLeft - reach - circle.radius
            : tileLeft + this.tileSize + reach - circle.radius;
          circleResolvedX = circleResolvedX === null
            ? candidateX
            : (step > 0
              ? Math.min(circleResolvedX, candidateX)
              : Math.max(circleResolvedX, candidateX));
          continue;
        }
        entity.x = step > 0
          ? leadingColumn * this.tileSize - entity.w
          : (leadingColumn + 1) * this.tileSize;
        entity.vx = 0;
        return true;
      }
      if (circleResolvedX !== null) {
        entity.x = circleResolvedX;
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
      refreshSurfaceDropState(
        entity,
        this.tileSize,
        this.collisionConfig.surfaceDropThrough.releaseMarginPx,
      );
      const surfaceRow = this.config.topAirRows;
      if (this.surfaceDropThroughEnabled
        && Number.isInteger(surfaceRow)
        && typeof this.worldModel.inBounds === "function"
        && !Number.isInteger(entity.surfaceDropThroughRow)
        && surfacePlatformCoversBody(
          this.worldModel,
          entity,
          this.tileSize,
          this.skinPx,
          surfaceRow,
        )
        && crossesSurfacePlatform(entity, step, this.tileSize, surfaceRow)) {
        entity.y = surfaceRow * this.tileSize - entity.h;
        entity.vy = 0;
        entity.onGround = true;
        return true;
      }
      entity.y += step;
      const bounds = this._bodyTileBounds(entity);
      const leadingRow = step > 0 ? bounds.bottom : bounds.top;
      const circle = getCircleCollisionGeometry(entity);
      let circleResolvedY = null;
      for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
        if (
          !this._isSolidForEntity(entity, tx, leadingRow, step)
          || !this._intersectsEntityTile(entity, tx, leadingRow)
        ) continue;
        if (circle) {
          const tileLeft = tx * this.tileSize;
          const tileTop = leadingRow * this.tileSize;
          const distanceX = distanceToInterval(
            circle.x,
            tileLeft,
            tileLeft + this.tileSize,
          );
          const reach = circleAxisReach(circle.radius, distanceX);
          const candidateY = step > 0
            ? tileTop - reach - circle.radius
            : tileTop + this.tileSize + reach - circle.radius;
          circleResolvedY = circleResolvedY === null
            ? candidateY
            : (step > 0
              ? Math.min(circleResolvedY, candidateY)
              : Math.max(circleResolvedY, candidateY));
          continue;
        }
        entity.y = step > 0
          ? leadingRow * this.tileSize - entity.h
          : (leadingRow + 1) * this.tileSize;
        entity.vy = 0;
        entity.onGround = step > 0;
        return true;
      }
      if (circleResolvedY !== null) {
        entity.y = circleResolvedY;
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
    const surfaceRow = this.config.topAirRows;
    if (this.surfaceDropThroughEnabled
      && Number.isInteger(surfaceRow)
      && typeof this.worldModel.inBounds === "function"
      && !Number.isInteger(entity.surfaceDropThroughRow)
      && surfacePlatformCoversBody(
        this.worldModel,
        entity,
        this.tileSize,
        this.skinPx,
        surfaceRow,
      )
      && isAtSurfacePlatform(
        entity,
        this.tileSize,
        surfaceRow,
        this.collisionConfig.surfaceDropThrough.contactTolerancePx,
      )) {
      return true;
    }
    const bounds = this._bodyTileBounds(entity, 0, this.groundProbePx);

    for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
      if (
        this._isSolidForEntity(entity, tx, bounds.bottom)
        && this._intersectsEntityTile(
          entity,
          tx,
          bounds.bottom,
          0,
          this.groundProbePx,
        )
      ) {
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
      if (
        this._isSolidForEntity(entity, tx, bounds.top, -this.groundProbePx)
        && this._intersectsEntityTile(
          entity,
          tx,
          bounds.top,
          0,
          -this.groundProbePx,
        )
      ) {
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
