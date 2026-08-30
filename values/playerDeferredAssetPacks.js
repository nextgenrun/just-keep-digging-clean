export const PLAYER_DEFERRED_ASSET_PACK_IDS = Object.freeze({
  crouch: "crouch",
  flight: "flight",
  teleport: "teleport",
  upwardAim: "upward-aim",
  impact: "impact",
  death: "death",
  locomotionPolish: "locomotion-polish",
  sideMining: "side-mining",
  diagonalMining: "diagonal-mining",
  ledgeClimb: "ledge-climb",
  movingComplexMining: "moving-complex-mining",
  complexSideMining: "complex-side-mining",
  complexUpMining: "complex-up-mining",
});

const COMPLEX_MINING_RELEASE_DELAY_MS = 60_000;

export const PLAYER_DEFERRED_ASSET_PACK_RELEASE_DELAYS_MS = Object.freeze({
  [PLAYER_DEFERRED_ASSET_PACK_IDS.movingComplexMining]:
    COMPLEX_MINING_RELEASE_DELAY_MS,
  [PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining]:
    COMPLEX_MINING_RELEASE_DELAY_MS,
  [PLAYER_DEFERRED_ASSET_PACK_IDS.complexUpMining]:
    COMPLEX_MINING_RELEASE_DELAY_MS,
});

const PACK_BY_SHEET_PROPERTY = Object.freeze({
  duckSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.crouch,
  crouchEnterSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.crouch,
  crouchExitSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.crouch,
  heldTorchCrouchSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.crouch,
  heldTorchCrouchEnterSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.crouch,
  heldTorchCrouchExitSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.crouch,
  flySheet: PLAYER_DEFERRED_ASSET_PACK_IDS.flight,
  legacyFlightTransitionSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.flight,
  heldTorchFlightSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.flight,
  teleportInSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.teleport,
  digUpLookSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.upwardAim,
  thunderStrikeChargeSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.upwardAim,
  earthquakeReactSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.impact,
  deathSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.death,
  landingSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.locomotionPolish,
  heldTorchHardLandingSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.locomotionPolish,
  wallPushSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.locomotionPolish,
  animationPolishTransitionSheet:
    PLAYER_DEFERRED_ASSET_PACK_IDS.locomotionPolish,
  movingSideDigJabSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.sideMining,
  movingSideDigCrossSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.sideMining,
  movingSideDigPhaseHandoffSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.sideMining,
  animationPolishDiagonalDigSheet:
    PLAYER_DEFERRED_ASSET_PACK_IDS.diagonalMining,
  ledgeClimbSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.ledgeClimb,
  movingComplexDigSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.movingComplexMining,
  complexDigCrossSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigJabSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigRoundhouseSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigJabElbowSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigLowKickSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigHighKickSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigSpinningBackKickSheet:
    PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigElbowUppercutSheet:
    PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigSingleElbowSheet:
    PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigHookSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining,
  complexDigUppercutSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.complexUpMining,
});

export function resolvePlayerDeferredAssetPackId(sheetProperty) {
  return PACK_BY_SHEET_PROPERTY[sheetProperty] || null;
}

export function resolvePlayerDeferredAssetPackReleaseDelayMs(
  packId,
  fallbackMs,
) {
  return PLAYER_DEFERRED_ASSET_PACK_RELEASE_DELAYS_MS[packId]
    ?? fallbackMs;
}
