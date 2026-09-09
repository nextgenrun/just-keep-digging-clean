import { AUDIO_MIX_REVIEW } from "../../../values/audioMixReview.js";
import {
  estimateAudioMixReviewPeak,
  resolveAudioMixReviewSourceId,
} from "./audioMixReviewMath.js?v=20260831-audio10";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export class ReviewAudioBus {
  constructor(scene, config = AUDIO_MIX_REVIEW) {
    this.scene = scene;
    this.config = config;
    this.masterTrim = 1;
    this.muted = false;
    this.scenarioId = config.defaultScenario;
    this.ambienceId = config.defaultAmbience;
    this.loops = new Map();
    this.lastPlayedAt = new Map();
    this.oneShotEvents = [];
    this.errors = [];
    this.blockedByCooldown = 0;
    this.pendingOneShotTimers = [];
  }

  applyScenario(scenarioId, { playTransients = true } = {}) {
    const scenario = this.config.scenarios[scenarioId];
    if (!scenario) return false;
    const previousScenarioId = this.scenarioId;
    const changedScenario = previousScenarioId !== scenarioId;
    const previousHadLoops = this.config.scenarios[previousScenarioId]?.loops.length > 0;
    if (changedScenario || playTransients) {
      this._clearPendingOneShots();
      this._stopStaleOneShots();
    }
    this.scenarioId = scenarioId;
    for (const state of this.loops.values()) state.target = 0;
    for (const entry of scenario.loops) {
      const sourceId = resolveAudioMixReviewSourceId(
        entry.sourceId,
        this.ambienceId,
      );
      const state = this._ensureLoop(sourceId);
      if (state) state.target = entry.volume;
    }
    if (playTransients) {
      for (const [index, entry] of scenario.oneShots.entries()) {
        const expectedScenario = scenarioId;
        const transitionDelay = changedScenario && previousHadLoops
          ? this.config.output.transitionTransientDelayMs
          : 0;
        const play = () => {
          if (this.scenarioId === expectedScenario) {
            this._playOneShot(entry, {
              scenarioId,
              sequenceIndex: index + 1,
              sequenceTotal: scenario.oneShots.length,
            });
          }
        };
        const delayMs = transitionDelay + (entry.delayMs || 0);
        if (delayMs > 0) {
          let timer = null;
          timer = this.scene.time.delayedCall(delayMs, () => {
            this.pendingOneShotTimers = this.pendingOneShotTimers
              .filter(candidate => candidate !== timer);
            play();
          });
          this.pendingOneShotTimers.push(timer);
        } else play();
      }
    }
    return true;
  }

  selectAmbience(sourceId) {
    if (!this.config.ambienceOptions.includes(sourceId)) return false;
    this.ambienceId = sourceId;
    return this.applyScenario(this.scenarioId, { playTransients: false });
  }

  setMasterTrim(value) {
    this.masterTrim = clamp01(value);
    return this.masterTrim;
  }

  setMuted(muted) {
    this.muted = muted === true;
    this.scene.sound.setMute?.(this.muted);
    return this.muted;
  }

  replay() {
    return this.applyScenario(this.scenarioId, { playTransients: true });
  }

  stopAll() {
    this._clearPendingOneShots();
    this._stopStaleOneShots();
    for (const state of this.loops.values()) {
      state.target = 0;
      state.current = 0;
      if (state.sound.isPlaying) state.sound.stop();
    }
    return true;
  }

  update(deltaMs) {
    const step = Math.min(1, deltaMs / this.config.output.loopFadeMs);
    const outputScale = this.config.output.masterSafetyCap * this.masterTrim;
    for (const state of this.loops.values()) {
      state.current += (state.target - state.current) * step;
      if (state.target > 0 && !state.sound.isPlaying) {
        try {
          state.sound.play({ loop: true, volume: 0 });
        } catch (error) {
          this._recordError(state.sourceId, error);
        }
      }
      state.sound.setVolume(clamp01(state.current * outputScale));
      if (
        state.target === 0
        && state.current <= this.config.output.stopEpsilon
        && state.sound.isPlaying
      ) {
        state.current = 0;
        state.sound.stop();
      }
    }
  }

  snapshot() {
    const activeLoops = [...this.loops.values()]
      .filter(state => state.target > 0 || state.current > this.config.output.stopEpsilon)
      .map(state => ({
        sourceId: state.sourceId,
        label: this.config.sources[state.sourceId].label,
        target: state.target,
        output: state.current * this.config.output.masterSafetyCap * this.masterTrim,
        playing: state.sound.isPlaying,
        fadingOut: state.target === 0,
      }));
    const estimatedPeak = estimateAudioMixReviewPeak(
      this.config,
      this.scenarioId,
      this.masterTrim,
      this.ambienceId,
    );
    return {
      scenarioId: this.scenarioId,
      ambienceId: this.ambienceId,
      masterTrim: this.masterTrim,
      muted: this.muted,
      audioLocked: this.scene.sound.locked === true,
      activeLoops,
      estimatedPeak,
      peakBudget: this.config.output.estimatedPeakBudget,
      withinBudget: estimatedPeak <= this.config.output.estimatedPeakBudget,
      oneShotEvents: this.oneShotEvents.slice(-8),
      pendingOneShotCount: this.pendingOneShotTimers.length,
      blockedByCooldown: this.blockedByCooldown,
      errors: [...this.errors],
    };
  }

  destroy() {
    this.stopAll();
    for (const state of this.loops.values()) state.sound.destroy();
    this.loops.clear();
  }

  _ensureLoop(sourceId) {
    if (this.loops.has(sourceId)) return this.loops.get(sourceId);
    const source = this.config.sources[sourceId];
    if (!source || !this.scene.cache.audio.exists(source.key)) {
      this._recordError(sourceId, new Error("preview not loaded"));
      return null;
    }
    const state = {
      sourceId,
      sound: this.scene.sound.add(source.key, { loop: true, volume: 0 }),
      current: 0,
      target: 0,
    };
    this.loops.set(sourceId, state);
    return state;
  }

  _playOneShot(entry, eventContext = {}) {
    const sourceId = resolveAudioMixReviewSourceId(entry.sourceId, this.ambienceId);
    const source = this.config.sources[sourceId];
    if (!source || !this.scene.cache.audio.exists(source.key)) {
      this._recordError(sourceId, new Error("preview not loaded"));
      return false;
    }
    const now = this.scene.time.now;
    const lastPlayed = this.lastPlayedAt.get(sourceId) ?? -Infinity;
    if (now - lastPlayed < (source.cooldownMs || 0)) {
      this.blockedByCooldown += 1;
      return false;
    }
    const output = clamp01(
      entry.volume * this.config.output.masterSafetyCap * this.masterTrim,
    );
    try {
      const rate = entry.rate || 1;
      this.scene.sound.play(source.key, { volume: output, rate });
      this.lastPlayedAt.set(sourceId, now);
      this.oneShotEvents.push({
        sourceId,
        output,
        rate,
        at: Math.round(now),
        ...eventContext,
      });
      return true;
    } catch (error) {
      this._recordError(sourceId, error);
      return false;
    }
  }

  _stopStaleOneShots() {
    for (const source of Object.values(this.config.sources)) {
      if (source.role === "oneShot") this.scene.sound.stopByKey?.(source.key);
    }
  }

  _clearPendingOneShots() {
    for (const timer of this.pendingOneShotTimers) timer?.remove?.();
    this.pendingOneShotTimers = [];
  }

  _recordError(sourceId, error) {
    const message = `${sourceId}: ${error?.message || error}`;
    if (!this.errors.includes(message)) this.errors.push(message);
  }
}
