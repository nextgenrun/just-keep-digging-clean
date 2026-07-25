function getTextureSourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.()
    || texture?.source?.[0]?.image
    || texture?.source?.[0];
  const width = Number(source?.width || 0);
  const height = Number(source?.height || 0);
  if (width <= 0 || height <= 0) {
    throw new Error(`Scenic facade texture ${key} has no readable source dimensions`);
  }
  return { width, height };
}

export class WorldScenicFacadeBandView {
  constructor(scene, band, key, config, geometryMask) {
    this.scene = scene;
    this.band = band;
    this.key = key;
    this.config = config;
    this.geometryMask = geometryMask;
    this.images = new Map();
    this.tint = band.tint;
  }

  sync(bounds) {
    const tileSize = this.scene.config.tileSize;
    const scale = this.config.render.textureScale;
    const source = getTextureSourceSize(this.scene, this.key);
    const plateWidth = source.width * scale;
    const plateHeight = source.height * scale;
    const spanLeft = this.config.span.leftTile * tileSize;
    const spanRight = this.config.span.rightTileExclusive * tileSize;
    const bandTop = this.band.topTile * tileSize;
    const bandBottom = this.band.bottomTileExclusive * tileSize;
    const visibleLeft = Math.max(spanLeft, bounds.left * tileSize);
    const visibleRight = Math.min(spanRight, bounds.right * tileSize);
    const visibleTop = Math.max(bandTop, bounds.top * tileSize);
    const visibleBottom = Math.min(bandBottom, bounds.bottom * tileSize);
    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) return;

    const firstColumn = Math.max(0, Math.floor((visibleLeft - spanLeft) / plateWidth));
    const lastColumn = Math.ceil((visibleRight - spanLeft) / plateWidth);
    const firstRow = Math.max(0, Math.floor((visibleTop - bandTop) / plateHeight));
    const lastRow = Math.ceil((visibleBottom - bandTop) / plateHeight);
    const needed = new Set();

    for (let row = firstRow; row < lastRow; row += 1) {
      for (let column = firstColumn; column < lastColumn; column += 1) {
        const id = `${column}:${row}`;
        const x = spanLeft + column * plateWidth;
        const y = bandTop + row * plateHeight;
        const cropWidth = Math.min(source.width, (spanRight - x) / scale);
        const cropHeight = Math.min(source.height, (bandBottom - y) / scale);
        if (cropWidth <= 0 || cropHeight <= 0) continue;
        needed.add(id);
        if (this.images.has(id)) continue;
        const image = this.scene.add.image(x, y, this.key)
          .setOrigin(0, 0)
          .setDepth(this.config.render.facadeDepth)
          .setAlpha(this.config.render.materialAlpha)
          .setTint(this.tint)
          .setMask(this.geometryMask)
          .setScale(scale);
        image.setCrop(0, 0, cropWidth, cropHeight);
        image.name = `world-scenic-facade-${this.band.id}-${id}`;
        this.images.set(id, image);
      }
    }

    for (const [id, image] of this.images) {
      if (needed.has(id)) continue;
      image.destroy();
      this.images.delete(id);
    }
  }

  setTint(tint) {
    this.tint = tint;
    for (const image of this.images.values()) image.setTint(tint);
  }

  destroy() {
    for (const image of this.images.values()) image.destroy();
    this.images.clear();
  }
}
