// Renders the approved static surface hero landmarks with deterministic grounding and distance styling.
import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../../values/hudLayout.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from
  "../../../values/ualNativePlayerAssetProfile.js";
import {
  WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS,
  WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
  resolveWorldVisualSurfaceHeroLandmarksEnabled,
} from "../../../values/worldVisualSurfaceHeroLandmarks.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from
  "../../../values/worldVisualSurfacePropLayout.js";
import { WORLD_VISUAL_SURFACE_PROPS } from
  "../../../values/worldVisualSurfaceProps.js";
import {
  resolveSurfacePropDisplayGeometry,
  resolveSurfacePropGroundContact,
} from "./surfacePropGeometry.js";
import {
  assertStarwellPortalSafety,
  assertStaticSurfaceHeroLandmarkPolicy,
} from "./surfaceHeroLandmarkValidation.js";
import { setTintIfChanged } from "./worldVisualRenderState.js";

export class WorldVisualSurfaceHeroLandmarkLayer {
  constructor(
    scene,
    worldModel,
    config = WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
    assets = WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS,
    protectedLayout = WORLD_VISUAL_SURFACE_PROP_LAYOUT,
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.assets = assets;
    this.protectedLayout = protectedLayout;
    this.active = new Map();
    this.invalidPlacements = new Map();
    this.placements = [];
    this.enabled = Object.freeze({ all: false });
    this.created = false;
    this.inspector = null;
  }

  create(search = globalThis.location?.search || "") {
    this.enabled = resolveWorldVisualSurfaceHeroLandmarksEnabled(this.config, search);
    if (!this.enabled.all) return false;
    this.placements = this.config.placements.filter(item => this.enabled[item.assetId]);
    if (!this.placements.length) return false;
    assertStaticSurfaceHeroLandmarkPolicy(this.config);
    this._validatePlacements();
    this._validateTextures();
    assertStarwellPortalSafety({
      enabled: this.enabled,
      config: this.config,
      placements: this.placements,
      assets: this.assets,
      geometryFor: asset => this._geometry(asset),
    });
    this.created = true;
    this.inspector = Object.freeze({ snapshot: () => this.getSnapshot() });
    globalThis.__jkdSurfaceHeroLandmarksV4 = this.inspector;
    console.info(
      `[WorldVisualSurfaceHeroLandmarkLayer] ${this.placements.length} static hero landmarks ready; `
      + "use ?surfaceHeroLandmarksV4=0 for exact prop-layout rollback",
    );
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.created || !bounds) return false;
    const surfaceRow = this.scene.config.topAirRows;
    const verticalMargin = this.config.streaming.surfaceVisibilityMarginRows;
    if (
      bounds.top > surfaceRow + verticalMargin
      || bounds.bottom < surfaceRow - verticalMargin
    ) {
      this._clearActive();
      return false;
    }

    const margin = this.config.streaming.horizontalMarginTiles;
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

  update(_time, lighting) {
    if (!this.created || !lighting) return;
    for (const [id, sprite] of this.active) {
      const item = this.placements.find(candidate => candidate.id === id);
      const profile = this.config.distanceProfiles[item.distanceProfile];
      setTintIfChanged(sprite, lighting[profile.lightingChannel]);
    }
  }

  _createPlacement(item) {
    const asset = this.assets[item.assetId];
    const runtimeAsset = ASSET_KEYS.environment.surfaceHeroLandmarksV4[item.assetId];
    const profile = this.config.distanceProfiles[item.distanceProfile];
    const geometry = this._geometry(asset);
    const contact = resolveSurfacePropGroundContact(
      this.worldModel,
      item.tileX,
      geometry.widthTiles,
      this.scene.config.topAirRows,
      WORLD_VISUAL_SURFACE_PROPS.grounding,
    );
    if (!contact.valid) {
      this.invalidPlacements.set(item.id, contact.reason);
      return null;
    }

    const sprite = this.scene.add.image(
      item.tileX * this.scene.config.tileSize,
      contact.y,
      runtimeAsset.key,
    )
      .setOrigin(0.5, 1)
      .setDepth(profile.depth)
      .setDisplaySize(geometry.width, geometry.height)
      .setAlpha(profile.alpha)
      .setScrollFactor(1);
    sprite.name = item.id;
    sprite.setData("surfaceHeroLandmarkId", item.id);
    sprite.setData("surfaceHeroLandmarkAssetId", item.assetId);
    sprite.setData("surfaceHeroLandmarkHeightMeters", asset.heightMeters);
    sprite.setData("surfaceHeroLandmarkDistance", profile.distance);
    sprite.setData("surfaceHeroLandmarkFadePercent", profile.fadePercent);
    sprite.setData("surfaceHeroLandmarkStaticTransform", true);
    this.invalidPlacements.delete(item.id);
    this.active.set(item.id, sprite);
    return sprite;
  }

  _geometry(asset) {
    return resolveSurfacePropDisplayGeometry(
      asset,
      this.scene.config.tileSize,
      UAL_NATIVE_PLAYER_ASSET_PROFILE,
      1,
    );
  }

  _validatePlacements() {
    const ids = new Set();
    for (const item of this.placements) {
      if (ids.has(item.id)) {
        throw new Error(
          `[WorldVisualSurfaceHeroLandmarkLayer] Duplicate placement ${item.id}`,
        );
      }
      ids.add(item.id);
      const asset = this.assets[item.assetId];
      const runtimeAsset = ASSET_KEYS.environment.surfaceHeroLandmarksV4[item.assetId];
      const profile = this.config.distanceProfiles[item.distanceProfile];
      if (!asset || !runtimeAsset || !profile) {
        throw new Error(
          `[WorldVisualSurfaceHeroLandmarkLayer] Incomplete placement ${item.id}`,
        );
      }
      if (
        profile.depth >= HUD_LAYOUT.playerDepth
        || Math.round((1 - profile.alpha) * 100) !== profile.fadePercent
      ) {
        throw new Error(
          `[WorldVisualSurfaceHeroLandmarkLayer] Invalid depth/fade profile ${item.id}`,
        );
      }

      const geometry = this._geometry(asset);
      const leftTile = item.tileX - geometry.widthTiles / 2;
      const rightTile = item.tileX + geometry.widthTiles / 2;
      const protectedZone = this.protectedLayout.protectedClearZones.find(zone => (
        (!zone.levels || zone.levels.includes(item.level))
        && rightTile > zone.leftTile
        && leftTile < zone.rightTile
      ));
      if (
        protectedZone
        && item.allowedProtectedZoneId !== protectedZone.id
      ) {
        throw new Error(
          `[WorldVisualSurfaceHeroLandmarkLayer] ${item.id} overlaps ${protectedZone.id}`,
        );
      }
      const lowProfileZone = this.protectedLayout.lowProfileZones.find(zone => (
        (!zone.levels || zone.levels.includes(item.level))
        && rightTile > zone.leftTile
        && leftTile < zone.rightTile
      ));
      if (
        lowProfileZone
        && asset.heightMeters > lowProfileZone.maximumRenderedHeightMeters
        && item.allowedLowProfileZoneId !== lowProfileZone.id
      ) {
        throw new Error(
          `[WorldVisualSurfaceHeroLandmarkLayer] ${item.id} exceeds ${lowProfileZone.id}`,
        );
      }
    }
  }

  _validateTextures() {
    for (const item of this.placements) {
      const asset = this.assets[item.assetId];
      const runtimeAsset = ASSET_KEYS.environment.surfaceHeroLandmarksV4[item.assetId];
      const texture = this.scene.textures.get(runtimeAsset.key);
      const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image;
      if (
        !source
        || source.width !== asset.expectedSource.width
        || source.height !== asset.expectedSource.height
      ) {
        throw new Error(
          `[WorldVisualSurfaceHeroLandmarkLayer] Source mismatch: ${runtimeAsset.key}`,
        );
      }
      if (
        this._geometry(asset).sourcePixelsPerWorldPixel
        < this.config.scale.minimumSourcePixelsPerWorldPixel
      ) {
        throw new Error(
          `[WorldVisualSurfaceHeroLandmarkLayer] Density contract failed: ${runtimeAsset.key}`,
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
      enabled: this.enabled,
      totalPlacements: this.placements.length,
      activePlacements: this.active.size,
      invalidPlacements: Object.freeze([...this.invalidPlacements.entries()]),
      staticTransforms: true,
      runtimeMotion: false,
      landmarks: Object.freeze(this.placements.map(item => {
        const profile = this.config.distanceProfiles[item.distanceProfile];
        const geometry = this._geometry(this.assets[item.assetId]);
        return Object.freeze({
          id: item.id,
          assetId: item.assetId,
          tileX: item.tileX,
          distance: profile.distance,
          fadePercent: profile.fadePercent,
          depth: profile.depth,
          heightMeters: this.assets[item.assetId].heightMeters,
          widthTiles: geometry.widthTiles,
          sourcePixelsPerWorldPixel: geometry.sourcePixelsPerWorldPixel,
        });
      })),
      portalSafety: this.config.portalSafety,
    });
  }

  destroy() {
    this.created = false;
    this._clearActive();
    if (globalThis.__jkdSurfaceHeroLandmarksV4 === this.inspector) {
      delete globalThis.__jkdSurfaceHeroLandmarksV4;
    }
    this.inspector = null;
  }
}
