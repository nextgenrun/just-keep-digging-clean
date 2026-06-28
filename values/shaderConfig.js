export const SHADER_CONFIG = Object.freeze({
  enabled: true,
  debug: false,

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

    darknessLight: Object.freeze({
      enabled: true,
      depth: 901,
      alpha: 0.26,
      torchWarmthStrength: 0.10,
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
