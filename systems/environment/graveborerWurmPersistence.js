import {
  GRAVEBORER_WURM_PHASES,
  sanitizeGraveborerWurmData,
} from "../../values/graveborerWurm.js";
import { copyGraveborerTile } from "./graveborerWurmPath.js";

export function resolveGraveborerWurmRestoredState(data, config) {
  if (!data || typeof data !== "object") return null;
  const saved = sanitizeGraveborerWurmData(data);
  const restored = {
    ...saved,
    targetTile: copyGraveborerTile(saved.targetTile),
    lastNoiseTile: copyGraveborerTile(saved.lastNoiseTile),
  };

  const activePass = restored.phase === GRAVEBORER_WURM_PHASES.warning
    || restored.phase === GRAVEBORER_WURM_PHASES.burrowing;

  // A pass that already hit advances instead of becoming a reloadable second
  // hit. Remaining hunt passes are still owed and receive a fresh telegraph.
  if (
    activePass
    && restored.targetTile
    && restored.hitConsumed
    && restored.passIndex < restored.passCount
  ) {
    restored.phase = GRAVEBORER_WURM_PHASES.warning;
    restored.passIndex += 1;
    restored.direction *= -1;
    restored.warningRemainingMs = config.timing.restoredWarningMinMs;
    restored.progress = 0;
    restored.hitCount = 0;
    restored.hitConsumed = false;
  } else if (
    restored.phase === GRAVEBORER_WURM_PHASES.burrowing
    && restored.targetTile
    && !restored.hitConsumed
  ) {
    restored.phase = GRAVEBORER_WURM_PHASES.warning;
    restored.warningRemainingMs = config.timing.restoredWarningMinMs;
    restored.progress = 0;
  } else if (
    restored.phase === GRAVEBORER_WURM_PHASES.warning
    && restored.targetTile
    && !restored.hitConsumed
  ) {
    restored.warningRemainingMs = Math.max(
      restored.warningRemainingMs,
      config.timing.restoredWarningMinMs,
    );
  } else if (
    activePass
    && (!restored.targetTile || restored.hitConsumed)
  ) {
    restored.phase = GRAVEBORER_WURM_PHASES.cooldown;
    restored.cooldownMs = config.timing.cooldownMs;
    restored.warningRemainingMs = 0;
    restored.progress = 0;
    restored.noise = 0;
    restored.targetTile = null;
    restored.lastNoiseTile = null;
    restored.encounterDepthTiles = 0;
    restored.passIndex = 0;
    restored.passCount = 0;
    restored.huntHitCount = 0;
    restored.hitCount = 0;
    restored.hitConsumed = false;
  }
  return restored;
}

export function createGraveborerWurmSaveData(state) {
  return sanitizeGraveborerWurmData({
    variantSize: state.variant?.size.id,
    variantDifficulty: state.variant?.difficulty.id,
    broodSpawned: state.broodSpawned,
    offspring: (state.offspring || []).map(child => child.getSaveData()),
    phase: state.phase,
    noise: state.noise,
    cooldownMs: state.cooldownMs,
    warningRemainingMs: state.warningRemainingMs,
    progress: state.progress,
    encounterCount: state.encounterCount,
    encounterDepthTiles: state.encounterDepthTiles,
    passIndex: state.passIndex,
    passCount: state.passCount,
    huntHitCount: state.huntHitCount,
    targetTile: state.targetTile,
    lastNoiseTile: state.lastNoiseTile,
    direction: state.direction,
    hitCount: state.hitCount,
    hitConsumed: state.hitConsumed,
  });
}
