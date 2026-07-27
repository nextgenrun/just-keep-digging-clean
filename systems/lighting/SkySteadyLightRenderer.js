const clamp01 = value => Math.max(0, Math.min(1, value));

function resolveAssetEntry(visuals, rarity) {
  const assets = visuals?.rarityAssets;
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const fallbackIndex = Math.max(
    0,
    Math.min(assets.length - 1, visuals.fallbackRarityIndex || 0)
  );
  const index = Number.isFinite(rarity)
    ? Math.max(0, Math.min(assets.length - 1, Math.floor(rarity)))
    : fallbackIndex;
  return {
    asset: assets[index] || assets[fallbackIndex],
    fallback: assets[fallbackIndex],
    index,
  };
}

/**
 * Pools the six ImageGen Star Block auras that stain hard darkness by rarity.
 */
export class SkySteadyLightRenderer {
  constructor(scene, visuals) {
    this.scene = scene;
    this.visuals = visuals;
    this._lights = [];
    this._usedCount = 0;

    if (!visuals?.enabled || !scene?.add?.image) return;

    const fallback = resolveAssetEntry(visuals, visuals.fallbackRarityIndex)?.fallback;
    if (!fallback?.key || !scene.textures?.exists?.(fallback.key)) return;

    const blendMode = Phaser.BlendModes[visuals.blendMode]
      ?? Phaser.BlendModes.ADD;
    const poolSize = Math.max(1, Math.floor(visuals.maxImages || 1));
    for (let index = 0; index < poolSize; index += 1) {
      const light = scene.add.image(0, 0, fallback.key)
        .setOrigin(0.5)
        .setDepth(visuals.renderDepth)
        .setBlendMode(blendMode)
        .setAlpha(0)
        .setVisible(false);
      this._lights.push(light);
    }
  }

  beginFrame() {
    for (let index = 0; index < this._usedCount; index += 1) {
      this._lights[index]?.setAlpha(0).setVisible(false);
    }
    this._usedCount = 0;
  }

  draw({
    worldX,
    worldY,
    tileSize,
    verticalScale,
    radiusTiles,
    rarity,
    intensity = 1,
  }) {
    const visuals = this.visuals;
    const entry = resolveAssetEntry(visuals, rarity);
    const light = this._lights[this._usedCount];
    if (!light || !entry?.asset?.key) return false;

    const requestedAsset = this.scene.textures?.exists?.(entry.asset.key)
      ? entry.asset
      : entry.fallback;
    if (!requestedAsset?.key || !this.scene.textures?.exists?.(requestedAsset.key)) {
      return false;
    }

    const opacityMultiplier = visuals.rarityOpacityMultipliers?.[entry.index] ?? 1;
    const alpha = clamp01(visuals.opacity * intensity * opacityMultiplier);
    if (alpha <= visuals.minimumAlpha) return false;

    const visibleDiameter = radiusTiles
      * tileSize
      * 2
      * visuals.radiusMultiplier;
    const artScale = 1 / visuals.artLightDiameterRatio;
    this._usedCount += 1;
    light
      .setTexture(requestedAsset.key)
      .setPosition(worldX, worldY)
      .setDisplaySize(
        visibleDiameter * artScale,
        visibleDiameter * verticalScale * artScale
      )
      .setAlpha(alpha)
      .setVisible(true);
    return true;
  }

  destroy() {
    this._lights.forEach(light => light?.destroy());
    this._lights.length = 0;
    this._usedCount = 0;
    this.scene = null;
    this.visuals = null;
  }
}
