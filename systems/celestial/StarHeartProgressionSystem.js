import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_ORDER,
  sanitizeStarHeartData,
} from "../../values/celestialEngines.js";

export class StarHeartProgressionSystem {
  constructor({ onChanged = null } = {}) {
    this._onChanged = onChanged;
    this._listeners = new Set();
    this._data = sanitizeStarHeartData(null);
    this._lastActivationId = null;
  }

  loadSaveData(data, constellationCount = 0) {
    this._data = sanitizeStarHeartData(data);
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
    if (!this._data.selectedEngine) return { ok: false, reason: "not-attuned" };
    if (this._data.charge < CELESTIAL_ENGINE_CONFIG.charge.activationCost) {
      return { ok: false, reason: "not-charged" };
    }

    this._data.charge -= CELESTIAL_ENGINE_CONFIG.charge.activationCost;
    this._data.activationsUsed += 1;
    this._lastActivationId = [
      this._data.selectedEngine,
      Math.max(0, Math.floor(Number(nowMs) || Date.now())),
      this._data.activationsUsed,
    ].join(":");
    this._emit("activation-consumed", true);
    return {
      ok: true,
      activationId: this._lastActivationId,
      engineId: this._data.selectedEngine,
    };
  }

  refundActivation(activationId) {
    if (!activationId || activationId !== this._lastActivationId) return false;
    this._data.charge = Math.min(
      CELESTIAL_ENGINE_CONFIG.charge.capacity,
      this._data.charge + CELESTIAL_ENGINE_CONFIG.charge.activationCost,
    );
    this._data.activationsUsed = Math.max(0, this._data.activationsUsed - 1);
    this._lastActivationId = null;
    this._emit("activation-refunded", true);
    return true;
  }

  getAvailableHearts() {
    return Math.max(0, this._data.heartsEarned - this._data.heartsSpent);
  }

  isUnlocked() {
    return this._data.heartsEarned > 0;
  }

  isCharged() {
    return this._data.charge >= CELESTIAL_ENGINE_CONFIG.charge.activationCost;
  }

  getSaveData() {
    return sanitizeStarHeartData(this._data);
  }

  getSnapshot() {
    return {
      ...this.getSaveData(),
      availableHearts: this.getAvailableHearts(),
      unlocked: this.isUnlocked(),
      charged: this.isCharged(),
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
  }

  _emit(event, persist, detail = null) {
    const snapshot = this.getSnapshot();
    for (const listener of this._listeners) listener(snapshot, event, detail);
    if (persist) this._onChanged?.(snapshot, event, detail);
  }
}
