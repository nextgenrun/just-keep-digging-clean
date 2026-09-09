const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export const CAVE_VISUAL_COMPOSITION = Object.freeze({
  enabled: true,
  queryParam: "caveComposition",
  disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  entrance: Object.freeze({ startDepthTiles: 0, fullDepthTiles: 12 }),
  surfaceLightRetention: 0.02,
  terrainNeutralTint: 0xffffff,
  backdrop: Object.freeze({
    brightness: 0.86,
    tint: 0xe4edff,
    enhancerTintMix: 0.88,
  }),
});

export function resolveCaveCompositionEnabled(
  search = globalThis.location?.search || "",
  config = CAVE_VISUAL_COMPOSITION,
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  return config.enabled && !config.disabledValues.includes(value);
}

export function resolveCaveCompositionWeight(depthTiles, config = CAVE_VISUAL_COMPOSITION) {
  const { startDepthTiles, fullDepthTiles } = config.entrance;
  const t = clamp01((depthTiles - startDepthTiles) / (fullDepthTiles - startDepthTiles));
  return t * t * (3 - 2 * t);
}

/** Multiplicative grading preserves the existing raster alpha and biome palette. */
export function applyCaveBackdropTone(tint, weight, config = CAVE_VISUAL_COMPOSITION) {
  const amount = clamp01(weight);
  if (!amount) return tint;
  const channel = shift => {
    const original = (tint >> shift) & 255;
    const scale = config.backdrop.brightness * ((config.backdrop.tint >> shift) & 255) / 255;
    return Math.round(original * (1 - amount + amount * scale));
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
