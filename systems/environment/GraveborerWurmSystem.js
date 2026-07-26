import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
} from "../../values/graveborerWurm.js";
import {
  copyGraveborerTile,
  createGraveborerWurmPath,
  createGraveborerWurmRenderState,
  resolveGraveborerWurmCollision,
  sampleGraveborerWurmPath,
} from "./graveborerWurmPath.js";
import {
  createGraveborerWurmSaveData,
  resolveGraveborerWurmRestoredState,
} from "./graveborerWurmPersistence.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Pure encounter state and path AI. Phaser-facing presentation and world
 * mutation live in the bridge/visual systems so this remains contract-testable.
 */
export class GraveborerWurmSystem {
  constructor(options = {}) {
    this.config = options.config || GRAVEBORER_WURM_CONFIG;
    this.enabled = options.enabled ?? this.config.featureFlags.enabled;
    this.devTest10x = options.devTest10x ?? this.config.featureFlags.devTest10x;
    this.active = false;
    this._events = [];
    this._path = null;
    this._lastWorldWidth = 0;
    this._reset();
  }

  _reset() {
    this.phase = GRAVEBORER_WURM_PHASES.dormant;
    this.noise = 0;
    this.cooldownMs = this.config.timing.initialCooldownMs;
    this.warningRemainingMs = 0;
    this.progress = 0;
    this.encounterCount = 0;
    this.targetTile = null;
    this.lastNoiseTile = null;
    this.direction = 1;
    this.hitConsumed = false;
    this._lastCarveProgress = 0;
    this._path = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled === true;
    return this.enabled;
  }

  setDevTest10x(enabled) {
    this.devTest10x = enabled === true;
    return this.devTest10x;
  }

  getActivityMultiplier() {
    return this.devTest10x ? this.config.featureFlags.devActivityMultiplier : 1;
  }

  loadSaveData(data) {
    const restored = resolveGraveborerWurmRestoredState(data, this.config);
    if (!restored) return this.getSaveData();
    Object.assign(this, restored);
    this._lastCarveProgress = restored.progress;
    this._rebuildPath();
    return this.getSaveData();
  }

  getSaveData() {
    return createGraveborerWurmSaveData(this);
  }

  recordNoise(source = "normal", tile = null) {
    if (!this.enabled) return this.noise;
    const baseAmount = Number.isFinite(source)
      ? Math.max(0, source)
      : Math.max(0, this.config.noise.sources[source] || 0);
    this.noise = clamp(
      this.noise + baseAmount * this.getActivityMultiplier(),
      0,
      this.config.noise.maximum,
    );
    if (copyGraveborerTile(tile)) this.lastNoiseTile = copyGraveborerTile(tile);
    return this.noise;
  }

  forceEncounter(tile = null) {
    const target = copyGraveborerTile(tile);
    if (target) this.lastNoiseTile = target;
    this.phase = GRAVEBORER_WURM_PHASES.dormant;
    this.cooldownMs = 0;
    this.noise = this.config.noise.maximum;
    this.warningRemainingMs = 0;
    this.progress = 0;
    this.hitConsumed = false;
    this._path = null;
    return this.getSnapshot();
  }

  update(deltaMs, context = {}) {
    this.active = this.enabled === true && context.active === true;
    if (!this.active) return this.getSnapshot();

    const dtMs = clamp(
      Number.isFinite(deltaMs) ? deltaMs : 0,
      0,
      this.config.timing.maxFrameMs,
    );
    const dtSeconds = dtMs / 1000;
    const activityMultiplier = this.getActivityMultiplier();
    this._lastWorldWidth = Number.isFinite(context.worldWidthTiles)
      ? context.worldWidthTiles
      : this._lastWorldWidth;

    if (this.phase === GRAVEBORER_WURM_PHASES.warning) {
      this.warningRemainingMs = Math.max(0, this.warningRemainingMs - dtMs);
      if (this.warningRemainingMs <= 0) this._beginBurrowing();
      return this.getSnapshot();
    }

    if (this.phase === GRAVEBORER_WURM_PHASES.burrowing) {
      this._updateBurrowing(dtMs, context.playerTile);
      return this.getSnapshot();
    }

    this.cooldownMs = Math.max(0, this.cooldownMs - dtMs * activityMultiplier);
    this.noise = Math.max(0, this.noise - this.config.noise.decayPerSecond * dtSeconds);
    if (this.devTest10x) {
      this.noise = clamp(
        this.noise
          + this.config.noise.devPassivePerSecond * dtSeconds * activityMultiplier,
        0,
        this.config.noise.maximum,
      );
    }

    if (
      this.cooldownMs <= 0
      && this.noise >= this.config.noise.threshold
      && copyGraveborerTile(context.playerTile)
    ) {
      this._beginWarning(context.playerTile);
    }
    return this.getSnapshot();
  }

  _beginWarning(playerTile) {
    this.targetTile = copyGraveborerTile(this.lastNoiseTile)
      || copyGraveborerTile(playerTile);
    if (!this.targetTile) return;
    const margin = this.config.path.spawnDistanceTiles + 2;
    if (this.targetTile.tx < margin) {
      this.direction = 1;
    } else if (this._lastWorldWidth > 0 && this.targetTile.tx > this._lastWorldWidth - margin) {
      this.direction = -1;
    } else {
      this.direction = (this.encounterCount + this.targetTile.ty) % 2 === 0 ? 1 : -1;
    }
    this.encounterCount += 1;
    this.phase = GRAVEBORER_WURM_PHASES.warning;
    this.warningRemainingMs = this.devTest10x
      ? this.config.timing.devWarningMs
      : this.config.timing.warningMs;
    this.progress = 0;
    this.hitConsumed = false;
    this._lastCarveProgress = 0;
    this._rebuildPath();
    this._events.push({ type: "phase", phase: this.phase });
  }

  _beginBurrowing() {
    this.phase = GRAVEBORER_WURM_PHASES.burrowing;
    this.warningRemainingMs = 0;
    this.progress = 0;
    this._lastCarveProgress = 0;
    this._events.push({ type: "phase", phase: this.phase });
  }

  _updateBurrowing(dtMs, playerTile) {
    this.progress += dtMs / this.config.timing.travelMs;
    const carveEnd = Math.min(1, this.progress);
    while (this._lastCarveProgress <= carveEnd) {
      const sample = this.samplePath(this._lastCarveProgress);
      if (sample) {
        this._events.push({
          type: "carve",
          point: { x: sample.x, y: sample.y },
          tangent: { x: sample.tangentX, y: sample.tangentY },
          progress: this._lastCarveProgress,
        });
      }
      this._lastCarveProgress += this.config.path.carveStepProgress;
    }

    if (!this.hitConsumed && copyGraveborerTile(playerTile)) {
      const hit = resolveGraveborerWurmCollision(
        this.getRenderState(0),
        playerTile,
        this.config,
      );
      if (hit) {
        this.hitConsumed = true;
        this._events.push({
          type: "hit",
          ...hit,
          targetTile: copyGraveborerTile(this.targetTile),
        });
      }
    }

    if (this.progress >= this.config.path.encounterEndProgress) {
      this._completeEncounter(true);
    }
  }

  _completeEncounter(emitEvent) {
    const didHit = this.hitConsumed;
    this.phase = GRAVEBORER_WURM_PHASES.cooldown;
    this.cooldownMs = this.config.timing.cooldownMs;
    this.warningRemainingMs = 0;
    this.progress = 0;
    this.noise = 0;
    this.targetTile = null;
    this.lastNoiseTile = null;
    this.hitConsumed = false;
    this._path = null;
    this._lastCarveProgress = 0;
    if (emitEvent) this._events.push({ type: "encounter-complete", didHit });
  }

  _rebuildPath() {
    this._path = createGraveborerWurmPath(
      this.targetTile,
      this.direction,
      this.config,
    );
  }

  samplePath(progress) {
    return sampleGraveborerWurmPath(this._path, progress);
  }

  getRenderState(timeMs = 0) {
    return createGraveborerWurmRenderState({
      active: this.active,
      phase: this.phase,
      progress: this.progress,
      path: this._path,
      config: this.config,
      timeMs,
    });
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      devTest10x: this.devTest10x,
      activityMultiplier: this.getActivityMultiplier(),
      active: this.active,
      phase: this.phase,
      noise: this.noise,
      noiseRatio: clamp(this.noise / this.config.noise.threshold, 0, 1),
      cooldownMs: this.cooldownMs,
      warningRemainingMs: this.warningRemainingMs,
      progress: this.progress,
      encounterCount: this.encounterCount,
      targetTile: copyGraveborerTile(this.targetTile),
      hitConsumed: this.hitConsumed,
    };
  }

  drainEvents() {
    const events = this._events;
    this._events = [];
    return events;
  }
}
