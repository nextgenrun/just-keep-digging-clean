import {
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_STATES,
  resolveShadowMinerMode,
} from "../../values/shadowMiner.js";
import {
  resolveShadowMinerEncounterBand,
  resolveShadowMinerEnvironment,
  resolveShadowMinerRepellent,
} from "./ShadowMinerEncounterContext.js";
import { ShadowMinerPoseHistory } from "./ShadowMinerPoseHistory.js";
import { ShadowMinerView } from "./ShadowMinerView.js";

function distanceBetween(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

export class ShadowMinerRuntime {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.config = options.config || SHADOW_MINER_CONFIG;
    this.mode = options.mode || resolveShadowMinerMode();
    this.profile = this.mode.review ? this.config.review : this.config.production;
    this.rateMultiplier = this.mode.dev10x ? this.config.dev.rateMultiplier : 1;
    this.random = options.random || Math.random;
    this.view = options.view || new ShadowMinerView(scene, this.config);
    this.history = options.history || new ShadowMinerPoseHistory(
      scene?.config?.tileSize,
      this.config.history,
    );
    this.state = SHADOW_MINER_STATES.DORMANT;
    this.stateDeadlineMs = 0;
    this.nextCheckAtMs = (scene?.time?.now || 0)
      + this._scaledDelay(this.profile.firstCheckDelayMs);
    this.encounterEndsAtMs = 0;
    this.encounterBand = null;
    this.encounterProfile = null;
    this.playbackTimeMs = 0;
    this.lastUpdateAtMs = 0;
    this.lastPlayerTile = null;
    this.lastWindowSummary = null;
    this.distanceToPlayerTiles = null;
    this.repelledBy = null;
    this.lastRepelledBy = null;
    this.spawnCount = 0;
    this.approachCount = 0;
    this.observeCount = 0;
    this.fleeCount = 0;
    this.completedCount = 0;
    this.destroyed = false;
  }

  update(time, delta, playerTile, providedContext = {}) {
    if (this.destroyed || !this.mode.enabled) return;
    this.lastUpdateAtMs = time;
    this.lastPlayerTile = playerTile || this.lastPlayerTile;
    this.history.record(time, this.scene?.player, playerTile);
    this.view.update?.(time);
    if (!playerTile) return;

    const environment = resolveShadowMinerEnvironment(this.scene, providedContext);
    if (this.state === SHADOW_MINER_STATES.DORMANT) {
      if (time >= this.nextCheckAtMs) this._trySpawn(time, playerTile, environment);
      return;
    }

    const repellent = resolveShadowMinerRepellent(environment, this.config);
    if (
      repellent
      && this.state !== SHADOW_MINER_STATES.FLEEING
      && this.state !== SHADOW_MINER_STATES.VANISHING
    ) {
      this._beginFlee(time, repellent);
    }

    if (this.state === SHADOW_MINER_STATES.SPAWNING) {
      if (time >= this.stateDeadlineMs) this._beginApproach();
    } else if (this.state === SHADOW_MINER_STATES.APPROACHING) {
      this._updateApproach(time, delta);
    } else if (this.state === SHADOW_MINER_STATES.OBSERVING) {
      this.view.facePlayer?.(this.scene?.player?.x);
      if (time >= this.stateDeadlineMs) this._beginVanish(time);
    } else if (this.state === SHADOW_MINER_STATES.FLEEING) {
      this._updateFlee(time, delta);
    } else if (
      this.state === SHADOW_MINER_STATES.VANISHING
      && time >= this.stateDeadlineMs
    ) {
      this._finishVanish(time);
    }
  }

  forceSpawn(
    playerTile = this.lastPlayerTile,
    time = this.scene?.time?.now || 0,
    providedContext = {},
  ) {
    if (!this.mode.enabled || this.state !== SHADOW_MINER_STATES.DORMANT || !playerTile) {
      return false;
    }
    const environment = resolveShadowMinerEnvironment(this.scene, providedContext);
    return this._trySpawn(time, playerTile, environment, true);
  }

  getHealthSnapshot() {
    return Object.freeze({
      id: this.config.id,
      ready: !this.destroyed && this.mode.enabled,
      reviewMode: this.mode.review,
      dev10x: this.mode.dev10x === true,
      rateMultiplier: this.rateMultiplier,
      nextCheckAtMs: this.nextCheckAtMs,
      state: this.state,
      active: this.state !== SHADOW_MINER_STATES.DORMANT,
      encounterBand: this.encounterBand,
      approachPlaybackRate: this.encounterProfile?.approachPlaybackRate || null,
      playbackDelayMs: this.state === SHADOW_MINER_STATES.DORMANT
        ? null
        : Math.max(0, this.lastUpdateAtMs - this.playbackTimeMs),
      distanceToPlayerTiles: this.distanceToPlayerTiles,
      repelledBy: this.repelledBy,
      lastRepelledBy: this.lastRepelledBy,
      spawnCount: this.spawnCount,
      approachCount: this.approachCount,
      observeCount: this.observeCount,
      fleeCount: this.fleeCount,
      completedCount: this.completedCount,
      replayWindow: this.lastWindowSummary,
      history: this.history.getSnapshot?.() || null,
      view: this.view.getSnapshot?.() || null,
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.view.destroy?.();
    this.history.clear?.();
    this.scene = null;
    this.lastPlayerTile = null;
  }

  _trySpawn(time, playerTile, environment, forced = false) {
    const depthTiles = playerTile.ty - (this.scene.config.topAirRows || 0);
    if (!forced && !this.mode.review && depthTiles < this.profile.minimumDepthTiles) {
      this._scheduleNext(time, this.profile.checkIntervalMs);
      return false;
    }

    const encounterBand = resolveShadowMinerEncounterBand(environment, this.config);
    const encounterProfile = this.config.panic.profiles[encounterBand];
    const spawnChance = Math.min(
      1,
      this.profile.spawnChance * encounterProfile.spawnChanceMultiplier,
    );
    if (!forced && this.random() > spawnChance) {
      this._scheduleNext(time, this.profile.checkIntervalMs);
      return false;
    }

    const replayEndAt = time - this.config.interaction.minimumTrailingDelayMs;
    const replayStartAt = time - encounterProfile.replayDelayMs;
    const windowSummary = this.history.getWindowSummary(replayStartAt, replayEndAt);
    if (!windowSummary.ready || !windowSummary.startPose) {
      this._scheduleNext(time, this.profile.placementRetryMs);
      return false;
    }
    const spawned = this.view.spawn?.({
      pose: windowSummary.startPose,
      visualIntensity: encounterProfile.visualIntensity,
    });
    if (spawned === false) {
      this._scheduleNext(time, this.profile.placementRetryMs);
      return false;
    }

    this.encounterBand = encounterBand;
    this.encounterProfile = encounterProfile;
    this.lastUpdateAtMs = time;
    this.playbackTimeMs = replayStartAt;
    this.encounterEndsAtMs = time + encounterProfile.maximumEncounterMs;
    this.lastWindowSummary = Object.freeze({
      samples: windowSummary.samples,
      travelTiles: windowSummary.travelTiles,
      actionSamples: windowSummary.actionSamples,
    });
    this.distanceToPlayerTiles = this._measureDistanceToPlayer(windowSummary.startPose);
    this.repelledBy = null;
    this.spawnCount += 1;
    this.state = SHADOW_MINER_STATES.SPAWNING;
    this.stateDeadlineMs = time + this.config.timing.spawnMs;
    this.scene.soundSystem?.playApprovedSfxFamily?.(
      this.config.audio.spawnFamily,
      this.config.audio.spawnVolume,
      { rate: this.config.audio.spawnRate },
    );
    return true;
  }

  _beginApproach() {
    this.state = SHADOW_MINER_STATES.APPROACHING;
    this.approachCount += 1;
  }

  _updateApproach(time, delta) {
    const elapsedMs = Math.max(0, Number(delta) || 0);
    const latestPlaybackAt = time - this.config.interaction.minimumTrailingDelayMs;
    this.playbackTimeMs = Math.min(
      latestPlaybackAt,
      this.playbackTimeMs + elapsedMs * this.encounterProfile.approachPlaybackRate,
    );
    const pose = this.history.sampleAt(this.playbackTimeMs);
    if (!pose || this.view.applyPose?.(pose) === false) {
      this._beginVanish(time);
      return;
    }
    this.distanceToPlayerTiles = this._measureDistanceToPlayer(pose);
    const nearPlayer = Number.isFinite(this.distanceToPlayerTiles)
      && this.distanceToPlayerTiles <= this.config.interaction.nearPlayerDistanceTiles;
    if (
      nearPlayer
      || this.playbackTimeMs >= latestPlaybackAt
      || time >= this.encounterEndsAtMs
    ) {
      this._beginObserve(time);
    }
  }

  _beginObserve(time) {
    this.state = SHADOW_MINER_STATES.OBSERVING;
    this.stateDeadlineMs = time + this.encounterProfile.observeMs;
    this.observeCount += 1;
    this.view.facePlayer?.(this.scene?.player?.x);
  }

  _beginFlee(time, repellent) {
    this.repelledBy = repellent;
    this.lastRepelledBy = repellent;
    this.state = SHADOW_MINER_STATES.FLEEING;
    this.stateDeadlineMs = time + this.config.interaction.fleeDurationMs;
    this.fleeCount += 1;
    this.view.setFleeing?.(true);
  }

  _updateFlee(time, delta) {
    const elapsedMs = Math.max(0, Number(delta) || 0);
    this.playbackTimeMs -= elapsedMs * this.config.interaction.fleePlaybackRate;
    const pose = this.history.sampleAt(this.playbackTimeMs);
    if (pose) this.view.applyPose?.(pose);
    if (!pose || time >= this.stateDeadlineMs) this._beginVanish(time);
  }

  _beginVanish(time) {
    if (this.state === SHADOW_MINER_STATES.VANISHING) return;
    this.view.vanish?.();
    this.state = SHADOW_MINER_STATES.VANISHING;
    this.stateDeadlineMs = time + this.config.timing.vanishMs;
  }

  _finishVanish(time) {
    this.view.hide?.();
    this.completedCount += 1;
    this.state = SHADOW_MINER_STATES.DORMANT;
    this.stateDeadlineMs = 0;
    this.encounterEndsAtMs = 0;
    this.encounterBand = null;
    this.encounterProfile = null;
    this.playbackTimeMs = 0;
    this.distanceToPlayerTiles = null;
    this.repelledBy = null;
    this._scheduleNext(time, this.profile.checkIntervalMs);
  }

  _measureDistanceToPlayer(pose) {
    const player = this.scene?.player;
    if (!pose || !Number.isFinite(player?.x) || !Number.isFinite(player?.y)) {
      return null;
    }
    return distanceBetween(pose, player) / this.scene.config.tileSize;
  }

  _scaledDelay(delayMs) {
    return delayMs / Math.max(1, this.rateMultiplier);
  }

  _scheduleNext(time, delayMs) {
    this.nextCheckAtMs = time + this._scaledDelay(delayMs);
  }
}
