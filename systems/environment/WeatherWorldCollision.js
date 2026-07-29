import { raycastRect, raycastSolidTiles } from "./weatherWorldRaycast.js";

export class WeatherWorldCollision {
  constructor(scene, config, weatherConfig) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;
    this.tileSize = config.tileSize;
    this.visualCoverRects = this._buildVisualCoverRects();
    this.surfaceMaskRects = this._buildSurfaceMaskRects();
    this.raycastRects = [...this.visualCoverRects, ...this.surfaceMaskRects];
  }

  get supportsRaycast() {
    return Boolean(
      this.scene.worldModel?.isSolid
      || this.visualCoverRects.length
      || this.surfaceMaskRects.length,
    );
  }

  findFirstBlocker(worldX, scanTop, scanBottom) {
    const tile = this._findTileBlocker(worldX, scanTop, scanBottom);
    const visual = this._findRectBlocker(
      this.visualCoverRects,
      worldX,
      scanTop,
      scanBottom,
    );
    const mask = this._findRectBlocker(
      this.surfaceMaskRects,
      worldX,
      scanTop,
      scanBottom,
    );
    return [tile, visual, mask]
      .filter(Boolean)
      .sort((left, right) => left.worldY - right.worldY)[0] || null;
  }

  raycastSegment(startX, startY, endX, endY) {
    if (![startX, startY, endX, endY].every(Number.isFinite)) return null;
    let earliest = raycastSolidTiles(
      this.scene.worldModel,
      this.tileSize,
      startX,
      startY,
      endX,
      endY,
    );
    for (const rect of this.raycastRects) {
      const hit = raycastRect(rect, startX, startY, endX, endY);
      if (hit && (!earliest || hit.fraction < earliest.fraction)) earliest = hit;
    }
    return earliest;
  }

  _findTileBlocker(worldX, scanTop, scanBottom) {
    const worldModel = this.scene.worldModel;
    if (!worldModel?.isSolid || !(this.tileSize > 0)) return null;
    const tileX = Math.floor(worldX / this.tileSize);
    const startTileY = Math.max(0, Math.floor(scanTop / this.tileSize));
    const configuredEnd = Number.isFinite(this.config.worldDepthTiles)
      ? this.config.worldDepthTiles - 1
      : Math.ceil(scanBottom / this.tileSize);
    const endTileY = Math.min(configuredEnd, Math.ceil(scanBottom / this.tileSize));
    for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
      if (!worldModel.isSolid(tileX, tileY)) continue;
      return {
        worldY: tileY * this.tileSize,
        undersideWorldY: (tileY + 1) * this.tileSize,
        source: "tile",
        tileX,
        tileY,
      };
    }
    return null;
  }

  _findRectBlocker(rects, worldX, scanTop, scanBottom) {
    let best = null;
    for (const rect of rects) {
      if (worldX < rect.x || worldX > rect.x + rect.width) continue;
      const blockedMask = rect.kind === "surfaceMaskBlocked";
      if (blockedMask) {
        if (rect.y > scanBottom || rect.y + rect.height < scanTop) continue;
      } else if (rect.y < scanTop || rect.y > scanBottom) {
        continue;
      }
      const worldY = blockedMask ? scanTop : rect.y;
      if (!best || worldY < best.worldY) {
        best = {
          worldY,
          undersideWorldY: blockedMask
            ? scanTop
            : rect.undersideWorldY ?? rect.y + rect.height,
          source: rect.kind,
        };
      }
    }
    return best;
  }

  _buildVisualCoverRects() {
    const floorY = this.config.topAirRows * this.tileSize;
    return (this.weatherConfig.visualCovers || []).map((cover) => {
      if (cover.kind === "townRoof") {
        const endTileX = this.config.spawnTileX + cover.endTileOffsetFromSpawn;
        return {
          kind: cover.kind,
          x: cover.startTileX * this.tileSize,
          y: Math.round(floorY - this.tileSize * cover.yTilesAboveFloor),
          width: (endTileX - cover.startTileX + 1) * this.tileSize,
          height: this.tileSize * cover.heightTiles,
        };
      }
      return {
        kind: cover.kind || "cover",
        x: cover.xTile * this.tileSize,
        y: cover.yTile * this.tileSize,
        width: cover.widthTiles * this.tileSize,
        height: cover.heightTiles * this.tileSize,
      };
    });
  }

  _buildSurfaceMaskRects() {
    const mask = this.weatherConfig.surfaceLandingMask;
    if (!mask?.enabled || !Array.isArray(mask.landingYByColumn)) return [];
    const maskBottom = (mask.maxSurfaceTileY || mask.tileHeight) * this.tileSize;
    return mask.landingYByColumn.map((landingTileY, tileX) => {
      const adjustedTileY = Number.isFinite(landingTileY)
        ? this._adjustSurfaceMaskLandingTileY(tileX, landingTileY)
        : 0;
      const worldY = adjustedTileY * this.tileSize;
      return {
        kind: Number.isFinite(landingTileY) ? "surfaceMask" : "surfaceMaskBlocked",
        x: tileX * this.tileSize,
        y: worldY,
        width: this.tileSize,
        height: Math.max(this.tileSize, maskBottom - worldY),
        undersideWorldY: worldY + this.tileSize,
      };
    });
  }

  _adjustSurfaceMaskLandingTileY(tileX, landingTileY) {
    const mask = this.weatherConfig.surfaceLandingMask;
    const zone = (mask.offsetZones || []).find((candidate) => (
      tileX >= candidate.startTileX && tileX <= candidate.endTileX
    ));
    const baseTileY = landingTileY + (zone?.offsetTiles || 0);
    const snapMax = Math.max(0, mask.snapDownMaxTiles || 0);
    const maxTileY = Math.min(mask.maxSurfaceTileY || baseTileY, baseTileY + snapMax);
    if (!this.scene.worldModel?.isSolid || snapMax <= 0) return baseTileY;
    for (let tileY = Math.floor(baseTileY); tileY <= maxTileY; tileY += 1) {
      if (this.scene.worldModel.isSolid(tileX, tileY)) return tileY;
    }
    return baseTileY;
  }
}
