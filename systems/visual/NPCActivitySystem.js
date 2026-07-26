import {
  NPC_ACTIVITY_CONFIG,
  resolveNpcActivitiesEnabled,
} from "../../values/npcActivityConfig.js";
import {
  createNpcActivityActor,
  finishNpcActor,
  restoreNpcBase,
  startNpcPose,
  updateNpcActorVisual,
  updateNpcQuietLoop,
} from "./npcActivityVisuals.js";

function tileDistance(playerTile, npc) {
  if (!playerTile) return Number.POSITIVE_INFINITY;
  return Math.abs(playerTile.tx - npc.tx) + Math.abs(playerTile.ty - npc.ty);
}

function visualAnchorError(actor) {
  const visuals = [actor.baseVisual, actor.quietOverlay, actor.overlay];
  return visuals.reduce((maximum, visual) => Math.max(
    maximum,
    Math.abs((visual?.x ?? actor.anchorX) - actor.anchorX),
    Math.abs((visual?.y ?? actor.anchorY) - actor.anchorY),
  ), 0);
}

export class NPCActivitySystem {
  constructor(
    scene,
    assetKeys,
    config = NPC_ACTIVITY_CONFIG,
    random = Math.random,
  ) {
    this.scene = scene;
    this.assetKeys = assetKeys;
    this.config = config;
    this.random = random;
    this.enabled = resolveNpcActivitiesEnabled(config);
    this.actors = [];
    this.actorById = new Map();
    this.startedAt = null;
    this.nextTownEventAt = null;
    this.lastHealthPublishAt = Number.NEGATIVE_INFINITY;
    this.missingAssets = [];
    this.readyReported = false;
  }

  registerNPC(npc, baseVisual, presentation) {
    if (!this.enabled || !baseVisual) return null;
    const merchant = this.config.merchants[npc.merchantId];
    const keys = npc.activityKeys
      || this.assetKeys.npcs.merchantActivities?.[npc.merchantId];
    if (!merchant || !keys) {
      this._recordMissing(npc.merchantId, ["configuration"]);
      return null;
    }
    const missing = this.config.poseAssetIds.filter(poseId => (
      !keys[poseId] || !this.scene.textures.exists(keys[poseId])
    ));
    if (missing.length > 0) {
      this._recordMissing(npc.merchantId, missing);
      return null;
    }
    const actor = createNpcActivityActor(
      this.scene,
      npc,
      merchant,
      keys,
      baseVisual,
      presentation,
      this.config,
    );
    this.actors.push(actor);
    this.actorById.set(npc.merchantId, actor);
    this._publishHealth(this.scene.time?.now || 0, true);
    return actor;
  }

  update(time, delta, playerTile) {
    if (!this.enabled || this.actors.length === 0) return;
    this._initializeSchedule(time);
    const safeDelta = Math.min(
      Math.max(delta || 0, 0),
      this.config.performance.maxDeltaMs,
    );
    for (const actor of this.actors) {
      const distance = tileDistance(playerTile, actor.npc);
      actor.playerNear = distance
        <= this.config.schedule.playerReactionRangeTiles;
      if (!actor.playerNear) actor.reactedDuringVisit = false;
      if (actor.state !== "quiet" && time >= actor.stateEndsAt) {
        finishNpcActor(actor, time, this.config, this.random);
      }
    }
    let activeCount = this._activeCount();
    for (const actor of this.actors) {
      if (
        actor.playerNear
        && !actor.reactedDuringVisit
        && time >= actor.reactionReadyAt
        && (
          actor.state !== "quiet"
          || activeCount < this.config.schedule.maxSimultaneousActivities
        )
      ) {
        const wasQuiet = actor.state === "quiet";
        this._startActivity(actor, "player", time);
        actor.reactedDuringVisit = true;
        actor.reactionReadyAt = time
          + this.config.schedule.playerReactionCooldownMs;
        if (wasQuiet) activeCount += 1;
      }
    }
    const dueActors = this.actors
      .filter(actor => (
        actor.state === "quiet"
        && !actor.playerNear
        && time >= actor.nextEventAt
      ))
      .sort((a, b) => a.nextEventAt - b.nextEventAt);
    if (time >= this.nextTownEventAt) {
      for (const actor of dueActors) {
        if (activeCount >= this.config.schedule.maxSimultaneousActivities) break;
        this._startScheduledActivity(actor, time);
        activeCount += 1;
      }
    }
    for (const actor of this.actors) {
      updateNpcQuietLoop(actor, time, this.config, this.random);
      updateNpcActorVisual(actor, time, safeDelta, this.config);
    }
    this._publishHealth(time);
  }

  settleMerchant(merchantId, time = this.scene.time?.now || 0) {
    const actor = this.actorById.get(merchantId);
    if (!actor) return false;
    finishNpcActor(actor, time, this.config, this.random, true);
    updateNpcActorVisual(
      actor,
      time,
      this.config.render.crossfadeOutMs,
      this.config,
    );
    return true;
  }

  getVisualPosition(merchantId) {
    const actor = this.actorById.get(merchantId);
    return actor ? { x: actor.anchorX, y: actor.anchorY } : null;
  }

  getHealthSnapshot() {
    const expected = this.config.health.expectedActorCount;
    const anchorViolationCount = this.actors.filter(actor => (
      visualAnchorError(actor) > this.config.health.anchorTolerancePx
    )).length;
    return {
      enabled: this.enabled,
      anchorLocked: true,
      status: !this.enabled
        ? "disabled"
        : this.missingAssets.length > 0 || anchorViolationCount > 0
        ? "degraded"
        : this.actors.length >= expected ? "healthy" : "initializing",
      actorCount: this.actors.length,
      expectedActorCount: expected,
      activeCount: this._activeCount(),
      anchorViolationCount,
      missingAssets: this.missingAssets.map(entry => ({ ...entry })),
      actors: this.actors.map(actor => ({
        merchantId: actor.npc.merchantId,
        state: actor.state,
        quietFrameId: actor.quietFrameId,
        anchorErrorPx: Number(visualAnchorError(actor).toFixed(4)),
      })),
    };
  }

  destroy() {
    for (const actor of this.actors) {
      actor.overlay?.destroy?.();
      actor.quietOverlay?.destroy?.();
      restoreNpcBase(actor);
    }
    this.actors = [];
    this.actorById.clear();
    globalThis[this.config.health.globalKey] = {
      ...this.getHealthSnapshot(),
      status: "destroyed",
    };
  }

  _initializeSchedule(time) {
    if (this.startedAt !== null) return;
    this.startedAt = time;
    this.nextTownEventAt = time
      + this.config.schedule.initialBaseDelayMs
      + this.random() * this.config.schedule.initialStaggerMs;
    this.actors.forEach((actor, index) => {
      actor.nextEventAt = time
        + this.config.schedule.initialBaseDelayMs
        + index * this.config.schedule.initialStaggerMs
        + this.random() * this.config.schedule.initialStaggerMs;
    });
  }

  _startScheduledActivity(actor, time) {
    const weights = this.config.schedule.weights;
    const total = this.config.ambientActivityIds.reduce(
      (sum, activityId) => sum + weights[activityId],
      0,
    );
    const choice = this.random() * total;
    let cumulative = 0;
    for (const activityId of this.config.ambientActivityIds) {
      cumulative += weights[activityId];
      if (choice <= cumulative) {
        return this._startActivity(actor, activityId, time);
      }
    }
    return this._startActivity(actor, this.config.ambientActivityIds[0], time);
  }

  _startActivity(actor, activityId, time) {
    startNpcPose(actor, activityId, time);
    const quietGap = this.config.schedule.townQuietGapMinMs
      + this.random() * (
        this.config.schedule.townQuietGapMaxMs
        - this.config.schedule.townQuietGapMinMs
      );
    this.nextTownEventAt = actor.stateEndsAt + quietGap;
    return actor;
  }

  _activeCount() {
    return this.actors.filter(actor => actor.state !== "quiet").length;
  }

  _recordMissing(merchantId, activityIds) {
    const entry = { merchantId, activityIds: [...activityIds] };
    this.missingAssets.push(entry);
    globalThis.__jkdHealth?.captureSystemFinding?.({
      key: `${this.config.health.missingAssetCode}:${merchantId}`,
      code: this.config.health.missingAssetCode,
      severity: this.config.health.missingAssetSeverity,
      message: `NPC activity assets missing for ${merchantId}: ${activityIds.join(", ")}`,
      context: entry,
    });
  }

  _publishHealth(time, force = false) {
    if (
      !force
      && time - this.lastHealthPublishAt
        < this.config.performance.healthPublishIntervalMs
    ) return;
    this.lastHealthPublishAt = time;
    const snapshot = this.getHealthSnapshot();
    globalThis[this.config.health.globalKey] = snapshot;
    if (!this.readyReported && snapshot.status === "healthy") {
      this.readyReported = true;
      globalThis.__jkdHealth?.markLifecycle?.(
        this.config.health.readyStage,
        {
          actorCount: snapshot.actorCount,
          anchorLocked: snapshot.anchorLocked,
        },
      );
    }
  }
}
