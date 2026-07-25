function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualMaterialBandView] Missing source: ${key}`);
  }
  return { width: source.width, height: source.height };
}

export class WorldVisualMaterialBandView {
  constructor(scene, band, material, config, geometryMask, backdropGeometryMask) {
    this.scene = scene;
    this.band = band;
    this.material = material;
    this.config = config;
    this.geometryMask = geometryMask;
    this.backdropGeometryMask = backdropGeometryMask;
    this.materialImages = new Map();
    this.backdropImages = new Map();
  }

  sync(bounds) {
    const size = sourceSize(this.scene, this.material.key);
    const tileSize = this.scene.config.tileSize;
    const leftPx = bounds.left * tileSize;
    const rightPx = bounds.right * tileSize;
    const bandTopPx = this.band.topTile * tileSize;
    const bandBottomPx = this.band.bottomTileExclusive * tileSize;
    const visibleTopPx = Math.max(bounds.top * tileSize, bandTopPx);
    const visibleBottomPx = Math.min(bounds.bottom * tileSize, bandBottomPx);
    const needed = new Set();
    if (rightPx > leftPx && visibleBottomPx > visibleTopPx) {
      const firstColumn = Math.floor(leftPx / size.width);
      const lastColumn = Math.ceil(rightPx / size.width);
      const firstRow = Math.floor((visibleTopPx - bandTopPx) / size.height);
      const lastRow = Math.ceil((visibleBottomPx - bandTopPx) / size.height);
      for (let row = firstRow; row < lastRow; row += 1) {
        for (let column = firstColumn; column < lastColumn; column += 1) {
          const id = `${column}:${row}`;
          const x = column * size.width;
          const y = bandTopPx + row * size.height;
          const cropHeight = Math.min(size.height, bandBottomPx - y);
          if (cropHeight <= 0) continue;
          needed.add(id);
          if (this.materialImages.has(id)) continue;
          this._createPlane(id, x, y, size.width, cropHeight);
        }
      }
    }
    this._prune(needed);
  }

  _createPlane(id, x, y, cropWidth, cropHeight) {
    const backdrop = this.scene.add.image(x, y, this.material.key)
      .setOrigin(0)
      .setDepth(this.config.render.caveBackdropDepth)
      .setMask(this.backdropGeometryMask)
      .setAlpha(0.24)
      .setTint(0x536375)
      .setCrop(0, 0, cropWidth, cropHeight);
    backdrop.name = `world-visual-material-backdrop-${this.band.id}-${id}`;
    const image = this.scene.add.image(x, y, this.material.key)
      .setOrigin(0)
      .setDepth(this.config.render.terrainDepth)
      .setMask(this.geometryMask)
      .setCrop(0, 0, cropWidth, cropHeight);
    image.name = `world-visual-material-${this.band.id}-${id}`;
    this.backdropImages.set(id, backdrop);
    this.materialImages.set(id, image);
  }

  _prune(needed) {
    for (const [id, image] of this.materialImages) {
      if (needed.has(id)) continue;
      image.destroy();
      this.backdropImages.get(id)?.destroy();
      this.materialImages.delete(id);
      this.backdropImages.delete(id);
    }
  }

  setLighting(lighting) {
    const tint = this.band.tint === 0xffffff ? lighting.terrainTint : this.band.tint;
    this.materialImages.forEach(image => image.setTint(tint));
    this.backdropImages.forEach(image => image.setAlpha(0.20 + lighting.fog * 0.11));
  }

  destroy() {
    this.materialImages.forEach(image => image.destroy());
    this.backdropImages.forEach(image => image.destroy());
    this.materialImages.clear();
    this.backdropImages.clear();
  }
}
