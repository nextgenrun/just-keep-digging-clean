export const LIGHT_CONFIG = Object.freeze({
  depthStartTiles: 3,
  depthMaxTiles: 2000,
  maxDepthDarkness: 1.0,
  maxNightDarkness: 0.35,
  maxCombinedDarkness: 1.0,
  hardBlackDepthTiles: 3,

  // Tunneling vision: outside this radius is black once underground.
  baseVisibilityRadiusTiles: 7.5,     // Fallback radius at depthStartTiles (no torch)
  minVisibilityRadiusTiles: 0.625,      // Abyss radius at 1000m+ (no torch), +25%
  visibilityRadiusStops: Object.freeze([
    Object.freeze([0, 12.0]),
    Object.freeze([3, 7.5]),
    Object.freeze([25, 6.2]),
    Object.freeze([100, 4.6]),
    Object.freeze([250, 2.7]),
    Object.freeze([400, 1.65]),
    Object.freeze([700, 0.9]),
    Object.freeze([1000, 0.5]),
  ]),

  surfaceSunlight: Object.freeze({
    fullStrengthDepthTiles: 0,
    fadeOutEndDepthTiles: 3,
    maxUndergroundInfluence: 0.03,
    daylightDarknessAlpha: 0.00,
    nightDarknessAlpha: 0.18,
    rainDarknessAlpha: 0.08,
    stormDarknessAlpha: 0.16,
    torchMinGlow: 0.16,
    torchNightGlowBoost: 0.46,
    lightningRevealStrength: 0.34,
  }),

  undergroundDarkness: Object.freeze({
    entryDarknessAlpha: 1.0,
    maxDarknessAlpha: 1.0,
    caveWeatherAlpha: 0.04,
    torchOffDarknessBoost: 0,
    minimumReadableAlpha: 1.0,
    lightningRevealStrength: 0.015,
    stormPulseStrength: 0.18,
  }),

  // Torch extends visibility without clearing the entire screen.
  torchBonusRadiusTiles: 2.5,         // Extra radius when torch is active
  torchDrainGpPerSecond: 8,
  torchDrainDepthStartTiles: 1000,     // Depth where torch drain starts ramping up
  torchDrainDepthRampEndTiles: 2000,   // Depth where torch drain reaches max ramp scaling
  torchDrainDepthStartMultiplier: 1.875, // 8 GP/s * 1.875 = 15 GP/s at 1000m
  torchDrainDepthMaxMultiplier: 3.75,   // 8 GP/s * 3.75 = 30 GP/s at 2000m+
  torchDarknessDepthStartTiles: 1000,  // Start increasing cave darkness at this depth
  torchDarknessDepthRampEndTiles: 2000, // Depth where darkness reaches max multiplier
  torchDarknessDepthMaxMultiplier: 2.5, // 2-3x target darkness by 2000m
  torchCoreColor: 0xffd28a,
  torchCoreGlowAlpha: 0.12,
  torchCoreDiameterScale: 0.58,
  torchHaloColor: 0xff8a35,
  torchHaloGlowAlpha: 0.045,
  torchHaloDiameterScale: 1.16,
  torchFlameColor: 0xff6a1f,
  torchFlameGlowAlpha: 0.035,
  torchFlameDiameterScale: 0.30,
  radiusFlickerAmount: 0.006,
  glowFlickerAmount: 0.045,
  torchFlickerSpeed: 0.0024,
  transitionResponsePerSecond: 5,
  facingOffsetTiles: 0.22,
  glowVerticalOffsetTiles: -0.2,

  torchFire: Object.freeze({
    radiusFlickerAmount: 0.014,
    haloFlickerAmount: 0.070,
    coreFlickerAmount: 0.090,
    flameFlickerAmount: 0.140,
    windFlickerAmount: 0.050,
    stormFlickerAmount: 0.075,
    positionFlutterTiles: 0.016,
    verticalFlutterTiles: 0.012,
    heatColorLow: 0xff8a35,
    heatColorHigh: 0xffd28a,
    coolSmokeColor: 0xff6a1f,
  }),

  crystalLights: Object.freeze({
    enabled: true,
    maxSourcesPerFrame: 12,
    cameraPaddingTiles: 4,
    verticalScale: 0.82,
    revealAlpha: 0.12,
    undergroundRevealBoost: 0.06,
    flickerSpeed: 0.0016,
    flickerAmount: 0.045,
    minActiveRatio: 0.08,
    playerRevealLeashTiles: 1.2,
    maxRevealRadiusTiles: 2.25,
  }),

  skyTileLights: Object.freeze({
    enabled: true,
    maxSourcesPerFrame: 18,
    cameraPaddingTiles: 5,
    revealAlpha: 0.08,
    undergroundRevealBoost: 0.10,
    flickerSpeed: 0.0014,
    flickerAmount: 0.05,
    playerRevealLeashTiles: 2.4,
    radiusTiles: 1.2,
    maxRadiusTiles: 1.6,
  }),

  geodeTileLights: Object.freeze({
    enabled: true,
    maxSourcesPerFrame: 18,
    cameraPaddingTiles: 6,
    revealAlpha: 0.11,
    undergroundRevealBoost: 0.16,
    flickerSpeed: 0.0012,
    flickerAmount: 0.07,
    playerRevealLeashTiles: 2.8,
    radiusTiles: 1.4,
    maxRadiusTiles: 2.1,
  }),

  // Night penalty — darkness shrinks vision further
  nightVisibilityPenalty: 0.4,        // Radius reduced by up to 40% at full night

  // Storm penalty — storms shrink vision further on top of night
  stormVisibilityPenalty: 0.5,        // Radius reduced by up to 50% during peak storm

  darknessColor: 0x000000,
  darknessRenderDepth: 900,
  torchGlowRenderDepth: 899,
  emissiveRenderDepth: 898,
  biomeRenderDepth: 59,
  lightningRevealStrength: 0.18,

  gradientTextureSize: 1024,
  visibilityMaskTextureKey: "__player-torch-fire-visibility-mask-v3",
  warmGlowTextureKey: "__player-torch-warm-glow-v3",
  maskGradientStops: Object.freeze([
    Object.freeze([0.00, 1.00]),
    Object.freeze([0.36, 1.00]),
    Object.freeze([0.60, 0.78]),
    Object.freeze([0.82, 0.34]),
    Object.freeze([0.95, 0.06]),
    Object.freeze([1.00, 0.00]),
  ]),
  glowGradientStops: Object.freeze([
    Object.freeze([0.00, 1.00]),
    Object.freeze([0.14, 0.82]),
    Object.freeze([0.45, 0.28]),
    Object.freeze([0.74, 0.07]),
    Object.freeze([1.00, 0.00]),
  ]),
});
