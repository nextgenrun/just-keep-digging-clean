const clamp01 = value => Math.max(0, Math.min(1, value));

const smoothstep = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function resolveAsset(visuals, rarity) {
  const assets = visuals?.rarityAssets;
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const fallbackIndex = Math.max(
    0,
    Math.min(assets.length - 1, visuals.fallbackRarityIndex || 0)
  );
  const index = Number.isFinite(rarity)
    ? Math.max(0, Math.min(assets.length - 1, Math.floor(rarity)))
    : fallbackIndex;
  return assets[index] || assets[fallbackIndex];
}

/**
 * Scales and fades one preloaded ImageGen Star Block pulse sprite.
 */
export class SkyBeaconPulseRenderer {
  constructor(scene, visuals) {
    this.scene = scene;
    this.visuals = visuals;
    this._ring = null;

    if (!visuals?.enabled || !scene?.add?.image) return;

    const fallback = resolveAsset(visuals, visuals.fallbackRarityIndex);
    if (!fallback?.key || !scene.textures?.exists?.(fallback.key)) return;

    const blendMode = Phaser.BlendModes[visuals.blendMode]
      ?? Phaser.BlendModes.ADD;
    this._ring = scene.add.image(0, 0, fallback.key)
      .setOrigin(0.5)
      .setDepth(visuals.renderDepth)
      .setBlendMode(blendMode)
      .setAlpha(0)
      .setVisible(false);
  }

  beginFrame() {
    if (!this._ring) return;
    this._ring.setAlpha(0);
    this._ring.setVisible(false);
  }

  draw({
    worldX,
    worldY,
    tileSize,
    verticalScale,
    pulseRadiusTiles,
    pulse,
    rarity,
  }) {
    const visuals = this.visuals;
    const asset = resolveAsset(visuals, rarity);
    if (!this._ring || !asset?.key || !pulse) return false;
    if (!this.scene.textures?.exists?.(asset.key)) return false;

    const easedStrength = smoothstep(pulse.waveStrength || 0);
    const alpha = clamp01(visuals.ringOpacity * easedStrength);
    if (alpha <= visuals.minimumAlpha) return false;

    const radiusX = pulseRadiusTiles * tileSize;
    const radiusY = radiusX * verticalScale;
    const artScale = 1 / visuals.artRingDiameterRatio;
    this._ring
      .setTexture(asset.key)
      .setPosition(worldX, worldY)
      .setDisplaySize(
        radiusX * 2 * artScale,
        radiusY * 2 * artScale
      )
      .setAlpha(alpha)
      .setVisible(true);
    return true;
  }

  destroy() {
    this._ring?.destroy();
    this._ring = null;
    this.scene = null;
    this.visuals = null;
  }
}
