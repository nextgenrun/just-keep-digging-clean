import {
  RUNTIME_FEATURE_ASSET_CONSUMERS,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
  getStarRarityFeatureAssetGroupId,
} from "../../values/runtimeAssetLoading.js";

export class UIInventoryStarAtlasAssetController {
  constructor(scene) {
    this.scene = scene;
    this.consumer = RUNTIME_FEATURE_ASSET_CONSUMERS.inventoryStarAtlas;
    this.acquired = new Set();
    this.generation = 0;
    this.pending = Promise.resolve({ ready: true });
  }

  ensureRarity(rarity) {
    const manager = this.scene?.runtimeFeatureAssetManager;
    if (!manager?.enabled) return Promise.resolve({ ready: true });
    const generation = ++this.generation;
    const rarityGroupId = getStarRarityFeatureAssetGroupId(rarity);
    const groupIds = [
      RUNTIME_FEATURE_ASSET_GROUP_IDS.starAtlas,
      rarityGroupId,
    ];
    if (groupIds.every(groupId => this.acquired.has(groupId))) {
      return Promise.resolve({ ready: true });
    }
    this.pending = this.pending.catch(() => ({ ready: false })).then(async () => {
      if (generation !== this.generation) return { ready: false };
      const results = await Promise.all(groupIds.map(groupId => (
        manager.ensureGroup(groupId, { consumer: this.consumer })
      )));
      const ready = results.every(result => result.ready);
      if (!ready || generation !== this.generation) {
        groupIds.forEach(groupId => {
          if (!this.acquired.has(groupId)) manager.releaseGroup(groupId, this.consumer);
        });
        return { ready: false };
      }
      for (const groupId of this.acquired) {
        if (
          groupId.startsWith(RUNTIME_FEATURE_ASSET_GROUP_IDS.starRarityPrefix)
          && groupId !== rarityGroupId
        ) {
          manager.releaseGroup(groupId, this.consumer);
          this.acquired.delete(groupId);
        }
      }
      groupIds.forEach(groupId => this.acquired.add(groupId));
      return { ready: true };
    });
    return this.pending;
  }

  releaseAll() {
    this.generation += 1;
    const manager = this.scene?.runtimeFeatureAssetManager;
    for (const groupId of this.acquired) {
      manager?.releaseGroup?.(groupId, this.consumer);
    }
    this.acquired.clear();
  }

  destroy() {
    this.releaseAll();
    this.scene = null;
  }
}
