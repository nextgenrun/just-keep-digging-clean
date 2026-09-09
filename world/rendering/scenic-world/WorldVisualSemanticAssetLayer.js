import { ExcavatedEdgeArtView } from "./ExcavatedEdgeArtView.js";
import { RESOURCE_BY_TILE_TYPE } from "../../../values/resourceTypes.js";
import { TILE_TYPES, isUnbreakableMiningSurface } from "../../../values/tileTypes.js";
import {
  WORLD_VISUAL_SEMANTIC_ASSETS,
  resolveWorldVisualSemanticAssetsEnabled,
  resolveWorldVisualSemanticResourceFrame,
  resolveWorldVisualSemanticSpecialFrame,
  resolveWorldVisualSemanticStarIdleEnabled,
} from "../../../values/worldVisualSemanticAssets.js";
import { WorldVisualBedrockMaterialLayer } from "./WorldVisualBedrockMaterialLayer.js";
import { resolveTownFloorOcclusionBounds } from "./WorldVisualTownFloorOcclusion.js";
import {
  refreshSemanticStarIdentityFrames,
  showWorldVisualSemanticStar,
  updateWorldVisualSemanticStars,
} from "./WorldVisualSemanticStarPresenter.js";
import { setTintIfChanged } from "./worldVisualRenderState.js";

function hashUnit(tx, ty, salt = 0) {
  let value = Math.imul(tx + 31, 73856093) ^ Math.imul(ty + 47, 19349663) ^ Math.imul(salt + 7, 83492791);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

export class WorldVisualSemanticAssetLayer {
  constructor(scene, worldModel, geometryMask, config = WORLD_VISUAL_SEMANTIC_ASSETS) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.geometryMask = geometryMask;
    this.config = config;
    this.enabled = resolveWorldVisualSemanticAssetsEnabled(config);
    this.starIdleEnabled = false;
    this.bedrockLayer = null;
    this.excavatedEdges = new ExcavatedEdgeArtView(scene, worldModel);
    this.resourcePool = [];
    this.resourceDepletionProvider = null;
    this.starBeautyPool = [];
    this.starEmissivePool = [];
    this.starIdlePool = [];
    this.specialBeautyPool = [];
    this.specialEmissivePool = [];
    this.activeStars = [];
    this.activeSpecials = [];
    this.activeBounds = null;
    this.lastLighting = null;
    this.lastReduced = false;
    this.activeSignature = null;
    this.dirty = true;
    this.currentEmissiveDepth = this.config.render.starEmissiveDepth;
    this.townFloorOcclusion = resolveTownFloorOcclusionBounds(scene);
  }

  create() {
    if (!this.enabled) return false;
    this.starIdleEnabled = resolveWorldVisualSemanticStarIdleEnabled(this.config);
    this._installFrames(this.config.resources.atlas);
    this._installFrames(this.config.skyTile.beautyAtlas);
    this._installFrames(this.config.skyTile.emissiveAtlas);
    if (this.starIdleEnabled) {
      this._installFrames(this.config.skyTile.idleMotion.atlas);
    }
    refreshSemanticStarIdentityFrames(this);
    this._installFrames(this.config.specialBlocks.beautyAtlas);
    if (this.config.specialBlocks.emissiveAtlas) {
      this._installFrames(this.config.specialBlocks.emissiveAtlas);
    }
    this.bedrockLayer = new WorldVisualBedrockMaterialLayer(this.scene, this.worldModel, this.config);
    this.bedrockLayer.create();
    return true;
  }

  sync(bounds, lighting, reduced = false) {
    if (!this.enabled || !bounds) return;
    const signature = `${bounds.left}:${bounds.top}:${bounds.right}:${bounds.bottom}:${reduced ? 1 : 0}`;
    if (!this.dirty && signature === this.activeSignature) {
      this.setLighting(lighting);
      return;
    }
    this.dirty = false;
    this.activeSignature = signature;
    this.activeBounds = { ...bounds };
    this.lastLighting = lighting;
    this.lastReduced = reduced;
    this.bedrockLayer.sync(bounds, lighting);
    this.excavatedEdges.sync(bounds, lighting, reduced);
    this.resourcePool.forEach(image => image.setVisible(false));
    this.starBeautyPool.forEach(image => image.setVisible(false));
    this.starEmissivePool.forEach(image => image.setVisible(false));
    this.starIdlePool.forEach(image => image.setVisible(false));
    this.specialBeautyPool.forEach(image => image.setVisible(false));
    this.specialEmissivePool.forEach(image => image.setVisible(false));
    this.activeStars = [];
    this.activeSpecials = [];
    const size = this.scene.config.tileSize;
    const nominalResourceCap = reduced
      ? Math.floor(this.config.performance.maxVisibleResources / 2)
      : this.config.performance.maxVisibleResources;
    const activeWindowCellCount = Math.max(0, bounds.right - bounds.left)
      * Math.max(0, bounds.bottom - bounds.top);
    const preserveActiveWindowResources =
      this.config.performance.preserveActiveWindowResources !== false;
    const resourceCap = preserveActiveWindowResources
      ? Math.max(nominalResourceCap, activeWindowCellCount)
      : nominalResourceCap;
    const starCap = reduced
      ? Math.floor(this.config.performance.maxVisibleStars / 2)
      : this.config.performance.maxVisibleStars;
    const specialCap = reduced
      ? Math.floor(this.config.performance.maxVisibleSpecialBlocks / 2)
      : this.config.performance.maxVisibleSpecialBlocks;
    const resourceCandidates = [];
    const stoneCandidates = [];
    let stars = 0;
    let specials = 0;
    let bedrockCells = 0;
    for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right; tx += 1) {
        const tileType = this.worldModel.getTileType(tx, ty);
        if (isUnbreakableMiningSurface(tileType)) {
          bedrockCells += 1;
          continue;
        }
        if (tileType === TILE_TYPES.SKY_TILE) {
          if (stars < starCap) this._showStar(stars++, tx, ty, size, lighting);
          continue;
        }
        const depthTiles = Math.max(
          0,
          ty - (
            this.worldModel.topAirRows
            ?? this.worldModel.config?.topAirRows
            ?? this.scene.config.topAirRows
            ?? 0
          )
        );
        const specialFrame = resolveWorldVisualSemanticSpecialFrame(
          tileType,
          depthTiles,
          this.config
        );
        if (Number.isInteger(specialFrame)) {
          if (specials < specialCap) this._showSpecial(specials++, tx, ty, specialFrame, size, lighting);
          continue;
        }
        const resourceKey = RESOURCE_BY_TILE_TYPE[tileType];
        if (!resourceKey) continue;
        if (this.resourceDepletionProvider?.({
          tileX: tx,
          tileY: ty,
          tileType,
          resourceKey,
        }) === true) continue;
        const frame = resolveWorldVisualSemanticResourceFrame(tx, ty, resourceKey, this.config);
        if (!Number.isInteger(frame)) continue;
        const candidate = { tx, ty, resourceKey, frame };
        if (resourceKey === "stone") {
          if (hashUnit(tx, ty, 43) <= this.config.resources.stoneDensity) stoneCandidates.push(candidate);
        } else {
          resourceCandidates.push(candidate);
        }
      }
    }
    let resources = 0;
    for (const candidate of resourceCandidates) {
      if (resources >= resourceCap) break;
      this._showResource(resources++, candidate.tx, candidate.ty, candidate.resourceKey, candidate.frame, size, lighting);
    }
    const stoneCap = preserveActiveWindowResources
      ? stoneCandidates.length
      : Math.min(
        this.config.resources.maxVisibleStone,
        Math.max(0, resourceCap - resources)
      );
    for (let index = 0; index < Math.min(stoneCap, stoneCandidates.length); index += 1) {
      const candidate = stoneCandidates[index];
      this._showResource(resources++, candidate.tx, candidate.ty, candidate.resourceKey, candidate.frame, size, lighting);
    }
    this.visibleBedrockCells = bedrockCells;
  }

  _showResource(index, tx, ty, resourceKey, frameIndex, size, lighting) {
    const atlas = this.config.resources.atlas;
    const profile = this.config.resources.profiles?.[resourceKey] || this.config.resources;
    const scaleVariation = this.config.resources.scaleVariation || 0;
    const rotationVariation = this.config.resources.rotationVariationRadians || 0;
    const scale = (profile.scale ?? this.config.resources.scale)
      * (1 - scaleVariation + hashUnit(tx, ty, 29) * scaleVariation * 2);
    const rotation = (hashUnit(tx, ty, 31) * 2 - 1) * rotationVariation;
    const image = this.resourcePool[index] || this._createImage(
      this.resourcePool,
      atlas.key,
      this.config.render.resourceDepth
    );
    image.setPosition((tx + 0.5) * size, (ty + 0.5) * size)
      .setTexture(atlas.key, `${atlas.framePrefix}${frameIndex}`)
      .setDisplaySize(size * scale, size * scale)
      .setRotation(rotation)
      .setAlpha(profile.alpha ?? this.config.resources.alpha)
      .setTint(lighting?.terrainTint || 0xffffff)
      .setVisible(true);
  }

  _showStar(index, tx, ty, size, lighting) {
    return showWorldVisualSemanticStar(
      this, index, tx, ty, size, lighting, hashUnit(tx, ty, 19) * Math.PI * 2,
    );
  }

  _showSpecial(index, tx, ty, frame, size, lighting) {
    const config = this.config.specialBlocks;
    const beauty = this.specialBeautyPool[index] || this._createImage(
      this.specialBeautyPool,
      config.beautyAtlas.key,
      this.config.render.specialBeautyDepth
    );
    const x = (tx + 0.5) * size;
    const y = (ty + 0.5) * size;
    const displaySize = size * config.scale;
    beauty.setPosition(x, y)
      .setTexture(config.beautyAtlas.key, `${config.beautyAtlas.framePrefix}${frame}`)
      .setDisplaySize(displaySize, displaySize)
      .setAlpha(config.beautyAlpha)
      .setTint(lighting?.terrainTint || 0xffffff)
      .setVisible(true);
  }

  _createImage(pool, key, depth, blendMode = null) {
    const image = this.scene.add.image(0, 0, key)
      .setDepth(depth)
      .setMask(this.geometryMask)
      .setVisible(false);
    if (blendMode) image.setBlendMode(blendMode);
    pool.push(image);
    return image;
  }

  _installFrames(atlas) {
    if (!this.scene.textures.exists(atlas.key)) {
      throw new Error(`[WorldVisualSemanticAssetLayer] Required atlas was not preloaded: ${atlas.key}`);
    }
    const texture = this.scene.textures.get(atlas.key);
    for (let index = 0; index < atlas.frameCount; index += 1) {
      const name = `${atlas.framePrefix}${index}`;
      if (texture.has(name)) continue;
      texture.add(
        name,
        0,
        (index % atlas.columns) * atlas.frameSizePx,
        Math.floor(index / atlas.columns) * atlas.frameSizePx,
        atlas.frameSizePx,
        atlas.frameSizePx
      );
    }
  }

  refreshStarIdentityFrames() {
    return refreshSemanticStarIdentityFrames(this);
  }

  update(now) {
    if (!this.enabled) return;
    updateWorldVisualSemanticStars(this, now);
  }

  setLighting(lighting) {
    this.lastLighting = lighting;
    const tint = lighting?.terrainTint || 0xffffff;
    this.resourcePool.forEach(image => image.visible && setTintIfChanged(image, tint));
    const starTint = this.config.skyTile.beautyReceivesTerrainTint === false
      ? 0xffffff
      : tint;
    this.starBeautyPool.forEach(image => image.visible && setTintIfChanged(image, starTint));
    this.specialBeautyPool.forEach(image => image.visible && setTintIfChanged(image, tint));
    this.bedrockLayer?.setLighting(lighting);
    this.excavatedEdges.setLighting(lighting);
  }

  setEmissiveDepth(depth) {
    const resolved = Number.isFinite(depth) ? depth : this.config.render.starEmissiveDepth;
    this.currentEmissiveDepth = resolved;
    const occludedDepth = this.config.render.townFloorOccludedEmissiveDepth;
    this.starEmissivePool.forEach((image, index) => (
      image.setDepth(this.activeStars[index]?.townFloorOccluded ? occludedDepth : resolved)
    ));
    this.starIdlePool.forEach((image, index) => (
      image.setDepth(this.activeStars[index]?.townFloorOccluded ? occludedDepth : resolved)
    ));
    this.specialEmissivePool.forEach((image, index) => (
      image.setDepth(this.activeSpecials[index]?.townFloorOccluded ? occludedDepth : resolved)
    ));
  }

  invalidateCell(tx, ty) {
    const bounds = this.activeBounds;
    if (!bounds || tx < bounds.left || tx >= bounds.right || ty < bounds.top || ty >= bounds.bottom) return;
    this.dirty = true;
    this.sync(bounds, this.lastLighting, this.lastReduced);
  }

  setResourceDepletionProvider(provider) {
    this.resourceDepletionProvider = typeof provider === "function" ? provider : null;
    this.invalidateResourcePresentation();
  }

  invalidateResourcePresentation() {
    this.dirty = true;
    if (this.activeBounds) {
      this.sync(this.activeBounds, this.lastLighting, this.lastReduced);
    }
  }

  destroy() {
    this.bedrockLayer?.destroy();
    this.excavatedEdges.destroy();
    this.resourcePool.forEach(image => image.destroy());
    this.starBeautyPool.forEach(image => image.destroy());
    this.starEmissivePool.forEach(image => image.destroy());
    this.starIdlePool.forEach(image => image.destroy());
    this.specialBeautyPool.forEach(image => image.destroy());
    this.specialEmissivePool.forEach(image => image.destroy());
    this.bedrockLayer = null;
    this.excavatedEdges = new ExcavatedEdgeArtView(scene, worldModel);
    this.resourcePool = [];
    this.starBeautyPool = [];
    this.starEmissivePool = [];
    this.starIdlePool = [];
    this.specialBeautyPool = [];
    this.specialEmissivePool = [];
    this.activeStars = [];
    this.activeSpecials = [];
    this.activeBounds = null;
    this.activeSignature = null;
    this.resourceDepletionProvider = null;
    this.townFloorOcclusion = null;
  }
}
