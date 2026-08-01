import { FIRST_FIVE_MINUTES_CONFIG } from "../../values/firstFiveMinutes.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

const PROTECTED_TOWN_TYPES = new Set([
  TILE_TYPES.FLOOR_TOWN_1,
  TILE_TYPES.FLOOR_TOWN_2,
]);

export class TutorialSurfaceSafetySystem {
  constructor(scene, config = FIRST_FIVE_MINUTES_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.isBlocked = null;
    this.onBlocked = null;
    this.safeTile = null;
  }

  setPolicy(isBlocked, onBlocked) {
    this.isBlocked = typeof isBlocked === "function" ? isBlocked : null;
    this.onBlocked = typeof onBlocked === "function" ? onBlocked : null;
  }

  create() {
    this.safeTile = this._findSafeSurfaceTile()
      || this._getConfiguredSafeSurfaceTile();
  }

  enforce() {
    if (this.isBlocked?.() !== true) return false;
    const body = this.scene.playerController?.physicsBody;
    const tileSize = this.scene.config?.tileSize;
    const surfaceRow = this.scene.config?.topAirRows;
    if (!body || !(tileSize > 0) || !Number.isInteger(surfaceRow)) return false;

    const feetY = body.y + body.h;
    const surfaceY = surfaceRow * tileSize;
    const tolerance = this.config.surfaceSafety.depthGuardTolerancePx;
    if (!Number.isFinite(feetY) || feetY <= surfaceY + tolerance) {
      this._rememberSafeSurfaceTile(body);
      return false;
    }

    const safeTile = this.safeTile
      || this._findSafeSurfaceTile()
      || this._getConfiguredSafeSurfaceTile();
    if (safeTile) {
      this.safeTile = safeTile;
      this.scene.playerController?.teleportToTile?.(safeTile.tx, safeTile.ty);
    }
    this.onBlocked?.();
    return true;
  }

  _getSurfaceRow() {
    return this.scene?.config?.topAirRows;
  }

  _getConfiguredSafeSurfaceTile() {
    const row = this._getSurfaceRow();
    const configuredX = this.scene?.config?.playerSpawnTileX;
    const fallbackX = this.config.surfaceSafety.safeReturnTileX;
    return {
      tx: Number.isInteger(configuredX) ? configuredX : fallbackX,
      ty: Number.isInteger(row) ? row - 1 : 0,
    };
  }

  _isSafeSurfaceTile(tx) {
    const world = this.scene?.worldModel;
    const row = this._getSurfaceRow();
    if (!world || !Number.isInteger(row) || !Number.isInteger(tx)) return false;
    if (typeof world.inBounds === "function" && !world.inBounds(tx, row)) return false;

    const floorType = world.getTileType?.(tx, row);
    if (floorType !== undefined && floorType !== null
      && !PROTECTED_TOWN_TYPES.has(floorType)) return false;
    if (typeof world.isSolid === "function" && world.isSolid(tx, row - 1)) return false;
    return true;
  }

  _findSafeSurfaceTile() {
    const row = this._getSurfaceRow();
    const tileSize = this.scene?.config?.tileSize;
    const body = this.scene?.playerController?.physicsBody;
    if (!Number.isInteger(row) || !(tileSize > 0)) return null;

    const preferredX = Number.isFinite(body?.x) && Number.isFinite(body?.w)
      ? Math.floor((body.x + body.w / 2) / tileSize)
      : this.config.surfaceSafety.safeReturnTileX;
    const radius = Math.max(0, Math.floor(this.config.surfaceSafety.recoveryScanRadiusTiles));
    for (let distance = 0; distance <= radius; distance += 1) {
      const candidates = distance === 0
        ? [preferredX]
        : [preferredX - distance, preferredX + distance];
      for (const tx of candidates) {
        if (this._isSafeSurfaceTile(tx)) return { tx, ty: row - 1 };
      }
    }
    return null;
  }

  _rememberSafeSurfaceTile(body) {
    const tileSize = this.scene?.config?.tileSize;
    if (!body || !(tileSize > 0)) return;
    const tx = Math.floor((body.x + body.w / 2) / tileSize);
    if (this._isSafeSurfaceTile(tx)) this.safeTile = { tx, ty: this._getSurfaceRow() - 1 };
  }

  destroy() {
    this.scene = null;
    this.config = null;
    this.isBlocked = null;
    this.onBlocked = null;
    this.safeTile = null;
  }
}
