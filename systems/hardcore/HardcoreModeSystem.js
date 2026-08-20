import {
  HARDCORE_MODE_CONFIG,
  consumeHardcoreDeath,
  isHardcoreMode,
  isHardcoreModeArmed,
  resolveHardcoreTeleportCost,
  sanitizeHardcoreModeData,
} from "../../values/hardcoreMode.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finiteOr = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

export class HardcoreModeSystem {
  constructor(data = null, config = HARDCORE_MODE_CONFIG) {
    this.config = config;
    this._events = [];
    this.loadSaveData(data);
  }

  loadSaveData(data) {
    this.state = sanitizeHardcoreModeData(data);
    this._lastStressBand = this._resolveStressBand(this.state.stress);
    this._lastThresholdNoticeAt = 0;
    return this.getSaveData();
  }

  selectMode(mode, now = Date.now()) {
    const next = sanitizeHardcoreModeData({
      mode,
      armed: false,
      selectedAt: finiteOr(now, 0),
    });
    this.state = next;
    this._lastStressBand = "calm";
    this._events.push({ type: "mode-selected", mode: next.mode });
    return this.getSaveData();
  }

  arm(source = "flight", now = Date.now()) {
    if (
      !isHardcoreMode(this.state)
      || this.state.exhausted === true
      || isHardcoreModeArmed(this.state)
    ) {
      return false;
    }
    this.state = sanitizeHardcoreModeData({
      ...this.state,
      armed: true,
      armedAt: finiteOr(now, 0),
    });
    this._events.push({ type: "armed", source });
    return true;
  }

  convertFromCasual(source = "bobo", now = Date.now()) {
    if (isHardcoreMode(this.state)) return false;
    this.state = sanitizeHardcoreModeData({
      mode: this.config.modes.hardcore,
      armed: true,
      selectedAt: finiteOr(now, 0),
      armedAt: finiteOr(now, 0),
      stress: 0,
      peakStress: 0,
      lastUnstuckAt: this.state.lastUnstuckAt,
      activePlayMs: 0,
      unstuckUses: 0,
      paidTeleports: 0,
      teleportMoneySpent: 0,
    });
    this._lastStressBand = "calm";
    this._events.push({ type: "converted", source });
    this._events.push({ type: "armed", source });
    return true;
  }

  update(deltaMs, context = {}) {
    if (!isHardcoreModeArmed(this.state) || context.gameplayActive !== true) {
      return this.getSnapshot();
    }

    const stressCfg = this.config.stress;
    const elapsedMs = clamp(
      finiteOr(deltaMs, 0),
      0,
      this.config.runStats.maximumActiveFrameMs,
    );
    const dtMs = clamp(elapsedMs, 0, stressCfg.maxFrameMs);
    const dt = dtMs / 1000;
    if (dt <= 0) return this.getSnapshot();

    const depth = Math.max(0, finiteOr(context.depth, 0));
    const darknessAlpha = clamp(finiteOr(context.darknessAlpha, 0), 0, 1);
    const torchActive = context.torchActive === true;
    const nearIntactStarLight = context.nearIntactStarLight === true;
    const playerLevel = Math.max(1, Math.floor(finiteOr(context.playerLevel, 1)));
    const stressResistance = clamp(
      (playerLevel - 1) * stressCfg.stressResistancePerPlayerLevel,
      0,
      stressCfg.stressResistanceMaximum,
    );
    const descentSpeed = Math.max(0, finiteOr(context.descentTilesPerSecond, 0));
    const darknessActive = depth >= stressCfg.minimumDepthTiles
      && !torchActive
      && !nearIntactStarLight
      && darknessAlpha >= stressCfg.darknessAlphaThreshold;

    let stressGainPerSecond = 0;
    const sources = [];
    if (darknessActive) {
      const depthBonus = Math.min(
        stressCfg.darknessDepthBonusMax,
        Math.max(0, depth - stressCfg.minimumDepthTiles)
          / 100
          * stressCfg.darknessDepthBonusPer100Tiles,
      );
      stressGainPerSecond += stressCfg.darknessStressPerSecond + depthBonus;
      sources.push("darkness");
    }

    if (descentSpeed > stressCfg.rapidDescentThresholdTilesPerSecond) {
      const range = Math.max(
        0.01,
        stressCfg.rapidDescentFullRateTilesPerSecond
          - stressCfg.rapidDescentThresholdTilesPerSecond,
      );
      const ratio = clamp(
        (descentSpeed - stressCfg.rapidDescentThresholdTilesPerSecond) / range,
        0,
        1,
      );
      stressGainPerSecond += stressCfg.rapidDescentStressPerSecond * ratio;
      sources.push("rapid-descent");
    }

    if (depth > stressCfg.deepPressureStartDepthTiles) {
      const range = Math.max(
        1,
        stressCfg.deepPressureFullDepthTiles - stressCfg.deepPressureStartDepthTiles,
      );
      const ratio = clamp(
        (depth - stressCfg.deepPressureStartDepthTiles) / range,
        0,
        1,
      );
      stressGainPerSecond += stressCfg.deepPressureStressPerSecondMax * ratio;
      if (ratio > 0.05) sources.push("deep-pressure");
    }

    stressGainPerSecond *= 1 - stressResistance;

    const previousStress = this.state.stress;
    let nextStress = previousStress;
    if (nearIntactStarLight) {
      nextStress += (
        stressGainPerSecond - stressCfg.intactStarRecoveryPerSecond
      ) * dt;
      sources.push("intact-star-light");
    } else if (stressGainPerSecond > 0) {
      nextStress += stressGainPerSecond * dt;
    } else {
      const recovery = depth < stressCfg.minimumDepthTiles
        ? stressCfg.surfaceRecoveryPerSecond
        : stressCfg.litRecoveryPerSecond;
      nextStress -= recovery * dt;
    }
    nextStress = clamp(nextStress, 0, stressCfg.maximum);

    this.state = sanitizeHardcoreModeData({
      ...this.state,
      stress: nextStress,
      peakStress: Math.max(this.state.peakStress, nextStress),
      activePlayMs: this.state.activePlayMs + elapsedMs,
    });
    this._emitStressBandChanges(previousStress, nextStress, context.nowMs);

    const drainRate = this.getStressGpDrainPerSecond(nextStress);
    return {
      ...this.getSnapshot(),
      darknessActive,
      nearIntactStarLight,
      descentTilesPerSecond: descentSpeed,
      playerLevel,
      stressResistance,
      stressGainPerSecond,
      stressSources: sources,
      stressGpDrainPerSecond: drainRate,
      requestedStressGpDrain: drainRate * dt,
    };
  }

  getStressGpDrainPerSecond(stress = this.state.stress) {
    const cfg = this.config.stress;
    if (stress < cfg.gpDrainStartThreshold) return 0;
    const ratio = clamp(
      (stress - cfg.gpDrainStartThreshold)
        / Math.max(1, cfg.maximum - cfg.gpDrainStartThreshold),
      0,
      1,
    );
    return cfg.gpDrainAtStartPerSecond
      + (cfg.gpDrainAtMaximumPerSecond - cfg.gpDrainAtStartPerSecond) * ratio;
  }

  getTeleportCost(depth, kind) {
    return resolveHardcoreTeleportCost(depth, kind);
  }

  getUnstuckCooldownRemaining(now = Date.now()) {
    const elapsed = Math.max(0, finiteOr(now, 0) - this.state.lastUnstuckAt);
    if (!this.state.lastUnstuckAt) return 0;
    return Math.max(0, this.config.unstuck.cooldownMs - elapsed);
  }

  canUseUnstuck(now = Date.now()) {
    return this.getUnstuckCooldownRemaining(now) <= 0;
  }

  recordUnstuck(now = Date.now()) {
    this.state = sanitizeHardcoreModeData({
      ...this.state,
      lastUnstuckAt: Math.max(0, finiteOr(now, 0)),
      unstuckUses: this.state.unstuckUses + 1,
    });
    this._events.push({ type: "unstuck-used" });
    return this.getSaveData();
  }

  recordTeleport(cost) {
    const paid = Math.max(0, Math.floor(finiteOr(cost, 0)));
    if (!isHardcoreModeArmed(this.state) || paid <= 0) return false;
    this.state = sanitizeHardcoreModeData({
      ...this.state,
      paidTeleports: this.state.paidTeleports + 1,
      teleportMoneySpent: this.state.teleportMoneySpent + paid,
    });
    this._events.push({ type: "teleport-paid", cost: paid });
    return true;
  }

  recordDeath(source = "unknown") {
    const result = consumeHardcoreDeath(this.state);
    if (result.outcome === "casual") return result;
    this.state = sanitizeHardcoreModeData({
      ...result.data,
      stress: 0,
    });
    result.data = this.state;
    this._events.push({
      type: "death-consumed",
      source,
      outcome: result.outcome,
      livesRemaining: result.livesRemaining,
    });
    return result;
  }

  getSaveData() {
    return sanitizeHardcoreModeData(this.state);
  }

  getSnapshot() {
    const stress = this.state.stress;
    return {
      ...this.getSaveData(),
      isHardcore: isHardcoreMode(this.state),
      armed: isHardcoreModeArmed(this.state),
      stressBand: this._resolveStressBand(stress),
      stressRatio: stress / this.config.stress.maximum,
      stressGpDrainPerSecond: this.getStressGpDrainPerSecond(stress),
    };
  }

  drainEvents() {
    const events = this._events;
    this._events = [];
    return events;
  }

  _resolveStressBand(stress) {
    if (stress >= this.config.stress.criticalThreshold) return "critical";
    if (stress >= this.config.stress.warningThreshold) return "warning";
    return "calm";
  }

  _emitStressBandChanges(previousStress, nextStress, nowMs = 0) {
    const nextBand = this._resolveStressBand(nextStress);
    if (nextBand === this._lastStressBand) return;
    const now = Math.max(0, finiteOr(nowMs, 0));
    const elapsed = now - this._lastThresholdNoticeAt;
    const rising = nextStress > previousStress;
    if (
      rising
      && nextBand !== "calm"
      && (this._lastThresholdNoticeAt === 0
        || elapsed >= this.config.stress.thresholdNoticeCooldownMs)
    ) {
      this._lastThresholdNoticeAt = now;
      this._events.push({ type: "stress-band", band: nextBand, stress: nextStress });
    }
    this._lastStressBand = nextBand;
  }
}
