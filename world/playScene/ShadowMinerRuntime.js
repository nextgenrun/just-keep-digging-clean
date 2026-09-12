import { ShadowMinerWorkLoop } from "./ShadowMinerWorkLoop.js";
import { SHADOW_MINER_WORK } from "../../values/shadowMinerWork.js";
import {
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_REPELLENTS,
  SHADOW_MINER_STATES,
  resolveShadowMinerMode,
} from "../../values/shadowMiner.js";
import {
  resolveShadowMinerEncounterBand,
  resolveShadowMinerDepthProfile,
  resolveShadowMinerEnvironment,
  resolveShadowMinerLightResponse,
} from "./ShadowMinerEncounterContext.js";
import { ShadowMinerPoseHistory } from "./ShadowMinerPoseHistory.js";
import { ShadowMinerView } from "./ShadowMinerView.js";
import { createShadowMinerRuntimeSnapshot } from "./shadowMinerRuntimeSnapshot.js";
import { createShadowMinerSpawnPlan } from "./shadowMinerSpawnPlan.js";
import { playShadowMinerArrivalAwareness } from "./shadowMinerArrivalAwareness.js";
import { resolveShadowMinerGroundedPose } from "./shadowMinerGrounding.js";
import {
  isShadowMinerPoseInsideCamera,
  measureShadowMinerDistanceToPlayer,
  selectShadowMinerAdmissionPose,
} from "./shadowMinerAdmission.js";

function readPlayerActionContext(scene) {
  const action = scene?.playerRigContact?.getActionSnapshot?.();
  const targetTile = action?.targetTile;
  if (!action || !targetTile) return null;
  return {
    ...action,
    tileType: scene?.worldModel?.getTileType?.(targetTile.tx, targetTile.ty),
  };
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
    this.depthProfile = null;
    this.lastDepthProfile = null;
    this.behaviorPlan = null;
    this.lastBehaviorPlan = null;
    this.playbackTimeMs = 0;
    this.observeActionWindow = null;
    this.observeActionPlaybackMs = 0;
    this.lastUpdateAtMs = 0;
    this.lastPlayerTile = null;
    this.lastWindowSummary = null;
    this.distanceToPlayerTiles = null;
    this.repelledBy = null;
    this.lastRepelledBy = null;
    this.lastEntryVisible = null;
    this.lastEntryDistanceTiles = null;
    this.lastAwarenessCue = null;
    this.lightExposureProgress = 0;
    this.lightPressure = 0;
    this.lightSource = null;
    this.lastLightResponse = null;
    this.lastSpawnAttempt = null;
    this.spawnCount = 0;
    this.approachCount = 0;
    this.observeCount = 0;
    this.fleeCount = 0;
    this.completedCount = 0;
    this.destroyed = false;
    this.workLoop = new ShadowMinerWorkLoop(this);
    this.spawnedAtMs = 0;
  }

  update(time, delta, playerTile, providedContext = {}) {
    if (this.destroyed || !this.mode.enabled) return;
    this.lastUpdateAtMs = time;
    this.lastPlayerTile = playerTile || this.lastPlayerTile;
    this.history.record(
      time,
      this.scene?.player,
      playerTile,
      readPlayerActionContext(this.scene),
    );
    this.view.update?.(time);
    if (!playerTile) return;

    const environment = resolveShadowMinerEnvironment(
      this.scene,
      providedContext,
      playerTile,
    );
    if (this.state === SHADOW_MINER_STATES.DORMANT) {
      if (time >= this.nextCheckAtMs) this._trySpawn(time, playerTile, environment);
      return;
    }

    if (
      this.state !== SHADOW_MINER_STATES.FLEEING
      && this.state !== SHADOW_MINER_STATES.VANISHING
    ) {
      const repellent = this._updateLightInteraction(time, delta, environment);
      if (repellent) this._beginFlee(time, repellent);
    }

    if (this.state === SHADOW_MINER_STATES.SPAWNING) {
      if (time >= this.stateDeadlineMs) this._beginApproach();
    } else if (this.state === SHADOW_MINER_STATES.APPROACHING) {
      this._updateApproach(time, delta);
    } else if (this.state === SHADOW_MINER_STATES.OBSERVING) {
      this._updateObserve(time, delta);
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
    const environment = resolveShadowMinerEnvironment(
      this.scene,
      providedContext,
      playerTile,
    );
    return this._trySpawn(time, playerTile, environment, true);
  }

  getHealthSnapshot() {
    return createShadowMinerRuntimeSnapshot(this);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.view.destroy?.();
    this.workLoop.reset();
    this.history.clear?.();
    this.scene = null;
    this.lastPlayerTile = null;
  }

  _trySpawn(time, playerTile, environment, forced = false) {
    const reject = (reason, delayMs) => {
      this.lastSpawnAttempt = { time, forced, spawned: false, reason };
      this._scheduleNext(time, delayMs);
      return false;
    };
    const depthTiles = playerTile.ty - (this.scene.config.topAirRows || 0);
    if (!forced && !this.mode.review && depthTiles < this.profile.minimumDepthTiles) {
      return reject("depth", this.profile.checkIntervalMs);
    }

    const encounterBand = resolveShadowMinerEncounterBand(environment, this.config);
    const encounterProfile = this.config.panic.profiles[encounterBand];
    const depthMeters = this.mode.reviewDepthMeters ?? environment.depthMeters;
    const depthProfile = resolveShadowMinerDepthProfile(
      depthMeters,
      this.config,
    );
    const spawnChance = Math.min(
      1,
      this.profile.spawnChance * encounterProfile.spawnChanceMultiplier,
    );
    if (!forced && this.random() > spawnChance) {
      return reject("chance", this.profile.checkIntervalMs);
    }

    const spawnPlan = createShadowMinerSpawnPlan({
      config: this.config,
      history: this.history,
      scene: this.scene,
      mode: this.mode,
      random: this.random,
      time,
      encounterBand,
      encounterProfile,
      depthProfile,
      depthMeters,
      forced,
      selectAdmissionPose: (...args) => selectShadowMinerAdmissionPose(...args),
    });
    if (!spawnPlan) {
      return reject("placement", this.profile.placementRetryMs);
    }
    const {
      behaviorPlan,
      replayStartAt,
      admissionPose,
      admittedWindow,
    } = spawnPlan;
    const groundedAdmissionPose = resolveShadowMinerGroundedPose(
      this.scene,
      this.config,
      admissionPose,
    );
    if (!groundedAdmissionPose) {
      return reject("ground", this.profile.placementRetryMs);
    }
    const admissionDistance = measureShadowMinerDistanceToPlayer(
      this.scene,
      groundedAdmissionPose,
    );
    if (
      Number.isFinite(admissionDistance)
      && admissionDistance < this.config.behavior.minimumPersonalSpaceTiles
    ) {
      return reject("space", this.profile.placementRetryMs);
    }
    const spawned = this.view.spawn?.({
      pose: groundedAdmissionPose,
      visualIntensity: behaviorPlan.visualIntensity,
      time,
    });
    if (spawned === false) {
      return reject("texture", this.profile.placementRetryMs);
    }

    this.encounterBand = encounterBand;
    this.encounterProfile = encounterProfile;
    this.depthProfile = depthProfile;
    this.lastDepthProfile = depthProfile;
    this.behaviorPlan = behaviorPlan;
    this.lastBehaviorPlan = behaviorPlan;
    this.lastUpdateAtMs = time;
    this.playbackTimeMs = groundedAdmissionPose.time;
    this.encounterEndsAtMs = time + behaviorPlan.maximumEncounterMs;
    this.lastWindowSummary = Object.freeze({
      samples: admittedWindow.samples,
      travelTiles: admittedWindow.travelTiles,
      actionSamples: admittedWindow.actionSamples,
      selectedStartOffsetMs: groundedAdmissionPose.time - replayStartAt,
      selectedStartAction: groundedAdmissionPose.action === true,
    });
    this.distanceToPlayerTiles = measureShadowMinerDistanceToPlayer(
      this.scene,
      groundedAdmissionPose,
    );
    this.lastEntryDistanceTiles = this.distanceToPlayerTiles;
    this.lastEntryVisible = isShadowMinerPoseInsideCamera(
      this.scene,
      this.config,
      groundedAdmissionPose,
    );
    this.repelledBy = null;
    this.lightExposureProgress = 0;
    this.lightPressure = 0;
    this.lightSource = null;
    this.lastLightResponse = null;
    this.lastSpawnAttempt = { time, forced, spawned: true, reason: null };
    this.spawnCount += 1;
    this.spawnedAtMs = time;
    this.workLoop.reset();
    this.state = SHADOW_MINER_STATES.SPAWNING;
    this.stateDeadlineMs = time + this.config.timing.spawnMs
      + behaviorPlan.approachHoldMs;
    this.lastAwarenessCue = playShadowMinerArrivalAwareness(
      this.scene,
      this.config,
      groundedAdmissionPose,
      behaviorPlan.visualIntensity,
    );
    this.scene.soundSystem?.playApprovedSfxFamily?.(
      this.config.audio.spawnFamily,
      this.config.audio.spawnVolume,
      { rate: this.config.audio.spawnRate * behaviorPlan.audioRateMultiplier },
    );
    return true;
  }

  _beginApproach() {
    this.state = SHADOW_MINER_STATES.APPROACHING;
    this.approachCount += 1;
  }

  _updateApproach(time, delta) {
    if (time - this.spawnedAtMs >= SHADOW_MINER_WORK.maximumApproachMs) {
      this._beginObserve(time);
      return;
    }
    const elapsedMs = Math.max(0, Number(delta) || 0);
    const lightResponse = this.config.interaction.lightResponse;
    const lightSlowMultiplier = Math.max(
      lightResponse.minimumApproachRateMultiplier,
      1 - lightResponse.approachSlowMaximum * this.lightPressure,
    );
    const latestPlaybackAt = time - this.config.interaction.minimumTrailingDelayMs;
    this.playbackTimeMs = Math.min(
      latestPlaybackAt,
      this.playbackTimeMs
        + elapsedMs
          * this.behaviorPlan.approachPlaybackRate
          * lightSlowMultiplier,
    );
    const groundedPose = resolveShadowMinerGroundedPose(
      this.scene,
      this.config,
      this.history.sampleAt(this.playbackTimeMs),
    );
    const pose = this.workLoop.limitTravel(groundedPose, delta);
    if (!pose) {
      this._beginObserve(time);
      return;
    }
    const candidateDistanceTiles = measureShadowMinerDistanceToPlayer(
      this.scene,
      pose,
    );
    const stopDistanceTiles = Math.max(
      this.config.behavior.minimumPersonalSpaceTiles,
      this.behaviorPlan.nearPlayerDistanceTiles,
    );
    if (
      Number.isFinite(candidateDistanceTiles)
      && candidateDistanceTiles <= stopDistanceTiles
    ) {
      this._beginObserve(time);
      return;
    }
    if (this.view.applyPose?.(pose) === false) {
      this._beginVanish(time);
      return;
    }
    this.distanceToPlayerTiles = candidateDistanceTiles;
    if (
      this.playbackTimeMs >= latestPlaybackAt
      || time >= this.encounterEndsAtMs
    ) {
      this._beginObserve(time);
    }
  }

  _beginObserve(time) {
    this.state = SHADOW_MINER_STATES.OBSERVING;
    this.observeActionWindow = null;
    this.observeActionPlaybackMs = 0;
    this.stateDeadlineMs = time + Math.max(this.behaviorPlan.observeMs, SHADOW_MINER_WORK.minimumObserveMs);
    this.observeCount += 1;
    this.view.phantomDig?.cancelAction?.();
    this.view.beginObserve?.(time, this.scene?.player?.x);
  }

  _updateObserve(time, delta) {
    this.distanceToPlayerTiles = measureShadowMinerDistanceToPlayer(this.scene, this.view.anchor);
    this.workLoop.update(time);
    if (time >= this.stateDeadlineMs) this._beginVanish(time);
  }

  _applyObserveActionPose() {
    if (!this.observeActionWindow) return false;
    const pose = this.history.sampleAt(this.observeActionPlaybackMs);
    if (!pose?.action) return false;
    return this.view.applyAnchoredActionPose?.(pose) === true;
  }

  _updateLightInteraction(time, delta, environment) {
    const distance = measureShadowMinerDistanceToPlayer(this.scene, this.view.anchor);
    if ((Number.isFinite(distance) && distance > SHADOW_MINER_WORK.torchRangeTiles)
      || time - this.spawnedAtMs < SHADOW_MINER_WORK.torchArrivalGraceMs) {
      environment = { ...environment, torchActive: false, torchIntensity: 0 };
    }
    const responseConfig = this.config.interaction.lightResponse;
    const elapsedMs = Math.min(
      responseConfig.maximumFrameMs,
      Math.max(0, Number(delta) || 0),
    );
    const response = resolveShadowMinerLightResponse(
      environment,
      this.depthProfile,
      this.config,
    );
    if (response) {
      this.lightExposureProgress = Math.min(
        1,
        this.lightExposureProgress
          + elapsedMs / Math.max(Number.EPSILON, response.repelDelayMs),
      );
      const attackRatio = Math.min(
        1,
        elapsedMs / Math.max(Number.EPSILON, responseConfig.visualAttackMs),
      );
      this.lightPressure += (
        response.visualPressure - this.lightPressure
      ) * attackRatio;
      this.lightSource = response.source;
      this.lastLightResponse = response;
    } else {
      this.lightExposureProgress = Math.max(
        0,
        this.lightExposureProgress
          - elapsedMs / Math.max(Number.EPSILON, responseConfig.exposureDecayMs),
      );
      this.lightPressure = Math.max(
        0,
        this.lightPressure
          - elapsedMs / Math.max(Number.EPSILON, responseConfig.visualReleaseMs),
      );
      if (this.lightPressure <= 0) this.lightSource = null;
    }
    this.view.setLightExposure?.({
      pressure: this.lightPressure,
      source: this.lightSource,
      progress: this.lightExposureProgress,
      time,
    });
    return response && this.lightExposureProgress >= 1
      ? response.source
      : null;
  }

  _beginFlee(time, repellent) {
    this.repelledBy = repellent;
    this.lastRepelledBy = repellent;
    this.state = SHADOW_MINER_STATES.FLEEING;
    this.stateDeadlineMs = time + this.behaviorPlan.fleeDurationMs;
    this.fleeCount += 1;
    if (this.view.beginFlee) {
      this.view.beginFlee({
        time,
        repellent,
        playerWorldX: this.scene?.player?.x,
      });
    } else {
      this.view.setFleeing?.(true);
    }
    const starRepellent = repellent === SHADOW_MINER_REPELLENTS.STAR;
    this.scene.soundSystem?.playApprovedSfxFamily?.(
      this.config.audio.repelFamily,
      starRepellent
        ? this.config.audio.starRepelVolume
        : this.config.audio.torchRepelVolume,
      {
        rate: (
          starRepellent
            ? this.config.audio.starRepelRate
            : this.config.audio.torchRepelRate
        ) * this.behaviorPlan.audioRateMultiplier,
      },
    );
  }

  _updateFlee(time, delta) {
    const elapsedMs = Math.max(0, Number(delta) || 0);
    this.playbackTimeMs -= elapsedMs * this.behaviorPlan.fleePlaybackRate;
    const pose = this.workLoop.limitTravel(this.history.sampleAt(this.playbackTimeMs), delta, true);
    if (pose) {
      const applied = this.view.applyFleePose?.(
        pose,
        time,
        this.scene?.player?.x,
      );
      const fallbackApplied = applied === undefined
        ? this.view.applyPose?.(pose)
        : applied;
      if (fallbackApplied === false) {
        this._beginVanish(time);
        return;
      }
    }
    if (!pose || time >= this.stateDeadlineMs) this._beginVanish(time);
  }

  _beginVanish(time) {
    if (this.state === SHADOW_MINER_STATES.VANISHING) return;
    this.view.vanish?.();
    this.state = SHADOW_MINER_STATES.VANISHING;
    this.stateDeadlineMs = time + this.config.timing.vanishMs;
  }

  _finishVanish(time) {
    this.view.hide?.({ preserveResidue: true });
    this.completedCount += 1;
    this.state = SHADOW_MINER_STATES.DORMANT;
    this.stateDeadlineMs = 0;
    this.encounterEndsAtMs = 0;
    this.encounterBand = null;
    this.encounterProfile = null;
    this.depthProfile = null;
    this.behaviorPlan = null;
    this.playbackTimeMs = 0;
    this.observeActionWindow = null;
    this.observeActionPlaybackMs = 0;
    this.distanceToPlayerTiles = null;
    this.repelledBy = null;
    this.lightExposureProgress = 0;
    this.lightPressure = 0;
    this.lightSource = null;
    this.lastLightResponse = null;
    this.view.setLightExposure?.({
      pressure: 0,
      source: null,
      progress: 0,
      time,
    });
    this._scheduleNext(time, this.profile.checkIntervalMs);
  }

  _scaledDelay(delayMs) {
    return delayMs / Math.max(1, this.rateMultiplier);
  }

  _scheduleNext(time, delayMs) {
    this.nextCheckAtMs = time + this._scaledDelay(delayMs);
  }
}
