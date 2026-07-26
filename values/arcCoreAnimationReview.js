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
  }),
  stage: Object.freeze({
    worldCols: 16,
    worldRows: 10,
    normalFloorRow: 7,
    normalBedrockRow: 8,
    defaultCameraZoom: 1,
    omegaCameraZoom: 0.72,
    omegaPlayerTileX: 6,
    omegaPlayerTileY: 2,
    omegaWallTileX: 7,
    omegaWallTileY: 2,
  }),
  small: Object.freeze({
    id: "arcCoreSmall",
    label: "Small Arc",
    displayName: "Arc Core — Gyro Needle",
    sourceProfile: "base",
    silhouette: "three-fin gyroscope",
    idleSignature: "quick counter-precession",
    digSignature: "focused two-lane needle bore",
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
    artwork: Object.freeze({
      source: "imagegen",
      assetKey: "arc-core-small-imagegen-v1",
      sheetPath: "visual-approval-previews/arc-core-imagegen-animation-v1/2026-07-26-small-arc-runtime-sheet-v1.png",
      frameWidth: 512,
      frameHeight: 512,
      idleFrames: Object.freeze([0, 1, 2, 3]),
      digFrames: Object.freeze([4, 5, 6, 7]),
      displaySizePx: 152,
      originX: 0.485,
      originY: 0.5,
      idleFrameMs: 235,
      cloudDurationMs: 1100,
      cloudRadiusPx: 96,
      cloudPuffs: 18,
    }),
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
    artwork: Object.freeze({
      source: "imagegen",
      assetKey: "arc-core-omega-imagegen-v1",
      sheetPath: "visual-approval-previews/arc-core-imagegen-animation-v1/2026-07-26-omega-arc-runtime-sheet-v1.png",
      frameWidth: 512,
      frameHeight: 512,
      idleFrames: Object.freeze([0, 1, 2, 3]),
      digFrames: Object.freeze([4, 5, 6, 7]),
      displaySizePx: 450,
      originX: 0.5,
      originY: 0.5,
      idleFrameMs: 1050,
      cloudDurationMs: 1750,
      cloudRadiusPx: 248,
      cloudPuffs: 30,
    }),
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
