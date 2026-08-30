import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../../values/starIdentityLibrary.js";
import { getStarIdentity } from "../../../values/starIdentityLibraryMath.js";
import { resolveWorldVisualSemanticStarFrame } from
  "../../../values/worldVisualSemanticAssets.js";
import { installStarIdentityTextureFrames } from
  "../../../systems/visual/installStarIdentityTextureFrames.js";
import { cellIntersectsTownFloorOcclusion } from
  "./WorldVisualTownFloorOcclusion.js";

export function refreshSemanticStarIdentityFrames(layer) {
  layer.identityFramesReady = installStarIdentityTextureFrames(layer.scene);
  layer.dirty = true;
  return layer.identityFramesReady;
}

export function showWorldVisualSemanticStar(
  layer,
  index,
  tx,
  ty,
  size,
  lighting,
  phase,
) {
  if (!layer.identityFramesReady) refreshSemanticStarIdentityFrames(layer);
  const rarity = layer.worldModel.getSkyTileRarity?.(tx, ty) || 0;
  const fallbackFrame = resolveWorldVisualSemanticStarFrame(
    rarity,
    layer.config,
  );
  const identity = getStarIdentity(
    layer.worldModel.getSkyTileIdentity?.(tx, ty) || 0,
  );
  const identityAtlas = STAR_IDENTITY_LIBRARY_CONFIG.atlases[identity.rarityIndex];
  const lightAtlas = STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases[identity.rarityIndex];
  const identityReady = layer.identityFramesReady
    && identityAtlas
    && layer.scene.textures.exists(identityAtlas.key);
  const lightReady = layer.identityFramesReady
    && lightAtlas
    && layer.scene.textures.exists(lightAtlas.key);
  if (
    layer.scene.runtimeFeatureAssetManager?.enabled
    && (!identityReady || !lightReady)
  ) return false;

  const beautyAtlas = identityReady ? identityAtlas : layer.config.skyTile.beautyAtlas;
  const emissiveAtlas = lightReady ? lightAtlas : layer.config.skyTile.emissiveAtlas;
  const beautyFrame = identityReady
    ? identity.frameName
    : `${beautyAtlas.framePrefix}${fallbackFrame}`;
  const emissiveFrame = lightReady
    ? identity.lightFrameName
    : `${emissiveAtlas.framePrefix}${fallbackFrame}`;
  const beauty = layer.starBeautyPool[index] || layer._createImage(
    layer.starBeautyPool,
    beautyAtlas.key,
    layer.config.render.starBeautyDepth,
    layer.config.skyTile.beautyBlendMode,
  );
  const emissive = layer.starEmissivePool[index] || layer._createImage(
    layer.starEmissivePool,
    emissiveAtlas.key,
    layer.currentEmissiveDepth,
    layer.config.render.emissiveBlendMode,
  );
  const idleMotion = layer.starIdleEnabled
    ? layer.config.skyTile.idleMotion
    : null;
  const idle = idleMotion
    ? (layer.starIdlePool[index] || layer._createImage(
      layer.starIdlePool,
      idleMotion.atlas.key,
      layer.currentEmissiveDepth,
      idleMotion.blendMode,
    ))
    : null;
  const x = (tx + 0.5) * size;
  const y = (ty + 0.5) * size;
  const displaySize = size * layer.config.skyTile.scale * (
    identityReady ? STAR_IDENTITY_LIBRARY_CONFIG.visual.worldTileScale : 1
  );
  const visualReady = identityReady || lightReady;
  const opacityScale = visualReady ? identity.light.opacityScale : 1;
  const lightDisplaySize = lightReady
    ? displaySize * STAR_IDENTITY_LIBRARY_CONFIG.visual.worldLightScale
    : displaySize;
  const lightAlphaScale = lightReady
    ? STAR_IDENTITY_LIBRARY_CONFIG.visual.worldLightAlphaScale
    : 1;
  const townFloorOccluded = cellIntersectsTownFloorOcclusion(
    layer.townFloorOcclusion,
    tx,
    ty,
    size,
  );
  beauty.setPosition(x, y)
    .setTexture(beautyAtlas.key, beautyFrame)
    .setDisplaySize(displaySize, displaySize)
    .setRotation(0)
    .setAlpha(layer.config.skyTile.beautyAlpha * opacityScale)
    .setTint(layer.config.skyTile.beautyReceivesTerrainTint === false
      ? 0xffffff
      : (lighting?.terrainTint || 0xffffff))
    .setVisible(true);
  emissive.setPosition(x, y)
    .setDepth(townFloorOccluded
      ? layer.config.render.townFloorOccludedEmissiveDepth
      : layer.currentEmissiveDepth)
    .setTexture(emissiveAtlas.key, emissiveFrame)
    .setDisplaySize(lightDisplaySize, lightDisplaySize)
    .setRotation(0)
    .setAlpha(layer.config.skyTile.emissiveAlpha * opacityScale * lightAlphaScale)
    .setVisible(true);
  const idleVariant = idleMotion
    ? (identityReady ? identity.index : fallbackFrame) % idleMotion.atlas.variantCount
    : 0;
  const idlePhaseFrame = idleMotion
    ? Math.floor((phase / (Math.PI * 2)) * idleMotion.atlas.framesPerVariant)
    : 0;
  const idleFrame = idleMotion
    ? idleVariant * idleMotion.atlas.framesPerVariant + idlePhaseFrame
    : 0;
  idle?.setPosition(x, y)
    .setDepth(townFloorOccluded
      ? layer.config.render.townFloorOccludedEmissiveDepth
      : layer.currentEmissiveDepth)
    .setTexture(idleMotion.atlas.key, `${idleMotion.atlas.framePrefix}${idleFrame}`)
    .setDisplaySize(displaySize * idleMotion.scale, displaySize * idleMotion.scale)
    .setRotation(0)
    .setAlpha(idleMotion.alpha * opacityScale)
    .setVisible(true);
  layer.activeStars.push({
    beauty,
    emissive,
    idle,
    townFloorOccluded,
    identity: visualReady ? identity : null,
    lightAlphaScale,
    phase,
    idleVariant,
    idleFrame,
  });
  return true;
}

export function updateWorldVisualSemanticStars(layer, now) {
  const motion = layer.starIdleEnabled
    ? layer.config.skyTile.idleMotion
    : null;
  for (const star of layer.activeStars) {
    const light = star.identity?.light;
    const period = light?.pulsePeriodMs
      || layer.config.skyTile.pulsePeriodMs;
    const range = light?.pulseRange
      || layer.config.skyTile.pulseAlphaRange;
    const opacityScale = light?.opacityScale || 1;
    const pulse = Math.sin((now / period) * Math.PI * 2 + star.phase) * 0.5 + 0.5;
    star.beauty.setAlpha(
      layer.config.skyTile.beautyAlpha
        * opacityScale
        * (1 - range * 0.25 + pulse * range * 0.25),
    );
    star.emissive.setAlpha(
      layer.config.skyTile.emissiveAlpha
        * star.lightAlphaScale
        * opacityScale
        * (1 - range + pulse * range),
    );
    const rotation = Math.sin(
      now * (light?.rotationSpeedRadiansPerMs || 0) + star.phase,
    ) * (light?.rotationAmplitudeRadians || 0);
    star.beauty.setRotation(rotation);
    star.emissive.setRotation(rotation);

    if (motion && star.idle) {
      const localFrame = Math.floor(now / motion.framePeriodMs)
        + Math.floor((star.phase / (Math.PI * 2)) * motion.atlas.framesPerVariant);
      const frame = star.idleVariant * motion.atlas.framesPerVariant
        + (localFrame % motion.atlas.framesPerVariant);
      if (frame !== star.idleFrame) {
        star.idleFrame = frame;
        star.idle.setTexture(motion.atlas.key, `${motion.atlas.framePrefix}${frame}`);
      }
    }
  }
}
