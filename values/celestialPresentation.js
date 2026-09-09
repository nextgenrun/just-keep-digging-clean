/** Art-only tuning for Celestial powers and their quieter Apex echoes. */
export const CELESTIAL_PRESENTATION = Object.freeze({
  enterMs: 160, exitMs: 160, passiveAlpha: 0.68,
  coreAlpha: 1, haloAlpha: 0.07, haloScale: 1.08, haloAspect: 1,
  haloRotationRatio: -0.46, detailDepthOffset: -2, coreDepthOffset: -1,
  fullTurn: Math.PI * 2, degreesPerRadian: 180 / Math.PI,
  maxDeltaMs: 50, millisecondsPerSecond: 1000,
  effectColours: Object.freeze([
    Object.freeze({ id: "azure", tint: 0x82deff }),
    Object.freeze({ id: "violet", tint: 0xd2a2ff }),
    Object.freeze({ id: "ember", tint: 0xffb06e }),
    Object.freeze({ id: "mint", tint: 0x83ffd1 }),
    Object.freeze({ id: "rose", tint: 0xff96cb }),
  ]),
  contact: Object.freeze({
    maxLive: 24, depthOffset: 4, authoredNormalOffsetDeg: 90,
    flashFrame: "silver-p01",
    flashSizeTiles: 0.38, flashAlpha: 0.7, flashFadeMs: 90,
    chipCount: 3, chipFrames: Object.freeze(["silver-s01", "silver-s02", "silver-s03"]),
    chipSizeTiles: 0.07, chipSpreadTiles: 0.13, chipTravelTiles: 0.28,
    chipAlpha: 0.9, chipMs: 300, chipEndScale: 0.3,
  }),
  wayward: Object.freeze({
    palettes: Object.freeze([
      Object.freeze({ id: "azure", hueDeg: 0 }),
      Object.freeze({ id: "violet", hueDeg: 65 }),
      Object.freeze({ id: "ember", hueDeg: 165 }),
    ]),
    echoScale: 0.88, echoAlpha: 0.18,
    sizeScale: 1.16, rotationDegPerSecond: 82,
    tints: Object.freeze([0xa5f5ef, 0xffffff, 0xc5a4ff, 0xffd9a8]),
    haloTints: Object.freeze([0xbb9cff, 0x92eee2, 0xd1abff, 0xffd5a1]),
    trailSpacingPx: 32, trailLifeMs: 240,
    trailMaxSamples: 3, trailMaxLive: 18,
  }),
  hollow: Object.freeze({
    sizeScale: 1.08, rotationDegPerSecond: 15, coreHueDeg: 32, haloHueDeg: -55,
    tints: Object.freeze([0xbcefe4, 0xf0c3ff, 0xba9bea, 0xffdab6]),
    haloTints: Object.freeze([0x91eacb, 0xdbb3ff, 0xab8bdf, 0xf4d8ab]),
    passiveCoreRadius: 0.19,
  }),
  pulse: Object.freeze({
    minimumIntervalMs: 280, passiveIntervalMs: 420, maxLive: 3,
    maxRadiusInSizes: 2.6, diameterScale: 2.5,
    alpha: 0.14, passiveAlpha: 0.08, attackMs: 60, lifeMs: 260,
    expandStart: 0.44, expandEnd: 1.12, pullStart: 1, pullEnd: 0.24,
    rotationDeg: 28, impactRadiusInSizes: 0.72,
  }),
  lance: Object.freeze({
    passiveAlpha: 0.65, trailSpacingPx: 28, trailMaxLive: 24,
    trailAlpha: 0.18, trailLifeMs: 240,
  }),
});
