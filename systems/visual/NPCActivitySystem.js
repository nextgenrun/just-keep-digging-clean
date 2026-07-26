import {
  NPC_ACTIVITY_CONFIG,
  resolveNpcActivitiesEnabled,
  resolveNpcWalkingEnabled,
} from "../../values/npcActivityConfig.js";
import {
  createNpcActivityActor,
  finishNpcActor,
  restoreNpcBase,
  startNpcPose,
  startNpcWalk,
  updateNpcActorVisual,
  updateNpcWalk,
} from "./npcActivityVisuals.js";

function tileDistance(playerTile, npc) {
  if (!playerTile) return Number.POSITIVE_INFINITY;
  return Math.abs(playerTile.tx - npc.tx) + Math.abs(playerTile.ty - npc.ty);
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
    this.walkingEnabled = resolveNpcWalkingEnabled(config);
    this.actors = [];
    this.actorById = new Map();
    this.startedAt = null;
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
    const missing = this.config.activityIds.filter(activityId => (
      !keys[activityId] || !this.scene.textures.exists(keys[activityId])
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
      const playerNear = distance <= this.config.schedule.playerReactionRangeTiles;
      const mustSettle = distance
        <= this.config.schedule.interactionSettleRangeTiles;
      if (!playerNear) actor.reactedDuringVisit = false;
      if ((playerNear || mustSettle) && actor.state === "walk") {
        finishNpcActor(actor, time, this.config, this.random, true);
      }
      if (
        actor.state !== "quiet"
        && actor.state !== "walk"
        && time >= actor.stateEndsAt
      ) {
        finishNpcActor(actor, time, this.config, this.random);
      }
      actor.playerNear = playerNear;
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
        startNpcPose(actor, "player", time);
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
    for (const actor of dueActors) {
      if (activeCount >= this.config.schedule.maxSimultaneousActivities) break;
      this._startScheduledActivity(actor, time);
      activeCount += 1;
    }

    for (const actor of this.actors) {
      if (actor.state === "walk") {
        updateNpcWalk(
          actor,
          time,
          safeDelta,
          this.scene,
          this.config,
          this.random,
        );
      }
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
      this.config.render.crossfadeMs,
      this.config,
    );
    return true;
  }

  getVisualPosition(merchantId) {
    const actor = this.actorById.get(merchantId);
    return actor ? { x: actor.currentX, y: actor.anchorY } : null;
  }

  getHealthSnapshot() {
    const active = this.actors.filter(actor => actor.state !== "quiet");
    const expected = this.config.health.expectedActorCount;
    return {
      enabled: this.enabled,
      walkingEnabled: this.walkingEnabled,
      status: !this.enabled
        ? "disabled"
        : this.missingAssets.length > 0
        ? "degraded"
        : this.actors.length >= expected ? "healthy" : "initializing",
      actorCount: this.actors.length,
      expectedActorCount: expected,
      activeCount: active.length,
      movingCount: active.filter(actor => actor.state === "walk").length,
      missingAssets: this.missingAssets.map(entry => ({ ...entry })),
      actors: this.actors.map(actor => ({
        merchantId: actor.npc.merchantId,
        state: actor.state,
        offsetPx: Number((actor.currentX - actor.anchorX).toFixed(2)),
      })),
    };
  }

  destroy() {
    for (const actor of this.actors) {
      actor.overlay?.destroy?.();
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
    this.actors.forEach((actor, index) => {
      actor.nextEventAt = time
        + this.config.schedule.initialBaseDelayMs
        + index * this.config.schedule.initialStaggerMs
        + this.random() * this.config.schedule.initialStaggerMs;
    });
  }

  _startScheduledActivity(actor, time) {
    const weights = this.config.schedule.weights;
    const total = weights.work + weights.rare
      + (this.walkingEnabled ? weights.walk : 0);
    const choice = this.random() * total;
    if (choice < weights.work) return startNpcPose(actor, "work", time);
    if (choice < weights.work + weights.rare) {
      return startNpcPose(actor, "rare", time);
    }
    return startNpcWalk(actor, time, this.scene, this.config, this.random);
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
          walkingEnabled: snapshot.walkingEnabled,
        },
      );
    }
  }
}
