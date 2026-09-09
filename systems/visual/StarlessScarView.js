import { STAR_SANCTUARY_CONFIG } from "../../values/starSanctuary.js";
import {
  collectStarScarTerritoryCells,
  resolveStarScarBoundaryEdges,
  resolveStarScarTerritorySite,
} from
  "../environment/starScarTerritory.js";
import { StarlessScarAssetLayer } from "./StarlessScarAssetLayer.js";
import {
  collectFallbackStarScars,
  drawFallbackStarScars,
  drawStarScarBoundaries,
  drawStarScarCellFill,
  drawStarScarCoreAccents,
  starlessScarColor,
} from "./starlessScarPresentation.js";
import {
  drawPendingStarlessScarPreview,
  resolvePendingStarlessScarPreview,
} from "./starlessScarPreview.js";
import {
  createStarlessScarSpread,
  resolveStarlessScarPostBreakSpread,
  revealStarlessScarSpreadCells,
} from "./starlessScarSpread.js";
import { resolveStarlessScarPaletteAtTile } from
  "./starlessScarPaletteResolver.js";

function mergeCells(...groups) {
  const byPosition = new Map();
  for (const cell of groups.flat()) byPosition.set(`${cell.tx},${cell.ty}`, cell);
  return [...byPosition.values()];
}

function mergeScars(...groups) {
  const byKey = new Map();
  for (const scar of groups.flat().filter(Boolean)) byKey.set(scar.key, scar);
  return [...byKey.values()];
}

export class StarlessScarView {
  constructor(
    scene,
    worldModel,
    config = STAR_SANCTUARY_CONFIG,
    { assetCache = null } = {},
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.territorySystem = config.scar.territoryBound
      ? scene.worldMapStarTerritorySystem || null
      : null;
    const visual = config.scar.visual;
    this.base = scene.add.graphics().setDepth(visual.baseDepth)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.rim = scene.add.graphics().setDepth(visual.rimDepth);
    this.preview = scene.add.graphics()
      .setDepth(config.consumption.preview.worldDepth);
    this.layerMaskGraphics = scene.make.graphics({ add: false });
    this.layerMask = this.layerMaskGraphics.createGeometryMask();
    this.solidMaskGraphics = scene.make.graphics({ add: false });
    this.solidMask = this.solidMaskGraphics.createGeometryMask();
    this.assetLayer = new StarlessScarAssetLayer(
      scene,
      this.layerMask,
      this.solidMask,
      visual,
      assetCache,
    );
    this.visibleScars = [];
    this.visibleScarCells = [];
    this.activeSpread = null;
    this.previewVisible = false;
    this.previewProgress = 0;
    this.previewRadiusTiles = 0;
    this.previewAllTerritories = false;
    this.spreadProgress = 0;
    this.spreadRadiusTiles = 0;
    this.lastStaticSignature = null;
    this.renderCount = 0;
    this.skippedRenderCount = 0;
  }

  _getVisibleBounds(extraMarginTiles = 0) {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view || !this.worldModel) return null;
    const tileSize = Math.max(1, this.worldModel.tileSize || 1);
    const margin = this.config.scar.visual.cullMarginTiles + extraMarginTiles;
    return {
      left: Math.max(0, Math.floor(view.x / tileSize) - margin),
      right: Math.min(
        this.worldModel.widthTiles - 1,
        Math.ceil((view.x + view.width) / tileSize) + margin,
      ),
      top: Math.max(0, Math.floor(view.y / tileSize) - margin),
      bottom: Math.min(
        this.worldModel.depthTiles - 1,
        Math.ceil((view.y + view.height) / tileSize) + margin,
      ),
    };
  }

  _collectTerritoryCells(bounds, options = {}) {
    return collectStarScarTerritoryCells({
      bounds,
      worldModel: this.worldModel,
      territorySystem: this.territorySystem,
      radiusTiles: this.config.scar.radiusTiles,
      coversEntireTerritory: this.config.scar.coversEntireTerritory,
      minimumDepthOffsetTiles: this.config.scar.minimumDepthOffsetTiles,
      ...options,
    });
  }

  _getStaticRenderSignature(enabled, bounds, assetSnapshot = {}) {
    const paletteReadiness = (assetSnapshot.palettes || [])
      .map(entry => `${entry.paletteId}:${entry.readyRoleCount}`)
      .sort()
      .join(",");
    return [
      enabled ? 1 : 0,
      bounds?.left ?? -1,
      bounds?.right ?? -1,
      bounds?.top ?? -1,
      bounds?.bottom ?? -1,
      Number(this.worldModel?.dugTiles?.size) || 0,
      Number(this.territorySystem?.stateRevision) || 0,
      assetSnapshot.groundReady ? 1 : 0,
      assetSnapshot.corruptionReady ? 1 : 0,
      assetSnapshot.centerReady ? 1 : 0,
      assetSnapshot.frontierReady ? 1 : 0,
      paletteReadiness,
    ].join(":");
  }

  _recordRender(signature, pending) {
    this.renderCount += 1;
    this.lastStaticSignature = !this.activeSpread && !pending
      ? signature
      : null;
  }

  _resolveScars(cells) {
    const sites = new Map();
    for (const cell of cells) {
      if (sites.has(cell.siteKey)) continue;
      const profile = this.scene._starSanctuaryRuntime?.system
        ?.getProfileAt(cell.site.tx, cell.site.ty);
      const palette = resolveStarlessScarPaletteAtTile(
        cell.site.tx,
        cell.site.ty,
        { site: cell.site, starProfile: profile },
      );
      sites.set(cell.siteKey, {
        ...cell.site,
        seed: profile?.seed || 0,
        identityColor: starlessScarColor(
          cell.site.color ?? profile?.identityPrimary,
        ),
        paletteId: palette?.id || cell.paletteId || "",
      });
    }
    return [...sites.values()];
  }

  _drawCells(graphics, cells, color, alpha) {
    drawStarScarCellFill(
      graphics,
      cells,
      Math.max(1, this.worldModel.tileSize || 1),
      this.config.scar.visual,
      color,
      alpha,
    );
  }

  _drawMask(cells) {
    if (cells.length) this._drawCells(this.layerMaskGraphics, cells, 0xffffff, 1);
  }

  _decorateCells(cells) {
    const profileBySite = new Map();
    return cells.map(cell => {
      let profile = profileBySite.get(cell.siteKey);
      if (!profileBySite.has(cell.siteKey)) {
        profile = this.scene._starSanctuaryRuntime?.system
          ?.getProfileAt(cell.site.tx, cell.site.ty) || null;
        profileBySite.set(cell.siteKey, profile);
      }
      const palette = resolveStarlessScarPaletteAtTile(
        cell.site?.tx ?? cell.tx,
        cell.site?.ty ?? cell.ty,
        {
          site: cell.site,
          starProfile: profile,
        },
      );
      return {
        ...cell,
        paletteId: palette?.id || "",
        scarSeed: Number(profile?.seed) || Number(cell.site?.identityIndex) || 0,
      };
    });
  }

  _drawSolidMask(cells) {
    const solidCells = cells.filter(cell => (
      this.worldModel?.isSolid?.(cell.tx, cell.ty) !== false
    ));
    if (solidCells.length) {
      this._drawCells(this.solidMaskGraphics, solidCells, 0xffffff, 1);
    }
    return solidCells;
  }

  _drawBoundaries(graphics, cells, options = {}) {
    return drawStarScarBoundaries(
      graphics,
      cells,
      Math.max(1, this.worldModel.tileSize || 1),
      this.config.scar.visual,
      options,
    );
  }

  startSpread(profile, nowMs = this.scene?.time?.now || 0) {
    this.activeSpread = createStarlessScarSpread(profile, nowMs);
    if (this.activeSpread) {
      this.spreadProgress = 0;
      this.spreadRadiusTiles = this.config.scar.spread.postBreakStartRadiusTiles;
    }
    return Boolean(this.activeSpread);
  }

  isResourceCollapsedAt(tileX, tileY, nowMs = this.scene?.time?.now || 0) {
    const site = resolveStarScarTerritorySite({
      worldModel: this.worldModel,
      territorySystem: this.territorySystem,
      tileX,
      tileY,
      radiusTiles: this.config.scar.radiusTiles,
      coversEntireTerritory: this.config.scar.coversEntireTerritory,
      minimumDepthOffsetTiles: this.config.scar.minimumDepthOffsetTiles,
    });
    if (!site) return false;
    const spread = resolveStarlessScarPostBreakSpread(
      this.activeSpread,
      nowMs,
      this.config.scar.spread,
    );
    if (!spread || spread.siteKey !== site.key || spread.complete) return true;
    const padding = Math.max(0, Number(this.config.scar.spread.cellPaddingTiles) || 0);
    const distanceSquared = (tileX - spread.tx) ** 2 + (tileY - spread.ty) ** 2;
    return distanceSquared <= (spread.radiusTiles + padding) ** 2;
  }

  _resolveCommittedCells(bounds, nowMs) {
    const cells = this._collectTerritoryCells(bounds);
    const spread = resolveStarlessScarPostBreakSpread(
      this.activeSpread,
      nowMs,
      this.config.scar.spread,
    );
    if (!spread) return cells;
    this.spreadProgress = spread.progress;
    this.spreadRadiusTiles = spread.radiusTiles;
    if (spread.complete) {
      this.activeSpread = null;
      return cells;
    }
    return revealStarlessScarSpreadCells(
      cells,
      spread,
      this.config.scar.spread.cellPaddingTiles,
    );
  }

  _resetFrameState() {
    this.base.clear();
    this.rim.clear();
    this.preview.clear();
    this.layerMaskGraphics.clear();
    this.solidMaskGraphics.clear();
    this.previewVisible = false;
    this.previewProgress = 0;
    this.previewRadiusTiles = 0;
    this.previewAllTerritories = false;
  }

  update() {
    const tileSize = Math.max(1, this.worldModel?.tileSize || 1);
    const view = this.scene?.cameras?.main?.worldView;
    const sanctuarySystem = this.scene?._starSanctuaryRuntime?.system;
    const enabled = sanctuarySystem?.enabled === true;
    const bounds = this._getVisibleBounds();
    const pending = enabled
      ? sanctuarySystem.getSnapshot?.()?.pendingConsumption || null
      : null;
    const signature = this._getStaticRenderSignature(
      enabled,
      bounds,
      this.assetLayer.getSnapshot(),
    );
    if (!this.activeSpread && !pending && signature === this.lastStaticSignature) {
      this.skippedRenderCount += 1;
      return;
    }

    this._resetFrameState();
    if (!enabled) {
      this.visibleScars = [];
      this.visibleScarCells = [];
      this.assetLayer.update({
        view,
        tileSize,
        cells: [],
        solidCells: [],
        scars: [],
        visible: false,
        boundaryEdges: [],
      });
      this._recordRender(signature, pending);
      return;
    }

    let committedCells = [];
    let committedBoundaryEdges = [];
    if (this.territorySystem) {
      committedCells = this._decorateCells(this._resolveCommittedCells(
        bounds,
        this.scene.time?.now || 0,
      ));
      this.visibleScarCells = committedCells;
      this.visibleScars = this._resolveScars(committedCells);
      if (committedCells.length) {
        this._drawCells(
          this.base,
          committedCells,
          this.config.scar.visual.baseColor,
          this.config.scar.visual.baseAlpha,
        );
        this._drawMask(committedCells);
        committedBoundaryEdges = this._drawBoundaries(
          this.rim,
          committedCells,
          { shadow: true },
        );
      }
    } else {
      this.visibleScarCells = [];
      this.visibleScars = collectFallbackStarScars({
        bounds: this._getVisibleBounds(this.config.scar.radiusTiles),
        worldModel: this.worldModel,
        getProfileAt: (tx, ty) => this.scene._starSanctuaryRuntime?.system
          ?.getProfileAt(tx, ty),
      });
      drawFallbackStarScars({
        base: this.base,
        rim: this.rim,
        maskGraphics: this.layerMaskGraphics,
        scars: this.visibleScars,
        tileSize,
        radiusTiles: this.config.scar.radiusTiles,
        visual: this.config.scar.visual,
      });
    }

    const preview = resolvePendingStarlessScarPreview({
      pending,
      bounds,
      territorySystem: this.territorySystem,
      config: this.config,
      collectCells: (nextBounds, options) => (
        this._collectTerritoryCells(nextBounds, options)
      ),
    });
    const previewState = drawPendingStarlessScarPreview({
      scene: this.scene,
      worldModel: this.worldModel,
      territorySystem: this.territorySystem,
      config: this.config,
      previewGraphics: this.preview,
      maskGraphics: this.layerMaskGraphics,
      ...preview,
    });
    this.previewVisible = previewState.visible;
    this.previewProgress = previewState.progress;
    this.previewRadiusTiles = previewState.radius;
    this.previewAllTerritories = preview.allTerritories;
    const previewScar = preview.pending?.profile ? {
      ...preview.pending.profile,
      identityColor: starlessScarColor(preview.pending.profile.identityPrimary),
      presentationAlpha: this.config.scar.visual.centerPreviewMinimumAlpha
        + (1 - this.config.scar.visual.centerPreviewMinimumAlpha)
          * this.previewProgress,
      paletteId: resolveStarlessScarPaletteAtTile(
        preview.pending.profile.tx,
        preview.pending.profile.ty,
        { starProfile: preview.pending.profile },
      )?.id || "",
    } : null;
    const layerCells = this._decorateCells(mergeCells(committedCells, preview.cells));
    const solidCells = this._drawSolidMask(layerCells);
    const layerScars = mergeScars(this.visibleScars, previewScar);
    const layerBoundaryEdges = preview.cells.length
      ? resolveStarScarBoundaryEdges(layerCells)
      : committedBoundaryEdges;
    drawStarScarCoreAccents(this.rim, layerScars, tileSize, this.config.scar.visual);
    this.assetLayer.update({
      view,
      tileSize,
      cells: layerCells,
      solidCells,
      scars: layerScars,
      visible: Boolean(layerCells.length || layerScars.length || this.previewVisible),
      boundaryEdges: layerBoundaryEdges,
    });
    this._recordRender(signature, pending);
  }

  getSnapshot() {
    const assets = this.assetLayer.getSnapshot();
    return {
      visibleScarCount: this.visibleScars.length,
      visibleScarCellCount: this.visibleScarCells.length,
      scarRadiusTiles: this.config.scar.radiusTiles,
      territoryBound: Boolean(this.territorySystem),
      coversEntireTerritory: this.config.scar.coversEntireTerritory === true,
      materialReady: assets.corruptionReady,
      ...assets,
      previewVisible: this.previewVisible,
      previewProgress: this.previewProgress,
      previewRadiusTiles: this.previewRadiusTiles,
      previewAllTerritories: this.previewAllTerritories,
      spreadActive: Boolean(this.activeSpread),
      spreadComplete: !this.activeSpread && this.spreadProgress >= 1,
      spreadProgress: this.spreadProgress,
      spreadRadiusTiles: this.spreadRadiusTiles,
      renderCount: this.renderCount,
      skippedRenderCount: this.skippedRenderCount,
    };
  }

  destroy() {
    this.assetLayer?.destroy();
    this.solidMask?.destroy?.();
    this.solidMaskGraphics?.destroy();
    this.layerMask?.destroy?.();
    this.layerMaskGraphics?.destroy();
    this.base?.destroy();
    this.rim?.destroy();
    this.preview?.destroy();
    this.visibleScars = [];
    this.visibleScarCells = [];
    this.activeSpread = null;
    this.lastStaticSignature = null;
    this.territorySystem = null;
    this.scene = null;
    this.worldModel = null;
  }
}
