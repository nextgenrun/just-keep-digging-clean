import {
  HARDCORE_MODE_CONFIG,
  consumeHardcoreDeath,
  isHardcoreMode,
  isHardcoreModeArmed,
  resolveHardcoreTeleportCost,
  sanitizeHardcoreModeData,
} from "../../values/hardcoreMode.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";

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

  clearStress(source = "celestial-empower") {
    const cleared = Math.max(0, finiteOr(this.state.stress, 0));
    if (cleared <= 0) return 0;
    this.state = sanitizeHardcoreModeData({
      ...this.state,
      stress: 0,
    });
    this._lastStressBand = "calm";
    this._events.push({ type: "stress-cleared", source, amount: cleared });
    return cleared;
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
    const torchCfg = LIGHT_CONFIG.torchIntensity;
    const maximumTorchIntensity = torchCfg.maximumPercent / 100;
    const overdriveStartIntensity = torchCfg.overdrive.startPercent / 100;
    const torchIntensity = torchActive
      ? clamp(
        finiteOr(context.torchIntensity, stressCfg.torchIntensityFallback),
        0,
        maximumTorchIntensity,
      )
      : 0;
    const overdriveRatio = clamp(
      (torchIntensity - overdriveStartIntensity)
        / Math.max(0.01, maximumTorchIntensity - overdriveStartIntensity),
      0,
      1,
    );
    const normalTorchRatio = clamp(
      torchIntensity / Math.max(0.01, overdriveStartIntensity),
      0,
      1,
    );
    const nearIntactStarLight = context.nearIntactStarLight === true;
    const intactStarRecoveryScale = nearIntactStarLight
      ? Math.max(0, finiteOr(context.intactStarRecoveryScale, 1))
      : 1;
    const insideConsumedStarScar = context.insideConsumedStarScar === true
      && !nearIntactStarLight;
    const consumedStarStressMultiplier = insideConsumedStarScar
      ? Math.max(1, finiteOr(context.consumedStarStressMultiplier, 1))
      : 1;
    const panicResistanceMeters = Math.max(
      0,
      finiteOr(context.panicResistanceMeters, 0),
    );
    const panicStartDepth = stressCfg.panicStartDepthTiles
      + panicResistanceMeters;
    const effectivePanicDepth = Math.max(0, depth - panicResistanceMeters);
    const descentSpeed = Math.max(0, finiteOr(context.descentTilesPerSecond, 0));
    const caveEyesPanicReduction = !torchActive
      ? clamp(finiteOr(context.caveEyesPanicReduction, 0), 0, 0.80)
      : 0;
    const gpDrainMultiplier = clamp(
      finiteOr(context.gpDrainMultiplier, 1),
      0.20,
      1,
    );
    const darknessEligible = effectivePanicDepth >= stressCfg.panicStartDepthTiles
      && !nearIntactStarLight
      && darknessAlpha >= stressCfg.darknessAlphaThreshold;
    const torchDarknessExposure = darknessEligible
      ? Math.pow(1 - normalTorchRatio, stressCfg.torchDarknessExposureExponent)
      : 0;
    const darknessActive = torchDarknessExposure > Number.EPSILON;

    let stressGainPerSecond = 0;
    const sources = [];
    const stressSuppressed = context.stressSuppressed === true;
    if (darknessActive && !stressSuppressed) {
      const depthBonus = Math.min(
        stressCfg.darknessDepthBonusMax,
        Math.max(0, effectivePanicDepth - stressCfg.panicStartDepthTiles)
          / 100
          * stressCfg.darknessDepthBonusPer100Tiles,
      );
      const darknessStressPerSecond = (
        stressCfg.darknessStressPerSecond + depthBonus
      ) * torchDarknessExposure * consumedStarStressMultiplier;
      stressGainPerSecond += darknessStressPerSecond;
      sources.push("darkness");
      if (insideConsumedStarScar) sources.push("starless-scar");
    }

    if (!stressSuppressed && descentSpeed > stressCfg.rapidDescentThresholdTilesPerSecond) {
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

    if (
      !stressSuppressed
      && effectivePanicDepth > stressCfg.deepPressureStartDepthTiles
    ) {
      const range = Math.max(
        1,
        stressCfg.deepPressureFullDepthTiles - stressCfg.deepPressureStartDepthTiles,
      );
      const ratio = clamp(
        (effectivePanicDepth - stressCfg.deepPressureStartDepthTiles) / range,
        0,
        1,
      );
      stressGainPerSecond += stressCfg.deepPressureStressPerSecondMax * ratio;
      if (ratio > 0.05) sources.push("deep-pressure");
    }

    stressGainPerSecond *= 1 - caveEyesPanicReduction;

    let stressRecoveryPerSecond = 0;
    if (nearIntactStarLight) {
      stressRecoveryPerSecond = stressCfg.intactStarRecoveryPerSecond
        * intactStarRecoveryScale;
      sources.push("intact-star-light");
    } else if (depth < panicStartDepth) {
      stressRecoveryPerSecond = stressCfg.surfaceRecoveryPerSecond;
    } else if (torchActive) {
      const normalRecoveryScale = Math.pow(
        normalTorchRatio,
        stressCfg.torchRecoveryExponent,
      );
      const recoveryScale = overdriveRatio > 0
        ? 1 + (
          stressCfg.torchOverdriveRecoveryMaximumMultiplier - 1
        ) * Math.pow(overdriveRatio, stressCfg.torchOverdriveRecoveryExponent)
        : normalRecoveryScale;
      stressRecoveryPerSecond = stressCfg.litRecoveryPerSecond
        * recoveryScale;
      if (stressRecoveryPerSecond > 0) sources.push("torch-light");
    } else if (stressGainPerSecond <= 0) {
      stressRecoveryPerSecond = stressCfg.litRecoveryPerSecond;
    }

    const previousStress = this.state.stress;
    let nextStress = previousStress;
    if (stressSuppressed) {
      nextStress = 0;
      sources.push("stellar-rage");
    } else {
      nextStress += (stressGainPerSecond - stressRecoveryPerSecond) * dt;
    }
    nextStress = clamp(nextStress, 0, stressCfg.maximum);

    this.state = sanitizeHardcoreModeData({
      ...this.state,
      stress: nextStress,
      peakStress: Math.max(this.state.peakStress, nextStress),
      activePlayMs: this.state.activePlayMs + elapsedMs,
    });
    this._emitStressBandChanges(previousStress, nextStress, context.nowMs);

    const drainRate = this.getStressGpDrainPerSecond(nextStress)
      * (1 - caveEyesPanicReduction)
      * gpDrainMultiplier;
    return {
      ...this.getSnapshot(),
      darknessActive,
      torchActive,
      torchIntensity,
      torchOverdriveActive: overdriveRatio > 0,
      torchOverdriveRatio: overdriveRatio,
      torchDarknessExposure,
      nearIntactStarLight,
      intactStarRecoveryScale,
      insideConsumedStarScar,
      consumedStarStressMultiplier,
      descentTilesPerSecond: descentSpeed,
      panicStartDepth,
      panicResistanceMeters,
      effectivePanicDepth,
      caveEyesPanicReduction,
      gpDrainMultiplier,
      stressSuppressed,
      stressGainPerSecond,
      stressRecoveryPerSecond,
      stressChangePerSecond: stressGainPerSecond - stressRecoveryPerSecond,
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
    const maximumStress = this.config.stress.maximum;
    return {
      ...this.getSaveData(),
      isHardcore: isHardcoreMode(this.state),
      armed: isHardcoreModeArmed(this.state),
      stressBand: this._resolveStressBand(stress),
      stressRatio: stress / maximumStress,
      sanity: maximumStress - stress,
      sanityRatio: 1 - stress / maximumStress,
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
    const previousBand = this._lastStressBand;
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
      this._events.push({
        type: "stress-band",
        band: nextBand,
        previousBand,
        stress: nextStress,
      });
    } else if (nextBand === "calm" && previousBand !== "calm") {
      this._events.push({
        type: "stress-band",
        band: nextBand,
        previousBand,
        stress: nextStress,
      });
    }
    this._lastStressBand = nextBand;
  }
}
