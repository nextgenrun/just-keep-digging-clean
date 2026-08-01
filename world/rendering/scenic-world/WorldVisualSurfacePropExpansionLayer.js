import { ASSET_KEYS } from "../../../values/assetKeys.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3,
  WORLD_VISUAL_SURFACE_PROP_ASSETS_V3,
} from "../../../values/generated/worldVisualPropLibraryV3/index.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from
  "../../../values/ualNativePlayerAssetProfile.js";
import { WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3 } from
  "../../../values/worldVisualSurfacePropCompositionV3.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from
  "../../../values/worldVisualSurfacePropLayout.js";
import {
  WORLD_VISUAL_SURFACE_SKY_PROPS_V3,
  resolveWorldVisualSurfaceSkyPropsV3Enabled,
} from "../../../values/worldVisualSurfaceSkyPropsV3.js";
import {
  resolveSurfacePropDisplayGeometry,
  resolveSurfacePropGroundContact,
  resolveSurfacePropScaleMultiplier,
} from "./surfacePropGeometry.js";
import { setTintIfChanged } from "./worldVisualRenderState.js";

function frameDimensions(textureManager, key, frameName) {
  const frame = textureManager.getFrame?.(key, frameName)
    || textureManager.get?.(key)?.get?.(frameName);
  if (!frame) return null;
  return {
    width: frame.realWidth || frame.width || frame.cutWidth,
    height: frame.realHeight || frame.height || frame.cutHeight,
  };
}

export class WorldVisualSurfacePropExpansionLayer {
  constructor(
    scene,
    worldModel,
    config = WORLD_VISUAL_SURFACE_SKY_PROPS_V3,
    assets = WORLD_VISUAL_SURFACE_PROP_ASSETS_V3,
    placements = WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3.placements,
    protectedLayout = WORLD_VISUAL_SURFACE_PROP_LAYOUT,
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.assets = assets;
    this.catalogPlacements = placements;
    this.placements = placements;
    this.suppressedPlacementIds = Object.freeze([]);
    this.protectedLayout = protectedLayout;
    this.active = new Map();
    this.invalidPlacements = new Map();
    this.created = false;
    this.inspector = null;
  }

  create(search = globalThis.location?.search || "", options = {}) {
    const enabled = resolveWorldVisualSurfaceSkyPropsV3Enabled(this.config, search);
    if (!enabled.surface) return false;
    this.suppressedPlacementIds = Object.freeze([
      ...(options.suppressedPlacementIds || []),
    ]);
    const suppressed = new Set(this.suppressedPlacementIds);
    for (const id of suppressed) {
      if (!this.catalogPlacements.some(item => item.id === id)) {
        throw new Error(
          `[WorldVisualSurfacePropExpansionLayer] Unknown suppressed placement ${id}`,
        );
      }
    }
    this.placements = this.catalogPlacements.filter(item => !suppressed.has(item.id));
    this._validateLibrary();
    this._validatePlacements();
    this._validateTextures();
    this.created = true;
    this.inspector = Object.freeze({ snapshot: () => this.getSnapshot() });
    globalThis.__jkdSurfacePropsV3 = this.inspector;
    console.info(
      `[WorldVisualSurfacePropExpansionLayer] ${this.placements.length} additive props ready; `
      + "use ?surfacePropsV3=0 to roll back the expansion"
    );
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.created || !bounds) return false;
    const surfaceRow = this.scene.config.topAirRows;
    const verticalMargin = this.config.surface.streaming.surfaceVisibilityMarginRows;
    if (
      bounds.top > surfaceRow + verticalMargin
      || bounds.bottom < surfaceRow - verticalMargin
    ) {
      this._clearActive();
      return false;
    }

    const margin = this.config.surface.streaming.horizontalMarginTiles;
    const desired = new Set(
      this.placements
        .filter(item => (
          item.tileX >= bounds.left - margin
          && item.tileX <= bounds.right + margin
        ))
        .map(item => item.id),
    );
    for (const [id, sprite] of this.active) {
      if (!desired.has(id)) {
        sprite.destroy();
        this.active.delete(id);
      }
    }
    for (const item of this.placements) {
      if (!desired.has(item.id) || this.active.has(item.id)) continue;
      if (!force && this.invalidPlacements.has(item.id)) continue;
      this._createPlacement(item);
    }
    this.update(this.scene.time?.now || 0, lighting);
    return true;
  }

  update(time, lighting) {
    if (!this.created) return;
    for (const sprite of this.active.values()) {
      if (lighting) setTintIfChanged(sprite, lighting.terrainTint);
    }
  }

  _createPlacement(item) {
    const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId];
    const runtimeAsset = ASSET_KEYS.environment.surfacePropsV3[item.assetId];
    const scale = resolveSurfacePropScaleMultiplier(item, this.config);
    const geometry = resolveSurfacePropDisplayGeometry(
      asset,
      this.scene.config.tileSize,
      UAL_NATIVE_PLAYER_ASSET_PROFILE,
      scale,
    );
    const contact = resolveSurfacePropGroundContact(
      this.worldModel,
      item.tileX,
      geometry.widthTiles,
      this.scene.config.topAirRows,
      this.config.surface.grounding,
    );
    if (!contact.valid) {
      this.invalidPlacements.set(item.id, contact.reason);
      return null;
    }

    const sprite = this.scene.add.image(
      item.tileX * this.scene.config.tileSize,
      contact.y,
      runtimeAsset.key,
      runtimeAsset.frame,
    )
      .setOrigin(0.5, 1)
      .setDepth(this.config.surface.renderDepths[item.lane])
      .setDisplaySize(geometry.width, geometry.height)
      .setAlpha(this.config.surface.alphaByLane[item.lane])
      .setFlipX(item.flipX)
      .setScrollFactor(1);
    sprite.name = `surface-prop-v3-${item.id}`;
    sprite.setData("surfacePropPlacementId", item.id);
    sprite.setData("surfacePropAssetId", item.assetId);
    sprite.setData("surfacePropScaleMultiplier", scale);
    sprite.setData(
      "surfacePropDistance",
      this.config.scale.distanceByLane[item.lane],
    );
    this.invalidPlacements.delete(item.id);
    this.active.set(item.id, sprite);
    return sprite;
  }

  _validateLibrary() {
    if (this.assets.length !== 140) {
      throw new Error("[WorldVisualSurfacePropExpansionLayer] Expected 140 library assets");
    }
    if (this.placements.length < 1 || this.placements.length >= this.assets.length) {
      throw new Error(
        "[WorldVisualSurfacePropExpansionLayer] Authored composition must select a sparse library subset"
      );
    }
    if (new Set(this.assets.map(asset => asset.id)).size !== this.assets.length) {
      throw new Error("[WorldVisualSurfacePropExpansionLayer] Duplicate asset id");
    }
  }

  _validatePlacements() {
    const ids = new Set();
    for (const item of this.placements) {
      if (ids.has(item.id)) {
        throw new Error(`[WorldVisualSurfacePropExpansionLayer] Duplicate ${item.id}`);
      }
      ids.add(item.id);
      const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId];
      const runtimeAsset = ASSET_KEYS.environment.surfacePropsV3[item.assetId];
      if (!asset || !runtimeAsset) {
        throw new Error(`[WorldVisualSurfacePropExpansionLayer] Missing ${item.assetId}`);
      }
      const maximumScale = resolveSurfacePropScaleMultiplier(item, this.config);
      const geometry = resolveSurfacePropDisplayGeometry(
        asset,
        this.scene.config.tileSize,
        UAL_NATIVE_PLAYER_ASSET_PROFILE,
        maximumScale,
      );
      const leftTile = item.tileX - geometry.widthTiles / 2;
      const rightTile = item.tileX + geometry.widthTiles / 2;
      const blocked = this.protectedLayout.protectedClearZones.find(zone => (
        (!zone.levels || zone.levels.includes(item.level))
        && rightTile > zone.leftTile
        && leftTile < zone.rightTile
      ));
      if (blocked) {
        throw new Error(
          `[WorldVisualSurfacePropExpansionLayer] ${item.id} overlaps ${blocked.id}`
        );
      }
      const lowProfile = this.protectedLayout.lowProfileZones?.find(zone => (
        (!zone.levels || zone.levels.includes(item.level))
        && rightTile > zone.leftTile
        && leftTile < zone.rightTile
      ));
      if (lowProfile && asset.heightMeters * maximumScale > lowProfile.maximumRenderedHeightMeters) {
        throw new Error(
          `[WorldVisualSurfacePropExpansionLayer] ${item.id} exceeds ${lowProfile.id}`
        );
      }
    }
  }

  _validateTextures() {
    const maximumScaleByAssetId = new Map();
    for (const item of this.placements) {
      const scale = resolveSurfacePropScaleMultiplier(item, this.config);
      maximumScaleByAssetId.set(
        item.assetId,
        Math.max(maximumScaleByAssetId.get(item.assetId) || 0, scale),
      );
    }
    for (const asset of this.assets) {
      const dimensions = frameDimensions(
        this.scene.textures,
        asset.atlasKey,
        asset.frame,
      );
      if (
        !dimensions
        || dimensions.width !== asset.expectedSource.width
        || dimensions.height !== asset.expectedSource.height
      ) {
        throw new Error(
          `[WorldVisualSurfacePropExpansionLayer] Atlas frame mismatch: ${asset.id}`
        );
      }
      const maximumScale = maximumScaleByAssetId.get(asset.id);
      if (!Number.isFinite(maximumScale)) continue;
      const geometry = resolveSurfacePropDisplayGeometry(
        asset,
        this.scene.config.tileSize,
        UAL_NATIVE_PLAYER_ASSET_PROFILE,
        maximumScale,
      );
      if (
        geometry.sourcePixelsPerWorldPixel
        < this.config.scale.minimumSourcePixelsPerWorldPixel
      ) {
        throw new Error(
          `[WorldVisualSurfacePropExpansionLayer] Density contract failed: ${asset.id}`
        );
      }
    }
  }

  _clearActive() {
    for (const sprite of this.active.values()) sprite.destroy();
    this.active.clear();
  }

  getSnapshot() {
    return Object.freeze({
      version: this.config.version,
      created: this.created,
      totalAssets: this.assets.length,
      totalPlacements: this.placements.length,
      suppressedPlacementIds: this.suppressedPlacementIds,
      activePlacements: this.active.size,
      invalidPlacements: Object.freeze([...this.invalidPlacements.entries()]),
      staticTransforms: true,
    });
  }

  destroy() {
    this.created = false;
    this._clearActive();
    if (globalThis.__jkdSurfacePropsV3 === this.inspector) {
      delete globalThis.__jkdSurfacePropsV3;
    }
    this.inspector = null;
  }
}
