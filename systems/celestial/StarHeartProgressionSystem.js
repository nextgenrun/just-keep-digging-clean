import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_ORDER,
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
    this._godModeEngine = null;
    this._godModeActivationSequence = 0;
  }

  loadSaveData(data, constellationCount = 0) {
    this._data = sanitizeStarHeartData(data);
    this._godModeEngine = null;
    this.syncConstellationCount(constellationCount, { silent: true });
    this._emit("loaded", false);
    return this.getSnapshot();
  }

  syncConstellationCount(count, { silent = false } = {}) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    const previousCount = this._data.constellationCount;
    const previousHearts = this._data.heartsEarned;
    this._data.constellationCount = Math.max(previousCount, safeCount);

    if (
      this._data.constellationCount >= CELESTIAL_ENGINE_CONFIG.unlock.requiredConstellations
      && this._data.heartsEarned < CELESTIAL_ENGINE_CONFIG.unlock.maxHearts
    ) {
      this._data.heartsEarned = CELESTIAL_ENGINE_CONFIG.unlock.maxHearts;
    }

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
    if (this._data.selectedEngine) {
      return { ok: false, reason: "already-attuned" };
    }
    if (this.getAvailableHearts() <= 0) {
      return { ok: false, reason: "heart-locked" };
    }

    this._data.selectedEngine = engineId;
    this._data.heartsSpent += 1;
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
      this._data.charge -= CELESTIAL_ENGINE_CONFIG.charge.activationCost;
      this._data.activationsUsed += 1;
    } else {
      this._godModeActivationSequence += 1;
    }
    this._lastActivationId = [
      godMode ? "god" : "star-heart",
      selectedEngine,
      Math.max(0, Math.floor(Number(nowMs) || Date.now())),
      godMode ? this._godModeActivationSequence : this._data.activationsUsed,
    ].join(":");
    this._lastActivationWasGodMode = godMode;
    this._emit(godMode ? "god-mode-activation" : "activation-consumed", !godMode);
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
      this._emit("god-mode-activation-refunded", false);
      return true;
    }
    this._data.charge = Math.min(
      CELESTIAL_ENGINE_CONFIG.charge.capacity,
      this._data.charge + CELESTIAL_ENGINE_CONFIG.charge.activationCost,
    );
    this._data.activationsUsed = Math.max(0, this._data.activationsUsed - 1);
    this._lastActivationId = null;
    this._lastActivationWasGodMode = false;
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

  _emit(event, persist, detail = null) {
    const snapshot = this.getSnapshot();
    for (const listener of this._listeners) listener(snapshot, event, detail);
    if (persist) this._onChanged?.(snapshot, event, detail);
  }
}
