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

  // Never resume an unseen lethal pass mid-frame after loading. Re-telegraph
  // the same committed path unless its encounter hit was already consumed.
  if (
    restored.phase === GRAVEBORER_WURM_PHASES.burrowing
    && restored.targetTile
    && !restored.hitConsumed
  ) {
    restored.phase = GRAVEBORER_WURM_PHASES.warning;
    restored.warningRemainingMs = config.timing.restoredWarningMinMs;
    restored.progress = 0;
  } else if (
    (restored.phase === GRAVEBORER_WURM_PHASES.warning
      || restored.phase === GRAVEBORER_WURM_PHASES.burrowing)
    && (!restored.targetTile || restored.hitConsumed)
  ) {
    restored.phase = GRAVEBORER_WURM_PHASES.cooldown;
    restored.cooldownMs = config.timing.cooldownMs;
    restored.warningRemainingMs = 0;
    restored.progress = 0;
    restored.noise = 0;
    restored.targetTile = null;
    restored.lastNoiseTile = null;
    restored.hitConsumed = false;
  }
  return restored;
}

export function createGraveborerWurmSaveData(state) {
  return sanitizeGraveborerWurmData({
    phase: state.phase,
    noise: state.noise,
    cooldownMs: state.cooldownMs,
    warningRemainingMs: state.warningRemainingMs,
    progress: state.progress,
    encounterCount: state.encounterCount,
    targetTile: state.targetTile,
    lastNoiseTile: state.lastNoiseTile,
    direction: state.direction,
    hitConsumed: state.hitConsumed,
  });
}
