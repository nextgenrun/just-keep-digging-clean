import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../../../values/ualNativePlayerAssetProfile.js";
import { WORLD_VISUAL_SURFACE_PROP_ASSETS } from "../../../values/worldVisualSurfacePropAssets.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from "../../../values/worldVisualSurfacePropLayout.js";
import {
  WORLD_VISUAL_SURFACE_PROPS,
  resolveWorldVisualSurfacePropsEnabled,
} from "../../../values/worldVisualSurfaceProps.js";
import {
  auditSurfacePropCoverage,
  resolveSurfacePropDisplayGeometry,
  resolveSurfacePropGroundContact,
} from "./surfacePropGeometry.js";

export class WorldVisualSurfacePropLayer {
  constructor(
    scene,
    worldModel,
    config = WORLD_VISUAL_SURFACE_PROPS,
    assets = WORLD_VISUAL_SURFACE_PROP_ASSETS,
    layout = WORLD_VISUAL_SURFACE_PROP_LAYOUT,
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.assets = assets;
    this.layout = layout;
    this.active = new Map();
    this.invalidPlacements = new Map();
    this.coverage = [];
    this.placements = [];
    this.enabled = Object.freeze({ all: false, level1: false, level2: false });
    this.created = false;
    this.inspector = null;
  }

  create(search = globalThis.location?.search || "") {
    this.enabled = resolveWorldVisualSurfacePropsEnabled(this.config, search);
    if (!this.enabled.all) return false;
    this.placements = this.layout.placements.filter(item => this.enabled[item.level]);
    this.coverage = auditSurfacePropCoverage(this.layout, this.assets);
    this._validateCoverage();
    this._validatePlacements();
    this._validateTextures();
    this.created = true;
    this.inspector = Object.freeze({ snapshot: () => this.getSnapshot() });
    globalThis.__jkdSurfaceProps = this.inspector;
    console.info(
      `[WorldVisualSurfacePropLayer] ${this.placements.length} authored modular placements ready; `
      + "use ?surfaceProps=0 for complete rollback"
    );
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.created || !bounds) return false;
    const surfaceRow = this.scene.config.topAirRows;
    const verticalMargin = this.config.streaming.surfaceVisibilityMarginRows;
    const surfaceVisible = bounds.top <= surfaceRow + verticalMargin
      && bounds.bottom >= surfaceRow - verticalMargin;
    if (!surfaceVisible) {
      this._clearActive();
      return false;
    }

    const margin = this.config.streaming.horizontalMarginTiles;
    const leftTile = bounds.left - margin;
    const rightTile = bounds.right + margin;
    const desired = new Set(
      this.placements
        .filter(item => item.tileX >= leftTile && item.tileX <= rightTile)
        .map(item => item.id)
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
    for (const sprite of this.active.values()) {
      sprite.setTint(lighting.terrainTint);
    }
  }

  _createPlacement(item) {
    const definition = this.assets[item.level]?.[item.assetId];
    const runtimeAsset = ASSET_KEYS.environment.surfaceProps[item.level]?.[item.assetId];
    const geometry = resolveSurfacePropDisplayGeometry(
      definition,
      this.scene.config.tileSize,
      UAL_NATIVE_PLAYER_ASSET_PROFILE,
    );
    const contact = resolveSurfacePropGroundContact(
      this.worldModel,
      item.tileX,
      geometry.widthTiles,
      this.scene.config.topAirRows,
      this.config.grounding,
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
      .setDepth(this.config.renderDepths[item.lane])
      .setDisplaySize(geometry.width, geometry.height)
      .setAlpha(this.config.alphaByLane[item.lane])
      .setFlipX(item.flipX)
      .setScrollFactor(1);
    sprite.name = `surface-prop-${item.id}`;
    sprite.setData("surfacePropPlacementId", item.id);
    sprite.setData("surfacePropHeightMeters", definition.heightMeters);
    this.invalidPlacements.delete(item.id);
    this.active.set(item.id, sprite);
    return sprite;
  }

  _validateCoverage() {
    const failed = this.coverage.filter(report => (
      report.maximumGapTiles > this.config.coverage.maximumUncoveredGapTiles
    ));
    if (failed.length) {
      throw new Error(
        `[WorldVisualSurfacePropLayer] Surface coverage gap exceeds contract: `
        + failed.map(item => `${item.id}=${item.maximumGapTiles.toFixed(2)}`).join(", ")
      );
    }
  }

  _validatePlacements() {
    const ids = new Set();
    for (const item of this.placements) {
      if (ids.has(item.id)) throw new Error(`[WorldVisualSurfacePropLayer] Duplicate placement ${item.id}`);
      ids.add(item.id);
      if (!this.assets[item.level]?.[item.assetId]) {
        throw new Error(`[WorldVisualSurfacePropLayer] Missing definition for ${item.id}`);
      }
      if (!ASSET_KEYS.environment.surfaceProps[item.level]?.[item.assetId]) {
        throw new Error(`[WorldVisualSurfacePropLayer] Missing asset key for ${item.id}`);
      }
      if (!(item.lane in this.config.renderDepths)) {
        throw new Error(`[WorldVisualSurfacePropLayer] Invalid lane for ${item.id}`);
      }
      const blocked = this.layout.protectedClearZones.find(zone => (
        item.tileX >= zone.leftTile && item.tileX <= zone.rightTile
      ));
      if (blocked) {
        throw new Error(`[WorldVisualSurfacePropLayer] ${item.id} overlaps ${blocked.id}`);
      }
    }
  }

  _validateTextures() {
    for (const [level, definitions] of Object.entries(this.assets)) {
      for (const [assetId, definition] of Object.entries(definitions)) {
        const runtimeAsset = ASSET_KEYS.environment.surfaceProps[level][assetId];
        const texture = this.scene.textures.get(runtimeAsset.key);
        const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image;
        if (!source || source.width !== definition.expectedSource.width
          || source.height !== definition.expectedSource.height) {
          throw new Error(`[WorldVisualSurfacePropLayer] Source mismatch: ${runtimeAsset.key}`);
        }
        const geometry = resolveSurfacePropDisplayGeometry(
          definition,
          this.scene.config.tileSize,
          UAL_NATIVE_PLAYER_ASSET_PROFILE,
        );
        if (geometry.sourcePixelsPerWorldPixel
          < this.config.scale.minimumSourcePixelsPerWorldPixel) {
          throw new Error(`[WorldVisualSurfacePropLayer] Density contract failed: ${runtimeAsset.key}`);
        }
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
      coverage: this.coverage,
    });
  }

  destroy() {
    this.created = false;
    this._clearActive();
    if (globalThis.__jkdSurfaceProps === this.inspector) delete globalThis.__jkdSurfaceProps;
    this.inspector = null;
  }
}
