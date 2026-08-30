import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";
import { resolveLevelOneBiomeFieldAtTile } from
  "../../../values/levelOneBiomeField.js";
import {
  resolveLevelOneBiomeDetailFrameIndexes,
  resolveLevelOneBiomeLayerSeed,
} from "../../../values/levelOneBiomeVisualFamilies.js";

function stableHash(column, row, seed, salt) {
  let mixed = (
    Math.imul(column + 103, 73856093)
    ^ Math.imul(row + 211, 19349663)
    ^ Math.imul(seed + salt, 83492791)
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

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export class WorldVisualUndergroundDetailRegionView {
  constructor(scene, region, config, terrainMask) {
    this.scene = scene;
    this.region = region;
    this.config = config;
    this.terrainMask = terrainMask;
    this.textureImages = new Map();
    this.propImages = new Map();
  }

  sync(bounds, lighting, force = false) {
    if (force) this._destroyAll();
    const range = this._resolveRange(bounds);
    if (!range) {
      this._destroyAll();
      return false;
    }
    if (this.region.kinds.textures) {
      this._syncKind("textures", range, this.textureImages);
    } else {
      this._prune(this.textureImages, new Set());
    }
    if (this.region.kinds.props) {
      this._syncKind("props", range, this.propImages);
    } else {
      this._prune(this.propImages, new Set());
    }
    this.update(lighting);
    return true;
  }

  resolveRequiredAssets(bounds) {
    if (!this._resolveRange(bounds)) return [];
    const sources = this.region.biomeFieldRegionsById;
    if (!sources) return this.region.assets;
    const assets = new Map();
    Object.values(sources).forEach(sourceRegion => {
      sourceRegion.assets.forEach(asset => assets.set(asset.key, asset));
    });
    return [...assets.values()];
  }

  getActiveAssets() {
    const assets = new Map();
    for (const collection of [this.textureImages, this.propImages]) {
      collection.forEach(image => {
        const asset = image._worldVisualAsset;
        if (asset) assets.set(asset.key, asset);
      });
    }
    return [...assets.values()];
  }

  _resolveRange(bounds) {
    const { region, config } = this;
    if (
      bounds.right <= region.leftTile
      || bounds.left >= region.rightTileExclusive
      || bounds.bottom <= region.topTile
      || bounds.top >= region.bottomTileExclusive
    ) return null;
    const placement = config.placement;
    const columns = Math.ceil(
      (region.rightTileExclusive - region.leftTile) / placement.cellWidthTiles
    );
    const rows = Math.ceil(
      (region.bottomTileExclusive - region.topTile) / placement.cellHeightTiles
    );
    const margin = placement.neighborCells;
    return {
      firstColumn: Math.max(
        0,
        Math.floor(
          (Math.max(bounds.left, region.leftTile) - region.leftTile)
          / placement.cellWidthTiles
        ) - margin
      ),
      lastColumn: Math.min(
        columns - 1,
        Math.floor(
          (Math.min(bounds.right, region.rightTileExclusive) - region.leftTile)
          / placement.cellWidthTiles
        ) + margin
      ),
      firstRow: Math.max(
        0,
        Math.floor(
          (Math.max(bounds.top, region.topTile) - region.topTile)
          / placement.cellHeightTiles
        ) - margin
      ),
      lastRow: Math.min(
        rows - 1,
        Math.floor(
          (Math.min(bounds.bottom, region.bottomTileExclusive) - region.topTile)
          / placement.cellHeightTiles
        ) + margin
      ),
    };
  }

  _syncKind(kind, range, collection) {
    const needed = new Set();
    const kindConfig = this.config[kind];
    const salt = kind === "textures" ? 1709 : 2903;
    for (let row = range.firstRow; row <= range.lastRow; row += 1) {
      for (let column = range.firstColumn; column <= range.lastColumn; column += 1) {
        const fieldSelection = this._resolveBiomeFieldSelection(column, row);
        const sourceRegion = fieldSelection?.sourceRegion || this.region;
        const profileOffset = fieldSelection
          ? resolveLevelOneBiomeLayerSeed(fieldSelection.profile, kind)
          : 0;
        const spawnHash = stableHash(
          column,
          row,
          sourceRegion.seedOffset + profileOffset,
          salt
        );
        if (unit(spawnHash) > kindConfig.chance) continue;
        const id = `${column}:${row}`;
        needed.add(id);
        if (!collection.has(id)) {
          const atlas = kind === "textures"
            ? sourceRegion.textureAtlas
            : sourceRegion.propAtlas;
          if (!this.scene.textures.exists(atlas.key)) continue;
          collection.set(
            id,
            this._createImage(
              kind,
              column,
              row,
              spawnHash,
              sourceRegion,
              fieldSelection?.profile || null
            )
          );
        }
      }
    }
    this._prune(collection, needed);
  }

  _resolveBiomeFieldSelection(column, row) {
    const sources = this.region.biomeFieldRegionsById;
    if (!sources) return null;
    const placement = this.config.placement;
    const centerTileX = this.region.leftTile
      + (column + 0.5) * placement.cellWidthTiles;
    const centerTileY = this.region.topTile
      + (row + 0.5) * placement.cellHeightTiles;
    const profile = resolveLevelOneBiomeFieldAtTile(centerTileX, centerTileY);
    const sourceRegion = profile ? sources[profile.sourceRegionId] : null;
    return profile && sourceRegion ? { profile, sourceRegion } : null;
  }

  _resolveBiomeFieldRegion(column, row) {
    return this._resolveBiomeFieldSelection(column, row)?.sourceRegion
      || this.region;
  }

  _createImage(
    kind,
    column,
    row,
    spawnHash,
    sourceRegion = this.region,
    profile = null
  ) {
    const { scene, region, config } = this;
    const tileSize = scene.config.tileSize;
    const placement = config.placement;
    const kindConfig = config[kind];
    const atlasConfig = config.atlas;
    const atlas = kind === "textures"
      ? sourceRegion.textureAtlas
      : sourceRegion.propAtlas;
    const seedOffset = sourceRegion.seedOffset + (profile
      ? resolveLevelOneBiomeLayerSeed(profile, kind)
      : 0);
    const frameHash = stableHash(column, row, seedOffset, spawnHash + 17);
    const scaleHash = stableHash(column, row, seedOffset, spawnHash + 31);
    const jitterXHash = stableHash(column, row, seedOffset, spawnHash + 47);
    const jitterYHash = stableHash(column, row, seedOffset, spawnHash + 53);
    const styleHash = stableHash(column, row, seedOffset, spawnHash + 61);
    const depthHash = stableHash(column, row, seedOffset, spawnHash + 67);
    const familyFrames = profile
      ? resolveLevelOneBiomeDetailFrameIndexes(profile, kind)
      : null;
    const frame = familyFrames?.length
      ? familyFrames[frameHash % familyFrames.length]
      : frameHash % atlasConfig.frameCount;
    const frameName = this._ensureAtlasFrame(atlas, frame);
    const isLargeProp = kind === "props"
      && kindConfig.largeFrameIndexes.includes(frame);
    const centerTileX = clamp(
      region.leftTile
        + (column + 0.5) * placement.cellWidthTiles
        + (unit(jitterXHash) * 2 - 1) * placement.jitterXTiles,
      region.leftTile + 0.5,
      region.rightTileExclusive - 0.5
    );
    const centerTileY = clamp(
      region.topTile
        + (row + 0.5) * placement.cellHeightTiles
        + (unit(jitterYHash) * 2 - 1) * placement.jitterYTiles,
      region.topTile + 0.5,
      region.bottomTileExclusive - 0.5
    );
    const minimumScale = isLargeProp
      ? kindConfig.largeMinSourceScale
      : kindConfig.minSourceScale;
    const maximumScale = isLargeProp
      ? kindConfig.largeMaxSourceScale
      : kindConfig.maxSourceScale;
    const sourceScale = lerp(minimumScale, maximumScale, unit(scaleHash));
    const displayWidth = atlasConfig.frameWidthPx * sourceScale;
    const displayHeight = atlasConfig.frameHeightPx * sourceScale;
    const isTexture = kind === "textures";
    const baseDepth = isTexture
      ? config.render.textureDepth
      : config.render.propDepth;
    const baseAlpha = isTexture
      ? config.render.textureAlpha
      : config.render.propAlpha;
    const image = scene.add.image(
      centerTileX * tileSize,
      centerTileY * tileSize,
      atlas.key,
      frameName
    )
      .setOrigin(0.5)
      .setDepth(baseDepth + unit(depthHash) * config.render.depthJitter)
      .setAlpha(baseAlpha)
      .setDisplaySize(displayWidth, displayHeight)
      .setRotation(
        (unit(styleHash) * 2 - 1) * kindConfig.maxRotationRadians
      )
      .setMask(this.terrainMask);
    if (typeof image.setFlipX === "function") {
      image.setFlipX(Boolean(frameHash & 1));
    }
    image.name = `world-visual-underground-${kind}-${region.id}-${column}-${row}`;
    image._worldVisualAsset = atlas;
    image._worldVisualAlpha = baseAlpha;
    image._worldVisualFrameIndex = frame;
    image._worldVisualSourceScale = sourceScale;
    image._worldVisualScaleClass = isLargeProp ? "multi-tile" : "localized";
    image._worldVisualBiomeProfileId = profile?.id || null;
    return image;
  }

  _ensureAtlasFrame(atlas, frame) {
    const atlasConfig = this.config.atlas;
    const frameName = `${atlasConfig.framePrefix}${frame}`;
    const texture = this.scene.textures.get(atlas.key);
    if (!texture.has(frameName)) {
      texture.add(
        frameName,
        0,
        (frame % atlasConfig.columns) * atlasConfig.frameWidthPx,
        Math.floor(frame / atlasConfig.columns) * atlasConfig.frameHeightPx,
        atlasConfig.frameWidthPx,
        atlasConfig.frameHeightPx
      );
    }
    return frameName;
  }

  update(lighting) {
    if (!lighting) return;
    for (const collection of [this.textureImages, this.propImages]) {
      collection.forEach(image => {
        setTintIfChanged(image, lighting.terrainTint);
        setAlphaIfChanged(image, image._worldVisualAlpha);
      });
    }
  }

  _prune(collection, needed) {
    for (const [id, image] of collection) {
      if (needed.has(id)) continue;
      image.destroy();
      collection.delete(id);
    }
  }

  _destroyAll() {
    this._prune(this.textureImages, new Set());
    this._prune(this.propImages, new Set());
  }

  destroy() {
    this._destroyAll();
    this.terrainMask = null;
  }
}
