import {
  WORLD_VISUAL_DAMAGE,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageFrame,
} from "../../../values/worldVisualDamage.js";

export class WorldVisualDamageImagePainter {
  constructor(
    scene,
    geometryMask,
    depth,
    config = WORLD_VISUAL_DAMAGE,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.geometryMask = geometryMask;
    this.depth = depth;
    this.config = config;
    this.atlas = resolveWorldVisualDamageAtlas(config, search);
    this.pool = [];
    this.activeCount = 0;
  }

  create() {
    this._installFrames();
    return true;
  }

  clear() {
    this.activeCount = 0;
    this.pool.forEach(image => image.setVisible(false));
  }

  draw(tx, ty, damage, size, variationTx = tx, variationTy = ty) {
    const frameIndex = resolveWorldVisualDamageFrame(
      variationTx,
      variationTy,
      damage,
      this.config
    );
    if (!Number.isInteger(frameIndex)) return false;
    const atlas = this.atlas;
    const image = this.pool[this.activeCount] || this._createImage();
    this.activeCount += 1;
    image.setPosition((tx + 0.5) * size, (ty + 0.5) * size)
      .setTexture(atlas.key, `${atlas.framePrefix}${frameIndex}`)
      .setDisplaySize(size * this.config.imagegen.scale, size * this.config.imagegen.scale)
      .setAlpha(this.config.imagegen.alpha)
      .setVisible(true);
    return true;
  }

  _createImage() {
    const atlas = this.atlas;
    const image = this.scene.add.image(0, 0, atlas.key)
      .setDepth(this.depth + this.config.imagegen.depthOffset)
      .setVisible(false);
    if (this.geometryMask) image.setMask(this.geometryMask);
    this.pool.push(image);
    return image;
  }

  _installFrames() {
    const atlas = this.atlas;
    if (!this.scene.textures.exists(atlas.key)) {
      throw new Error(`[WorldVisualDamageImagePainter] Required atlas was not preloaded: ${atlas.key}`);
    }
    if (atlas.frameCount !== this.config.stateCount * this.config.imagegen.variants) {
      throw new Error("[WorldVisualDamageImagePainter] Atlas frame count does not match states x variants");
    }
    const texture = this.scene.textures.get(atlas.key);
    for (let index = 0; index < atlas.frameCount; index += 1) {
      const name = `${atlas.framePrefix}${index}`;
      if (texture.has(name)) continue;
      texture.add(
        name,
        0,
        (index % atlas.columns) * atlas.frameSizePx,
        Math.floor(index / atlas.columns) * atlas.frameSizePx,
        atlas.frameSizePx,
        atlas.frameSizePx
      );
    }
  }

  setDepth(depth) {
    this.depth = depth;
    const resolved = depth + this.config.imagegen.depthOffset;
    this.pool.forEach(image => image.setDepth(resolved));
  }

  destroy() {
    this.pool.forEach(image => image.destroy());
    this.pool = [];
    this.activeCount = 0;
  }
}
