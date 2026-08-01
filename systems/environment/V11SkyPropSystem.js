import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3,
  WORLD_VISUAL_SKY_PROP_ASSETS_V3,
} from "../../values/generated/worldVisualPropLibraryV3/index.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../../values/heavenblocksAccessConfig.js";
import { V11_SKY_ISLAND_LAYOUT } from "../../values/v11SkyIslandLayout.js";
import { WORLD_VISUAL_SKY_PROP_COMPOSITION_V3 } from
  "../../values/worldVisualSkyPropCompositionV3.js";
import {
  WORLD_VISUAL_SURFACE_SKY_PROPS_V3,
  resolveWorldVisualSurfaceSkyPropsV3Enabled,
} from "../../values/worldVisualSurfaceSkyPropsV3.js";
import {
  getSkyPropFrameDimensions,
  resolveSkyPropGeometry,
  resolveSkyPropScaleMultiplier,
  skyPropRectanglesIntersect,
} from "./v11SkyPropGeometry.js";

export class V11SkyPropSystem {
  constructor(
    scene,
    config = WORLD_VISUAL_SURFACE_SKY_PROPS_V3,
    layout = V11_SKY_ISLAND_LAYOUT,
    accessConfig = HEAVENBLOCKS_ACCESS_CONFIG,
  ) {
    this.scene = scene;
    this.config = config;
    this.layout = layout;
    this.accessConfig = accessConfig;
    this.assets = WORLD_VISUAL_SKY_PROP_ASSETS_V3;
    this.placements = WORLD_VISUAL_SKY_PROP_COMPOSITION_V3.placements;
    this.active = new Map();
    this.created = false;
    this.lastBoundsSignature = "";
    this.inspector = null;
  }

  create(search = globalThis.location?.search || "") {
    const enabled = resolveWorldVisualSurfaceSkyPropsV3Enabled(this.config, search);
    if (!enabled.sky) return false;
    const atlasKeys = new Set(this.assets.map(asset => asset.atlasKey));
    if (
      typeof this.scene.textures.exists === "function"
      && [...atlasKeys].some(key => !this.scene.textures.exists(key))
    ) {
      console.warn("[V11SkyPropSystem] V3 atlases unavailable; additive sky props skipped");
      return false;
    }
    this._validateLibrary();
    this._validatePlacements();
    this._validateTextures();
    this.created = true;
    this.inspector = Object.freeze({ snapshot: () => this.getSnapshot() });
    globalThis.__jkdSkyPropsV3 = this.inspector;
    this.sync(true);
    console.info(
      `[V11SkyPropSystem] ${this.placements.length} portal-island and Heavenblock props ready; `
      + "use ?skyPropsV3=0 to roll back"
    );
    return true;
  }

  update(time) {
    if (!this.created) return;
    this.sync(false);
  }

  sync(force = false) {
    const bounds = this._getVisibleBounds();
    if (!bounds) return false;
    const signature = `${bounds.left}:${bounds.right}:${bounds.top}:${bounds.bottom}`;
    if (!force && signature === this.lastBoundsSignature) return false;
    this.lastBoundsSignature = signature;
    const desired = new Set(
      this.placements
        .filter(item => (
          item.tileX >= bounds.left
          && item.tileX <= bounds.right
          && item.tileY >= bounds.top
          && item.tileY <= bounds.bottom
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
      if (desired.has(item.id) && !this.active.has(item.id)) {
        this._createPlacement(item);
      }
    }
    return true;
  }

  _createPlacement(item) {
    const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId];
    const runtimeAsset = ASSET_KEYS.environment.skyPropsV3[item.assetId];
    const scale = resolveSkyPropScaleMultiplier(item, this.config);
    const geometry = resolveSkyPropGeometry(
      asset,
      this.scene.config.tileSize,
      scale,
    );
    const portalIsland = item.worldRegion.startsWith("v11-level-");
    const depths = portalIsland
      ? this.config.sky.portalIslandDepths
      : this.config.sky.heavenblockDepths;
    const sprite = this.scene.add.image(
      item.tileX * this.scene.config.tileSize,
      item.tileY * this.scene.config.tileSize,
      runtimeAsset.key,
      runtimeAsset.frame,
    )
      .setOrigin(0.5, 1)
      .setDepth(depths[item.lane])
      .setDisplaySize(geometry.width, geometry.height)
      .setAlpha(this.config.sky.alphaByLane[item.lane])
      .setFlipX(item.flipX)
      .setScrollFactor(1);
    sprite.name = `sky-prop-v3-${item.id}`;
    sprite.setData("skyPropPlacementId", item.id);
    sprite.setData("skyPropAssetId", item.assetId);
    sprite.setData("skyPropWorldRegion", item.worldRegion);
    sprite.setData("skyPropDistance", this.config.scale.distanceByLane[item.lane]);
    this.active.set(item.id, sprite);
    return sprite;
  }

  _getVisibleBounds() {
    const camera = this.scene?.cameras?.main;
    if (!camera) return null;
    const tileSize = this.scene.config.tileSize;
    const view = camera.worldView;
    const leftPx = Number.isFinite(view?.x) ? view.x : camera.scrollX;
    const topPx = Number.isFinite(view?.y) ? view.y : camera.scrollY;
    const widthPx = Number.isFinite(view?.width) && view.width > 0
      ? view.width
      : camera.width / (camera.zoom || 1);
    const heightPx = Number.isFinite(view?.height) && view.height > 0
      ? view.height
      : camera.height / (camera.zoom || 1);
    const margin = this.config.sky.streamingMarginTiles;
    return {
      left: Math.floor(leftPx / tileSize) - margin,
      right: Math.ceil((leftPx + widthPx) / tileSize) + margin,
      top: Math.floor(topPx / tileSize) - margin,
      bottom: Math.ceil((topPx + heightPx) / tileSize) + margin,
    };
  }

  _maximumBounds(item, asset) {
    const scale = resolveSkyPropScaleMultiplier(item, this.config);
    const geometry = resolveSkyPropGeometry(
      asset,
      this.scene.config.tileSize,
      scale,
    );
    return {
      left: item.tileX - geometry.widthTiles / 2,
      right: item.tileX + geometry.widthTiles / 2,
      top: item.tileY - geometry.heightTiles,
      bottom: item.tileY,
    };
  }

  _validateLibrary() {
    if (this.assets.length !== 60) {
      throw new Error("[V11SkyPropSystem] Expected 60 library assets");
    }
    if (this.placements.length < 1 || this.placements.length >= this.assets.length) {
      throw new Error("[V11SkyPropSystem] Authored composition must select a sparse library subset");
    }
  }

  _validatePlacements() {
    for (const item of this.placements) {
      const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId];
      if (!asset || !ASSET_KEYS.environment.skyPropsV3[item.assetId]) {
        throw new Error(`[V11SkyPropSystem] Missing asset ${item.assetId}`);
      }
      const bounds = this._maximumBounds(item, asset);
      if (item.worldRegion.startsWith("v11-level-")) {
        const levelId = Number(item.worldRegion.match(/v11-level-(\d+)/)?.[1]);
        const level = this.layout.levels.find(entry => entry.levelId === levelId);
        if (
          !level
          || bounds.left < level.leftTile
          || bounds.right > level.leftTile + level.widthTiles
        ) {
          throw new Error(`[V11SkyPropSystem] ${item.id} leaves its sky island`);
        }
        const blocked = [
          ...level.portalSlots.map(slot => ({
            id: slot.id,
            left: slot.leftTile,
            right: slot.leftTile + slot.widthTiles,
            top: slot.bottomTile - slot.heightTiles,
            bottom: slot.bottomTile,
          })),
          {
            id: `v11-level-${levelId}-pillar`,
            left: level.pillarTileX - .75,
            right: level.pillarTileX + .75,
            top: level.pillarTileY - 2,
            bottom: level.floorRow,
          },
        ].find(zone => skyPropRectanglesIntersect(bounds, zone));
        if (blocked) {
          throw new Error(`[V11SkyPropSystem] ${item.id} overlaps ${blocked.id}`);
        }
        continue;
      }

      const region = this.accessConfig.regions.find(
        entry => entry.id === item.worldRegion,
      );
      if (
        !region
        || bounds.left < region.platform.leftTx
        || bounds.right > region.platform.rightTxExclusive
      ) {
        throw new Error(`[V11SkyPropSystem] ${item.id} leaves its Heavenblock`);
      }
      const centers = [region.arrival.tx, region.returnAltar.tx, region.rewardShrine.tx];
      const radius = this.accessConfig.interactionRadiusTiles;
      if (centers.some(center => (
        bounds.right > center - radius && bounds.left < center + radius
      ))) {
        throw new Error(
          `[V11SkyPropSystem] ${item.id} overlaps a Heavenblock interaction`
        );
      }
    }
  }

  _validateTextures() {
    const maximumScale = Math.max(...Object.values(this.config.scale.sizeVariants))
      * Math.max(...Object.values(this.config.scale.lanePerspective));
    for (const asset of this.assets) {
      const dimensions = getSkyPropFrameDimensions(
        this.scene.textures,
        asset.atlasKey,
        asset.frame,
      );
      if (
        !dimensions
        || dimensions.width !== asset.expectedSource.width
        || dimensions.height !== asset.expectedSource.height
      ) {
        throw new Error(`[V11SkyPropSystem] Atlas frame mismatch: ${asset.id}`);
      }
      const geometry = resolveSkyPropGeometry(
        asset,
        this.scene.config.tileSize,
        maximumScale,
      );
      if (
        geometry.sourcePixelsPerWorldPixel
        < this.config.scale.minimumSourcePixelsPerWorldPixel
      ) {
        throw new Error(`[V11SkyPropSystem] Density contract failed: ${asset.id}`);
      }
    }
  }

  getSnapshot() {
    return Object.freeze({
      version: this.config.version,
      created: this.created,
      totalAssets: this.assets.length,
      totalPlacements: this.placements.length,
      activePlacements: this.active.size,
      staticTransforms: true,
      protectedPortalSlots: this.layout.levels.reduce(
        (count, level) => count + level.portalSlots.length,
        0,
      ),
    });
  }

  destroy() {
    this.created = false;
    for (const sprite of this.active.values()) sprite.destroy();
    this.active.clear();
    if (globalThis.__jkdSkyPropsV3 === this.inspector) delete globalThis.__jkdSkyPropsV3;
    this.inspector = null;
    this.lastBoundsSignature = "";
  }
}
