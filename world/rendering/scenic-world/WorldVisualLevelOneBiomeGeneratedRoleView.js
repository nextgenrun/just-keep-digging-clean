import { LEVEL_ONE_BIOME_FIELD } from "../../../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  resolveLevelOneBiomeGeneratedRoleAsset,
  resolveLevelOneBiomeLayerSeed,
  resolveLevelOneBiomeVisualFamiliesEnabled,
} from "../../../values/levelOneBiomeVisualFamilies.js";
import {
  LEVEL_ONE_BIOME_DEPTH_VARIANTS,
  resolveLevelOneBiomeDepthRoleLayers,
} from "../../../values/levelOneBiomeDepthVariants.js";
import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";

function stableHash(index, seed, salt) {
  let mixed = (
    Math.imul(index + 127, 73856093)
    ^ Math.imul(seed + salt, 19349663)
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

function sourceSize(scene, asset) {
  if (asset.crop?.width && asset.crop?.height) {
    return { width: asset.crop.width, height: asset.crop.height };
  }
  const texture = scene.textures.get(asset.key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image;
  if (!source?.width || !source?.height) return null;
  return { width: source.width, height: source.height };
}

export class WorldVisualLevelOneBiomeGeneratedRoleView {
  constructor(
    scene,
    terrainMask,
    fieldConfig = LEVEL_ONE_BIOME_FIELD,
    familyConfig = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
    search = globalThis.location?.search || "",
    depthVariantConfig = LEVEL_ONE_BIOME_DEPTH_VARIANTS
  ) {
    this.scene = scene;
    this.terrainMask = terrainMask;
    this.fieldConfig = fieldConfig;
    this.familyConfig = familyConfig;
    this.search = search;
    this.depthVariantConfig = depthVariantConfig;
    this.enabled = resolveLevelOneBiomeVisualFamiliesEnabled(familyConfig, search);
    this.images = new Map();
  }

  intersects(bounds) {
    const field = this.fieldConfig.bounds;
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
    this._resolvePlacements(bounds).forEach(entry => {
      assets.set(entry.asset.key, entry.asset);
    });
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
    placements.forEach(entry => this._syncPlacement(entry));
    this._prune(needed);
    this.update(lighting);
    return placements.length > 0;
  }

  _syncPlacement(entry) {
    const existing = this.images.get(entry.id);
    if (existing?._worldVisualSelectionId === (
      entry.asset.selectionId || entry.asset.key
    )) return;
    existing?.destroy?.();
    this.images.delete(entry.id);
    if (!this.scene.textures.exists(entry.asset.key)) return;
    const image = this._createImage(entry);
    if (image) this.images.set(entry.id, image);
  }

  _resolvePlacements(bounds) {
    const field = this.fieldConfig;
    const profiles = new Map(field.profiles.map(profile => [profile.id, profile]));
    const siteOrdinals = new Map();
    const resolved = [];
    field.seeds.forEach((seed, index) => {
      const profile = profiles.get(seed.profileId);
      if (!profile) return;
      const siteOrdinal = siteOrdinals.get(profile.id) || 0;
      siteOrdinals.set(profile.id, siteOrdinal + 1);
      this.familyConfig.generatedRoleIds.forEach(roleId => {
        this._appendRolePlacement(
          resolved,
          bounds,
          profile,
          seed,
          index,
          siteOrdinal,
          roleId
        );
      });
    });
    return resolved;
  }

  _appendRolePlacement(
    collection,
    bounds,
    profile,
    seed,
    index,
    siteOrdinal,
    roleId
  ) {
    const role = this.familyConfig.generatedRoles[roleId];
    const baseAsset = resolveLevelOneBiomeGeneratedRoleAsset(
      profile,
      roleId,
      this.familyConfig,
      this.search
    );
    const layers = resolveLevelOneBiomeDepthRoleLayers(
      profile,
      roleId,
      siteOrdinal,
      index,
      baseAsset,
      this.depthVariantConfig
    );
    if (!role || !layers.length) return;
    const familySeed = resolveLevelOneBiomeLayerSeed(
      profile,
      role.seedLayer,
      this.familyConfig,
      this.search
    );
    if (unit(stableHash(index, familySeed, role.salt + 3)) > role.chance) return;
    const placement = role.placement;
    const field = this.fieldConfig;
    const tileX = clamp(
      seed.centerTileX + (unit(stableHash(index, familySeed, role.salt + 17)) * 2 - 1)
        * placement.jitterXTiles,
      field.bounds.leftTile + 0.5,
      field.bounds.rightTileExclusive - 0.5
    );
    const tileY = clamp(
      field.bounds.topTile + seed.centerDepthM + placement.offsetYTiles
        + (unit(stableHash(index, familySeed, role.salt + 31)) * 2 - 1)
          * placement.jitterYTiles,
      field.bounds.topTile + 0.5,
      field.bounds.bottomTileExclusive - 0.5
    );
    const margin = placement.visibleMarginTiles;
    if (
      tileX < bounds.left - margin
      || tileX > bounds.right + margin
      || tileY < bounds.top - margin
      || tileY > bounds.bottom + margin
    ) return;
    const scale = lerp(
      placement.minSourceScale,
      placement.maxSourceScale,
      unit(stableHash(index, familySeed, role.salt + 43))
    );
    const depthOffset = unit(stableHash(index, familySeed, role.salt + 83))
      * role.render.depthJitter;
    layers.forEach(layer => collection.push({
      id: `${profile.id}:${index}:${roleId}${
        layer.layerId === "primary" ? "" : `:${layer.layerId}`
      }`,
      profile,
      roleId,
      role,
      asset: layer.asset,
      tileX,
      tileY,
      scale: scale * (layer.scaleMultiplier ?? 1),
      rotation: (unit(stableHash(index, familySeed, role.salt + 59)) * 2 - 1)
        * placement.maxRotationRadians,
      flipX: Boolean(stableHash(index, familySeed, role.salt + 71) & 1),
      depthOffset: depthOffset + (layer.depthOffset ?? 0),
      alpha: role.render.alpha * (layer.alphaMultiplier ?? 1),
      layerId: layer.layerId,
    }));
  }

  _createImage(entry) {
    const source = sourceSize(this.scene, entry.asset);
    if (!source) return null;
    const tileSize = this.scene.config.tileSize;
    const { placement, render } = entry.role;
    const image = this.scene.add.image(
      entry.tileX * tileSize,
      entry.tileY * tileSize,
      entry.asset.key
    );
    if (entry.asset.crop) {
      image.setCrop(
        entry.asset.crop.x,
        entry.asset.crop.y,
        entry.asset.crop.width,
        entry.asset.crop.height
      );
    }
    image
      .setOrigin(placement.originX, placement.originY)
      .setDepth(render.depth + entry.depthOffset)
      .setAlpha(entry.alpha)
      .setDisplaySize(source.width * entry.scale, source.height * entry.scale)
      .setRotation(entry.rotation)
      .setMask(this.terrainMask);
    image.setFlipX?.(entry.flipX);
    image.name = `world-visual-level1-biome-${entry.roleId}-${entry.id}`;
    image._worldVisualAsset = entry.asset;
    image._worldVisualSelectionId = entry.asset.selectionId || entry.asset.key;
    image._worldVisualBiomeProfileId = entry.profile.id;
    image._worldVisualBiomeRoleId = entry.roleId;
    image._worldVisualBiomeLayerId = entry.layerId;
    image._worldVisualBaseAlpha = entry.alpha;
    return image;
  }

  update(lighting) {
    if (!lighting) return;
    this.images.forEach(image => {
      setTintIfChanged(image, lighting.terrainTint);
      setAlphaIfChanged(image, image._worldVisualBaseAlpha ?? 1);
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
