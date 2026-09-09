import {
  resolveStarlessScarPropFrame,
  shouldPlaceStarlessScarProp,
} from "./starlessScarPaletteResolver.js";

const ROTATION_BY_SIDE = Object.freeze({
  top: 0,
  right: Math.PI * 0.5,
  bottom: Math.PI,
  left: -Math.PI * 0.5,
});

function hasTexture(scene, asset) {
  return Boolean(asset?.key && scene.textures?.exists?.(asset.key));
}

function hidePool(pool, used = 0) {
  for (let index = used; index < pool.length; index += 1) {
    pool[index].setVisible(false);
  }
}

function positionTiledGround(layer, view, tileSize, visual, visible) {
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
  const scale = Math.max(0.01, Number(visual.paletteGroundTileScale) || 1);
  layer.tilePositionX = left / scale;
  layer.tilePositionY = top / scale;
}

function propFrameName(asset, index) {
  return `${asset.key}-frame-${index}`;
}

export class StarlessScarPaletteView {
  constructor(scene, assetCache, palette, visual, atlasConfig) {
    this.scene = scene;
    this.assetCache = assetCache;
    this.palette = palette;
    this.visual = visual;
    this.atlasConfig = atlasConfig;
    this.territoryMaskGraphics = scene.make.graphics({ add: false });
    this.territoryMask = this.territoryMaskGraphics.createGeometryMask();
    this.solidMaskGraphics = scene.make.graphics({ add: false });
    this.solidMask = this.solidMaskGraphics.createGeometryMask();
    this.requestedRoles = new Set();
    this.ground = null;
    this.centerPool = [];
    this.frontierPool = [];
    this.propPool = [];
    this.visibleCenterCount = 0;
    this.visibleFrontierCount = 0;
    this.visiblePropCount = 0;
    this.destroyed = false;
  }

  _onAssetReady(role, asset) {
    if (this.destroyed) {
      this.assetCache?.release?.(asset.key, asset);
      return;
    }
    if (role === "ground" && !this.ground) {
      this.ground = this.scene.add.tileSprite(0, 0, 1, 1, asset.key)
        .setOrigin(0, 0)
        .setDepth(this.visual.paletteGroundDepth)
        .setAlpha(this.visual.paletteGroundAlpha)
        .setTileScale(this.visual.paletteGroundTileScale)
        .setMask(this.solidMask)
        .setVisible(false);
    }
    if (role === "props") this._ensurePropFrames(asset);
  }

  _ensureAssets() {
    for (const [role, asset] of Object.entries(this.palette.assets)) {
      if (this.requestedRoles.has(role)) continue;
      this.requestedRoles.add(role);
      if (hasTexture(this.scene, asset)) {
        this._onAssetReady(role, asset);
        continue;
      }
      if (!this.assetCache?.ensure) {
        this.requestedRoles.delete(role);
        continue;
      }
      this.assetCache.ensure(asset, {
        onReady: readyAsset => this._onAssetReady(role, readyAsset),
        onError: () => {
          if (!this.destroyed) this.requestedRoles.delete(role);
        },
      });
    }
  }

  _ensurePropFrames(asset) {
    const texture = this.scene.textures?.get?.(asset.key);
    if (!texture?.add) return;
    const { frameWidthPx, frameHeightPx, frameCount } = this.atlasConfig;
    for (let index = 0; index < frameCount; index += 1) {
      const name = propFrameName(asset, index);
      if (texture.has?.(name)) continue;
      texture.add(
        name,
        0,
        (index % 2) * frameWidthPx,
        Math.floor(index / 2) * frameHeightPx,
        frameWidthPx,
        frameHeightPx,
      );
    }
  }

  _drawMask(graphics, cells, tileSize) {
    const overlap = this.visual.cellOverlapRatio * tileSize;
    graphics.clear().fillStyle(0xffffff, 1);
    for (const cell of cells) {
      graphics.fillRect(
        cell.tx * tileSize - overlap,
        cell.ty * tileSize - overlap,
        tileSize + overlap * 2,
        tileSize + overlap * 2,
      );
    }
  }

  _getImage(pool, index, asset, depth, frame = null, masked = false) {
    let image = pool[index];
    if (!image) {
      if (!hasTexture(this.scene, asset)) return null;
      image = this.scene.add.image(0, 0, asset.key, frame).setDepth(depth);
      if (masked) {
        image.setMask(masked === "territory" ? this.territoryMask : this.solidMask);
      }
      pool.push(image);
    } else if (frame !== null) {
      image.setFrame(frame);
    }
    return image;
  }

  _syncCenters(scars, tileSize) {
    const asset = this.palette.assets.center;
    let used = 0;
    for (const scar of scars) {
      const image = this._getImage(
        this.centerPool,
        used,
        asset,
        this.visual.paletteCenterDepth,
        null,
        "territory",
      );
      if (!image) break;
      image.setPosition(
        (scar.tx + 0.5) * tileSize,
        (scar.ty + 0.5) * tileSize,
      ).setDisplaySize(
        this.visual.paletteCenterSizeTiles * tileSize,
        this.visual.paletteCenterSizeTiles * tileSize,
      ).setAlpha(
        this.visual.paletteCenterAlpha * (scar.presentationAlpha ?? 1),
      ).setRotation((scar.seed % 8) * Math.PI * 0.25)
        .setFlipX((scar.seed & 1) === 1)
        .setVisible(true);
      used += 1;
    }
    hidePool(this.centerPool, used);
    this.visibleCenterCount = used;
  }

  _syncFrontiers(edges, tileSize) {
    const asset = this.palette.assets.frontier;
    let used = 0;
    for (const edge of edges) {
      const image = this._getImage(
        this.frontierPool,
        used,
        asset,
        this.visual.paletteFrontierDepth,
      );
      if (!image) break;
      const inset = this.visual.frontierInsetTiles * tileSize;
      const hash = Math.abs(edge.cellTx * 31 + edge.cellTy * 17);
      image.setPosition(
        (edge.x1 + edge.x2) * 0.5 * tileSize - edge.outwardX * inset,
        (edge.y1 + edge.y2) * 0.5 * tileSize - edge.outwardY * inset,
      ).setDisplaySize(
        this.visual.paletteFrontierSizeTiles * tileSize,
        this.visual.paletteFrontierSizeTiles * tileSize,
      ).setRotation(ROTATION_BY_SIDE[edge.side] || 0)
        .setFlipX((hash & 1) === 1)
        .setAlpha(this.visual.paletteFrontierAlpha)
        .setVisible(true);
      used += 1;
    }
    hidePool(this.frontierPool, used);
    this.visibleFrontierCount = used;
  }

  _syncProps(cells, scars, tileSize) {
    const asset = this.palette.assets.props;
    if (!hasTexture(this.scene, asset)) {
      hidePool(this.propPool);
      this.visiblePropCount = 0;
      return;
    }
    const positions = new Set(cells.map(cell => `${cell.tx},${cell.ty}`));
    const nearCenter = cell => scars.some(scar => (
      (scar.tx - cell.tx) ** 2 + (scar.ty - cell.ty) ** 2 < 14
    ));
    let used = 0;
    for (const cell of cells) {
      if (!shouldPlaceStarlessScarProp(cell.tx, cell.ty, cell.scarSeed)) continue;
      if (nearCenter(cell)) continue;
      const supported = [
        `${cell.tx - 1},${cell.ty}`,
        `${cell.tx + 1},${cell.ty}`,
        `${cell.tx},${cell.ty - 1}`,
        `${cell.tx},${cell.ty + 1}`,
      ].filter(key => positions.has(key)).length;
      if (supported < 3 || used >= this.visual.paletteMaximumVisibleProps) continue;
      const frameIndex = resolveStarlessScarPropFrame(
        cell.tx,
        cell.ty,
        cell.scarSeed,
        this.atlasConfig.frameCount,
      );
      const image = this._getImage(
        this.propPool,
        used,
        asset,
        this.visual.palettePropDepth,
        propFrameName(asset, frameIndex),
        true,
      );
      if (!image) break;
      const hash = Math.abs((cell.tx * 73) ^ (cell.ty * 151) ^ cell.scarSeed);
      const sizeTiles = this.visual.palettePropSizeTilesMin
        + (hash % 100) / 99 * (
          this.visual.palettePropSizeTilesMax - this.visual.palettePropSizeTilesMin
        );
      image.setPosition(
        (cell.tx + 0.5) * tileSize,
        (cell.ty + 0.5) * tileSize,
      ).setDisplaySize(sizeTiles * tileSize, sizeTiles * tileSize)
        .setRotation(((hash % 9) - 4) * 0.018)
        .setFlipX((hash & 1) === 1)
        .setAlpha(this.visual.palettePropAlpha)
        .setVisible(true);
      used += 1;
    }
    hidePool(this.propPool, used);
    this.visiblePropCount = used;
  }

  update({ view, tileSize, cells, solidCells, scars, edges, visible }) {
    this._ensureAssets();
    this._drawMask(this.territoryMaskGraphics, cells, tileSize);
    this._drawMask(this.solidMaskGraphics, solidCells, tileSize);
    positionTiledGround(
      this.ground,
      view,
      tileSize,
      this.visual,
      visible && solidCells.length,
    );
    if (!visible) {
      hidePool(this.centerPool);
      hidePool(this.frontierPool);
      hidePool(this.propPool);
      this.visibleCenterCount = 0;
      this.visibleFrontierCount = 0;
      this.visiblePropCount = 0;
      return;
    }
    this._syncCenters(scars, tileSize);
    this._syncFrontiers(edges, tileSize);
    this._syncProps(solidCells, scars, tileSize);
  }

  hasReadyRole(role) {
    return hasTexture(this.scene, this.palette.assets[role]);
  }

  getSnapshot() {
    return {
      paletteId: this.palette.id,
      readyRoleCount: Object.values(this.palette.assets)
        .filter(asset => hasTexture(this.scene, asset)).length,
      visibleCenterCount: this.visibleCenterCount,
      visibleFrontierCount: this.visibleFrontierCount,
      visiblePropCount: this.visiblePropCount,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ground?.clearMask?.(false);
    this.ground?.destroy();
    for (const image of [...this.centerPool, ...this.frontierPool, ...this.propPool]) {
      image.clearMask?.(false);
      image.destroy();
    }
    this.territoryMask?.destroy?.();
    this.solidMask?.destroy?.();
    this.territoryMaskGraphics?.destroy();
    this.solidMaskGraphics?.destroy();
    for (const asset of Object.values(this.palette.assets)) {
      this.assetCache?.release?.(asset.key, asset);
    }
    this.centerPool.length = 0;
    this.frontierPool.length = 0;
    this.propPool.length = 0;
    this.scene = null;
    this.assetCache = null;
  }
}
