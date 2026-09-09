import { resolveStarScarBoundaryEdges } from
  "../environment/starScarTerritory.js";
import { StarlessScarBiomeAssetLayer } from
  "./StarlessScarBiomeAssetLayer.js";

const ROTATION_BY_SIDE = Object.freeze({
  top: 0,
  right: Math.PI * 0.5,
  bottom: Math.PI,
  left: -Math.PI * 0.5,
});

function hasTexture(scene, asset) {
  return Boolean(asset?.key && scene.textures?.exists?.(asset.key));
}

function createTiledLayer(scene, mask, asset, depth, alpha, scale) {
  if (!hasTexture(scene, asset)) return null;
  return scene.add.tileSprite(0, 0, 1, 1, asset.key)
    .setOrigin(0, 0)
    .setDepth(depth)
    .setAlpha(alpha)
    .setTileScale(scale)
    .setMask(mask)
    .setVisible(false);
}

function positionTiledLayer(layer, view, tileSize, visual, scale, visible) {
  if (!layer) return;
  if (!visible || !view) {
    layer.setVisible(false);
    return;
  }
  const margin = visual.cullMarginTiles * tileSize;
  const left = Math.floor(view.x - margin);
  const top = Math.floor(view.y - margin);
  layer.setPosition(left, top).setSize(
    Math.ceil(view.width + margin * 2),
    Math.ceil(view.height + margin * 2),
  ).setVisible(true);
  const safeScale = Math.max(0.01, Number(scale) || 1);
  layer.tilePositionX = left / safeScale;
  layer.tilePositionY = top / safeScale;
}

function hidePool(pool, used) {
  for (let index = used; index < pool.length; index += 1) {
    pool[index].setVisible(false);
  }
}

export class StarlessScarAssetLayer {
  constructor(scene, territoryMask, solidMask, visual, assetCache = null) {
    this.scene = scene;
    this.territoryMask = territoryMask;
    this.solidMask = solidMask;
    this.visual = visual;
    this.ground = createTiledLayer(
      scene,
      solidMask,
      visual.assets.ground,
      visual.groundDepth,
      visual.groundAlpha,
      visual.groundTileScale,
    );
    this.corruption = createTiledLayer(
      scene,
      solidMask,
      visual.assets.corruption,
      visual.materialDepth,
      visual.materialAlpha,
      visual.materialTileScale,
    );
    this.centerPool = [];
    this.frontierPool = [];
    this.visibleCenterCount = 0;
    this.visibleFrontierCount = 0;
    this.biome = new StarlessScarBiomeAssetLayer(
      scene,
      assetCache,
      visual,
    );
  }

  _getPooledImage(pool, index, asset, depth, masked = false) {
    let image = pool[index];
    if (!image) {
      if (!hasTexture(this.scene, asset)) return null;
      image = this.scene.add.image(0, 0, asset.key).setDepth(depth);
      if (masked) image.setMask(this.territoryMask);
      pool.push(image);
    }
    return image;
  }

  _syncCenters(scars, tileSize) {
    const asset = this.visual.assets.center;
    let used = 0;
    for (const scar of scars) {
      if (
        scar.paletteId
        && this.biome.hasReadyRole(scar.paletteId, "center")
      ) continue;
      const image = this._getPooledImage(
        this.centerPool,
        used,
        asset,
        this.visual.centerDepth,
        true,
      );
      if (!image) break;
      image.setPosition(
        (scar.tx + 0.5) * tileSize,
        (scar.ty + 0.5) * tileSize,
      ).setDisplaySize(
        this.visual.centerSizeTiles * tileSize,
        this.visual.centerSizeTiles * tileSize,
      ).setAlpha(
        this.visual.centerAlpha * (scar.presentationAlpha ?? 1),
      ).setRotation((scar.seed % 8) * Math.PI * 0.25)
        .setFlipX((scar.seed & 1) === 1)
        .setVisible(true);
      used += 1;
    }
    hidePool(this.centerPool, used);
    this.visibleCenterCount = used;
  }

  _syncFrontier(cells, tileSize, boundaryEdges = null) {
    const asset = this.visual.assets.frontier;
    const paletteByCell = new Map(cells.map(cell => [
      `${cell.tx},${cell.ty}`,
      cell.paletteId,
    ]));
    const edges = (Array.isArray(boundaryEdges)
      ? boundaryEdges
      : resolveStarScarBoundaryEdges(cells))
      .filter(edge => {
        if (edge.kind !== "outer") return false;
        const paletteId = paletteByCell.get(`${edge.cellTx},${edge.cellTy}`);
        return !paletteId || !this.biome.hasReadyRole(paletteId, "frontier");
      });
    let used = 0;
    for (const edge of edges) {
      const image = this._getPooledImage(
        this.frontierPool,
        used,
        asset,
        this.visual.frontierDepth,
      );
      if (!image) break;
      const inset = this.visual.frontierInsetTiles * tileSize;
      const hash = Math.abs(edge.cellTx * 31 + edge.cellTy * 17);
      image.setPosition(
        (edge.x1 + edge.x2) * 0.5 * tileSize - edge.outwardX * inset,
        (edge.y1 + edge.y2) * 0.5 * tileSize - edge.outwardY * inset,
      ).setDisplaySize(
        this.visual.frontierSizeTiles * tileSize,
        this.visual.frontierSizeTiles * tileSize,
      ).setRotation(ROTATION_BY_SIDE[edge.side] || 0)
        .setFlipX((hash & 1) === 1)
        .setAlpha(this.visual.frontierAlpha)
        .setVisible(true);
      used += 1;
    }
    hidePool(this.frontierPool, used);
    this.visibleFrontierCount = used;
  }

  update({
    view,
    tileSize,
    cells,
    solidCells = cells,
    scars,
    visible,
    boundaryEdges = null,
  }) {
    positionTiledLayer(
      this.ground,
      view,
      tileSize,
      this.visual,
      this.visual.groundTileScale,
      visible,
    );
    this.biome.update({
      view,
      tileSize,
      cells,
      solidCells,
      scars,
      visible,
      boundaryEdges,
    });
    positionTiledLayer(
      this.corruption,
      view,
      tileSize,
      this.visual,
      this.visual.materialTileScale,
      visible,
    );
    if (!visible) {
      hidePool(this.centerPool, 0);
      hidePool(this.frontierPool, 0);
      this.visibleCenterCount = 0;
      this.visibleFrontierCount = 0;
      return;
    }
    this._syncCenters(scars, tileSize);
    this._syncFrontier(cells, tileSize, boundaryEdges);
  }

  getSnapshot() {
    const biome = this.biome.getSnapshot();
    return {
      groundReady: Boolean(this.ground),
      corruptionReady: Boolean(this.corruption),
      centerReady: hasTexture(this.scene, this.visual.assets.center),
      frontierReady: hasTexture(this.scene, this.visual.assets.frontier),
      ...biome,
      visibleCenterCount: this.visibleCenterCount + biome.visiblePaletteCenterCount,
      visibleFrontierCount: this.visibleFrontierCount + biome.visiblePaletteFrontierCount,
    };
  }

  destroy() {
    this.biome?.destroy();
    this.ground?.clearMask?.(false);
    this.corruption?.clearMask?.(false);
    this.ground?.destroy();
    this.corruption?.destroy();
    for (const image of [...this.centerPool, ...this.frontierPool]) {
      image.clearMask?.(false);
      image.destroy();
    }
    this.centerPool.length = 0;
    this.frontierPool.length = 0;
    this.scene = null;
    this.territoryMask = null;
    this.solidMask = null;
  }
}
