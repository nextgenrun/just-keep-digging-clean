export const HEAVENBLOCKS_ALTAR_STAGE = Object.freeze({
  DORMANT: 0,
  ATTUNING: 1,
  AWAKENED: 2,
});

function normalizeRelicCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

export function resolveHeavenblocksSurfaceAltarStageIndex({
  gate,
  progressionSystem,
  relicCount = 0,
} = {}) {
  const unlocked = progressionSystem?.isRegionUnlocked?.(gate?.regionId) === true;

  if (gate?.relicGate === true) {
    if (unlocked || progressionSystem?.isSkyGateEligible?.() === true) {
      return HEAVENBLOCKS_ALTAR_STAGE.AWAKENED;
    }
    return normalizeRelicCount(relicCount) > 0
      ? HEAVENBLOCKS_ALTAR_STAGE.ATTUNING
      : HEAVENBLOCKS_ALTAR_STAGE.DORMANT;
  }

  if (progressionSystem?.isRegionCompleted?.(gate?.regionId) === true) {
    return HEAVENBLOCKS_ALTAR_STAGE.AWAKENED;
  }
  return unlocked
    ? HEAVENBLOCKS_ALTAR_STAGE.ATTUNING
    : HEAVENBLOCKS_ALTAR_STAGE.DORMANT;
}
