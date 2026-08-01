export const clampFireLight01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function mixFireLight(from, to, amount) {
  return from + (to - from) * clampFireLight01(amount);
}

export function approachFireLight(current, target, responsePerSecond, deltaMs) {
  const safeDelta = Math.max(0, Number(deltaMs) || 0) / 1000;
  const response = Math.max(0, Number(responsePerSecond) || 0);
  if (safeDelta === 0 || response === 0) return current;
  return current + (target - current) * (1 - Math.exp(-response * safeDelta));
}

export function computeEyeAdaptationTarget(lighting, torch, config) {
  const surface = clampFireLight01(lighting?.surfaceLightInfluence);
  const night = clampFireLight01(lighting?.nightAmount);
  const sun = clampFireLight01(lighting?.sunStrength);
  const lightning = clampFireLight01(lighting?.weather?.lightningFlashAmount);
  const torchStrength = torch?.active
    ? clampFireLight01(torch.strength) * config.torchLuminance
    : 0;
  const surfaceAmbient = Math.max(
    config.surfaceNightLuminance * night,
    sun
  );
  const caveAmbient = config.minimumLuminance + torchStrength;
  const sceneLuminance = mixFireLight(caveAmbient, surfaceAmbient, surface);
  const lightningLuminance = lightning * config.lightningLuminance;

  return clampFireLight01(Math.max(config.minimumLuminance, sceneLuminance, lightningLuminance));
}

export function advanceEyeAdaptation(previous, rawTarget, deltaMs, config, reduced = false) {
  const fallback = clampFireLight01(config.initialLuminance);
  const current = clampFireLight01(previous?.perceivedLuminance ?? fallback);
  const previousTarget = clampFireLight01(previous?.targetLuminance ?? current);
  const target = approachFireLight(
    previousTarget,
    clampFireLight01(rawTarget),
    config.targetResponsePerSecond,
    deltaMs
  );
  const response = target >= current
    ? config.lightResponsePerSecond
    : config.darkResponsePerSecond;
  const perceivedLuminance = approachFireLight(current, target, response, deltaMs);
  const denominator = Math.max(0.001, config.differenceForMaximumEffect);
  const effectScale = reduced ? config.reducedEffectScale : 1;
  const darkDifference = Math.max(0, perceivedLuminance - target) / denominator;
  const bloomDifference = Math.max(0, target - perceivedLuminance) / denominator;

  return {
    targetLuminance: target,
    perceivedLuminance,
    darkVeilAlpha: clampFireLight01(darkDifference)
      * config.maximumDarkVeilAlpha
      * effectScale,
    bloomAlpha: clampFireLight01(bloomDifference)
      * config.maximumBloomAlpha
      * effectScale,
  };
}

export function traceFireRayToSolid({
  worldModel,
  sourceX,
  sourceY,
  angleRadians,
  tileSize,
  maxLengthTiles,
  minimumLengthTiles,
  collisionPaddingTiles,
  sampleStepTiles,
}) {
  const safeTileSize = Math.max(1, Number(tileSize) || 1);
  const maximumDistance = Math.max(0, Number(maxLengthTiles) || 0) * safeTileSize;
  const minimumDistance = Math.max(0, Number(minimumLengthTiles) || 0) * safeTileSize;
  const padding = Math.max(0, Number(collisionPaddingTiles) || 0) * safeTileSize;
  const step = Math.max(0.05, Number(sampleStepTiles) || 0.05) * safeTileSize;
  if (!worldModel?.isSolid || maximumDistance <= 0) return maximumDistance;

  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);
  for (let distance = step; distance <= maximumDistance; distance += step) {
    const x = sourceX + cosine * distance;
    const y = sourceY + sine * distance;
    const tile = worldModel.worldToTile?.(x, y) || {
      tx: Math.floor(x / safeTileSize),
      ty: Math.floor(y / safeTileSize),
    };
    if (worldModel.inBounds?.(tile.tx, tile.ty) === false) {
      return Math.max(minimumDistance, distance - padding);
    }
    if (worldModel.isSolid(tile.tx, tile.ty)) {
      return Math.max(minimumDistance, distance - padding);
    }
  }
  return maximumDistance;
}
