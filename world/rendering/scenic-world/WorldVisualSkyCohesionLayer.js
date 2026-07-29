import {
  WORLD_VISUAL_SKY_COHESION,
  getWorldVisualSkyCohesionAssets,
  resolveWorldVisualSkyCohesionCells,
  resolveWorldVisualSkyCohesionEnabled,
} from "../../../values/worldVisualSkyCohesion.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropBlendMask,
} from "../../../values/worldVisualDepthBackdrops.js";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";
import {
  createWorldVisualBlendMask,
  resolveWorldVisualBlendBits,
} from
  "./worldVisualBlendMaskFrame.js?rev=20260729-whole-world-expansion-v5-lineless-v10";

function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.()
    || texture?.source?.[0]?.image
    || texture?.source?.[0];
  return source?.width && source?.height
    ? { width: source.width, height: source.height }
    : null;
}

function intersects(bounds, cell, margin = 0) {
  return bounds.right + margin > cell.leftTile
    && bounds.left - margin < cell.rightTileExclusive
    && bounds.bottom + margin > cell.topTile
    && bounds.top - margin < cell.bottomTileExclusive;
}

function createIncomingBlendMask(
  scene,
  asset,
  blend,
  edges,
  x,
  y,
  width,
  height
) {
  const bits = resolveWorldVisualBlendBits(blend, edges);
  const mask = createWorldVisualBlendMask(
    scene,
    asset,
    blend,
    bits,
    x,
    y,
    width,
    height
  );
  return mask ? { ...mask, bits } : null;
}

export class WorldVisualSkyCohesionLayer {
  constructor(
    scene,
    config = WORLD_VISUAL_SKY_COHESION,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.config = config;
    this.search = search;
    this.enabled = resolveWorldVisualSkyCohesionEnabled(config, search);
    this.cells = [];
    this.cards = new Map();
    this.activeCellIds = new Set();
    this.activeAssetKeys = new Set();
    this.pendingAssetKeys = new Set();
    this.assetCache = null;
    this.maskAsset = null;
    this.maskReady = false;
    this.lastBounds = null;
    this.lastLighting = null;
  }

  create() {
    if (!this.enabled) return false;
    const tileSize = this.scene.config.tileSize;
    const worldWidthTiles = this.scene.config.worldWidthTiles
      || this.scene.config.worldWidthPx / tileSize;
    this.cells = resolveWorldVisualSkyCohesionCells(
      worldWidthTiles,
      this.scene.config.topAirRows,
      tileSize,
      this.config
    );
    this.maskAsset = resolveWorldVisualDepthBackdropBlendMask(
      WORLD_VISUAL_DEPTH_BACKDROPS,
      this.search
    );
    this.assetCache = new WorldVisualAssetCache(this.scene, {
      retainKeys: this.maskAsset ? [this.maskAsset.key] : [],
    });
    this._requestMask();
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.enabled || !bounds) return false;
    this.lastBounds = bounds;
    this.lastLighting = lighting;
    if (force) this._destroyCards();
    const margin = this.config.worldGrid.loadMarginTiles;
    const needed = this.cells.filter(cell => intersects(bounds, cell, margin));
    this.activeCellIds = new Set(needed.map(cell => cell.id));
    this.activeAssetKeys = new Set(needed.map(cell => cell.asset.key));
    needed.forEach(cell => this._requestCell(cell));
    this._prune();
    this.update(0, lighting);
    return needed.length > 0;
  }

  update(time, lighting = this.lastLighting) {
    if (!this.enabled || !lighting) return false;
    this.lastLighting = lighting;
    const tint = Number.isFinite(lighting.farTint) ? lighting.farTint : 0xffffff;
    this.cards.forEach(({ image }) => {
      setTintIfChanged(image, tint);
      setAlphaIfChanged(image, this.config.render.alpha);
    });
    return this.cards.size > 0;
  }

  _requestMask() {
    if (!this.maskAsset) return;
    this.assetCache.ensure(this.maskAsset, {
      onReady: () => {
        this.maskReady = true;
        if (this.lastBounds) this.sync(this.lastBounds, this.lastLighting);
      },
    });
  }

  _requestCell(cell) {
    if (this.scene.textures.exists(cell.asset.key)) {
      this._ensureCard(cell);
      return;
    }
    if (this.pendingAssetKeys.has(cell.asset.key)) return;
    this.pendingAssetKeys.add(cell.asset.key);
    this.assetCache.ensure(cell.asset, {
      onReady: () => {
        this.pendingAssetKeys.delete(cell.asset.key);
        const activeMatches = this.cells.filter(candidate => (
          candidate.asset.key === cell.asset.key
          && this.activeCellIds.has(candidate.id)
        ));
        activeMatches.forEach(candidate => this._ensureCard(candidate));
        if (activeMatches.length > 0) {
          this.update(0, this.lastLighting);
        } else {
          this.assetCache.release(cell.asset.key, cell.asset);
        }
      },
      onError: () => this.pendingAssetKeys.delete(cell.asset.key),
    });
  }

  _ensureCard(cell) {
    if (!this.maskReady || this.cards.has(cell.id)) return null;
    const source = sourceSize(this.scene, cell.asset.key);
    if (
      source?.width !== this.config.source.widthPx
      || source?.height !== this.config.source.heightPx
    ) {
      console.error(`[WorldVisualSkyCohesionLayer] Invalid source: ${cell.asset.key}`);
      return null;
    }
    const tileSize = this.scene.config.tileSize;
    const x = cell.leftTile * tileSize;
    const y = cell.topTile * tileSize;
    const width = cell.displayWidthPx;
    const height = cell.displayHeightPx;
    const image = this.scene.add.image(x, y, cell.asset.key)
      .setOrigin(0)
      .setDepth(
        this.config.render.depth
        + cell.renderOrder * this.config.render.depthStep
      )
      .setAlpha(this.config.render.alpha)
      .setScale(cell.displayScale);
    const mask = createIncomingBlendMask(
      this.scene,
      this.maskAsset,
      WORLD_VISUAL_DEPTH_BACKDROPS.blend,
      cell.blendEdges,
      x,
      y,
      width,
      height
    );
    if (!mask) {
      image.destroy();
      return null;
    }
    image.setMask(mask.bitmap);
    image.name = `world-visual-sky-native-card-${cell.id}`;
    const card = {
      cell,
      image,
      maskImage: mask.image,
      bitmapMask: mask.bitmap,
      blendBits: mask.bits,
    };
    this.cards.set(cell.id, card);
    return card;
  }

  _prune() {
    for (const [id, card] of this.cards) {
      if (this.activeCellIds.has(id)) continue;
      this._destroyCard(card);
      this.cards.delete(id);
    }
    for (const asset of getWorldVisualSkyCohesionAssets(this.config)) {
      if (!this.activeAssetKeys.has(asset.key)) {
        this.assetCache.release(asset.key, asset);
      }
    }
  }

  _destroyCard(card) {
    card.image.clearMask?.(false);
    card.image.destroy();
    card.bitmapMask?.destroy?.();
    card.maskImage?.destroy?.();
  }

  _destroyCards() {
    this.cards.forEach(card => this._destroyCard(card));
    this.cards.clear();
  }

  destroy() {
    this._destroyCards();
    this.assetCache?.destroy();
    this.assetCache = null;
    this.cells = [];
    this.activeCellIds.clear();
    this.activeAssetKeys.clear();
    this.pendingAssetKeys.clear();
    this.lastBounds = null;
    this.lastLighting = null;
  }
}
