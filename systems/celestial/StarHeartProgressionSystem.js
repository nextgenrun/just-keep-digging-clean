import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_ORDER,
  getEarnedStarHeartCount,
  sanitizeStarHeartData,
} from "../../values/celestialEngines.js";

export class StarHeartProgressionSystem {
  constructor({ onChanged = null, isGodModeActive = null } = {}) {
    this._onChanged = onChanged;
    this._isGodModeActiveProvider = typeof isGodModeActive === "function"
      ? isGodModeActive
      : null;
    this._listeners = new Set();
    this._data = sanitizeStarHeartData(null);
    this._lastActivationId = null;
    this._lastActivationWasGodMode = false;
    this._lastActivationPriorHeartsEarned = null;
    this._godModeEngine = null;
    this._godModeActivationSequence = 0;
  }

  loadSaveData(data, constellationCount = 0) {
    this._data = sanitizeStarHeartData(data);
    this._godModeEngine = null;
    this._lastActivationPriorHeartsEarned = null;
    this.syncConstellationCount(constellationCount, { silent: true });
    this._emit("loaded", false);
    return this.getSnapshot();
  }

  syncConstellationCount(count, { silent = false } = {}) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    const previousCount = this._data.constellationCount;
    const previousHearts = this._data.heartsEarned;
    this._data.constellationCount = Math.max(previousCount, safeCount);

    this._refreshEarnedHearts();

    const changed = previousCount !== this._data.constellationCount
      || previousHearts !== this._data.heartsEarned;
    if (changed && !silent) {
      this._emit(
        previousHearts < this._data.heartsEarned ? "heart-earned" : "constellation-progress",
        true,
      );
    }
    return changed;
  }

  chooseEngine(engineId) {
    if (!CELESTIAL_ENGINE_ORDER.includes(engineId)) {
      return { ok: false, reason: "invalid-engine" };
    }
    if (this.isGodModeActive()) {
      this._godModeEngine = engineId;
      this._emit("god-mode-engine-equipped", false);
      return { ok: true, snapshot: this.getSnapshot() };
    }
    if (this._data.unlockedEngines.includes(engineId)) {
      const changed = this._data.selectedEngine !== engineId;
      this._data.selectedEngine = engineId;
      if (changed) this._emit("engine-equipped", true);
      return { ok: true, changed, snapshot: this.getSnapshot() };
    }
    if (this.getAvailableHearts() <= 0) {
      return { ok: false, reason: "heart-locked" };
    }

    this._data.unlockedEngines = [...this._data.unlockedEngines, engineId];
    this._data.selectedEngine = engineId;
    this._data.heartsSpent = this._data.unlockedEngines.length;
    this._data.charge = CELESTIAL_ENGINE_CONFIG.charge.initialOnAttune;
    this._emit("engine-attuned", true);
    return { ok: true, snapshot: this.getSnapshot() };
  }

  recordCollectedSkyStar(rarity = 0) {
    if (this.isGodModeActive()) return 0;
    if (!this._data.selectedEngine) return 0;
    const index = Math.max(
      0,
      Math.min(
        CELESTIAL_ENGINE_CONFIG.charge.starChargeByRarity.length - 1,
        Math.floor(Number(rarity) || 0),
      ),
    );
    const before = this._data.charge;
    this._data.charge = Math.min(
      CELESTIAL_ENGINE_CONFIG.charge.capacity,
      before + CELESTIAL_ENGINE_CONFIG.charge.starChargeByRarity[index],
    );
    const gained = this._data.charge - before;
    if (gained > 0) this._emit("charge-gained", true, { gained, rarity: index });
    return gained;
  }

  consumeActivation(nowMs = Date.now()) {
    const godMode = this.isGodModeActive();
    const selectedEngine = godMode ? this._resolveGodModeEngine() : this._data.selectedEngine;
    if (!selectedEngine) return { ok: false, reason: "not-attuned" };
    if (!godMode && this._data.charge < CELESTIAL_ENGINE_CONFIG.charge.activationCost) {
      return { ok: false, reason: "not-charged" };
    }

    if (!godMode) {
      const previousHearts = this._data.heartsEarned;
      this._lastActivationPriorHeartsEarned = previousHearts;
      this._data.charge -= CELESTIAL_ENGINE_CONFIG.charge.activationCost;
      this._data.activationsUsed += 1;
      this._refreshEarnedHearts();
    } else {
      this._lastActivationPriorHeartsEarned = null;
      this._godModeActivationSequence += 1;
    }
    this._lastActivationId = [
      godMode ? "god" : "star-heart",
      selectedEngine,
      Math.max(0, Math.floor(Number(nowMs) || Date.now())),
      godMode ? this._godModeActivationSequence : this._data.activationsUsed,
    ].join(":");
    this._lastActivationWasGodMode = godMode;
    const heartEarned = !godMode
      && this._lastActivationPriorHeartsEarned < this._data.heartsEarned;
    this._emit(
      godMode ? "god-mode-activation" : heartEarned ? "heart-earned" : "activation-consumed",
      !godMode,
    );
    return {
      ok: true,
      activationId: this._lastActivationId,
      engineId: selectedEngine,
    };
  }

  refundActivation(activationId) {
    if (!activationId || activationId !== this._lastActivationId) return false;
    if (this._lastActivationWasGodMode) {
      this._lastActivationId = null;
      this._lastActivationWasGodMode = false;
      this._lastActivationPriorHeartsEarned = null;
      this._emit("god-mode-activation-refunded", false);
      return true;
    }
    this._data.charge = Math.min(
      CELESTIAL_ENGINE_CONFIG.charge.capacity,
      this._data.charge + CELESTIAL_ENGINE_CONFIG.charge.activationCost,
    );
    this._data.activationsUsed = Math.max(0, this._data.activationsUsed - 1);
    if (Number.isFinite(this._lastActivationPriorHeartsEarned)) {
      this._data.heartsEarned = Math.max(
        this._data.heartsSpent,
        this._lastActivationPriorHeartsEarned,
      );
    }
    this._lastActivationId = null;
    this._lastActivationWasGodMode = false;
    this._lastActivationPriorHeartsEarned = null;
    this._emit("activation-refunded", true);
    return true;
  }

  getAvailableHearts() {
    if (this.isGodModeActive()) return CELESTIAL_ENGINE_CONFIG.unlock.maxHearts;
    return Math.max(0, this._data.heartsEarned - this._data.heartsSpent);
  }

  isUnlocked() {
    return this.isGodModeActive() || this._data.heartsEarned > 0;
  }

  isCharged() {
    return this.isGodModeActive()
      || this._data.charge >= CELESTIAL_ENGINE_CONFIG.charge.activationCost;
  }

  isGodModeActive() {
    return this._isGodModeActiveProvider?.() === true;
  }

  refreshGodMode() {
    if (this.isGodModeActive()) this._resolveGodModeEngine();
    else this._godModeEngine = null;
    this._emit("god-mode-refreshed", false);
    return this.getSnapshot();
  }

  getSaveData() {
    return sanitizeStarHeartData(this._data);
  }

  getSnapshot() {
    const saveData = this.getSaveData();
    const godMode = this.isGodModeActive();
    return {
      ...saveData,
      selectedEngine: godMode ? this._resolveGodModeEngine() : saveData.selectedEngine,
      charge: godMode ? CELESTIAL_ENGINE_CONFIG.charge.capacity : saveData.charge,
      availableHearts: this.getAvailableHearts(),
      unlocked: this.isUnlocked(),
      charged: this.isCharged(),
      godMode,
      engineCount: saveData.unlockedEngines.length,
      allEnginesUnlocked: saveData.unlockedEngines.length >= CELESTIAL_ENGINE_ORDER.length,
      nextHeartActivationMilestone: this._getNextHeartActivationMilestone(saveData),
      activationsToNextHeart: this._getActivationsToNextHeart(saveData),
      requiredConstellations: CELESTIAL_ENGINE_CONFIG.unlock.requiredConstellations,
      chargeCapacity: CELESTIAL_ENGINE_CONFIG.charge.capacity,
    };
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this._listeners.add(listener);
    listener(this.getSnapshot(), "subscribed", null);
    return () => this._listeners.delete(listener);
  }

  destroy() {
    this._listeners.clear();
    this._onChanged = null;
    this._isGodModeActiveProvider = null;
  }

  _resolveGodModeEngine() {
    if (!this._godModeEngine) {
      this._godModeEngine = this._data.selectedEngine || CELESTIAL_ENGINE_ORDER[0];
    }
    return this._godModeEngine;
  }

  _refreshEarnedHearts() {
    const earned = getEarnedStarHeartCount(
      this._data.constellationCount,
      this._data.activationsUsed,
    );
    this._data.heartsEarned = Math.max(
      this._data.heartsEarned,
      this._data.heartsSpent,
      earned,
    );
    return this._data.heartsEarned;
  }

  _getNextHeartActivationMilestone(data) {
    if (
      data.constellationCount < CELESTIAL_ENGINE_CONFIG.unlock.requiredConstellations
      || data.heartsEarned >= CELESTIAL_ENGINE_CONFIG.unlock.maxHearts
    ) {
      return null;
    }
    return CELESTIAL_ENGINE_CONFIG.unlock.additionalHeartActivationMilestones
      .find(milestone => data.activationsUsed < milestone) ?? null;
  }

  _getActivationsToNextHeart(data) {
    const milestone = this._getNextHeartActivationMilestone(data);
    return milestone === null ? 0 : Math.max(0, milestone - data.activationsUsed);
  }

  _emit(event, persist, detail = null) {
    const snapshot = this.getSnapshot();
    for (const listener of this._listeners) listener(snapshot, event, detail);
    if (persist) this._onChanged?.(snapshot, event, detail);
  }
}
