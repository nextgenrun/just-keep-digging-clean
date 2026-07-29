export class WorldBackgroundSpatialIndex {
  constructor(bandHeightPx) {
    this.bandHeightPx = bandHeightPx;
    this.bands = new Map();
    this.itemByRuntimeId = new Map();
    this.itemsByTextureKey = new Map();
  }

  rebuild(items, resolveRect) {
    this.bands.clear();
    this.itemByRuntimeId.clear();
    this.itemsByTextureKey.clear();

    for (const item of items) {
      item.runtimeRect = resolveRect(item.entry);
      this.itemByRuntimeId.set(item.runtimeId, item);
      const textureItems = this.itemsByTextureKey.get(item.entry.textureKey) || [];
      textureItems.push(item);
      this.itemsByTextureKey.set(item.entry.textureKey, textureItems);

      const firstBand = Math.floor(item.runtimeRect.top / this.bandHeightPx);
      const finalBand = Math.ceil(item.runtimeRect.bottom / this.bandHeightPx) - 1;
      for (let band = firstBand; band <= finalBand; band += 1) {
        const bandItems = this.bands.get(band) || [];
        bandItems.push(item);
        this.bands.set(band, bandItems);
      }
    }
  }

  query(bounds) {
    const firstBand = Math.floor(bounds.top / this.bandHeightPx);
    const finalBand = Math.ceil(bounds.bottom / this.bandHeightPx) - 1;
    const matches = new Set();
    for (let band = firstBand; band <= finalBand; band += 1) {
      for (const item of this.bands.get(band) || []) matches.add(item);
    }
    return [...matches];
  }

  getByRuntimeId(runtimeId) {
    return this.itemByRuntimeId.get(runtimeId) || null;
  }

  getByTextureKey(textureKey) {
    return this.itemsByTextureKey.get(textureKey) || [];
  }
}
