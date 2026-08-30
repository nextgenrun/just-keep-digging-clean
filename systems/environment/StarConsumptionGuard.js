import { TILE_TYPES } from "../../values/tileTypes.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

function parseTileKey(key) {
  const [tx, ty] = String(key).split(",").map(Number);
  return Number.isInteger(tx) && Number.isInteger(ty) ? { tx, ty } : null;
}

export class StarConsumptionGuard {
  constructor(worldModel, config, resolveProfile, acknowledged = false) {
    this.worldModel = worldModel;
    this.config = config;
    this.resolveProfile = resolveProfile;
    this.acknowledged = acknowledged === true;
    this.acknowledgementPending = null;
    this.pendingDamage = null;
    this.authorizedDamageKeys = new Set();
    this.events = [];
  }

  acknowledgeRisk() {
    if (!this.acknowledgementPending) return false;
    const profile = this.acknowledgementPending?.profile || null;
    this.acknowledged = true;
    this.acknowledgementPending = null;
    this.pendingDamage = null;
    this.events.push({ type: "star-consumption-acknowledged", profile });
    return true;
  }

  cancelAttempt() {
    const profile = this.acknowledgementPending?.profile
      || this.pendingDamage?.profile
      || null;
    const hadAttempt = Boolean(
      this.acknowledgementPending || this.pendingDamage,
    );
    this.acknowledgementPending = null;
    this.pendingDamage = null;
    if (hadAttempt) {
      this.events.push({
        type: "star-consumption-acknowledgement-cancelled",
        profile,
      });
    }
    return hadAttempt;
  }

  update(nowMs, context = {}) {
    this._updatePendingDamage(nowMs, context);
    this._flushConsumedAuthorizations();
    return this.getSnapshot(nowMs);
  }

  shouldBlockDamage({ tileX, tileY, type } = {}, nowMs = 0) {
    if (type !== TILE_TYPES.SKY_TILE) return false;
    const key = `${tileX},${tileY}`;
    if (this.authorizedDamageKeys.has(key)) return false;
    if (!this.acknowledged) {
      if (!this.acknowledgementPending) {
        const profile = this.resolveProfile(tileX, tileY);
        this.acknowledgementPending = { key, profile };
        this.events.push({
          type: "star-consumption-acknowledgement-required",
          profile,
        });
      }
      return true;
    }

    const now = Math.max(0, Number(nowMs) || 0);
    const continuing = this.pendingDamage?.key === key
      && now - this.pendingDamage.lastAttemptAt
        <= this.config.consumption.maximumAttemptGapMs;
    if (!continuing) {
      const profile = this.resolveProfile(tileX, tileY);
      this.pendingDamage = {
        key,
        startedAt: now,
        lastAttemptAt: now,
        profile,
      };
      this.events.push({ type: "star-consumption-warning", profile });
      return true;
    }
    this.pendingDamage.lastAttemptAt = now;
    if (
      now - this.pendingDamage.startedAt
      < this.config.consumption.confirmationHoldMs
    ) return true;

    const profile = this.pendingDamage.profile;
    this.authorizedDamageKeys.add(key);
    this.pendingDamage = null;
    this.events.push({ type: "star-consumption-confirmed", profile });
    return false;
  }

  getSnapshot(nowMs = 0) {
    return {
      consumptionAcknowledged: this.acknowledged,
      consumptionConfirmationPending: Boolean(
        this.acknowledgementPending,
      ),
      pendingConsumption: this._getPendingConsumption(nowMs),
    };
  }

  drainEvents() {
    const events = this.events.slice();
    this.events.length = 0;
    return events;
  }

  _updatePendingDamage(nowMs, context) {
    if (!this.pendingDamage) return;
    const target = context.consumptionTarget;
    const targetKey = target ? `${target.tx},${target.ty}` : "";
    const inputKnown = Object.prototype.hasOwnProperty.call(
      context,
      "consumptionHeld",
    );
    const released = inputKnown && (
      context.consumptionHeld !== true
      || targetKey !== this.pendingDamage.key
    );
    const expired = nowMs - this.pendingDamage.lastAttemptAt
      > this.config.consumption.maximumAttemptGapMs;
    if (!released && !expired) return;
    this.events.push({
      type: "star-consumption-hold-cancelled",
      profile: this.pendingDamage.profile,
    });
    this.pendingDamage = null;
  }

  _getPendingConsumption(nowMs) {
    if (this.acknowledgementPending) {
      return {
        phase: "acknowledgement",
        profile: this.acknowledgementPending.profile,
        progress: 0,
      };
    }
    if (!this.pendingDamage) return null;
    const elapsedMs = Math.max(0, nowMs - this.pendingDamage.startedAt);
    return {
      phase: "holding",
      profile: this.pendingDamage.profile,
      elapsedMs,
      holdMs: this.config.consumption.confirmationHoldMs,
      progress: clamp01(
        elapsedMs / this.config.consumption.confirmationHoldMs,
      ),
    };
  }

  _flushConsumedAuthorizations() {
    for (const key of this.authorizedDamageKeys) {
      const tile = parseTileKey(key);
      if (!tile) {
        this.authorizedDamageKeys.delete(key);
        continue;
      }
      if (this.worldModel?.getTileType?.(tile.tx, tile.ty) === TILE_TYPES.SKY_TILE) {
        continue;
      }
      const source = this.worldModel?.getDugTileSource?.(tile.tx, tile.ty);
      if (source?.type === TILE_TYPES.SKY_TILE) {
        this.events.push({
          type: "star-consumed",
          profile: this.resolveProfile(tile.tx, tile.ty),
        });
      }
      this.authorizedDamageKeys.delete(key);
    }
  }

  destroy() {
    this.events.length = 0;
    this.authorizedDamageKeys.clear();
    this.acknowledgementPending = null;
    this.pendingDamage = null;
    this.resolveProfile = null;
    this.worldModel = null;
  }
}
