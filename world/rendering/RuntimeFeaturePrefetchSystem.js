import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../../values/runtimeAssetLoading.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export class RuntimeFeaturePrefetchSystem {
  constructor(scene, manager, config = RUNTIME_ASSET_LOADING.featureResidency) {
    this.scene = scene;
    this.manager = manager;
    this.config = config.starBlockPrefetch;
    this.timer = null;
    this.requested = false;
  }

  start() {
    if (!this.manager?.enabled || !this.scene.time?.addEvent) return false;
    this.timer = this.scene.time.addEvent({
      delay: this.config.intervalMs,
      loop: true,
      callback: () => this._sampleStarBlockDemand(),
    });
    return true;
  }

  _sampleStarBlockDemand() {
    if (this.requested || this.scene.gameState !== "playing") return;
    const playerTile = this.scene.playerController?.getPlayerTile?.();
    const worldModel = this.scene.worldModel;
    if (!playerTile || !worldModel) return;
    const radius = this.config.radiusTiles;
    const left = Math.max(0, playerTile.tx - radius);
    const right = Math.min(worldModel.width - 1, playerTile.tx + radius);
    const top = Math.max(0, playerTile.ty - radius);
    const bottom = Math.min(worldModel.depth - 1, playerTile.ty + radius);

    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (worldModel.getTileType(tx, ty) !== TILE_TYPES.SKY_TILE) continue;
        this.requested = true;
        this.manager.ensureGroup(RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx, {
          consumer: this.config.consumerId,
        }).then(result => {
          if (!result.ready) this.requested = false;
        });
        return;
      }
    }
  }

  destroy() {
    this.timer?.remove?.();
    this.timer = null;
    this.scene = null;
    this.manager = null;
  }
}
