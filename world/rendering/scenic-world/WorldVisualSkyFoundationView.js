import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";

function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.()
    || texture?.source?.[0]?.image
    || texture?.source?.[0];
  return source?.width && source?.height
    ? { width: source.width, height: source.height }
    : null;
}

export class WorldVisualSkyFoundationView {
  constructor(scene, config, assetCache) {
    this.scene = scene;
    this.config = config;
    this.assetCache = assetCache;
    this.fallback = null;
    this.images = [];
    this.destroyed = false;
    this.lastLighting = null;
  }

  get image() {
    return this.images[0] || null;
  }

  create() {
    if (!this.config?.asset || !this.assetCache) return false;
    const fieldWidthPx = this.scene.config.worldWidthPx;
    const fieldHeightPx = this.scene.config.topAirRows
      * this.scene.config.tileSize;
    this.fallback = this.scene.add.rectangle(
      0,
      0,
      fieldWidthPx,
      fieldHeightPx,
      this.config.fallbackColor,
      1
    )
      .setOrigin(0)
      .setDepth(this.config.fallbackDepth);
    this.fallback.name = "world-visual-sky-atmosphere-fallback";
    this.assetCache.ensure(this.config.asset, {
      onReady: () => this._createImages(),
      onError: () => {
        console.error(
          `[WorldVisualSkyFoundationView] Failed: ${this.config.asset.key}`
        );
      },
    });
    return true;
  }

  _createImages() {
    if (this.destroyed || this.images.length > 0) return this.image;
    const source = sourceSize(this.scene, this.config.asset.key);
    if (
      source?.width !== this.config.expectedSource.widthPx
      || source?.height !== this.config.expectedSource.heightPx
    ) {
      console.error(
        `[WorldVisualSkyFoundationView] Invalid source: ${this.config.asset.key}`
      );
      return null;
    }
    const fieldWidthPx = this.scene.config.worldWidthPx;
    const fieldHeightPx = this.scene.config.topAirRows
      * this.scene.config.tileSize;
    const segmentWidthPx = this.config.expectedSource.widthPx;
    const verticalScale = fieldHeightPx / this.config.expectedSource.heightPx;
    const segmentCount = Math.ceil(fieldWidthPx / segmentWidthPx);
    for (let index = 0; index < segmentCount; index += 1) {
      const image = this.scene.add.image(
        index * segmentWidthPx,
        0,
        this.config.asset.key
      )
        .setOrigin(0)
        .setDepth(this.config.depth)
        .setAlpha(this.config.alpha)
        .setScale(1, verticalScale);
      image.name = `world-visual-sky-atmosphere-foundation-v2-${index}`;
      this.images.push(image);
    }
    this.update(this.lastLighting);
    return this.image;
  }

  update(lighting) {
    if (lighting) this.lastLighting = lighting;
    const tint = Number.isFinite(this.lastLighting?.farTint)
      ? this.lastLighting.farTint
      : 0xffffff;
    setTintIfChanged(this.fallback, tint);
    this.images.forEach(image => {
      setTintIfChanged(image, tint);
      setAlphaIfChanged(image, this.config.alpha);
    });
    return Boolean(this.fallback || this.images.length > 0);
  }

  destroy() {
    this.destroyed = true;
    this.fallback?.destroy?.();
    this.fallback = null;
    this.images.forEach(image => image.destroy?.());
    this.images = [];
    this.lastLighting = null;
  }
}