import {
  HEAVENBLOCKS_WORLD_CONFIG,
} from "../../values/heavenblocksWorldConfig.js";
import {
  HEAVENBLOCKS_VISUAL_CONFIG,
  resolveHeavenblocksVisualsEnabled,
} from "../../values/heavenblocksVisualConfig.js";
import { HeavenblockArtifactVisualLayer } from "./HeavenblockArtifactVisualLayer.js";
import { HeavenblockTileVisualLayer } from "./HeavenblockTileVisualLayer.js";

export class HeavenblockWorldVisualSystem {
  constructor(
    scene,
    worldModel,
    visualConfig = HEAVENBLOCKS_VISUAL_CONFIG,
    worldConfig = HEAVENBLOCKS_WORLD_CONFIG,
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.visualConfig = visualConfig;
    this.worldConfig = worldConfig;
    this.enabled = resolveHeavenblocksVisualsEnabled(visualConfig);
    this.backdrops = [];
    this.tileLayer = new HeavenblockTileVisualLayer(scene, worldModel, worldConfig);
    this.tileCells = this.tileLayer.tileCells;
    this.crackCells = this.tileLayer.crackCells;
    this.artifactLayer = new HeavenblockArtifactVisualLayer(
      scene,
      worldModel,
      worldConfig,
    );
    this.heartSprites = this.artifactLayer.heartSprites;
    this.relicCacheSprites = this.artifactLayer.relicCacheSprites;
    this.vaultMarkers = this.artifactLayer.vaultMarkers;
    this.surfacePortals = new Map();
    this.islandPortals = new Map();
    this._progressionSignature = "";
  }

  create() {
    if (!this.enabled) return;
    for (const region of this.worldConfig.regions) this._createRegion(region);
    this.refreshAll();
    const sample = this.tileCells.values().next().value;
    console.info("[HeavenblockWorldVisualSystem] Native tile world ready", JSON.stringify({
      health: this.getHealthSnapshot(),
      sample: sample ? {
        textureKey: sample.textureKey,
        role: sample.role,
        displayWidth: sample.image.displayWidth,
        displayHeight: sample.image.displayHeight,
        depth: sample.image.depth,
        visible: sample.image.visible,
        alpha: sample.image.alpha,
      } : null,
    }));
  }

  _createRegion(region) {
    const tileSize = this.worldModel.tileSize;
    if (this.scene.textures.exists(region.backdropKey)) {
      const overscan = this.worldConfig.visual.backdropOverscan;
      const width = region.displayWidthPx * overscan;
      const height = region.displayHeightPx * overscan;
      const backdrop = this.scene.add.image(
        region.leftTile * tileSize + (region.displayWidthPx - width) / 2,
        region.topTile * tileSize + (region.displayHeightPx - height) / 2,
        region.backdropKey,
      )
        .setOrigin(0)
        .setDepth(this.worldConfig.visual.backdropDepth)
        .setAlpha(region.tileStyle.backdropAlpha)
        .setDisplaySize(width, height);
      backdrop.name = `${region.id}:atmosphere`;
      this.backdrops.push(backdrop);
    }

    this.tileLayer.createRegion(region);
    this.artifactLayer.createRegion(region);
    this.surfacePortals.set(region.id, this._createPortal(region, region.surfaceGate, "surface"));
    this.islandPortals.set(region.id, this._createPortal(region, region.arrival, "island"));
  }

  _createPortal(region, anchor, location) {
    if (!this.scene.textures.exists(region.portalAssetKey)) return null;
    const tileSize = this.worldModel.tileSize;
    const portal = this.scene.add.image(
      (anchor.tx + 0.5) * tileSize,
      (anchor.ty + 1) * tileSize,
      region.portalAssetKey,
    )
      .setOrigin(0.5, 1)
      .setDepth(this.worldConfig.visual.portalDepth)
      .setTint(region.color)
      .setDisplaySize(
        this.worldConfig.visual.portalWidthTiles * tileSize,
        this.worldConfig.visual.portalHeightTiles * tileSize,
      );
    portal.name = `${region.id}:${location}-portal`;
    return portal;
  }

  invalidateCell(tileX, tileY) {
    this.tileLayer.invalidateCell(tileX, tileY);
    this.artifactLayer.invalidateCell(tileX, tileY);
  }

  refreshAll() {
    this.tileLayer.refreshAll();
  }

  syncProgression(progressionSystem, force = false) {
    const signature = JSON.stringify(progressionSystem?.getSaveData?.() || {});
    if (!force && signature === this._progressionSignature) return;
    this._progressionSignature = signature;
    for (const region of this.worldConfig.regions) {
      const unlocked = progressionSystem?.isRegionUnlocked?.(region.id) === true;
      this.surfacePortals.get(region.id)
        ?.setVisible(true)
        .setAlpha(unlocked
          ? this.worldConfig.visual.unlockedPortalAlpha
          : this.worldConfig.visual.lockedPortalAlpha);
      this.islandPortals.get(region.id)
        ?.setVisible(unlocked)
        .setAlpha(this.worldConfig.visual.unlockedPortalAlpha);
    }
    this.artifactLayer.syncProgression(progressionSystem);
  }

  getHealthSnapshot() {
    const tileHealth = this.tileLayer.getHealthSnapshot();
    const artifactHealth = this.artifactLayer.getHealthSnapshot();
    const missingTextures = [...tileHealth.missingTextures, ...artifactHealth.missingTextures];
    for (const region of this.worldConfig.regions) {
      for (const key of [region.backdropKey, region.portalAssetKey]) {
        if (!this.scene.textures?.exists?.(key)) missingTextures.push(key);
      }
    }
    return {
      enabled: this.enabled,
      ready: !this.enabled || (
        missingTextures.length === 0
        && tileHealth.ready
        && artifactHealth.ready
      ),
      expectedCells: tileHealth.expectedCells,
      tileCellCount: tileHealth.tileCellCount,
      crackCellCount: tileHealth.crackCellCount,
      bakedFacadeCellCount: tileHealth.bakedFacadeCellCount,
      topologyCounts: tileHealth.topologyCounts,
      heartCount: artifactHealth.heartCount,
      relicCacheCount: artifactHealth.relicCacheCount,
      vaultMarkerCount: artifactHealth.vaultMarkerCount,
      missingTextures: Array.from(new Set(missingTextures)),
    };
  }

  destroy() {
    for (const object of [
      ...this.backdrops,
      ...this.surfacePortals.values(),
      ...this.islandPortals.values(),
    ]) {
      if (!object) continue;
      this.scene.tweens?.killTweensOf?.(object);
      object.destroy?.();
    }
    this.backdrops = [];
    this.tileLayer.destroy();
    this.artifactLayer.destroy();
    this.surfacePortals.clear();
    this.islandPortals.clear();
  }
}

export default HeavenblockWorldVisualSystem;
