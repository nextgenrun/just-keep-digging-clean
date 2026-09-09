import {
  LEVEL_ONE_BIOME_FIELD,
  resolveLevelOneBiomeBoundaryAssets,
  resolveLevelOneBiomeFieldAtTile,
  resolveLevelOneBiomeFieldEnabled,
} from "../../../values/levelOneBiomeField.js";
import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";
import { appendLevelOneBiomeBoundaryVariants } from
  "./levelOneBiomeBoundaryAlignment.js";

function stableHash(column, row, salt) {
  let mixed = (
    Math.imul(column + 113, 73856093)
    ^ Math.imul(row + 227, 19349663)
    ^ Math.imul(salt + 19, 83492791)
  ) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function unit(hash) {
  return hash / 0xffffffff;
}

function lerp(minimum, maximum, amount) {
  return minimum + (maximum - minimum) * amount;
}

function sourceSize(scene, asset) {
  const texture = scene.textures.get(asset.key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image;
  if (!source?.width || !source?.height) return null;
  return { width: source.width, height: source.height };
}

export class WorldVisualLevelOneBiomeBoundaryView {
  constructor(
    scene,
    terrainMask,
    config = LEVEL_ONE_BIOME_FIELD,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.terrainMask = terrainMask;
    this.config = config;
    this.enabled = resolveLevelOneBiomeFieldEnabled(config, search);
    this.images = new Map();
  }

  intersects(bounds) {
    const field = this.config.bounds;
    return this.enabled
      && Boolean(bounds)
      && bounds.right > field.leftTile
      && bounds.left < field.rightTileExclusive
      && bounds.bottom > field.topTile
      && bounds.top < field.bottomTileExclusive;
  }

  resolveRequiredAssets(bounds) {
    if (!this.intersects(bounds)) return [];
    const assets = new Map();
    for (const entry of this._resolvePlacements(bounds)) {
      assets.set(entry.asset.key, entry.asset);
    }
    return [...assets.values()];
  }

  getActiveAssets() {
    const assets = new Map();
    this.images.forEach(image => {
      const asset = image._worldVisualAsset;
      if (asset) assets.set(asset.key, asset);
    });
    return [...assets.values()];
  }

  sync(bounds, lighting, force = false) {
    if (force) this._destroyImages();
    if (!this.intersects(bounds)) {
      this._destroyImages();
      return false;
    }
    const placements = this._resolvePlacements(bounds);
    const needed = new Set(placements.map(entry => entry.id));
    placements.forEach(entry => {
      const existing = this.images.get(entry.id);
      if (existing?._worldVisualAsset?.key === entry.asset.key) return;
      existing?.destroy?.();
      this.images.delete(entry.id);
      if (!this.scene.textures.exists(entry.asset.key)) return;
      const image = this._createImage(entry);
      if (image) this.images.set(entry.id, image);
    });
    this._prune(needed);
    this.update(lighting);
    return placements.length > 0;
  }

  _resolvePlacements(bounds) {
    const field = this.config.bounds;
    const placement = this.config.boundary.placement;
    const marginX = placement.cellWidthTiles * placement.neighborCells;
    const marginY = placement.cellHeightTiles * placement.neighborCells;
    const firstColumn = Math.max(0, Math.floor(
      (Math.max(field.leftTile, bounds.left - marginX) - field.leftTile)
      / placement.cellWidthTiles
    ));
    const lastColumn = Math.min(
      Math.ceil((field.rightTileExclusive - field.leftTile) / placement.cellWidthTiles) - 1,
      Math.floor(
        (Math.min(field.rightTileExclusive - 0.001, bounds.right + marginX) - field.leftTile)
        / placement.cellWidthTiles
      )
    );
    const firstRow = Math.max(0, Math.floor(
      (Math.max(field.topTile, bounds.top - marginY) - field.topTile)
      / placement.cellHeightTiles
    ));
    const lastRow = Math.min(
      Math.ceil((field.bottomTileExclusive - field.topTile) / placement.cellHeightTiles) - 1,
      Math.floor(
        (Math.min(field.bottomTileExclusive - 0.001, bounds.bottom + marginY) - field.topTile)
        / placement.cellHeightTiles
      )
    );
    const resolved = [];
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const centerTileX = field.leftTile + (column + 0.5) * placement.cellWidthTiles;
        const centerTileY = field.topTile + (row + 0.5) * placement.cellHeightTiles;
        const current = resolveLevelOneBiomeFieldAtTile(centerTileX, centerTileY, this.config);
        if (!current) continue;
        this._appendPlacement(
          resolved,
          column,
          row,
          "x",
          1,
          centerTileX,
          centerTileY,
          current,
          resolveLevelOneBiomeFieldAtTile(
            centerTileX + placement.sampleOffsetTiles,
            centerTileY,
            this.config
          )
        );
        this._appendPlacement(
          resolved,
          column,
          row,
          "y",
          1,
          centerTileX,
          centerTileY,
          current,
          resolveLevelOneBiomeFieldAtTile(
            centerTileX,
            centerTileY + placement.sampleOffsetTiles,
            this.config
          )
        );
        this._appendPlacement(
          resolved,
          column,
          row,
          "x",
          -1,
          centerTileX,
          centerTileY,
          current,
          resolveLevelOneBiomeFieldAtTile(
            centerTileX - placement.sampleOffsetTiles,
            centerTileY,
            this.config
          )
        );
        this._appendPlacement(
          resolved,
          column,
          row,
          "y",
          -1,
          centerTileX,
          centerTileY,
          current,
          resolveLevelOneBiomeFieldAtTile(
            centerTileX,
            centerTileY - placement.sampleOffsetTiles,
            this.config
          )
        );
      }
    }
    return resolved;
  }

  _appendPlacement(
    collection,
    column,
    row,
    axis,
    direction,
    centerTileX,
    centerTileY,
    current,
    neighbor
  ) {
    if (!neighbor || neighbor.sourceRegionId === current.sourceRegionId) return;
    const assets = resolveLevelOneBiomeBoundaryAssets(
      current.sourceRegionId,
      neighbor.sourceRegionId,
      this.config
    );
    if (!assets.length) return;
    const axisSalt = (axis === "x" ? 3109 : 4211) + (direction < 0 ? 997 : 0);
    const assetIndex = (
      column + row + (axis === "y" ? 1 : 0) + (direction < 0 ? 1 : 0)
    ) % assets.length;
    const asset = assets[assetIndex];
    const chanceHash = stableHash(column, row, axisSalt);
    const placement = this.config.boundary.placement;
    if (unit(chanceHash) > placement.chance) return;
    const offset = placement.sampleOffsetTiles * 0.5;
    const jitterX = (unit(stableHash(column, row, axisSalt + 17)) * 2 - 1)
      * placement.jitterXTiles;
    const jitterY = (unit(stableHash(column, row, axisSalt + 31)) * 2 - 1)
      * placement.jitterYTiles;
    appendLevelOneBiomeBoundaryVariants(collection, {
      id: `${column}:${row}:${axis}:${direction}`,
      asset,
      pairKey: [current.sourceRegionId, neighbor.sourceRegionId].sort().join("|"),
      axis,
      tileX: centerTileX + (axis === "x" ? offset * direction : 0) + jitterX,
      tileY: centerTileY + (axis === "y" ? offset * direction : 0) + jitterY,
      scale: lerp(
        placement.minSourceScale,
        placement.maxSourceScale,
        unit(stableHash(column, row, axisSalt + 43))
      ),
      rotation: (unit(stableHash(column, row, axisSalt + 59)) * 2 - 1)
        * placement.maxRotationRadians,
      flipX: Boolean(stableHash(column, row, axisSalt + 71) & 1),
      depthOffset: unit(stableHash(column, row, axisSalt + 83))
        * this.config.boundary.render.depthJitter,
    }, assets, this.config);
  }

  _createImage(entry) {
    const source = sourceSize(this.scene, entry.asset);
    if (!source) return null;
    const tileSize = this.scene.config.tileSize;
    const render = this.config.boundary.render;
    const image = this.scene.add.image(
      entry.tileX * tileSize,
      entry.tileY * tileSize,
      entry.asset.key
    )
      .setOrigin(0.5, 0.66)
      .setDepth(render.depth + entry.depthOffset)
      .setAlpha(render.alpha)
      .setDisplaySize(source.width * entry.scale, source.height * entry.scale)
      .setRotation(entry.rotation)
      .setMask(this.terrainMask);
    image.setFlipX?.(entry.flipX);
    image.name = `world-visual-level1-biome-boundary-${entry.id}`;
    image._worldVisualAsset = entry.asset;
    return image;
  }

  update(lighting) {
    if (!lighting) return;
    this.images.forEach(image => {
      setTintIfChanged(image, lighting.terrainTint);
      setAlphaIfChanged(image, this.config.boundary.render.alpha);
    });
  }

  _prune(needed) {
    for (const [id, image] of this.images) {
      if (needed.has(id)) continue;
      image.destroy();
      this.images.delete(id);
    }
  }

  _destroyImages() {
    this._prune(new Set());
  }

  destroy() {
    this._destroyImages();
    this.terrainMask = null;
  }
}
