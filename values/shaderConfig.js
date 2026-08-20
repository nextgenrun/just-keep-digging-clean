export const SHADER_CONFIG = Object.freeze({
  enabled: true,
  debug: false,

  performance: Object.freeze({
    // Below this alpha the layer is already visually absent. Hide both the
    // sampled image and its render-to-texture shader so Phaser skips the
    // otherwise full-screen WebGL pass.
    inactiveLayerAlphaThreshold: 0.001,
  }),

  layers: Object.freeze({
    weatherAtmosphere: Object.freeze({
      enabled: true,
      depth: 60,
      alpha: 0.32,
      hazeStrength: 0.22,
      rainStreakStrength: 0.18,
      caveGrainStrength: 0.16,
      windScale: 0.0032,
    }),

    materialResponse: Object.freeze({
      enabled: false,
      depth: 898,
      alpha: 0.36,
      wetSurfaceStrength: 0.20,
      warmPoolStrength: 0.15,
      floorBounceStrength: 0.11,
      caveReliefStrength: 0.065,
      highlightCeiling: 0.085,
      groundBandStart: 0.20,
      groundBandEnd: 0.64,
      detailFrequency: 68,
      queryParam: "materialLighting",
      enabledQueryValue: "1",
      disabledQueryValue: "0",
    }),

    darknessLight: Object.freeze({
      enabled: true,
      queryParam: "darknessLight",
      disabledQueryValue: "0",
      depth: 901,
      alpha: 0.26,
      torchWarmthStrength: 0.25,
      torchCoreRadiusRatio: 0.24,
      torchPenumbraWidth: 0.16,
      torchFalloffPower: 1.85,
      torchMaximumAlpha: 0.19,
      caveGrainStrength: 0.08,
      vignetteStrength: 0.18,
      maxTorchScreenRadius: 0.46,
    }),

    lightningFlash: Object.freeze({
      enabled: true,
      depth: 996,
      alpha: 0.70,
      flashStrength: 0.34,
      bloomStrength: 0.18,
      stormNoiseStrength: 0.10,
    }),
  }),

  fallback: Object.freeze({
    disableOnCanvas: true,
    disableOnShaderError: true,
  }),
});

export function isMaterialResponseEnabled(
  search = globalThis.location?.search ?? "",
  config = SHADER_CONFIG.layers.materialResponse,
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value === config.disabledQueryValue) return false;
  return config.enabled !== false || value === config.enabledQueryValue;
}

export function isDarknessLightEnabled(
  search = globalThis.location?.search ?? "",
  config = SHADER_CONFIG.layers.darknessLight,
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value === config.disabledQueryValue) return false;
  return config.enabled !== false;
}
