import {
  RUNTIME_ASSET_LOADING,
  getStarRarityFeatureAssetGroupId,
} from "../../values/runtimeAssetLoading.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export class RuntimeFeaturePrefetchSystem {
  constructor(scene, manager, config = RUNTIME_ASSET_LOADING.featureResidency) {
    this.scene = scene;
    this.manager = manager;
    this.config = config.starBlockPrefetch;
    this.timer = null;
    this.requestedRarities = new Set();
    this.pendingRarities = new Set();
  }

  start() {
    if (!this.manager?.enabled || !this.scene.time?.addEvent) return Promise.resolve(false);
    const initial = this._sampleStarBlockDemand();
    this.timer = this.scene.time.addEvent({
      delay: this.config.intervalMs,
      loop: true,
      callback: () => { void this._sampleStarBlockDemand(); },
    });
    return initial;
  }

  _sampleStarBlockDemand() {
    if (this.scene.gameState !== "playing" && this.scene.gameState !== "loading") {
      return Promise.resolve(false);
    }
    const saved = this.scene._cachedSaveData?.playerStateData;
    const tileSize = this.scene.config?.tileSize || 32;
    const playerTile = this.scene.playerController?.getPlayerTile?.() || {
      tx: Number.isFinite(saved?.bodyX)
        ? Math.floor(saved.bodyX / tileSize)
        : this.scene.config?.playerSpawnTileX ?? this.scene.config?.spawnTileX,
      ty: Number.isFinite(saved?.bodyY)
        ? Math.floor(saved.bodyY / tileSize)
        : this.scene.config?.playerSpawnTileY ?? this.scene.config?.spawnTileY,
    };
    const worldModel = this.scene.worldModel;
    if (!playerTile || !worldModel) return Promise.resolve(false);
    const radius = this.config.radiusTiles;
    const left = Math.max(0, playerTile.tx - radius);
    const right = Math.min(worldModel.width - 1, playerTile.tx + radius);
    const top = Math.max(0, playerTile.ty - radius);
    const bottom = Math.min(worldModel.depth - 1, playerTile.ty + radius);
    const desiredRarities = new Set();

    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (worldModel.getTileType(tx, ty) !== TILE_TYPES.SKY_TILE) continue;
        desiredRarities.add(worldModel.getSkyTileRarity?.(tx, ty) || 0);
      }
    }
    for (const rarity of this.requestedRarities) {
      if (desiredRarities.has(rarity)) continue;
      this.manager.releaseGroup(
        getStarRarityFeatureAssetGroupId(rarity),
        this.config.consumerId,
      );
      this.requestedRarities.delete(rarity);
    }
    for (const rarity of this.pendingRarities) {
      if (desiredRarities.has(rarity)) continue;
      this.manager.releaseGroup(
        getStarRarityFeatureAssetGroupId(rarity),
        this.config.consumerId,
      );
      this.pendingRarities.delete(rarity);
    }
    const requests = [...desiredRarities]
      .filter(rarity => (
        !this.requestedRarities.has(rarity)
        && !this.pendingRarities.has(rarity)
      ))
      .sort((left, right) => left - right)
      .map(rarity => {
        this.pendingRarities.add(rarity);
        return this.manager.ensureGroup(getStarRarityFeatureAssetGroupId(rarity), {
          consumer: this.config.consumerId,
        }).then(result => {
          this.pendingRarities.delete(rarity);
          if (result.ready) {
            this.requestedRarities.add(rarity);
            this.scene.worldRenderer?.semanticAssetLayer
              ?.refreshStarIdentityFrames?.();
          }
          return result.ready;
        });
      });
    if (requests.length === 0) {
      return Promise.resolve(desiredRarities.size > 0);
    }
    return Promise.all(requests).then(results => results.every(Boolean));
  }

  destroy() {
    this.timer?.remove?.();
    this.timer = null;
    for (const rarity of new Set([
      ...this.requestedRarities,
      ...this.pendingRarities,
    ])) {
      this.manager?.releaseGroup?.(
        getStarRarityFeatureAssetGroupId(rarity),
        this.config.consumerId,
      );
    }
    this.requestedRarities.clear();
    this.pendingRarities.clear();
    this.scene = null;
    this.manager = null;
  }
}
