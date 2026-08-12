import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../../values/starIdentityLibrary.js";
import { getStarIdentity } from "../../values/starIdentityLibraryMath.js";
import { installStarIdentityTextureFrames } from "../visual/installStarIdentityTextureFrames.js";

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
 * Pools exact ImageGen Star identities that stain hard darkness by colour.
 */
export class SkySteadyLightRenderer {
  constructor(scene, visuals) {
    this.scene = scene;
    this.visuals = visuals;
    this._lights = [];
    this._usedCount = 0;
    this._identityFramesReady = false;
  }

  _ensurePool() {
    if (this._lights.length > 0) return true;
    const visuals = this.visuals;
    if (!visuals?.enabled || !this.scene?.add?.image) return false;
    const fallback = resolveAssetEntry(visuals, visuals.fallbackRarityIndex)?.fallback;
    if (!fallback?.key || visuals.rarityAssets.some(
      asset => !this.scene.textures?.exists?.(asset.key),
    )) return false;

    this._identityFramesReady = installStarIdentityTextureFrames(this.scene);
    const blendMode = Phaser.BlendModes[visuals.blendMode]
      ?? Phaser.BlendModes.ADD;
    const poolSize = Math.max(1, Math.floor(visuals.maxImages || 1));
    for (let index = 0; index < poolSize; index += 1) {
      const light = this.scene.add.image(0, 0, fallback.key)
        .setOrigin(0.5)
        .setDepth(visuals.renderDepth)
        .setBlendMode(blendMode)
        .setAlpha(0)
        .setVisible(false);
      this._lights.push(light);
    }
    return true;
  }

  beginFrame() {
    this._ensurePool();
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
    identity = 0,
    time = 0,
    tx = 0,
    ty = 0,
  }) {
    this._ensurePool();
    const visuals = this.visuals;
    const entry = resolveAssetEntry(visuals, rarity);
    const light = this._lights[this._usedCount];
    if (!light || !entry?.asset?.key) return false;

    if (!this._identityFramesReady) {
      this._identityFramesReady = installStarIdentityTextureFrames(this.scene);
    }

    const starIdentity = getStarIdentity(identity);
    const identityLightAtlas = STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases[
      starIdentity.rarityIndex
    ];
    const identityReady = this._identityFramesReady
      && identityLightAtlas
      && this.scene.textures?.exists?.(identityLightAtlas.key);
    if (this.scene.runtimeFeatureAssetManager?.enabled && !identityReady) return false;
    const requestedAsset = identityReady
      ? identityLightAtlas
      : this.scene.textures?.exists?.(entry.asset.key)
        ? entry.asset
        : entry.fallback;
    if (!requestedAsset?.key || !this.scene.textures?.exists?.(requestedAsset.key)) {
      return false;
    }

    const opacityMultiplier = visuals.rarityOpacityMultipliers?.[entry.index] ?? 1;
    const identityLight = identityReady ? starIdentity.light : null;
    const alpha = clamp01(
      visuals.opacity
        * intensity
        * opacityMultiplier
        * (identityLight?.opacityScale || 1)
    );
    if (alpha <= visuals.minimumAlpha) return false;

    const visibleDiameter = radiusTiles
      * tileSize
      * 2
      * visuals.radiusMultiplier
      * (identityLight?.radiusScale || 1);
    const artScale = (1 / visuals.artLightDiameterRatio)
      * (identityReady
        ? STAR_IDENTITY_LIBRARY_CONFIG.visual.steadyAuraArtScale
        : 1);
    const rotation = identityLight
      ? Math.sin(
          time * identityLight.rotationSpeedRadiansPerMs
            + starIdentity.index
            + tx
            + ty
        ) * identityLight.rotationAmplitudeRadians
      : 0;
    this._usedCount += 1;
    light
      .setTexture(
        requestedAsset.key,
        identityReady ? starIdentity.lightFrameName : undefined,
      )
      .setPosition(worldX, worldY)
      .setDisplaySize(
        visibleDiameter * artScale,
        visibleDiameter
          * verticalScale
          * (identityLight?.verticalScale || 1)
          * artScale
      )
      .setAlpha(alpha)
      .setVisible(true);
    light.setRotation?.(rotation);
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
