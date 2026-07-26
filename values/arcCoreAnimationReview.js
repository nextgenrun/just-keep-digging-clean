/**
 * Review-only motion language for the two Arc Core tiers.
 *
 * These values drive the tanktest-v1 animation mockup only. They deliberately
 * do not register either design with the production vehicle renderer.
 */
export const ARC_CORE_ANIMATION_REVIEW = Object.freeze({
  reviewOnly: true,
  productionChanged: false,
  controls: Object.freeze({
    digKey: "F",
    cloudKey: "B",
  }),
  stage: Object.freeze({
    worldCols: 19,
    worldRows: 10,
    normalFloorRow: 7,
    normalBedrockRow: 8,
    defaultCameraZoom: 1,
    omegaCameraZoom: 0.72,
    omegaPlayerTileX: 8,
    omegaPlayerTileY: 4,
    omegaWallTileX: 11,
    omegaWallTileY: 1,
  }),
  small: Object.freeze({
    id: "arcCoreSmall",
    label: "Small Arc",
    displayName: "Arc Core — Round Gyro",
    sourceProfile: "base",
    silhouette: "compact round gyro core",
    idleSignature: "fast internal counter-precession",
    digSignature: "twin-channel shutter bore",
    digDurationSeconds: 0.74,
    breakProgress: 0.64,
    idlePeriodMs: 1320,
    bodyRadiusPx: 27,
    haloRadiusPx: 37,
    coreColor: 0x9ff6ff,
    shellColor: 0x0b2430,
    accentColor: 0xf9d66d,
    energyColor: 0x63f5ff,
    breakParticleBudget: 72,
    cloudDurationMs: 1250,
    cloudRadiusPx: 112,
    cloudSparkCount: 18,
  }),
  omega: Object.freeze({
    id: "arcCoreOmega",
    label: "Omega Arc",
    displayName: "Omega Arc Core — Cathedral Array",
    sourceProfile: "omega",
    silhouette: "four-bastion reactor gate",
    idleSignature: "slow tidal suspension",
    digSignature: "eight-lane compression lattice",
    digDurationSeconds: 1.68,
    breakProgress: 0.74,
    idlePeriodMs: 4480,
    bodyRadiusPx: 154,
    frameRadiusPx: 124,
    coreRadiusPx: 38,
    coreColor: 0xffd8ff,
    shellColor: 0x171126,
    accentColor: 0xffd166,
    energyColor: 0xd96cff,
    breakParticleBudget: 224,
    cloudDurationMs: 2100,
    cloudRadiusPx: 260,
    cloudSparkCount: 32,
  }),
});

export function getArcCoreAnimationReviewMode(modeId) {
  if (modeId === ARC_CORE_ANIMATION_REVIEW.small.id) return ARC_CORE_ANIMATION_REVIEW.small;
  if (modeId === ARC_CORE_ANIMATION_REVIEW.omega.id) return ARC_CORE_ANIMATION_REVIEW.omega;
  return null;
}

export function isArcCoreAnimationReviewMode(modeId) {
  return getArcCoreAnimationReviewMode(modeId) !== null;
}

export function resolveArcCoreAnimationReviewPhase(modeId, progress) {
  if (modeId === ARC_CORE_ANIMATION_REVIEW.small.id) {
    if (progress < 0.12) return "gimbal brace";
    if (progress < 0.28) return "needle charge";
    if (progress < 0.5) return "two-lane contact";
    if (progress < ARC_CORE_ANIMATION_REVIEW.small.breakProgress) return "focused fracture";
    if (progress < 0.8) return "snap break";
    return "gyro recovery";
  }

  if (modeId === ARC_CORE_ANIMATION_REVIEW.omega.id) {
    if (progress < 0.18) return "bastion deploy";
    if (progress < 0.36) return "reactor collapse";
    if (progress < 0.58) return "eight-lane ignition";
    if (progress < ARC_CORE_ANIMATION_REVIEW.omega.breakProgress) return "compression sweep";
    if (progress < 0.86) return "grid rupture";
    return "mass recovery";
  }

  return null;
}
