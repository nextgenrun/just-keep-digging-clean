const freezeList = values => Object.freeze([...values]);

const moment = (id, overrides = {}) => {
  const resolved = {
    id,
    holdMs: 0,
    trailCount: 2,
    trailLagRatio: 0.035,
    trailAlpha: 0.14,
    softEchoRatios: [0.62],
    softEchoAlpha: 0.055,
    softEchoScale: 0.88,
    softEchoEndScale: 0.72,
    softEchoDurationMs: 190,
    softEchoDriftPx: 5,
    arrivalEchoCount: 1,
    arrivalScale: 1.65,
    orbitAmplitudePx: 0,
    orbitCycles: 0,
    ...overrides,
  };
  return Object.freeze({
    ...resolved,
    softEchoRatios: freezeList(resolved.softEchoRatios),
  });
};

export const LOOT_PICKUP_PRESENTATION = Object.freeze({
  assets: Object.freeze({
    soilMinis: Object.freeze({
      key: "ui-loot-soil-mini-atlas-v1",
      path: "sprites/UI/loot-pickups-v2/soil-mini-atlas-v1.png?v=20260831",
      columns: 2,
      frameSizePx: 96,
      frameCount: 4,
      framePrefix: "ui-loot-soil-mini-",
      frameByResource: Object.freeze({
        dirt: 0,
        darkDirtNormal: 1,
        darkDirtStrong: 2,
        lavaDirt: 3,
      }),
    }),
  }),
  limits: Object.freeze({
    maxActiveFlights: 24,
    routinePickupCap: 3,
    bonusPickupCap: 4,
  }),
  spawn: Object.freeze({
    spreadXPx: 22,
    spreadYPx: 12,
    indexSpacingPx: 8,
    riseMinPx: 9,
    riseRangePx: 5,
    startScale: 0.42,
    endScale: 1.06,
    durationMs: 118,
    ease: "Back.out",
  }),
  flight: Object.freeze({
    resourceDisplaySizePx: 29,
    specialDisplaySizePx: 32,
    starDisplaySizePx: 34,
    starRaritySizeStepPx: 1,
    travelFadeStartRatio: 0.88,
    startScale: 1.06,
    endScale: 0.66,
    breathScale: 0.035,
    breathCycles: 2.25,
    sampleDelta: 0.012,
    headingInfluence: 0.12,
    bankRadians: 0.11,
    bankCycles: 1.8,
    targetFollowStartRatio: 0.62,
    trailMinimumSizePx: 12,
    trailScaleStep: 0.16,
    arrivalAlpha: 0.3,
    arrivalDurationMs: 210,
    arrivalStaggerMs: 28,
    arrivalEase: "Sine.easeOut",
    softEchoEase: "Sine.easeOut",
    starLightAlpha: 0.46,
    starLightScale: 1.16,
  }),
  moments: Object.freeze({
    routine: moment("routine"),
    special: moment("special-tile", {
      holdMs: 72,
      trailCount: 3,
      trailLagRatio: 0.04,
      trailAlpha: 0.18,
      softEchoRatios: [0.38, 0.7],
      softEchoAlpha: 0.075,
      arrivalEchoCount: 2,
      arrivalScale: 1.82,
      orbitAmplitudePx: 3,
      orbitCycles: 0.75,
    }),
    star: Object.freeze([
      moment("star-tuck", {
        holdMs: 65, trailCount: 2, trailAlpha: 0.16,
        softEchoRatios: [0.58], softEchoAlpha: 0.065,
        arrivalEchoCount: 2, orbitAmplitudePx: 2, orbitCycles: 0.55,
      }),
      moment("star-lift", {
        holdMs: 90, trailCount: 3, trailAlpha: 0.18,
        softEchoRatios: [0.46, 0.73], softEchoAlpha: 0.075,
        arrivalEchoCount: 2, orbitAmplitudePx: 4, orbitCycles: 0.7,
      }),
      moment("star-half-orbit", {
        holdMs: 125, trailCount: 3, trailAlpha: 0.2,
        softEchoRatios: [0.36, 0.66], softEchoAlpha: 0.085,
        arrivalEchoCount: 2, arrivalScale: 1.9,
        orbitAmplitudePx: 7, orbitCycles: 1,
      }),
      moment("star-switchback", {
        holdMs: 155, trailCount: 4, trailAlpha: 0.21,
        softEchoRatios: [0.3, 0.54, 0.76], softEchoAlpha: 0.095,
        arrivalEchoCount: 3, arrivalScale: 2,
        orbitAmplitudePx: 9, orbitCycles: 1.25,
      }),
      moment("star-orbit-hold", {
        holdMs: 205, trailCount: 4, trailAlpha: 0.23,
        softEchoRatios: [0.26, 0.5, 0.73], softEchoAlpha: 0.105,
        arrivalEchoCount: 3, arrivalScale: 2.12,
        orbitAmplitudePx: 12, orbitCycles: 1.55,
      }),
      moment("star-crown-spiral", {
        holdMs: 250, trailCount: 5, trailAlpha: 0.25,
        softEchoRatios: [0.22, 0.45, 0.68], softEchoAlpha: 0.11,
        arrivalEchoCount: 4, arrivalScale: 2.24,
        orbitAmplitudePx: 15, orbitCycles: 1.9,
      }),
    ]),
  }),
  authoredResourceFamilies: freezeList([
    "dirt", "stone", "copper", "darkDirtNormal", "darkDirtStrong",
    "bronze", "steel", "iron", "silver", "gold", "lavaDirt",
    "obsidian", "emberOre", "magmaCrystal",
  ]),
  reducedMotion: Object.freeze({
    mediaQuery: "(prefers-reduced-motion: reduce)",
    durationMultiplier: 0.74,
    rotationMultiplier: 0.16,
    trailCount: 0,
    holdMultiplier: 0,
    arrivalScale: 1.12,
  }),
});

export function resolveLootPickupMoment({
  isStarResource = false,
  skyTileRarity = null,
  identityNewlyDiscovered = false,
  special = false,
} = {}, config = LOOT_PICKUP_PRESENTATION) {
  if (isStarResource) {
    const index = Math.max(
      0,
      Math.min(
        config.moments.star.length - 1,
        Math.floor(Number(skyTileRarity) || 0) + (identityNewlyDiscovered ? 1 : 0),
      ),
    );
    return config.moments.star[index];
  }
  if (special) return config.moments.special;
  return config.moments.routine;
}
