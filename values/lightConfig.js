export const LIGHT_CONFIG = Object.freeze({
  renderOptimization: Object.freeze({
    // Keep this below one 8-bit alpha step. The hidden render texture is
    // rebuilt immediately when darkness becomes visible again.
    inactiveDarknessAlphaThreshold: 0.001,
  }),
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
    fadeOutEndDepthTiles: 10,
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

  // Active torch reveal bonus layered over the depth-aware base radius.
  torchBonusRadiusTiles: 2.5,
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

  playerLightV2: Object.freeze({
    enabled: true,
    id: "v2",
    rollbackQuery: Object.freeze({
      name: "playerLight",
      legacyValue: "legacy",
    }),
    anchor: Object.freeze({
      bodyXRatio: 0.5,
      bodyYRatio: 0.5,
      fallbackYOffsetTiles: -0.46,
      facingInfluenceRatio: 0,
    }),
    reveal: Object.freeze({
      verticalScale: 0.90,
      positionFlutterScale: 0,
    }),
    environment: Object.freeze({
      minimumIntensity: 0.16,
      maximumIntensity: 1.08,
      minimumRadiusScale: 0.78,
      minimumFlickerScale: 0.42,
      lowSunIntensityLift: 0.18,
      surfaceDay: Object.freeze({
        intensity: 0.26,
        radiusScale: 0.84,
        warmth: 0.66,
        coolEdge: 0.12,
        flickerScale: 0.52,
      }),
      surfaceNight: Object.freeze({
        intensity: 0.90,
        radiusScale: 0.98,
        warmth: 1,
        coolEdge: 0.03,
        flickerScale: 0.88,
      }),
      underground: Object.freeze({
        intensity: 1,
        radiusScale: 1,
        warmth: 0.96,
        coolEdge: 0.055,
        flickerScale: 0.72,
      }),
      weather: Object.freeze({
        rainIntensityMultiplier: 1.06,
        rainRadiusMultiplier: 0.96,
        rainWarmthMultiplier: 0.86,
        rainCoolEdgeAdd: 0.12,
        rainFlickerMultiplier: 1.12,
        stormIntensityMultiplier: 1.10,
        stormRadiusMultiplier: 0.92,
        stormWarmthMultiplier: 0.76,
        stormCoolEdgeAdd: 0.22,
        stormFlickerMultiplier: 1.24,
        lightningIntensityMultiplier: 0.84,
      }),
    }),
    glow: Object.freeze({
      haloAlpha: 0.052,
      haloDiameterScale: 1.10,
      coreAlpha: 0.115,
      coreDiameterScale: 0.54,
      innerAlpha: 0.045,
      innerDiameterScale: 0.24,
      haloVerticalScale: 0.86,
      coreVerticalScale: 0.92,
      innerVerticalScale: 1,
      coolEdgeColor: 0x88b7c9,
      neutralCoreColor: 0xfff2d2,
      coolEdgeTintInfluence: 0.34,
    }),
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

  caveLights: Object.freeze({
    enabled: true,
    maxSourcesPerFrame: 16,
    cameraPaddingTiles: 4,
    verticalScale: 0.68,
    revealAlpha: 0.42,
    undergroundRevealBoost: 0.12,
    flickerSpeed: 0.0007,
    flickerAmount: 0.018,
    minActiveRatio: 0.08,
    playerRevealLeashTiles: 0.9,
    maxRevealRadiusTiles: 5.5,
    interiorTransitionResponsePerSecond: 4.2,
    defaultProfile: Object.freeze({
      minimumRatio: 0.32,
      maximumRatio: 0.78,
      pulseRadiansPerMs: 0.0008,
      pulsePower: 1,
      darknessBoost: 0.14,
    }),
    archetypeProfiles: Object.freeze({
      "echo-gallery": Object.freeze({
        minimumRatio: 0.22,
        maximumRatio: 0.84,
        pulseRadiansPerMs: 0.0010,
        pulsePower: 1.35,
        darknessBoost: 0.14,
      }),
      "rootbound-hollow": Object.freeze({
        minimumRatio: 0.30,
        maximumRatio: 0.68,
        pulseRadiansPerMs: 0.00055,
        pulsePower: 1.1,
        darknessBoost: 0.17,
      }),
      "prism-nursery": Object.freeze({
        minimumRatio: 0.42,
        maximumRatio: 0.92,
        pulseRadiansPerMs: 0.0013,
        pulsePower: 0.82,
        darknessBoost: 0.10,
      }),
      "storm-scar": Object.freeze({
        minimumRatio: 0.16,
        maximumRatio: 1,
        pulseRadiansPerMs: 0.0018,
        pulsePower: 1.6,
        darknessBoost: 0.18,
      }),
      "gilded-burrow": Object.freeze({
        minimumRatio: 0.18,
        maximumRatio: 0.72,
        pulseRadiansPerMs: 0.00045,
        pulsePower: 1.45,
        darknessBoost: 0.20,
      }),
      "ember-fault": Object.freeze({
        minimumRatio: 0.36,
        maximumRatio: 0.94,
        pulseRadiansPerMs: 0.0021,
        pulsePower: 0.9,
        darknessBoost: 0.16,
      }),
    }),
    hazardLight: Object.freeze({
      idleRatio: 0.08,
      telegraphRatio: 0.68,
      activeRatio: 1,
      staticRatio: 0.82,
    }),
  }),

  skyTileLights: Object.freeze({
    enabled: true,
    // Star Blocks are navigation beacons: every in-view source keeps its own
    // soft pool of light even when it sits outside the player's torch radius.
    persistThroughDarkness: true,
    maxSourcesPerFrame: 24,
    cameraPaddingTiles: 9,
    revealAlpha: 0.58,
    undergroundRevealBoost: 0.18,
    flickerSpeed: 0.0009,
    flickerAmount: 0.025,
    radiusTiles: 1.55,
    maxRadiusTiles: 1.72,
    verticalScale: 0.88,
    steadyAura: Object.freeze({
      enabled: true,
      renderDepth: 900.5,
      blendMode: "ADD",
      artSource: "ImageGen",
      artRevision: "star-identity-lights-v1-20260730",
      fallbackArtRevision: "star-block-steady-light-v1-20260727",
      artLightDiameterRatio: 0.78,
      radiusMultiplier: 1,
      opacity: 0.22,
      minimumAlpha: 0.004,
      maxImages: 24,
      fallbackRarityIndex: 0,
      rarityOpacityMultipliers: Object.freeze([
        0.86,
        0.90,
        0.94,
        0.96,
        0.94,
        1,
      ]),
      rarityAssets: Object.freeze([
        Object.freeze({
          key: "star-block-steady-light-cyan-v1",
          path: "sprites/environment/star-block-steady-light-v1/star-block-steady-light-cyan-v1.png?v=20260727",
        }),
        Object.freeze({
          key: "star-block-steady-light-lavender-v1",
          path: "sprites/environment/star-block-steady-light-v1/star-block-steady-light-lavender-v1.png?v=20260727",
        }),
        Object.freeze({
          key: "star-block-steady-light-gold-v1",
          path: "sprites/environment/star-block-steady-light-v1/star-block-steady-light-gold-v1.png?v=20260727",
        }),
        Object.freeze({
          key: "star-block-steady-light-orange-v1",
          path: "sprites/environment/star-block-steady-light-v1/star-block-steady-light-orange-v1.png?v=20260727",
        }),
        Object.freeze({
          key: "star-block-steady-light-turquoise-v1",
          path: "sprites/environment/star-block-steady-light-v1/star-block-steady-light-turquoise-v1.png?v=20260727",
        }),
        Object.freeze({
          key: "star-block-steady-light-violet-v1",
          path: "sprites/environment/star-block-steady-light-v1/star-block-steady-light-violet-v1.png?v=20260727",
        }),
      ]),
    }),
    beaconPulse: Object.freeze({
      enabled: true,
      // Each coordinate-seeded window only has a small chance to emit. Nearby
      // Star Blocks may stay quiet for several windows and never stack pulses.
      windowMs: 45000,
      chancePerWindow: 0.18,
      maxConcurrentPulses: 1,
      durationMs: 8800,
      edgePaddingMs: 5500,
      revealAlpha: 0.065,
      radiusBoostTiles: 8.6,
      fullRadiusProgress: 0.985,
      fadeInProgress: 0.12,
      travelFadePower: 0.72,
      visuals: Object.freeze({
        enabled: true,
        renderDepth: 901,
        blendMode: "ADD",
        artSource: "ImageGen",
        artRevision: "star-block-pulse-v1-20260727",
        artRingDiameterRatio: 0.78,
        ringOpacity: 0.14,
        fallbackRarityIndex: 0,
        rarityAssets: Object.freeze([
          Object.freeze({
            key: "star-block-pulse-cyan-v1",
            path: "sprites/environment/star-block-pulse-v1/star-block-pulse-cyan-v1.png?v=20260727",
          }),
          Object.freeze({
            key: "star-block-pulse-lavender-v1",
            path: "sprites/environment/star-block-pulse-v1/star-block-pulse-lavender-v1.png?v=20260727",
          }),
          Object.freeze({
            key: "star-block-pulse-gold-v1",
            path: "sprites/environment/star-block-pulse-v1/star-block-pulse-gold-v1.png?v=20260727",
          }),
          Object.freeze({
            key: "star-block-pulse-orange-v1",
            path: "sprites/environment/star-block-pulse-v1/star-block-pulse-orange-v1.png?v=20260727",
          }),
          Object.freeze({
            key: "star-block-pulse-turquoise-v1",
            path: "sprites/environment/star-block-pulse-v1/star-block-pulse-turquoise-v1.png?v=20260727",
          }),
          Object.freeze({
            key: "star-block-pulse-violet-v1",
            path: "sprites/environment/star-block-pulse-v1/star-block-pulse-violet-v1.png?v=20260727",
          }),
        ]),
        minimumAlpha: 0.003,
      }),
    }),
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

export function getStarBlockPulsePreloadAssets(config = LIGHT_CONFIG) {
  const assets = config.skyTileLights?.beaconPulse?.visuals?.rarityAssets;
  return Array.isArray(assets) ? assets : [];
}

export function getStarBlockSteadyLightPreloadAssets(config = LIGHT_CONFIG) {
  const assets = config.skyTileLights?.steadyAura?.rarityAssets;
  return Array.isArray(assets) ? assets : [];
}
