/** Selects and resets the shared UAL mining swing chain for repeated directional hits. */
import { UAL_NATIVE_ACTION_TUNING } from "../values/ualNativeActionTuning.js";

function targetKey(targetTile) {
  return Number.isFinite(targetTile?.tx) && Number.isFinite(targetTile?.ty)
    ? `${targetTile.tx},${targetTile.ty}`
    : "none";
}

export class UalMiningComboSelector {
  constructor(config = UAL_NATIVE_ACTION_TUNING.combo) {
    this.config = config;
    this.reset();
  }

  select({ family, direction, animationKeys, fallback, targetTile, nowMs } = {}) {
    const keys = Array.isArray(animationKeys) && animationKeys.length > 0
      ? animationKeys
      : fallback ? [fallback] : [];
    if (keys.length === 0) return null;

    const now = Number.isFinite(nowMs) ? nowMs : 0;
    const nextTargetKey = targetKey(targetTile);
    const previous = this._state;
    const expired = !previous || now - previous.lastStartedAtMs > this.config.resetAfterMs;
    const familyChanged = previous?.family !== family;
    const directionChanged = this.config.resetOnDirectionChange
      && previous?.direction !== direction;
    const targetChanged = this.config.resetOnTargetChange
      && previous?.targetKey !== nextTargetKey;
    const continuing = !expired && !familyChanged && !directionChanged && !targetChanged;
    const stageIndex = continuing ? previous.nextStageIndex % keys.length : 0;

    this._state = {
      family,
      direction,
      targetKey: nextTargetKey,
      lastStartedAtMs: now,
      stageIndex,
      nextStageIndex: (stageIndex + 1) % keys.length,
      stageCount: keys.length,
    };
    return keys[stageIndex] || fallback || keys[0];
  }

  reset() {
    this._state = null;
  }

  get state() {
    return this._state ? { ...this._state } : null;
  }
}
