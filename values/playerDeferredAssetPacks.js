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
});

const PACK_BY_SHEET_PROPERTY = Object.freeze({
  duckSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.crouch,
  flySheet: PLAYER_DEFERRED_ASSET_PACK_IDS.flight,
  teleportInSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.teleport,
  digUpLookSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.upwardAim,
  thunderStrikeChargeSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.upwardAim,
  earthquakeReactSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.impact,
  deathSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.death,
  landingSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.locomotionPolish,
  wallPushSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.locomotionPolish,
  animationPolishTransitionSheet:
    PLAYER_DEFERRED_ASSET_PACK_IDS.locomotionPolish,
  movingSideDigJabSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.sideMining,
  movingSideDigCrossSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.sideMining,
  movingSideDigPhaseHandoffSheet: PLAYER_DEFERRED_ASSET_PACK_IDS.sideMining,
  animationPolishDiagonalDigSheet:
    PLAYER_DEFERRED_ASSET_PACK_IDS.diagonalMining,
});

export function resolvePlayerDeferredAssetPackId(sheetProperty) {
  return PACK_BY_SHEET_PROPERTY[sheetProperty] || null;
}
