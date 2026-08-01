import {
  WORLD_VISUAL_SKY_COHESION,
  getWorldVisualSkyCohesionAssets,
  multiplyWorldVisualSkyTints,
  resolveWorldVisualSkyCohesionEnabled,
  resolveWorldVisualSkyCells,
  resolveWorldVisualSkyRuntimeMode,
} from "../../../values/worldVisualSkyCohesion.js?rev=20260730-sky-order-v2";
import { RUNTIME_ASSET_LOADING } from "../../../values/runtimeAssetLoading.js";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";
import {
  createWorldVisualNormalizedBlendMask,
  resolveWorldVisualBlendBits,
} from
  "./worldVisualBlendMaskFrame.js?rev=20260729-native-density-v14";
import { WorldVisualSkyFoundationView } from "./WorldVisualSkyFoundationView.js";

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
  blend,
  edges,
  x,
  y,
  width,
  height
) {
  const bits = resolveWorldVisualBlendBits(blend, edges);
  const mask = createWorldVisualNormalizedBlendMask(
    scene,
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
    this.runtimeMode = resolveWorldVisualSkyRuntimeMode(config, search);
    this.cells = [];
    this.cards = new Map();
    this.activeCellIds = new Set();
    this.activeAssetKeys = new Set();
    this.visibleCellIds = new Set();
    this.committedCellIds = new Set();
    this.committedAssetKeys = new Set();
    this.pendingAssetKeys = new Set();
    this.assetCache = null;
    this.foundationView = null;
    this.matte = null;
    this.coverageReady = false;
    this.lastBounds = null;
    this.lastLighting = null;
    this.inspector = null;
  }

  create() {
    if (!this.enabled) return false;
    const tileSize = this.scene.config.tileSize;
    const worldWidthTiles = this.scene.config.worldWidthTiles
      || this.scene.config.worldWidthPx / tileSize;
    this.cells = resolveWorldVisualSkyCells(
      worldWidthTiles,
      this.scene.config.topAirRows,
      tileSize,
      this.config,
      this.search
    );
    this.assetCache = new WorldVisualAssetCache(this.scene, {
      owner: RUNTIME_ASSET_LOADING.owners.skyCohesion,
      priority: RUNTIME_ASSET_LOADING.priorities.skyCohesion,
    });
    if (this.runtimeMode === "ordered-features") {
      this.foundationView = new WorldVisualSkyFoundationView(
        this.scene,
        this.config.foundation,
        this.assetCache
      );
      this.foundationView.create();
    } else {
      const fieldWidthPx = Math.max(
        ...this.cells.map(cell => cell.rightTileExclusive * tileSize)
      );
      const fieldHeightPx = Math.max(
        ...this.cells.map(cell => cell.bottomTileExclusive * tileSize)
      );
      this.matte = this.scene.add.rectangle(
        0,
        0,
        fieldWidthPx,
        fieldHeightPx,
        this.config.blend.matteColor,
        1
      )
        .setOrigin(0)
        .setDepth(this.config.render.matteDepth)
        .setAlpha(0);
      this.matte.name = "world-visual-sky-normalized-blend-matte";
    }
    this.inspector = Object.freeze({ snapshot: () => this.getSnapshot() });
    globalThis.__jkdSkyComposition = this.inspector;
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.enabled || !bounds) return false;
    this.lastBounds = bounds;
    this.lastLighting = lighting;
    if (force) {
      this._destroyCards();
      this.committedCellIds.clear();
      this.committedAssetKeys.clear();
      this.coverageReady = false;
    }
    const margin = this.config.worldGrid.loadMarginTiles;
    const visible = this.cells.filter(cell => intersects(bounds, cell));
    const needed = this.cells.filter(cell => intersects(bounds, cell, margin));
    this.visibleCellIds = new Set(visible.map(cell => cell.id));
    this.activeCellIds = new Set(needed.map(cell => cell.id));
    this.activeAssetKeys = new Set(needed.map(cell => cell.asset.key));
    needed.forEach(cell => this._requestCell(cell));
    if (needed.length === 0) {
      this.committedCellIds.clear();
      this.committedAssetKeys.clear();
    }
    this._tryCommitCoverage();
    this._prune();
    this._syncCoverageVisibility();
    this.update(0, lighting);
    return needed.length > 0;
  }

  update(time, lighting = this.lastLighting) {
    if (!this.enabled || !lighting) return false;
    this.lastLighting = lighting;
    const weatherTint = Number.isFinite(lighting.farTint)
      ? lighting.farTint
      : 0xffffff;
    this.foundationView?.update(lighting);
    this.cards.forEach(({ cell, image }) => {
      setTintIfChanged(
        image,
        multiplyWorldVisualSkyTints(
          weatherTint,
          cell.asset.atmosphereTint
        )
      );
      setAlphaIfChanged(image, this._resolveCardAlpha(cell));
    });
    return Boolean(
      this.foundationView?.fallback
      || this.foundationView?.image
      || this.cards.size > 0
    );
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
          this._tryCommitCoverage();
          this._prune();
          this._syncCoverageVisibility();
          this.update(0, this.lastLighting);
        } else {
          this.assetCache.release(cell.asset.key, cell.asset);
        }
      },
      onError: () => this.pendingAssetKeys.delete(cell.asset.key),
    });
  }

  _ensureCard(cell) {
    if (this.cards.has(cell.id)) return null;
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
      .setAlpha(0)
      .setCrop(
        cell.sourceCrop.xPx,
        cell.sourceCrop.yPx,
        cell.sourceCrop.widthPx,
        cell.sourceCrop.heightPx
      )
      // Phaser positions a cropped quad at +crop.x/+crop.y. Match the display
      // origin to the safe-frame origin so the visible crop still begins at
      // the authored world-space cell position.
      .setDisplayOrigin(cell.sourceCrop.xPx, cell.sourceCrop.yPx)
      .setScale(cell.displayScale);
    image.setBlendMode?.(
      this.runtimeMode === "ordered-features"
        ? this.config.render.featureBlendMode
        : this.config.blend.blendMode
    );
    const cellBlend = {
      ...this.config.blend,
      featherXPx: cell.overlapXPx,
      featherYPx: cell.overlapYPx,
    };
    const mask = createIncomingBlendMask(
      this.scene,
      cellBlend,
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
      maskTextureKey: mask.textureKey,
      blendBits: mask.bits,
    };
    this.cards.set(cell.id, card);
    return card;
  }

  _tryCommitCoverage() {
    if (this.runtimeMode === "ordered-features") {
      this.committedCellIds = new Set(
        [...this.activeCellIds].filter(id => this.cards.has(id))
      );
      this.committedAssetKeys = new Set(
        [...this.committedCellIds].map(id => this.cards.get(id).cell.asset.key)
      );
      return this.committedCellIds.size > 0;
    }
    if (
      this.activeCellIds.size === 0
      || ![...this.activeCellIds].every(id => this.cards.has(id))
    ) {
      return false;
    }
    this.committedCellIds = new Set(this.activeCellIds);
    this.committedAssetKeys = new Set(this.activeAssetKeys);
    return true;
  }

  _resolveCardAlpha(cell) {
    if (!this.coverageReady || !this.committedCellIds.has(cell.id)) return 0;
    if (this.runtimeMode !== "ordered-features") return this.config.render.alpha;
    const bandAlpha = this.config.composition.bandAlpha[cell.bandId];
    const transitionProfiles = [
      cell.incomingHorizontalTransition?.profile,
      cell.incomingVerticalTransition?.profile,
    ].filter(Boolean);
    const transitionAlpha = transitionProfiles.reduce((alpha, profile) => {
      const profileAlpha = this.config.composition.transitionAlphaScale[profile];
      return Number.isFinite(profileAlpha) ? Math.min(alpha, profileAlpha) : alpha;
    }, 1);
    return this.config.render.alpha
      * (Number.isFinite(bandAlpha) ? bandAlpha : 1)
      * transitionAlpha;
  }

  _syncCoverageVisibility() {
    if (this.runtimeMode === "ordered-features") {
      this.coverageReady = true;
      this.cards.forEach(({ cell, image }) => {
        setAlphaIfChanged(image, this._resolveCardAlpha(cell));
      });
      return true;
    }
    const coverageReady = (
      this.visibleCellIds.size > 0
      && [...this.visibleCellIds].every(id => (
        this.committedCellIds.has(id) && this.cards.has(id)
      ))
    );
    this.coverageReady = coverageReady;
    setAlphaIfChanged(this.matte, coverageReady ? 1 : 0);
    this.cards.forEach(({ cell, image }) => setAlphaIfChanged(
      image,
      this._resolveCardAlpha(cell)
    ));
    return coverageReady;
  }

  _prune() {
    const retainedCellIds = new Set([
      ...this.activeCellIds,
      ...this.committedCellIds,
    ]);
    for (const [id, card] of this.cards) {
      if (retainedCellIds.has(id)) continue;
      this._destroyCard(card);
      this.cards.delete(id);
    }
    const retainedAssetKeys = new Set([
      ...this.activeAssetKeys,
      ...this.committedAssetKeys,
    ]);
    for (const asset of getWorldVisualSkyCohesionAssets(this.config)) {
      if (asset.key === this.config.foundation.asset.key) continue;
      if (!retainedAssetKeys.has(asset.key)) {
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

  getSnapshot() {
    return Object.freeze({
      enabled: this.enabled,
      runtimeMode: this.runtimeMode,
      fallbackReady: Boolean(this.foundationView?.fallback),
      foundationReady: Boolean(this.foundationView?.image),
      foundationAssetKey: this.config.foundation.asset.key,
      activeFeatureCards: this.cards.size,
      pendingFeatureAssets: this.pendingAssetKeys.size,
      coverageReady: this.coverageReady,
      blackMatteActive: Boolean(this.matte?.alpha > 0),
    });
  }

  destroy() {
    this._destroyCards();
    this.foundationView?.destroy();
    this.foundationView = null;
    this.assetCache?.destroy();
    this.assetCache = null;
    this.matte?.destroy?.();
    this.matte = null;
    this.cells = [];
    this.activeCellIds.clear();
    this.activeAssetKeys.clear();
    this.visibleCellIds.clear();
    this.committedCellIds.clear();
    this.committedAssetKeys.clear();
    this.pendingAssetKeys.clear();
    this.coverageReady = false;
    this.lastBounds = null;
    this.lastLighting = null;
    if (globalThis.__jkdSkyComposition === this.inspector) {
      delete globalThis.__jkdSkyComposition;
    }
    this.inspector = null;
  }
}
