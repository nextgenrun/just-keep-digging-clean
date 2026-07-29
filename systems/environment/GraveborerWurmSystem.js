import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
} from "../../values/graveborerWurm.js";
import {
  copyGraveborerTile,
  createGraveborerWurmPath,
  createGraveborerWurmRenderState,
  sampleGraveborerWurmPath,
} from "./graveborerWurmPath.js";
import {
  resolveGraveborerWurmSweptCollision,
} from "./graveborerWurmCollision.js";
import {
  createGraveborerWurmSaveData,
  resolveGraveborerWurmRestoredState,
} from "./graveborerWurmPersistence.js";
import { resolveGraveborerWurmDifficulty } from "./graveborerWurmDifficulty.js";
import {
  createGraveborerWurmCooldownState,
  createGraveborerWurmForcedState,
  createGraveborerWurmInitialState,
  createGraveborerWurmSnapshot,
} from "./graveborerWurmState.js";

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
    this._events = [];
    this._lastWorldWidth = 0;
    Object.assign(
      this,
      createGraveborerWurmInitialState(this.config, this.devTest10x),
    );
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
    return this.devTest10x
      ? this.config.frequency.devActivityMultiplier
      : this.config.frequency.productionActivityMultiplier;
  }

  loadSaveData(data) {
    const restored = resolveGraveborerWurmRestoredState(data, this.config);
    if (!restored) return this.getSaveData();
    Object.assign(this, restored);
    this._lastCarveProgress = restored.progress;
    this._refreshDifficulty();
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
    Object.assign(
      this,
      createGraveborerWurmForcedState(this.config, this.devTest10x),
    );
    return this.getSnapshot();
  }

  update(deltaMs, context = {}) {
    this.active = this.enabled === true && context.active === true;
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
    if (!this.enabled) return this.getSnapshot();
    if (!this.active) {
      if (
        this.phase === GRAVEBORER_WURM_PHASES.dormant
        || this.phase === GRAVEBORER_WURM_PHASES.cooldown
      ) {
        this.cooldownMs = Math.max(0, this.cooldownMs - dtMs * activityMultiplier);
        this.noise = Math.max(
          0,
          this.noise - this.config.noise.decayPerSecond * dtSeconds,
        );
      }
      return this.getSnapshot();
    }

    if (this.phase === GRAVEBORER_WURM_PHASES.warning) {
      this.warningRemainingMs = Math.max(0, this.warningRemainingMs - dtMs);
      if (this.warningRemainingMs <= 0) this._beginBurrowing();
      return this.getSnapshot();
    }

    if (this.phase === GRAVEBORER_WURM_PHASES.burrowing) {
      this._updateBurrowing(dtMs, context);
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
      this._beginWarning(context.playerTile, context.depth, true);
    }
    return this.getSnapshot();
  }

  _beginWarning(playerTile, depthTiles, newHunt) {
    if (newHunt) {
      this.encounterDepthTiles = Math.max(
        this.config.activation.minDepthTiles,
        Number(depthTiles) || this.config.activation.minDepthTiles,
      );
      this.passIndex = 1;
      this.passCount = resolveGraveborerWurmDifficulty(
        this.encounterDepthTiles,
        this.passIndex,
        this.devTest10x,
        this.config,
      ).passCount;
      this.huntHitCount = 0;
      this.targetTile = copyGraveborerTile(this.lastNoiseTile)
        || copyGraveborerTile(playerTile);
      this.encounterCount += 1;
    } else {
      this.passIndex = Math.min(this.passCount, this.passIndex + 1);
      this.targetTile = copyGraveborerTile(playerTile)
        || copyGraveborerTile(this.targetTile);
      this.direction *= -1;
    }
    if (!this.targetTile) return;
    const margin = this.config.path.spawnDistanceTiles + 2;
    if (this.targetTile.tx < margin) {
      this.direction = 1;
    } else if (this._lastWorldWidth > 0 && this.targetTile.tx > this._lastWorldWidth - margin) {
      this.direction = -1;
    } else if (newHunt) {
      this.direction = (this.encounterCount + this.targetTile.ty) % 2 === 0 ? 1 : -1;
    }
    this._refreshDifficulty();
    this.phase = GRAVEBORER_WURM_PHASES.warning;
    this.warningRemainingMs = this.difficulty.warningMs;
    this.progress = 0;
    this.hitCount = 0;
    this.hitConsumed = false;
    this._lastCarveProgress = 0;
    this._rebuildPath();
    this._events.push({
      type: "phase",
      phase: this.phase,
      passIndex: this.passIndex,
      passCount: this.passCount,
      threatPercent: this.difficulty.threatPercent,
      repeatedPass: newHunt !== true,
    });
  }

  _beginBurrowing() {
    this.phase = GRAVEBORER_WURM_PHASES.burrowing;
    this.warningRemainingMs = 0;
    this.progress = 0;
    this._lastCarveProgress = 0;
    this._events.push({
      type: "phase",
      phase: this.phase,
      passIndex: this.passIndex,
      passCount: this.passCount,
      threatPercent: this.difficulty.threatPercent,
    });
  }

  _updateBurrowing(dtMs, context = {}) {
    const previousProgress = this.progress;
    this.progress += dtMs / this.difficulty.travelMs;
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

    const collisionTarget = context.playerBounds || context.playerTile;
    if (
      this.hitCount < this.config.combat.maxHitsPerPass
      && collisionTarget
    ) {
      const hit = resolveGraveborerWurmSweptCollision(
        this.getRenderState(0, previousProgress),
        this.getRenderState(0),
        collisionTarget,
        this.config,
      );
      if (hit) {
        this.hitCount += 1;
        this.huntHitCount += 1;
        this.hitConsumed = this.hitCount >= this.config.combat.maxHitsPerPass;
        const headHit = hit.part === "head";
        this._events.push({
          type: "hit",
          ...hit,
          targetTile: copyGraveborerTile(this.targetTile),
          passIndex: this.passIndex,
          passCount: this.passCount,
          damageRatio: headHit
            ? this.difficulty.headDamageRatio
            : this.difficulty.bodyDamageRatio,
          minimumDamageGp: headHit
            ? this.difficulty.minimumHeadDamageGp
            : this.difficulty.minimumBodyDamageGp,
        });
      }
    }

    if (this.progress >= this.config.path.encounterEndProgress) {
      if (this.passIndex < this.passCount) {
        this._beginWarning(
          context.playerTile,
          this.encounterDepthTiles,
          false,
        );
      } else {
        this._completeEncounter(true);
      }
    }
  }

  _completeEncounter(emitEvent) {
    const completedPasses = this.passCount;
    const huntHitCount = this.huntHitCount;
    Object.assign(
      this,
      createGraveborerWurmCooldownState(this.config, this.devTest10x),
    );
    if (emitEvent) {
      this._events.push({
        type: "encounter-complete",
        didHit: huntHitCount > 0,
        huntHitCount,
        completedPasses,
      });
    }
  }

  _refreshDifficulty() {
    this.difficulty = resolveGraveborerWurmDifficulty(
      this.encounterDepthTiles || this.config.activation.minDepthTiles,
      this.passIndex || 1,
      this.devTest10x,
      this.config,
    );
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

  getRenderState(timeMs = 0, progress = this.progress) {
    return createGraveborerWurmRenderState({
      active: this.active,
      phase: this.phase,
      progress,
      path: this._path,
      config: this.config,
      timeMs,
    });
  }

  getSnapshot() {
    return createGraveborerWurmSnapshot(this);
  }

  drainEvents() {
    const events = this._events;
    this._events = [];
    return events;
  }
}
