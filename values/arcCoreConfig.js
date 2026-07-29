export const LEVEL_TWO_MERCHANT_ID = "magmaMoneyMonster";
export const ARC_CORE_UPGRADE_ID = "arcCoreVehicle";
export const OMEGA_ARC_CORE_UPGRADE_ID = "omegaArcCoreVehicle";

export const ARC_CORE_CONFIG = Object.freeze({
  merchant: Object.freeze({
    id: LEVEL_TWO_MERCHANT_ID,
    tileX: 141,
    tileY: 64,
    displayName: "Molten Money Monster",
  }),
  parking: Object.freeze({
    tileX: 148,
    tileY: 64,
  }),
  interactRangeTiles: 2,
  displaySizeTiles: 0.92,
  upgradeId: ARC_CORE_UPGRADE_ID,
  dig: Object.freeze({
    depthTiles: 2,
    widthTiles: 2,
    beamColor: 0x63f5ff,
    targetColor: 0xffb347,
  }),
  omega: Object.freeze({
    displayName: "Omega Arc Core",
    displaySizeTiles: 3.68,
    upgradeId: OMEGA_ARC_CORE_UPGRADE_ID,
    dig: Object.freeze({
      depthTiles: 8,
      widthTiles: 8,
      beamColor: 0xd96cff,
      targetColor: 0xffd166,
    }),
  }),
});
