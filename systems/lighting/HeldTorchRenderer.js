const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export class HeldTorchRenderer {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.image = null;
    this.available = false;
    this._snapshot = { available: false, visible: false };
    this._create();
  }

  _create() {
    const key = this.config.textureKey;
    if (!this.config.enabled || !this.scene.textures?.exists?.(key)) return;
    try {
      const texture = this.scene.textures.get(key);
      const crop = this.config.sourceCrop;
      if (!texture.has(this.config.frameName)) {
        texture.add(
          this.config.frameName,
          0,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
        );
      }
      this.image = this.scene.add.image(0, 0, key, this.config.frameName)
        .setOrigin(this.config.originX, this.config.originY)
        .setVisible(false)
        .setAlpha(0);
      this.available = true;
      this._snapshot.available = true;
    } catch (error) {
      console.warn("[HeldTorchRenderer] Approved torch prop unavailable.", error);
      this.destroy();
    }
  }

  render({ active, source, tileSize, strength }) {
    if (!this.available) return false;
    if (!active || !source) {
      this.hide();
      return true;
    }
    const safeTileSize = Math.max(1, Number(tileSize) || 1);
    const frame = Math.max(0, Number(source.animationFrame) || 0);
    const pose = Math.sin(frame * this.config.poseRadiansPerFrame);
    const facingSign = source.facingSign < 0 ? -1 : 1;
    const x = source.x + facingSign * pose * this.config.poseHorizontalTiles * safeTileSize;
    const y = source.y + pose * this.config.poseVerticalTiles * safeTileSize;
    const depth = Number.isFinite(source.playerDepth)
      ? source.playerDepth + this.config.playerDepthOffset
      : this.config.fallbackDepth;
    this.image
      .setPosition(x, y)
      .setDepth(depth)
      .setDisplaySize(
        safeTileSize * this.config.displayWidthTiles,
        safeTileSize * this.config.displayHeightTiles,
      )
      .setFlipX(facingSign < 0)
      .setRotation(facingSign * pose * this.config.poseRotationRadians)
      .setAlpha(0.90 + clamp01(strength) * 0.10)
      .setVisible(true);
    this._snapshot = {
      available: true,
      visible: true,
      x,
      y,
      depth,
      animationFrame: frame,
    };
    return true;
  }

  hide() {
    this.image?.setVisible(false)?.setAlpha(0);
    this._snapshot = { ...this._snapshot, visible: false };
  }

  getSnapshot() {
    return { ...this._snapshot };
  }

  destroy() {
    this.image?.destroy?.();
    this.image = null;
    this.available = false;
  }
}
