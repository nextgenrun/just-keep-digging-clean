/** Renders mineable relic caches, component hearts, and opened-region vault markers. */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HEAVENBLOCK_CELL_MARKERS } from "../../values/heavenblocksWorldConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

const cellKey = (tileX, tileY) => `${tileX},${tileY}`;

export class HeavenblockArtifactVisualLayer {
  constructor(scene, worldModel, worldConfig) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.worldConfig = worldConfig;
    this.heartSprites = new Map();
    this.relicCacheSprites = new Map();
    this.vaultMarkers = new Map();
  }

  createRegion(region) {
    this._createHeart(region);
    this._createRelicCaches(region);
    this.vaultMarkers.set(region.id, this._createVaultMarker(region));
  }

  _createHeart(region) {
    if (!this.scene.textures.exists(region.heartAssetKey)) return;
    const visual = this.worldConfig.visual;
    const point = this.worldModel.tileToWorld(region.core.tx, region.core.ty);
    const displaySize = visual.heartDisplayTiles * this.worldModel.tileSize;
    const heart = this.scene.add.image(point.x, point.y, region.heartAssetKey)
      .setDepth(visual.heartDepth)
      .setDisplaySize(displaySize, displaySize);
    heart.name = `${region.id}:component-heart`;
    this._pulse(
      heart,
      visual.pulseScale,
      visual.pulseDurationMs,
    );
    this.heartSprites.set(region.id, heart);
  }

  _createRelicCaches(region) {
    region.layoutRows.forEach((row, localY) => {
      Array.from(row).forEach((marker, localX) => {
        if (marker !== HEAVENBLOCK_CELL_MARKERS.RELIC_CACHE) return;
        const tileX = region.leftTile + localX;
        const tileY = region.topTile + localY;
        this._createRelicCache(region, tileX, tileY);
      });
    });
  }

  _createRelicCache(region, tileX, tileY) {
    const visual = this.worldConfig.visual;
    const tileSize = this.worldModel.tileSize;
    const point = this.worldModel.tileToWorld(tileX, tileY);
    const plateKey = ASSET_KEYS.tiles.ancientRelicCache;
    const tokenKey = ASSET_KEYS.ui.heavenblocks.ancientRelicToken;
    const plate = this.scene.textures.exists(plateKey)
      ? this.scene.add.image(tileX * tileSize, tileY * tileSize, plateKey)
        .setOrigin(0)
        .setDepth(visual.relicPlateDepth)
        .setDisplaySize(
          visual.relicPlateDisplayTiles * tileSize,
          visual.relicPlateDisplayTiles * tileSize,
        )
      : null;
    const token = this.scene.textures.exists(tokenKey)
      ? this.scene.add.image(point.x, point.y, tokenKey)
        .setDepth(visual.relicTokenDepth)
        .setDisplaySize(
          visual.relicTokenDisplayTiles * tileSize,
          visual.relicTokenDisplayTiles * tileSize,
        )
        .setBlendMode(Phaser.BlendModes.ADD)
      : null;
    if (plate) plate.name = `${region.id}:relic-cache-plate`;
    if (token) {
      token.name = `${region.id}:relic-cache-token`;
      this._pulse(token, visual.relicPulseScale, visual.relicPulseDurationMs);
    }
    this.relicCacheSprites.set(cellKey(tileX, tileY), { plate, token });
  }

  _createVaultMarker(region) {
    if (!this.scene.textures.exists(region.componentAssetKey)) return null;
    const point = this.worldModel.tileToWorld(region.arcVault.tx, region.arcVault.ty);
    return this.scene.add.image(point.x, point.y, region.componentAssetKey)
      .setDepth(this.worldConfig.visual.portalDepth + 0.1)
      .setDisplaySize(this.worldModel.tileSize * 0.78, this.worldModel.tileSize * 0.78)
      .setVisible(false);
  }

  _pulse(object, scale, duration) {
    const scaleX = object.scaleX;
    const scaleY = object.scaleY;
    this.scene.tweens.add({
      targets: object,
      scaleX: scaleX * scale,
      scaleY: scaleY * scale,
      duration,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  invalidateCell(tileX, tileY) {
    const descriptor = this.worldModel.getHeavenblockCellDescriptor(tileX, tileY);
    if (!descriptor) return;
    const type = this.worldModel.getType(tileX, tileY);
    if (descriptor.marker === HEAVENBLOCK_CELL_MARKERS.RELIC_CACHE) {
      const relic = this.relicCacheSprites.get(cellKey(tileX, tileY));
      const visible = type === TILE_TYPES.ANCIENT_RELIC_CACHE;
      relic?.plate?.setVisible(visible);
      relic?.token?.setVisible(visible);
    }
    if (descriptor.marker === HEAVENBLOCK_CELL_MARKERS.COMPONENT_HEART) {
      this.heartSprites.get(descriptor.region.id)
        ?.setVisible(type === TILE_TYPES.HEAVENBLOCK_CORE);
    }
  }

  syncProgression(progressionSystem) {
    for (const region of this.worldConfig.regions) {
      const completed = progressionSystem?.isRegionCompleted?.(region.id) === true;
      const vaultOpened = progressionSystem?.isOmegaVaultOpened?.(region.vaultId) === true;
      this.vaultMarkers.get(region.id)
        ?.setVisible(completed)
        .setAlpha(vaultOpened ? 0.42 : 1);
    }
  }

  getHealthSnapshot() {
    const expectedRelicCacheCount = this.worldConfig.regions.reduce(
      (count, region) => count + region.layoutRows.reduce(
        (rowCount, row) => rowCount + Array.from(row)
          .filter((marker) => marker === HEAVENBLOCK_CELL_MARKERS.RELIC_CACHE).length,
        0,
      ),
      0,
    );
    const missingTextures = [];
    for (const key of [
      ASSET_KEYS.tiles.ancientRelicCache,
      ASSET_KEYS.ui.heavenblocks.ancientRelicToken,
    ]) {
      if (!this.scene.textures?.exists?.(key)) missingTextures.push(key);
    }
    for (const region of this.worldConfig.regions) {
      for (const key of [region.heartAssetKey, region.componentAssetKey]) {
        if (!this.scene.textures?.exists?.(key)) missingTextures.push(key);
      }
    }
    return {
      ready: (
        missingTextures.length === 0
        && this.heartSprites.size === this.worldConfig.regions.length
        && this.relicCacheSprites.size === expectedRelicCacheCount
        && this.vaultMarkers.size === this.worldConfig.regions.length
      ),
      heartCount: this.heartSprites.size,
      relicCacheCount: this.relicCacheSprites.size,
      expectedRelicCacheCount,
      vaultMarkerCount: this.vaultMarkers.size,
      missingTextures,
    };
  }

  destroy() {
    for (const object of [
      ...this.heartSprites.values(),
      ...Array.from(this.relicCacheSprites.values()).flatMap(
        (entry) => [entry.plate, entry.token],
      ),
      ...this.vaultMarkers.values(),
    ]) {
      if (!object) continue;
      this.scene.tweens?.killTweensOf?.(object);
      object.destroy?.();
    }
    this.heartSprites.clear();
    this.relicCacheSprites.clear();
    this.vaultMarkers.clear();
  }
}

export default HeavenblockArtifactVisualLayer;
