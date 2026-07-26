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

    darknessLight: Object.freeze({
      enabled: true,
      depth: 901,
      alpha: 0.26,
      torchWarmthStrength: 0.30,
      torchOpacityStrength: 0.18,
      torchCoreStrength: 0.65,
      torchBounceStrength: 0.18,
      torchFalloffPower: 1.65,
      torchCoreRadiusRatio: 0.32,
      torchHotRadiusRatio: 0.13,
      torchEdgeNoiseStrength: 0.012,
      torchBounceOffsetRatio: 0.18,
      torchBounceVerticalScale: 1.7,
      naturalRadiusScale: 0.72,
      caveGrainStrength: 0.08,
      vignetteStrength: 0.18,
      maxTorchScreenRadius: 0.46,
      maxNaturalTorchScreenRadius: 0.90,
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
