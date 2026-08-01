import {
  WORLD_VISUAL_BACKDROP_ENHANCERS,
  getWorldVisualBackdropEnhancerAssets,
  resolveWorldVisualBackdropEnhancerSelection,
  resolveWorldVisualBackdropEnhancersEnabled,
} from "../../../values/worldVisualBackdropEnhancers.js?rev=20260729-backdrop-enhancers-v7";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  mixWorldVisualTint,
  resolveWorldVisualDepthBackdropRegions,
  resolveWorldVisualDepthBackdropRegionAssets,
  resolveWorldVisualDepthBackdropsEnabled,
  resolveWorldVisualDepthBackdropTint,
} from "../../../values/worldVisualDepthBackdrops.js?rev=20260729-normalized-seams-v11";
import { RUNTIME_ASSET_LOADING } from "../../../values/runtimeAssetLoading.js";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import {
  resolveWorldVisualBackdropCardPlacement,
  resolveWorldVisualBackdropCardRange,
} from "./worldVisualBackdropCardGrid.js?rev=20260729-backdrop-enhancers-v7";
import {
  setPositionIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";
import { resolveWorldVisualSemanticSequenceIndex } from
  "./worldVisualSemanticSequence.js";

function sourceSize(scene, asset) {
  const texture = scene.textures.get(asset.key);
  const source = (
    texture?.getSourceImage?.()
    || texture?.source?.[0]?.image
    || texture?.source?.[0]
  );
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualBackdropEnhancerLayer] Missing source: ${asset.key}`);
  }
  return { width: source.width, height: source.height };
}

export class WorldVisualBackdropEnhancerLayer {
  constructor(
    scene,
    config = WORLD_VISUAL_BACKDROP_ENHANCERS,
    backdropConfig = WORLD_VISUAL_DEPTH_BACKDROPS,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.config = config;
    this.backdropConfig = backdropConfig;
    this.search = search;
    this.enabled = (
      resolveWorldVisualBackdropEnhancersEnabled(config, search)
      && resolveWorldVisualDepthBackdropsEnabled(backdropConfig, search)
    );
    this.cards = new Map();
    this.activeAssetKeys = new Set();
    this.pendingAssetKeys = new Set();
    this.activeBounds = null;
    this.lastLighting = null;
    this.assetCache = null;
  }

  get segments() {
    return this.cards;
  }

  create() {
    if (!this.enabled) return false;
    this.assetCache = new WorldVisualAssetCache(this.scene, {
      owner: RUNTIME_ASSET_LOADING.owners.backdropEnhancer,
      priority: RUNTIME_ASSET_LOADING.priorities.backdropEnhancer,
    });
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.enabled || !bounds) return false;
    this.activeBounds = bounds;
    this.lastLighting = lighting;
    if (force) this._destroyCards();

    const tileSize = this.scene.config.tileSize;
    const transitionTiles = (
      Number(this.backdropConfig.blend?.crossBiomeOverlapYPx) || 0
    ) / tileSize;
    const regions = resolveWorldVisualDepthBackdropRegions(
      bounds.top,
      bounds.bottom + transitionTiles,
      this.backdropConfig,
      this.search
    ).filter(region => (
      bounds.right > region.leftTile
      && bounds.left < region.rightTileExclusive
    ));
    const neededCards = new Set();
    const neededAssets = new Map();

    for (const region of regions) {
      const range = resolveWorldVisualBackdropCardRange(
        bounds,
        region,
        this.backdropConfig,
        tileSize,
        this.config.streaming.neighborSegments
      );
      if (!range) continue;
      for (let row = range.firstRow; row <= range.lastRow; row += 1) {
        for (
          let column = range.firstColumn;
          column <= range.lastColumn;
          column += 1
        ) {
          const backdropAsset = this._resolveBackdropAsset(
            region,
            column,
            row,
            range.rows
          );
          const selection = resolveWorldVisualBackdropEnhancerSelection(
            region.id,
            column,
            row,
            this.config,
            backdropAsset
          );
          if (!selection) continue;
          const id = `${region.id}:${column}:${row}`;
          neededCards.add(id);
          neededAssets.set(selection.asset.key, selection.asset);
          if (this._isAssetReady(selection.asset)) {
            this._upsertCard(id, region, column, row, selection);
          } else {
            this._requestAsset(selection.asset);
          }
        }
      }
    }

    this.activeAssetKeys = new Set(neededAssets.keys());
    this._pruneCards(neededCards);
    this._releaseUnusedAssets();
    this.update(lighting);
    return neededCards.size > 0;
  }

  _isAssetReady(asset) {
    return Boolean(asset?.key && this.scene.textures.exists(asset.key));
  }

  _resolveBackdropAsset(region, column, row, rows) {
    const assets = resolveWorldVisualDepthBackdropRegionAssets(
      region,
      this.backdropConfig,
      this.search
    );
    const handoffs = assets.filter(asset => asset.path?.includes("-handoff-"));
    const body = assets.filter(asset => !handoffs.includes(asset));
    if (handoffs.length > 0 && row === rows - 1) {
      return handoffs[column % handoffs.length];
    }
    const ordered = body.length > 0 ? body : handoffs;
    return ordered.length > 0
      ? ordered[resolveWorldVisualSemanticSequenceIndex(
        column,
        row,
        0,
        ordered.length
      )]
      : null;
  }

  _requestAsset(asset) {
    if (
      !this.assetCache
      || this._isAssetReady(asset)
      || this.pendingAssetKeys.has(asset.key)
    ) {
      return;
    }
    this.pendingAssetKeys.add(asset.key);
    this.assetCache.ensure(asset, {
      onReady: () => {
        this.pendingAssetKeys.delete(asset.key);
        if (this.activeAssetKeys.has(asset.key) && this.activeBounds) {
          this.sync(this.activeBounds, this.lastLighting, false);
        } else {
          this.assetCache?.release(asset.key, asset);
        }
      },
      onError: () => this.pendingAssetKeys.delete(asset.key),
    });
  }

  _upsertCard(id, region, column, row, selection) {
    const existing = this.cards.get(id);
    if (
      existing
      && existing.asset.key === selection.asset.key
      && existing.alpha === selection.alpha
    ) {
      return existing;
    }
    if (existing) this._destroyCard(existing);
    const card = this._createCard(region, column, row, selection);
    this.cards.set(id, card);
    return card;
  }

  _createCard(region, column, row, selection) {
    const tileSize = this.scene.config.tileSize;
    const placement = resolveWorldVisualBackdropCardPlacement(
      region,
      this.backdropConfig,
      tileSize,
      column,
      row
    );
    const source = sourceSize(this.scene, selection.asset);
    const cropWidth = Math.max(
      1,
      Math.round(
        source.width
        * placement.contentWidthPx
        / placement.geometry.widthPx
      )
    );
    const cropHeight = Math.max(
      1,
      Math.round(
        source.height
        * placement.contentHeightPx
        / placement.geometry.heightPx
      )
    );
    const regionIndex = Math.max(
      0,
      this.backdropConfig.regions.indexOf(region)
    );
    const backdropDepth = (
      this.backdropConfig.render.backwallDepth
      + regionIndex
        * (Number(this.backdropConfig.render.regionDepthStride) || 0)
      + (row * placement.columns + column)
        * (Number(this.backdropConfig.render.segmentDepthStep) || 0)
    );
    const image = this.scene.add.image(
      placement.baseX,
      placement.baseY,
      selection.asset.key
    )
      .setOrigin(0)
      .setDepth(backdropDepth + this.config.render.depthOffset)
      .setCrop(0, 0, cropWidth, cropHeight)
      .setDisplayOrigin(0, 0)
      .setScale(
        placement.contentWidthPx / cropWidth,
        placement.contentHeightPx / cropHeight
      )
      .setAlpha(selection.alpha);
    image.setBlendMode?.(selection.asset.blendMode);
    image.name = (
      `world-visual-backdrop-enhancer-${region.id}-${column}-${row}`
    );
    return {
      image,
      asset: selection.asset,
      alpha: selection.alpha,
      baseX: placement.baseX,
      baseY: placement.baseY,
      centerTileY: (
        placement.baseY + placement.contentHeightPx / 2
      ) / tileSize,
      region,
      column,
      row,
    };
  }

  update(lighting) {
    if (!this.enabled || !lighting) return;
    for (const card of this.cards.values()) {
      setPositionIfChanged(card.image, card.baseX, card.baseY);
      const backdropTint = resolveWorldVisualDepthBackdropTint(
        card.centerTileY,
        lighting,
        this.backdropConfig,
        card.region
      );
      setTintIfChanged(
        card.image,
        mixWorldVisualTint(
          0xffffff,
          backdropTint,
          this.config.render.tintMix
        )
      );
    }
  }

  _pruneCards(neededCards) {
    for (const [id, card] of this.cards) {
      if (neededCards.has(id)) continue;
      this._destroyCard(card);
      this.cards.delete(id);
    }
  }

  _destroyCard(card) {
    card?.image?.destroy?.();
  }

  _destroyCards() {
    this._pruneCards(new Set());
  }

  _releaseUnusedAssets() {
    for (const asset of getWorldVisualBackdropEnhancerAssets(this.config)) {
      if (!this.activeAssetKeys.has(asset.key)) {
        this.assetCache?.release(asset.key, asset);
      }
    }
  }

  getPerformanceSnapshot() {
    return {
      enabled: this.enabled,
      visibleCards: this.cards.size,
      activeAssets: this.activeAssetKeys.size,
      pendingAssets: this.pendingAssetKeys.size,
      assetCache: this.assetCache?.getPerformanceSnapshot?.() || null,
    };
  }

  destroy() {
    this._destroyCards();
    this.assetCache?.destroy();
    this.assetCache = null;
    this.activeAssetKeys.clear();
    this.pendingAssetKeys.clear();
    this.activeBounds = null;
    this.lastLighting = null;
  }
}
