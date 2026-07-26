const profile = (
  kind,
  accent,
  secondary,
  direction,
  periodMs,
  particleCount,
  particleSpeed,
  particleDrift,
  parallaxPx,
  glowStrength,
  bandCount
) => Object.freeze({
  kind,
  accent,
  secondary,
  direction,
  periodMs,
  particleCount,
  particleSpeed,
  particleDrift,
  parallaxPx,
  glowStrength,
  bandCount,
});

export const WORLD_VISUAL_DEPTH_MOTION = Object.freeze({
  tween: Object.freeze({
    periodMs: 8800,
    minStrength: 0.72,
    maxStrength: 1,
    ease: "Sine.easeInOut",
  }),
  drawing: Object.freeze({
    blendMode: "ADD",
    maxSegments: 12,
    reducedMaxSegments: 6,
    maxParticlesPerSegment: 10,
    reducedParticlesPerSegment: 5,
    signatureAlpha: 0.23,
    particleAlpha: 0.3,
    secondaryAlphaScale: 0.72,
    lightningAlpha: 0.18,
    lineWidthPx: 2,
    strongLineWidthPx: 4,
    particleRadiusPx: 2.4,
    steamRadiusPx: 15,
    lineSteps: 12,
    laneLeftRatio: 0.08,
    laneRightRatio: 0.92,
    laneTopRatio: 0.1,
    laneBottomRatio: 0.9,
    centerXRatio: 0.5,
    centerYRatio: 0.5,
    waveAmplitudeRatio: 0.045,
    orbitRadiusXRatio: 0.23,
    orbitRadiusYRatio: 0.16,
    shaftWidthRatio: 0.075,
    streakLengthRatio: 0.075,
    particleTimeScale: 0.1,
    driftScale: 0.04,
    surgeTrailRatio: 0.24,
  }),
  profiles: Object.freeze({
    "surface-entry": profile(
      "organic", 0xf2ad52, 0x77c6cc, "up", 12400, 54, 0.055, 0.12, 8, 0.52, 4
    ),
    "level1-blue": profile(
      "rain", 0x47c7ff, 0x5174ff, "down", 9800, 62, 0.13, 0.035, 7, 0.6, 3
    ),
    "level1-amber": profile(
      "dust", 0xffc35a, 0xff7e2f, "down", 15200, 78, 0.075, 0.16, 6, 0.48, 5
    ),
    "level1-silver": profile(
      "shimmer", 0xd9f4ff, 0x78aeea, "down", 13100, 48, 0.09, 0.04, 5, 0.56, 6
    ),
    "level1-magma": profile(
      "heat", 0xff7138, 0xffb04a, "up", 8200, 68, 0.12, 0.12, 5, 0.7, 3
    ),
    "level2-slagworks": profile(
      "steam", 0xff8848, 0xd9d1c4, "up", 11200, 34, 0.07, 0.21, 7, 0.5, 4
    ),
    "level2-obsidian": profile(
      "ash", 0xbd73ff, 0x6e62a8, "down", 14600, 70, 0.085, 0.18, 5, 0.56, 4
    ),
    "level2-foundry": profile(
      "surge", 0x54dcff, 0xffab5c, "side", 9400, 40, 0.08, 0.14, 7, 0.7, 5
    ),
    "level2-blackglass": profile(
      "prism", 0xa77dff, 0x58c9ff, "orbit", 16800, 52, 0.045, 0.11, 4, 0.62, 3
    ),
    "level2-starfire": profile(
      "cosmic", 0xff62d4, 0x4ddcff, "down", 11800, 86, 0.075, 0.2, 6, 0.72, 5
    ),
  }),
});
