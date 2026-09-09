import { GEM_POWER_BLOCK_TIERS, getGemPowerBlockTier } from
  "../../values/specialBlocks.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { LOOT_PICKUP_PRESENTATION } from
  "../../values/lootPickupPresentation.js";
import {
  WORLD_VISUAL_SEMANTIC_ASSETS,
  resolveWorldVisualSemanticResourceFrame,
  resolveWorldVisualSemanticSpecialFrame,
} from "../../values/worldVisualSemanticAssets.js";

const SOIL_MINI_ATLAS = LOOT_PICKUP_PRESENTATION.assets.soilMinis;

const freezeSoilFallback = resourceType => {
  const frameIndex = SOIL_MINI_ATLAS.frameByResource[resourceType];
  return Object.freeze({
    resourceType,
    textureKey: SOIL_MINI_ATLAS.key,
    frameName: `${SOIL_MINI_ATLAS.framePrefix}${frameIndex}`,
    frameIndex,
    atlas: SOIL_MINI_ATLAS,
    sourceId: "authored-soil-mini-atlas",
  });
};

export const DEFAULT_REWARD_PICKUP_RESOURCE_FALLBACKS = Object.freeze({
  dirt: freezeSoilFallback("dirt"),
  darkDirtNormal: freezeSoilFallback("darkDirtNormal"),
  darkDirtStrong: freezeSoilFallback("darkDirtStrong"),
  lavaDirt: freezeSoilFallback("lavaDirt"),
});

const TILE_TYPE_NAME_BY_VALUE = Object.freeze(Object.fromEntries(
  Object.entries(TILE_TYPES).map(([name, value]) => [value, name]),
));

function freezeDescriptor(descriptor) {
  const telemetry = Object.freeze({
    visualId: descriptor.visualId,
    kind: descriptor.kind,
    sourceId: descriptor.sourceId,
    textureKey: descriptor.textureKey,
    frameName: descriptor.frameName,
    frameIndex: descriptor.frameIndex,
    resourceType: descriptor.resourceType,
    tileType: descriptor.tileType,
    tileTypeName: descriptor.tileTypeName,
    variantIndex: descriptor.variantIndex,
    gemPowerTierId: descriptor.gemPowerTierId,
    exactWorldFrame: descriptor.exactWorldFrame,
  });
  return Object.freeze({ ...descriptor, telemetry });
}

function normalizeFallbacks(fallbacks) {
  return Object.freeze(Object.fromEntries(
    Object.entries(fallbacks || {}).map(([resourceType, fallback]) => [
      resourceType,
      Object.freeze({ ...(fallback || {}), resourceType }),
    ]),
  ));
}

/** Resolves authored reward visuals without owning reward or progression state. */
export class RewardPickupVisualResolver {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.semanticConfig = options.semanticConfig || WORLD_VISUAL_SEMANTIC_ASSETS;
    this.resourceFallbacks = normalizeFallbacks({
      ...DEFAULT_REWARD_PICKUP_RESOURCE_FALLBACKS,
      ...(options.resourceFallbacks || {}),
    });
  }

  resolveResourcePickup({
    resourceType,
    tx,
    ty,
    tileX,
    tileY,
    authoredFallback = null,
  } = {}) {
    if (!resourceType) return null;
    const resources = this.semanticConfig?.resources;
    const frameStart = resources?.frameStarts?.[resourceType];
    if (Number.isInteger(frameStart)) {
      const resolvedTx = Number.isFinite(tx) ? tx : tileX;
      const resolvedTy = Number.isFinite(ty) ? ty : tileY;
      if (!Number.isFinite(resolvedTx) || !Number.isFinite(resolvedTy)) return null;
      const frameIndex = resolveWorldVisualSemanticResourceFrame(
        resolvedTx,
        resolvedTy,
        resourceType,
        this.semanticConfig,
      );
      const frameName = this.ensureAtlasFrame(resources.atlas, frameIndex);
      if (!frameName) return null;
      return freezeDescriptor({
        visualId: `resource:${resourceType}:${frameIndex}`,
        kind: "resource",
        sourceId: "semantic-resource-atlas",
        textureKey: resources.atlas.key,
        frameName,
        frameIndex,
        resourceType,
        tileType: null,
        tileTypeName: null,
        variantIndex: frameIndex - frameStart,
        gemPowerTierId: null,
        exactWorldFrame: true,
      });
    }
    return this._resolveResourceFallback(
      resourceType,
      authoredFallback || this.resourceFallbacks[resourceType],
    );
  }

  resolveSpecialPickup({
    tileType,
    depthTiles = 0,
    gemPowerTierId = null,
    gemTierId = null,
  } = {}) {
    if (!Number.isInteger(tileType)) return null;
    const safeDepth = Number.isFinite(depthTiles) ? Math.max(0, depthTiles) : 0;
    const requestedTierId = gemPowerTierId || gemTierId || null;
    let resolvedTier = null;
    let frameIndex = null;
    if (tileType === TILE_TYPES.GEM_POWER_BLOCK) {
      resolvedTier = requestedTierId
        ? GEM_POWER_BLOCK_TIERS.find(tier => tier.id === requestedTierId) || null
        : getGemPowerBlockTier(safeDepth);
      if (!resolvedTier) return null;
      frameIndex = resolvedTier.semanticFrame;
    } else {
      frameIndex = resolveWorldVisualSemanticSpecialFrame(
        tileType,
        safeDepth,
        this.semanticConfig,
      );
    }
    const atlas = this.semanticConfig?.specialBlocks?.beautyAtlas;
    const frameName = this.ensureAtlasFrame(atlas, frameIndex);
    if (!frameName) return null;
    const tileTypeName = TILE_TYPE_NAME_BY_VALUE[tileType] || "UNKNOWN";
    return freezeDescriptor({
      visualId: `special:${tileTypeName}:${frameIndex}`,
      kind: "special",
      sourceId: "semantic-special-atlas",
      textureKey: atlas.key,
      frameName,
      frameIndex,
      resourceType: null,
      tileType,
      tileTypeName,
      variantIndex: null,
      gemPowerTierId: resolvedTier?.id || null,
      exactWorldFrame: true,
    });
  }

  ensureAtlasFrame(atlas, frameIndex) {
    if (
      !atlas?.key
      || !Number.isInteger(frameIndex)
      || frameIndex < 0
      || frameIndex >= atlas.frameCount
      || !Number.isInteger(atlas.columns)
      || !Number.isFinite(atlas.frameSizePx)
    ) return null;
    const textures = this.scene?.textures;
    if (!textures?.exists?.(atlas.key) || typeof textures.get !== "function") return null;
    const texture = textures.get(atlas.key);
    const frameName = `${atlas.framePrefix}${frameIndex}`;
    if (texture?.has?.(frameName)) return frameName;
    if (typeof texture?.add !== "function") return null;
    try {
      texture.add(
        frameName,
        0,
        (frameIndex % atlas.columns) * atlas.frameSizePx,
        Math.floor(frameIndex / atlas.columns) * atlas.frameSizePx,
        atlas.frameSizePx,
        atlas.frameSizePx,
      );
    } catch (_error) {
      return null;
    }
    return texture.has?.(frameName) ? frameName : null;
  }

  _resolveResourceFallback(resourceType, fallback) {
    const textureKey = fallback?.textureKey || fallback?.key;
    let frameName = fallback?.frameName ?? fallback?.frame ?? null;
    const textures = this.scene?.textures;
    if (!textureKey || !textures?.exists?.(textureKey)) return null;
    if (fallback?.atlas && Number.isInteger(fallback?.frameIndex)) {
      frameName = this.ensureAtlasFrame(fallback.atlas, fallback.frameIndex);
      if (!frameName) return null;
    }
    if (frameName !== null) {
      const texture = textures.get?.(textureKey);
      if (!texture?.has?.(frameName)) return null;
    }
    return freezeDescriptor({
      visualId: `resource:${resourceType}:authored-fallback`,
      kind: "resource",
      sourceId: fallback?.sourceId || "authored-resource-fallback",
      textureKey,
      frameName,
      frameIndex: Number.isInteger(fallback?.frameIndex) ? fallback.frameIndex : null,
      resourceType,
      tileType: null,
      tileTypeName: null,
      variantIndex: null,
      gemPowerTierId: null,
      exactWorldFrame: false,
    });
  }
}
