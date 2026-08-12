export function resolveFireLightLayerPolicy(
  config,
  presentation = {},
  raysRequested = false,
) {
  const volumeEnabled = presentation.volumeAlphaScale !== 0;
  const atmosphereEnabled = presentation.atmosphereAlphaScale !== 0;
  const textureKeys = [config.assetKeys.steadyFlame, config.assetKeys.stateFlame];
  if (volumeEnabled) textureKeys.push(config.assetKeys.lightVolume);
  if (atmosphereEnabled) textureKeys.push(config.assetKeys.atmosphere);
  if (raysRequested) textureKeys.push(config.assetKeys.rays);
  return Object.freeze({
    atmosphereEnabled,
    textureKeys: Object.freeze(textureKeys),
    volumeEnabled,
  });
}
