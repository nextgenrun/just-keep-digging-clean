/**
 * Approved production motion language for the two Arc Core tiers.
 *
 * The main game and tanktest-v1 consume the same mode timing and transition
 * contract so review and gameplay cannot drift.
 */
export const ARC_CORE_VISUAL_CONFIG = Object.freeze({
  approved: true,
  reviewOnly: false,
  productionChanged: true,
  approvalStatus: "Production approved: same Piskel pack as gameplay",
  rollbackQueryParam: "arcCoreVisualsV3",
  legacyRollbackValue: "0",
  health: Object.freeze({
    packageId: "arc-core-v3",
    pipeline: "piskel-roundtrip",
    productionRoleCount: 10,
  }),
  controls: Object.freeze({
    digKey: "F",
    cloudKey: "B",
    smallArcKey: "1",
    omegaArcKey: "2",
  }),
  reviewStage: Object.freeze({
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
    transition: Object.freeze({
      envelopeExponent: 0.62,
      playerFadeOutStart: 0.08,
      playerFadeOutEnd: 0.46,
      arcFadeInStart: 0.32,
      arcFadeInEnd: 0.7,
      playerReturnStart: 0.34,
      playerReturnEnd: 0.78,
      playerScaleLoss: 0.2,
      arcInitialScale: 0.72,
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
    cloudDurationMs: 2100,
    cloudRadiusPx: 260,
    cloudSparkCount: 32,
    transition: Object.freeze({
      envelopeExponent: 0.54,
      playerFadeOutStart: 0.06,
      playerFadeOutEnd: 0.5,
      arcFadeInStart: 0.28,
      arcFadeInEnd: 0.74,
      playerReturnStart: 0.38,
      playerReturnEnd: 0.82,
      playerScaleLoss: 0.28,
      arcInitialScale: 0.64,
    }),
  }),
});

export function getArcCoreVisualMode(modeId) {
  if (modeId === ARC_CORE_VISUAL_CONFIG.small.id) return ARC_CORE_VISUAL_CONFIG.small;
  if (modeId === ARC_CORE_VISUAL_CONFIG.omega.id) return ARC_CORE_VISUAL_CONFIG.omega;
  return null;
}

export function isArcCoreVisualMode(modeId) {
  return getArcCoreVisualMode(modeId) !== null;
}

export function resolveArcCoreVisualPhase(modeId, progress) {
  if (modeId === ARC_CORE_VISUAL_CONFIG.small.id) {
    if (progress < 0.08) return "gimbal wake";
    if (progress < 0.18) return "shutter brace";
    if (progress < 0.32) return "twin ignition";
    if (progress < 0.48) return "bore lock";
    if (progress < ARC_CORE_VISUAL_CONFIG.small.breakProgress) return "fracture seal";
    if (progress < 0.76) return "snap rupture";
    if (progress < 0.9) return "gyro recoil";
    return "ring settle";
  }

  if (modeId === ARC_CORE_VISUAL_CONFIG.omega.id) {
    if (progress < 0.1) return "bastion wake";
    if (progress < 0.22) return "cathedral brace";
    if (progress < 0.36) return "reactor inversion";
    if (progress < 0.52) return "lattice ignition";
    if (progress < ARC_CORE_VISUAL_CONFIG.omega.breakProgress) return "compression advance";
    if (progress < 0.84) return "grid rupture";
    if (progress < 0.94) return "mass recoil";
    return "tidal settle";
  }

  return null;
}

export function resolveArcCoreVisualsEnabled(
  search = globalThis.location?.search || "",
) {
  const params = new URLSearchParams(search);
  return params.get(ARC_CORE_VISUAL_CONFIG.rollbackQueryParam)
    !== ARC_CORE_VISUAL_CONFIG.legacyRollbackValue;
}
