import { TILE_TYPES } from "../../../values/tileTypes.js";
import { getHeavenblocksRegionAt } from "../../../values/heavenblocksWorldConfig.js";
import {
  WORLD_VISUAL_MATERIALS,
  resolveWorldVisualMaterialBands,
} from "../../../values/worldVisualMaterials.js";
import { WORLD_VISUAL_RUNTIME } from "../../../values/worldVisualRuntime.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropFallbackAsset,
  isWorldVisualDepthBackdropRegionRenderable,
  resolveWorldVisualDepthBackdropRegionAssets,
  resolveWorldVisualDepthBackdropRegions,
} from "../../../values/worldVisualDepthBackdrops.js";
import {
  isWorldVisualTerrainCapTileType,
  resolveWorldVisualTerrainVariationEnabled,
} from "../../../values/worldVisualTerrainVariation.js";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import { WorldVisualMaterialBandView } from "./WorldVisualMaterialBandView.js";

function isAir(model, tx, ty) {
  return model.getTileType(tx, ty) === TILE_TYPES.AIR;
}

export class WorldVisualMaterialField {
  constructor(
    scene,
    worldModel,
    config = WORLD_VISUAL_RUNTIME,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.search = search;
    this.authoredTopCapsEnabled = resolveWorldVisualTerrainVariationEnabled(
      undefined,
      search
    );
    this.maskGraphics = null;
    this.geometryMask = null;
    this.backdropMaskGraphics = null;
    this.backdropGeometryMask = null;
    this.edgeGraphics = null;
    this.bandViews = new Map();
    this.activeBandIds = new Set();
    this.activeMaterialKeys = new Set();
    this.activeBounds = null;
    this.lastLighting = null;
    this.pendingMaterialKeys = new Set();
    this.assetCache = new WorldVisualAssetCache(scene, {
      retainKeys: [WORLD_VISUAL_MATERIALS.townEarth.key],
    });
  }

  create() {
    this.maskGraphics = this.scene.make.graphics({ add: false });
    this.geometryMask = this.maskGraphics.createGeometryMask();
    this.backdropMaskGraphics = this.scene.make.graphics({ add: false });
    this.backdropGeometryMask = this.backdropMaskGraphics.createGeometryMask();
    this.edgeGraphics = this.scene.add.graphics().setDepth(this.config.render.terrainEdgeDepth);
  }

  sync(bounds, lighting, force = false) {
    if (!bounds || bounds.right <= bounds.left || bounds.bottom <= bounds.top) return;
    this.lastLighting = lighting;
    this.activeBounds = bounds;
    const bands = resolveWorldVisualMaterialBands(bounds.top, bounds.bottom);
    this.activeBandIds = new Set(bands.map(band => band.id));
    this.activeMaterialKeys = new Set();
    for (const band of bands) {
      const requestedMaterial = WORLD_VISUAL_MATERIALS[band.materialId];
      if (!requestedMaterial) {
        throw new Error(`[WorldVisualMaterialField] Material is not configured: ${band.materialId}`);
      }
      this.activeMaterialKeys.add(requestedMaterial.key);
      const materialReady = this.scene.textures.exists(requestedMaterial.key);
      if (!materialReady) this._requestMaterial(requestedMaterial);
      const material = materialReady ? requestedMaterial : this._resolveFallbackMaterial(band.id);
      this._syncBandView(bounds, band, material, force);
    }
    this._pruneBandViews();
    this._releaseUnusedMaterials();
    this._drawSolidMask(bounds);
    this.setLighting(lighting);
  }

  _resolveFallbackMaterial(bandId) {
    const active = this.bandViews.get(bandId)?.material;
    if (active && this.scene.textures.exists(active.key)) return active;
    const startup = WORLD_VISUAL_MATERIALS.townEarth;
    if (this.scene.textures.exists(startup.key)) return startup;
    throw new Error("[WorldVisualMaterialField] The startup terrain material was not preloaded");
  }

  _requestMaterial(material) {
    if (this.pendingMaterialKeys.has(material.key)) return;
    this.pendingMaterialKeys.add(material.key);
    this.assetCache.ensure(material, {
      onReady: () => {
        this.pendingMaterialKeys.delete(material.key);
        if (!this.activeBounds || !this.lastLighting) return;
        if (this.activeMaterialKeys.has(material.key)) {
          this.sync(this.activeBounds, this.lastLighting, true);
        } else {
          this.assetCache.release(material.key);
        }
      },
      onError: () => this.pendingMaterialKeys.delete(material.key),
    });
  }

  _syncBandView(bounds, band, material, force) {
    let view = this.bandViews.get(band.id);
    if (force || view?.material.key !== material.key) {
      view?.destroy();
      view = new WorldVisualMaterialBandView(
        this.scene,
        band,
        material,
        this.config,
        this.geometryMask,
        this.backdropGeometryMask
      );
      this.bandViews.set(band.id, view);
    }
    view.sync(bounds);
  }

  _pruneBandViews() {
    for (const [bandId, view] of this.bandViews) {
      if (this.activeBandIds.has(bandId)) continue;
      view.destroy();
      this.bandViews.delete(bandId);
    }
  }

  _releaseUnusedMaterials() {
    for (const material of Object.values(WORLD_VISUAL_MATERIALS)) {
      if (this.activeMaterialKeys.has(material.key)) continue;
      this.assetCache.release(material.key);
    }
  }

  _drawSolidMask(bounds) {
    const tileSize = this.scene.config.tileSize;
    this.maskGraphics.clear().fillStyle(0xffffff, 1);
    this.edgeGraphics.clear().lineStyle(Math.max(2, tileSize * 0.025), 0x111820, 0.72);
    for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right; tx += 1) {
        if (getHeavenblocksRegionAt(tx, ty)) continue;
        if (isAir(this.worldModel, tx, ty)) continue;
        const x = tx * tileSize;
        const y = ty * tileSize;
        this.maskGraphics.fillRect(x, y, tileSize + 0.5, tileSize + 0.5);
        this._drawExposedEdges(tx, ty, x, y, tileSize);
      }
    }
    this._drawBackdropMask(bounds, tileSize);
  }

  _drawBackdropMask(bounds, tileSize) {
    const graphics = this.backdropMaskGraphics;
    graphics.clear().fillStyle(0xffffff, 1);
    const fillTiles = (left, top, right, bottom) => {
      if (right <= left || bottom <= top) return;
      graphics.fillRect(
        left * tileSize,
        top * tileSize,
        (right - left) * tileSize,
        (bottom - top) * tileSize
      );
    };
    const regions = resolveWorldVisualDepthBackdropRegions(
      bounds.top,
      bounds.bottom,
      WORLD_VISUAL_DEPTH_BACKDROPS,
      this.search
    );
    const fallbackAsset = getWorldVisualDepthBackdropFallbackAsset(
      WORLD_VISUAL_DEPTH_BACKDROPS,
      this.search
    );
    const assetExists = asset => asset?.type === "video"
      ? Boolean(this.scene.cache?.video?.exists(asset.key))
      : this.scene.textures.exists(asset.key);
    let cursor = bounds.top;
    for (const region of regions) {
      const top = Math.max(cursor, bounds.top, region.topTile);
      const bottom = Math.min(bounds.bottom, region.bottomTileExclusive);
      fillTiles(bounds.left, cursor, bounds.right, top);
      const renderable = isWorldVisualDepthBackdropRegionRenderable(
        region,
        assetExists,
        resolveWorldVisualDepthBackdropRegionAssets(
          region,
          WORLD_VISUAL_DEPTH_BACKDROPS,
          this.search
        ),
        fallbackAsset
      );
      if (!renderable) {
        fillTiles(bounds.left, top, bounds.right, bottom);
      } else {
        fillTiles(bounds.left, top, Math.min(bounds.right, region.leftTile), bottom);
        fillTiles(Math.max(bounds.left, region.rightTileExclusive), top, bounds.right, bottom);
      }
      cursor = Math.max(cursor, bottom);
    }
    fillTiles(bounds.left, cursor, bounds.right, bounds.bottom);
  }

  _drawExposedEdges(tx, ty, x, y, size) {
    const jitter = ((Math.imul(tx + 11, 73856093) ^ Math.imul(ty + 17, 19349663)) >>> 0) % 7 - 3;
    const usesAuthoredTopCap = (
      this.authoredTopCapsEnabled
      && isWorldVisualTerrainCapTileType(this.worldModel.getTileType(tx, ty))
    );
    if (isAir(this.worldModel, tx, ty - 1) && !usesAuthoredTopCap) {
      this.edgeGraphics.beginPath().moveTo(x, y + jitter).lineTo(x + size, y - jitter).strokePath();
    }
    if (isAir(this.worldModel, tx, ty + 1)) {
      this.edgeGraphics.beginPath().moveTo(x, y + size - jitter).lineTo(x + size, y + size + jitter).strokePath();
    }
    if (isAir(this.worldModel, tx - 1, ty)) {
      this.edgeGraphics.beginPath().moveTo(x + jitter, y).lineTo(x - jitter, y + size).strokePath();
    }
    if (isAir(this.worldModel, tx + 1, ty)) {
      this.edgeGraphics.beginPath().moveTo(x + size - jitter, y).lineTo(x + size + jitter, y + size).strokePath();
    }
  }

  setLighting(lighting) {
    this.bandViews.forEach(view => view.setLighting(lighting));
  }

  invalidateCell(tx, ty, lighting) {
    const b = this.activeBounds;
    if (!b || tx < b.left - 1 || tx >= b.right + 1 || ty < b.top - 1 || ty >= b.bottom + 1) return;
    this.sync(b, lighting, false);
  }

  _destroyPlanes() {
    this.bandViews.forEach(view => view.destroy());
    this.bandViews.clear();
  }

  destroy() {
    this._destroyPlanes();
    this.assetCache.destroy();
    this.geometryMask?.destroy();
    this.backdropGeometryMask?.destroy();
    this.maskGraphics?.destroy();
    this.backdropMaskGraphics?.destroy();
    this.edgeGraphics?.destroy();
    this.geometryMask = null;
    this.backdropGeometryMask = null;
    this.maskGraphics = null;
    this.backdropMaskGraphics = null;
    this.edgeGraphics = null;
    this.activeBandIds.clear();
    this.activeMaterialKeys.clear();
    this.pendingMaterialKeys.clear();
  }
}
