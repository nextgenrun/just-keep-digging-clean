export class RuntimeFeatureResidency {
  constructor(scene, coordinator, records, onEviction = null) {
    this.scene = scene;
    this.coordinator = coordinator;
    this.records = records;
    this.onEviction = onEviction;
  }

  trimToBudget() {
    const memory = this.coordinator?.textureMemory?.sample?.(true);
    if (!memory?.overBudget) return false;
    const candidates = [...this.records.values()]
      .filter(record => (
        record.status === "ready"
        && record.consumers.size === 0
        && record.definition.releaseWhenUnused
        && record.loadedKeys.size > 0
      ))
      .sort((left, right) => left.lastUsedAtMs - right.lastUsedAtMs);
    let evicted = false;
    for (const record of candidates) {
      this.evict(record);
      evicted = true;
      const updated = this.coordinator.textureMemory.sample(true);
      if (updated.estimatedBytes <= updated.lowWatermarkBytes) break;
    }
    return evicted;
  }

  evict(record) {
    if (record.consumers.size > 0) return false;
    const removed = this.removeManagedTextures(record);
    if (removed === 0) return false;
    record.status = "idle";
    this.onEviction?.(record, removed);
    return true;
  }

  removeManagedTextures(record) {
    let removed = 0;
    for (const key of record.loadedKeys) {
      if (this.coordinator?.textureMemory?.isManaged?.(key) === false) continue;
      if (this.scene.textures?.exists?.(key)) {
        this.scene.textures.remove(key);
        removed += 1;
      }
      this.coordinator?.releaseDecodedSource?.(key);
      record.loadedKeys.delete(key);
    }
    return removed;
  }

  adoptExistingTextures(record, type) {
    for (const asset of record.definition.assets) {
      if (!this.scene.textures?.exists?.(asset.key)) continue;
      record.loadedKeys.add(asset.key);
      this.coordinator?._registerTexture?.({
        asset,
        type,
        owner: record.definition.owner,
        priority: record.definition.priority,
        residencyClass: record.definition.residencyClass,
        packId: record.definition.id,
        consumers: [...record.consumers],
      }, false);
    }
  }
}
