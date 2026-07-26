export const LEVEL_TWO_MERCHANT_ID = "magmaMoneyMonster";
export const ARC_CORE_UPGRADE_ID = "arcCoreVehicle";
export const OMEGA_ARC_CORE_UPGRADE_ID = "omegaArcCoreVehicle";

export const ARC_CORE_PURCHASE_COST = Object.freeze({
  silver: 120,
  gold: 60,
});

export const OMEGA_ARC_CORE_PURCHASE_COST = Object.freeze({
  silver: 240,
  gold: 240,
  obsidian: 40,
  emberOre: 15,
  magmaCrystal: 3,
});

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
  visual: Object.freeze({
    legacyDepth: 18,
    promptDepth: 22,
    promptGapTiles: 0.18,
    unlockedTint: 0xffffff,
    lockedTint: 0x59636d,
    lockedBodyAlpha: 0.78,
    unlockedBodyAlpha: 1,
    lockedEnergyAlpha: 0.08,
    unlockedEnergyAlpha: 1,
    onlineStatusDurationMs: 1800,
    lockedStatusDurationMs: 2200,
    smallOnlineColor: "#63F5FF",
    omegaOnlineColor: "#D96CFF",
    parkedColor: "#D6E2E8",
    lockedColor: "#FFB347",
    prompt: Object.freeze({
      fontFamily: "Consolas, monospace",
      fontSizePx: 14,
      color: "#77F7FF",
      stroke: "#06121A",
      strokeThickness: 4,
      align: "center",
    }),
  }),
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
