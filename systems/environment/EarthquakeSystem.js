import { collectLocalFallZones, resolveRockLandingRow } from "./earthquakeLocalHazards.js";
/**
 * EarthquakeSystem
 *
 * Manages seismic hazards: earthquakes, cave-ins, falling rocks.
 * Uses a state machine: idle → warning → earthquake → aftermath → idle.
 *
 * PLAYER FEEDBACK: EarthquakeFeedbackUI owns one compact generated-art status
 * card. The world system requests one restrained amber flash at quake start;
 * mutation pulses never recreate warning text or full-screen flashes.
 *
 * CAVE-IN RESTORATION: After collapse, each destroyed tile is queued
 * for re-spawn as rubble (partial HP, same type as the original).
 * The player must dig through the rubble to escape — they get "stuck"
 * until they clear the debris.
 */

import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  EARTHQUAKE_CONFIG,
  EARTHQUAKE_SUPPRESSION_UPGRADE,
} from "../../values/earthquakes.js";
import { PLAYER_VOICE_CONFIG } from "../../values/playerVoiceCharacterLeoV1.generated.js";
import {
  expandFallZoneCandidate,
  resolveFallZoneGeometry,
  rockSweptAabbCrossesBody,
} from "./earthquakeFallZoneMath.js";

const MUTABLE_TYPES = new Set([
  TILE_TYPES.DIRT,
  TILE_TYPES.STONE,
  TILE_TYPES.DARK_DIRT_NORMAL,
  TILE_TYPES.DARK_DIRT_STRONG,
]);

const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const tileKey = (tx, ty) => `${tx},${ty}`;
const restoreDueAt = entry => Number.isFinite(entry?.dueAt)
  ? entry.dueAt
  : (Number(entry?.scheduledAt) || 0) + Math.max(0, Number(entry?.delayMs) || 0);

export class EarthquakeSystem {
  constructor(scene, config = EARTHQUAKE_CONFIG, clockNow = null) {
    this.scene = scene;
    this.clockNow = clockNow;
    this.heartbeat = 0;
    this.health = { started: 0, completed: 0, queued: 0, rocks: 0, hits: 0, cancelledCeilings: 0, emptySearches: 0 };
    this._eventFallZonesQueued = 0;
    this._localFallTimer = 0;
    this.config = config;
    this.state = "idle";
    this.epicenter = null;
    this.intensity = null;
    this.stateRemaining = 0;
    this.stateTotalMs = 0;
    this.nextEventMs = 0;
    this.nextEventSchedule = "repeat";
    this.mutationTimer = 0;
    this.caveIns = [];
    this.fallingRocks = [];
    this.chainTimer = 0;
    this.chainPending = false;
    this.impactCooldown = 0;
    this.paused = false;
    this.suppressed = false;
    this._firstEligibleScheduleApplied = false;

    this._restoreQueue = [];
    this._restoreQueueSorted = true;
    this._trapGuidanceShown = false;
    this._openedPassageKeys = new Set();
    this._openedPassageTiles = [];
    this._nextFallZoneId = 0;

    this.stressFx = scene.add.graphics().setDepth(18);
    this._stressTimer = 0;
    this._scheduleNext();
    this.syncSuppression();
    this._installDebugApi();
    this._log("initialized", this.getStatus());
  }

  update(delta) {
    this.heartbeat += 1;
    if (this.syncSuppression() || !this.config.enabled || this.paused) return;
    const dt = Math.min(delta, 100);
    this.impactCooldown = Math.max(0, this.impactCooldown - dt);
    this._updateFallingRocks(dt);
    this._updateCaveIns(dt);

    // ===== NEW: Update rubble restoration =====
    this._updateRubbleRestoration(dt);

    this._stressTimer -= dt;
    if (this._stressTimer <= 0) {
      this._stressTimer = 500;
      this._drawInstability();
    }

    if (this.chainPending) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) {
        this.chainPending = false;
        const candidate = this._findCeilingCandidates(1)[0];
        if (candidate) {
          const queued = this._queueCaveInGroup(candidate, true);
          if (queued > 0) this._announceAftershock(queued);
          this._log("chain reaction warning", { ...candidate, queued });
        }
      }
    }

    if (this.state === "idle") {
      if (this._hasPendingFallZoneHazards()) return;
      this.nextEventMs -= dt;
      if (this.nextEventMs <= 0) this.start();
      return;
    }

    this.stateRemaining -= dt;
    if (this.state === "warning") {
      this._warningFx(dt);
      if (this.stateRemaining <= 0) this._beginQuake();
      return;
    }

    if (this.state === "earthquake") {
      this._quakeFx(dt);
      this._localFallTimer -= dt;
      if (this._localFallTimer <= 0) {
        this._localFallTimer = this.config.localHazards.replenishMs;
        if (this.caveIns.length + this.fallingRocks.length < this.config.localHazards.maximumLive) {
          const candidate = this._findCeilingCandidates(1)[0];
          if (candidate) this._queueCaveInGroup(candidate, false);
          else this.health.emptySearches += 1;
        }
      }
      this.mutationTimer -= dt;
      if (this.mutationTimer <= 0) {
        this.mutationTimer += this.config.mutationPulseMs;
        this._mutateNearbyTiles();
      }
      if (this.stateRemaining <= 0) this._beginAftermath();
      return;
    }

    if (
      this.state === "aftermath"
      && this.stateRemaining <= 0
      && !this._hasPendingFallZoneHazards()
    ) {
      this._finishEvent();
    }
  }

  start(forcedIntensity = null) {
    if (this.syncSuppression()) return false;
    if (this.state !== "idle") this.cancelActiveHazards();
    this._trapGuidanceShown = false;
    this._openedPassageKeys.clear();
    this._openedPassageTiles = [];
    this.scene.earthquakeHazardOverlay?.clear?.();
    this.epicenter = this._selectWorldEpicenter();
    if (!this.epicenter) {
      this._scheduleNext({
        firstEligible: this.nextEventSchedule === "first",
      });
      this._log("start deferred: no valid epicenter", {
        nextEventMs: Math.round(this.nextEventMs),
      });
      return false;
    }
    const depth = this.epicenter?.depth ?? this.config.minimumDepth;
    this.intensity = forcedIntensity && this.config.intensities[forcedIntensity]
      ? forcedIntensity
      : this._rollIntensity(depth);
    const cfg = this.config.intensities[this.intensity];
    this._eventFallZonesQueued = 0;
    this._localFallTimer = this.config.localHazards.replenishMs;
    this.health.started += 1;
    this.state = "warning";
    this._firstEligibleScheduleApplied = true;
    this.stateRemaining = rand(...cfg.warningMs);
    this.stateTotalMs = this.stateRemaining;
    this.scene.earthquakeFeedbackUI?.beginEvent?.();
    const warningProximity = this._getPlayerProximity(
      this.config.playerFeedback?.audioRadiusTiles,
    );
    const warningSound = warningProximity > 0
      ? this.scene.soundSystem?.playSeismicWarning?.(warningProximity)
      : null;
    if (!warningSound) this._playTone("rumble");
    if (warningProximity > 0) {
      this._primePlayerImpactReaction();
      this.scene.soundSystem?.playPlayerVoiceEvent?.(
        PLAYER_VOICE_CONFIG.eventIds.earthquakeWarning,
        {
          intensity: this.intensity,
          proximity: warningProximity,
          tags: this._getVoiceContextTags(depth),
        },
      );
    }

    this._log("warning started", {
      intensity: this.intensity,
      epicenter: this.epicenter,
      depth,
      durationMs: Math.round(this.stateRemaining),
    });
    return true;
  }

  setPaused(paused) {
    const nextPaused = Boolean(paused);
    const wasPaused = this.paused;
    this.paused = nextPaused;
    if (
      !nextPaused
      && !this.suppressed
      && !this._firstEligibleScheduleApplied
    ) {
      this._firstEligibleScheduleApplied = true;
      if (this._getSurvivedEarthquakeCount() === 0 && this.state === "idle") {
        this._scheduleNext({ firstEligible: true });
      }
    }
    if (nextPaused === wasPaused) return;
    if (nextPaused) this.stopAudio();
    this._log(this.paused ? "paused" : "resumed");
  }

  _hasPendingFallZoneHazards() {
    return this.chainPending === true
      || (this.caveIns?.length ?? 0) > 0
      || (this.fallingRocks?.length ?? 0) > 0;
  }

  _getSurvivedEarthquakeCount() {
    const stats = this.scene.retentionProgressSystem
      ?.getJournalSnapshot?.()?.stats;
    return Math.max(0, Number(stats?.earthquakesSurvived) || 0);
  }

  _getVoiceContextTags(depth) {
    const tags = [
      this._getSurvivedEarthquakeCount() > 0 ? "repeat" : "first",
      this.intensity,
    ];
    if (depth >= PLAYER_VOICE_CONFIG.deepReturnMinimumDepth) tags.push("deep");
    return tags;
  }

  _primePlayerImpactReaction() {
    const animationKey = this.scene.playerAssetProfile?.earthquakeReactAnim;
    if (!animationKey) return;
    void this.scene.playerDeferredAnimationAssetController
      ?.ensureForAnimation?.(animationKey);
  }

  syncSuppression() {
    const upgradeId = this.config.suppression?.id
      || EARTHQUAKE_SUPPRESSION_UPGRADE.id;
    const nextSuppressed = Number(
      this.scene?.upgradeSystem?.getUpgradeLevel?.(upgradeId) || 0,
    ) > 0;
    const currentSuppressed = this.suppressed === true;
    if (nextSuppressed === currentSuppressed) {
      this.suppressed = currentSuppressed;
      return currentSuppressed;
    }

    this.suppressed = nextSuppressed;
    if (this.suppressed) {
      this.cancelActiveHazards();
      this.nextEventMs = Number.POSITIVE_INFINITY;
      this.scene.earthquakeTileFeedbackSystem?.clear?.();
      this._log("permanently suppressed by upgrade");
    } else {
      this._scheduleNext();
      this._log("suppression removed");
    }
    return this.suppressed;
  }

  cancelActiveHazards() {
    const hadActiveEvent = this.state !== "idle"
      || this._hasPendingFallZoneHazards();
    this.scene.soundSystem?.stopSeismicWarning?.();
    this.stopAudio();
    this.state = "idle";
    this.epicenter = null;
    this.intensity = null;
    this.stateRemaining = 0;
    this.stateTotalMs = 0;
    this.caveIns.length = 0;
    this.chainPending = false;
    this.chainTimer = 0;

    // ===== NEW: Clear restore queue =====
    this._restoreQueue.length = 0;
    this._restoreQueueSorted = true;

    this.fallingRocks.length = 0;
    this.stressFx?.clear?.();
    // Scene may already be shutting down — camera could be gone
    const camera = this.scene?.cameras?.main;
    if (camera) {
      camera.stopShake?.();
      camera.shakeEffect?.reset?.();
      camera.shakeEffect?.stop?.();
    }
    if (this.scene?.shakeSystem) this.scene.shakeSystem.stop();
    this.scene.earthquakeFeedbackUI?.reset?.();
    this.scene.earthquakeHazardOverlay?.clear?.();
    if (this.suppressed) this.nextEventMs = Number.POSITIVE_INFINITY;
    else if (
      hadActiveEvent
      || !Number.isFinite(this.nextEventMs)
      || this.nextEventMs <= 0
    ) this._scheduleNext();
    this._log("active hazards cancelled");
  }

  getStatus() {
    return {
      heartbeat: this.heartbeat,
      health: { ...this.health },
      paused: this.paused,
      eventFallZonesQueued: this._eventFallZonesQueued,
      state: this.state,
      intensity: this.intensity,
      epicenter: this.epicenter ? { ...this.epicenter } : null,
      epicenterDepth: this.epicenter?.depth ?? null,
      playerDistanceTiles: this._getPlayerDistanceToEpicenter(),
      playerAware: this.isPlayerAware(),
      stateRemaining: Math.max(0, Math.round(this.stateRemaining)),
      stateTotalMs: Math.round(this.stateTotalMs),
      depth: this._getDepth(),
      nextEventMs: Math.round(this.nextEventMs),
      nextEventSchedule: this.nextEventSchedule,
      caveIns: this.caveIns.length,
      fallingRocks: this.fallingRocks.length,
      chainPending: this.chainPending,
      chainRemainingMs: Math.max(0, Math.round(this.chainTimer)),
      rubbleQueue: this._restoreQueue.length,
      rubbleTiles: this.scene.worldModel?.getRubbleTiles?.().length ?? 0,
      suppressed: this.suppressed,
      warningTextActive: false,
      debug: this._debugEnabled(),
    };
  }

  destroy() {
    this.cancelActiveHazards();
    this.stressFx?.destroy();
    if (typeof window !== "undefined" && window.earthquakeDebug?.system === this) {
      delete window.earthquakeDebug;
    }
  }

  // ── State handlers ────────────────────────────────────────────

  _beginQuake() {
    this.scene.soundSystem?.stopSeismicWarning?.();
    const cfg = this.config.intensities[this.intensity];
    this.state = "earthquake";
    this.stateRemaining = rand(...cfg.quakeMs);
    this.stateTotalMs = this.stateRemaining;
    this.mutationTimer = 0;

    const count = randInt(...cfg.caveIns);
    for (const candidate of this._findCeilingCandidates(count)) {
      this._queueCaveInGroup(candidate, false);
    }

    this._playTone("crack");

    this._seismicFlash();

    this._log("earthquake started", {
      intensity: this.intensity,
      durationMs: Math.round(this.stateRemaining),
      caveIns: this.caveIns.length,
    });
  }

  _beginAftermath() {
    const cfg = this.config.intensities[this.intensity];
    this.state = "aftermath";
    this.stateRemaining = rand(...this.config.aftermathMs);
    this.stateTotalMs = this.stateRemaining;

    const restoreDelay = this.config?.rubbleRestoreDelayMs || 3000;
    this._scheduleDugTunnelRubble(restoreDelay);

    if (Math.random() < cfg.chainChance) {
      this.chainPending = true;
      this.chainTimer = rand(...this.config.chainDelayMs);
      this._log("chain reaction scheduled", { delayMs: Math.round(this.chainTimer) });
    }
    this._playTone("settle");
    this._openedPassageTiles.forEach(tile => {
      this.scene.earthquakeHazardOverlay?.markOpenedPassage?.(tile.tx, tile.ty);
    });

    this.scene.queueDugTilesSave?.();
    this._log("aftermath started");
  }

  _finishEvent() {
    this.health.completed += 1;
    const completedIntensity = this.intensity || "unknown";
    const distanceEndured = Math.max(0, Math.round(this._getPlayerDistanceToEpicenter() || 0));
    const passagesOpened = this._openedPassageKeys.size;
    this.scene.retentionProgressSystem?.recordEarthquake?.({
      passagesOpened,
      intensity: completedIntensity,
      distanceEndured,
    });
    this.state = "idle";
    this.intensity = null;
    this.epicenter = null;
    this.stateRemaining = 0;
    this.stateTotalMs = 0;
    this.chainPending = false;
    this.chainTimer = 0;
    this._firstEligibleScheduleApplied = true;
    this._scheduleNext();
    this._log("event complete", { nextEventMs: Math.round(this.nextEventMs) });
  }

  _scheduleDugTunnelRubble(delayMs) {
    const baseCount = this.config.rubbleRespawnCounts?.[this.intensity] ?? 0;
    const depth = this._getEpicenterDepth();
    const scale = this._getRubbleDepthScale(depth);
    const multiplier = Number.isFinite(scale.multiplier) ? scale.multiplier : 1;
    const count = Math.ceil(baseCount * multiplier);
    if (count <= 0) return;

    const radius = Number.isFinite(scale.radiusTiles)
      ? scale.radiusTiles
      : this.config.rubbleRespawnRadiusTiles ?? this.config.radiusTiles ?? 12;
    const spreadMs = Math.max(0, Math.floor(Number.isFinite(scale.spreadMs) ? scale.spreadMs : 0));
    const candidates = this._findDugRubbleCandidates(count, radius);
    const hpRatio = Number.isFinite(this.config.rubbleHpRatio) ? this.config.rubbleHpRatio : 0.25;

    candidates.forEach((candidate) => {
      this._queueRubbleRestore({
        tx: candidate.tx,
        ty: candidate.ty,
        type: candidate.type,
        maxHp: candidate.maxHp,
        hp: Math.max(1, Math.floor(candidate.maxHp * hpRatio)),
        delayMs: delayMs + rand(0, spreadMs),
        source: "dug",
      });
    });

    this._log("dug tunnel rubble queued", {
      baseCount,
      depth,
      multiplier,
      requested: count,
      queued: candidates.length,
      radius,
      spreadMs,
    });
  }

  _getRubbleDepthScale(depth = this._getEpicenterDepth()) {
    const bands = Array.isArray(this.config.rubbleDepthScaling)
      ? this.config.rubbleDepthScaling
      : [];
    return bands.find(band => depth >= band.min && depth <= band.max) ?? {
      multiplier: 1,
      radiusTiles: this.config.rubbleRespawnRadiusTiles ?? this.config.radiusTiles ?? 12,
      spreadMs: 0,
    };
  }

  _queueRubbleRestore(entry) {
    if (!entry || !Number.isInteger(entry.tx) || !Number.isInteger(entry.ty) || !Number.isInteger(entry.type)) {
      return;
    }

    const scheduledAt = (this.clockNow?.() ?? performance.now());
    const delayMs = Math.max(0, entry.delayMs || 0);
    this._restoreQueue.push({
      tx: entry.tx,
      ty: entry.ty,
      type: entry.type,
      hp: Math.max(1, Math.floor(entry.hp || 1)),
      maxHp: Math.max(1, Math.floor(entry.maxHp || entry.hp || 1)),
      delayMs,
      scheduledAt,
      dueAt: scheduledAt + delayMs,
      source: entry.source || "unknown",
    });
    this._restoreQueueSorted = false;
  }

  /**
   * Update rubble restoration — restore tiles from the queue
   * @param {number} dt - delta time ms
   * @private
   */
  _updateRubbleRestoration(dt) {
    if (!this._restoreQueue.length) {
      this._restoreQueueSorted = true;
      return;
    }
    if (this._restoreQueueSorted !== true) {
      this._restoreQueue.sort((left, right) => restoreDueAt(right) - restoreDueAt(left));
      this._restoreQueueSorted = true;
    }
    const now = (this.clockNow?.() ?? performance.now());
    if (restoreDueAt(this._restoreQueue[this._restoreQueue.length - 1]) > now) return;
    let restoredAny = false;
    let restoredNearPlayer = false;
    let restoredThisFrame = 0;
    let processedThisFrame = 0;
    const restoredTiles = [];
    const retryEntries = [];
    const occupiedTiles = this._getPlayerOccupiedTileKeys();
    const restoresPerFrame = Math.max(1, Math.floor(this.config.rubbleRestoresPerFrame ?? 24));
    while (this._restoreQueue.length && processedThisFrame < restoresPerFrame) {
      const entry = this._restoreQueue[this._restoreQueue.length - 1];
      if (restoreDueAt(entry) > now) break;
      this._restoreQueue.pop();
      processedThisFrame += 1;
      if (occupiedTiles.has(tileKey(entry.tx, entry.ty))) {
        entry.scheduledAt = now;
        entry.delayMs = this.config.rubbleOccupiedRetryMs;
        entry.dueAt = now + entry.delayMs;
        retryEntries.push(entry);
        continue;
      }
      if (this.scene.worldModel.getTileType(entry.tx, entry.ty) !== TILE_TYPES.AIR) continue;

      const restored = this.scene.worldModel.setRubbleTile(entry.tx, entry.ty, entry.type, entry.hp, entry.maxHp);
      if (!restored) continue;

      restoredTiles.push({ tx: entry.tx, ty: entry.ty });
      this.scene.earthquakeTileFeedbackSystem?.showRestore?.({
        tx: entry.tx,
        ty: entry.ty,
      });
      this._emitDust(entry.tx, entry.ty, entry.source === "dug" ? 4 : 5);
      this.scene.earthquakeHazardOverlay?.markRestoredRubble?.(entry.tx, entry.ty);
      restoredAny = true;
      restoredNearPlayer ||= this._isTileNearPlayer(
        entry.tx,
        entry.ty,
        this.config.playerFeedback?.trapGuidanceRadiusTiles
      );
      restoredThisFrame += 1;
    }
    if (retryEntries.length) {
      this._restoreQueue.push(...retryEntries);
      this._restoreQueueSorted = false;
    }

    if (restoredTiles.length) {
      const renderer = this.scene.worldRenderer;
      if (typeof renderer?.applyTileUpdates === "function") {
        renderer.applyTileUpdates(restoredTiles);
      } else {
        for (const tile of restoredTiles) {
          renderer?.applyTileUpdate?.(tile.tx, tile.ty);
        }
      }
    }
    if (restoredAny) {
      if (restoredNearPlayer) this._showTrapGuidance();
      this.scene.queueDugTilesSave?.();
    }
  }

  _showTrapGuidance() {
    if (this._trapGuidanceShown) return;
    this._trapGuidanceShown = true;
    this.scene.earthquakeFeedbackUI?.activateEscapeObjective?.();
  }

  _announceAftershock(queued) {
    if (!this.isPlayerAware()) return;
    this.scene.earthquakeFeedbackUI?.activateAftershockWarning?.();
    const proximity = this._getPlayerProximity(
      this.config.playerFeedback?.audioRadiusTiles,
    );
    const warningSound = proximity > 0
      ? this.scene.soundSystem?.playSeismicWarning?.(proximity)
      : null;
    if (!warningSound) this._playTone("rumble");
    this._log("aftershock announced", { queued, proximity });
  }

  // ── Restrained screen feedback ─────────────────────────────────

  _seismicFlash() {
    const proximity = this._getPlayerProximity(this.config.playerFeedback?.flashRadiusTiles);
    if (proximity <= 0) return;
    const feedback = this.config.playerFeedback || {};
    if (
      !Number.isFinite(feedback.flashColor)
      || !Number.isFinite(feedback.flashAlpha)
      || !Number.isFinite(feedback.flashDurationMs)
    ) {
      return;
    }
    this.scene.screenFlashSystem?._flash?.(
      feedback.flashColor,
      feedback.flashAlpha * proximity,
      feedback.flashDurationMs,
    );
  }

  // ── Original cave-in logic (modified for rubble tracking) ──────

  _mutateNearbyTiles() {
    const epicenter = this.epicenter;
    if (!epicenter) return;
    const cfg = this.config.intensities[this.intensity];
    const candidates = [];
    const radius = this.config.radiusTiles;
    const attempts = this.config.worldSpawn?.mutationSampleAttempts ?? 48;
    for (let i = 0; i < attempts; i += 1) {
      const tx = epicenter.tx + randInt(-radius, radius);
      const ty = epicenter.ty + randInt(-radius, radius);
      const type = this.scene.worldModel.getTileType(tx, ty);
      if (!MUTABLE_TYPES.has(type)) continue;
      const distance = Math.abs(tx - epicenter.tx) + Math.abs(ty - epicenter.ty);
      const exposed = this._hasAdjacentAir(tx, ty);
      const unstable = this._isUnstable(tx, ty);
      candidates.push({ tx, ty, type, score: (exposed ? 4 : 0) + (unstable ? 5 : 0) - distance * 0.05 });
    }
    candidates.sort((a, b) => b.score - a.score);
    for (const tile of candidates.slice(0, cfg.mutationsPerPulse)) {
      if (this.caveIns.some(zone => zone.tx === tile.tx && zone.ty === tile.ty)) continue;
      const hp = this.scene.worldModel.getTileHp(tile.tx, tile.ty);
      const roll = Math.random();
      const damage = roll < 0.1 ? hp : roll < 0.35 ? hp * 0.55 : hp * 0.25;
      const result = this.scene.worldModel.damageTile(tile.tx, tile.ty, Math.max(1, damage));
      this._applyDamageVisualUpdate(tile.tx, tile.ty, result);
      this.scene.earthquakeTileFeedbackSystem?.showDamage?.({
        tx: tile.tx,
        ty: tile.ty,
        damage: result.damage ?? damage,
        destroyed: result.destroyed,
        source: "pulse",
      });
      if (result.destroyed) {
        this._recordOpenedPassage(tile.tx, tile.ty);
        this._emitDust(tile.tx, tile.ty, 7);
        if (this._isTileNearPlayer(tile.tx, tile.ty, this.config.playerFeedback?.rewardRadiusTiles)) {
          const reward = this.scene.digSystem?.processDestroyedTile(tile.tx, tile.ty, result.typeBeforeDamage, (this.clockNow?.() ?? performance.now()), false, result.wasRubble);
          this.scene.showLootPickupFeedback?.(reward, { tx: tile.tx, ty: tile.ty });
        }
      }
      this._log("tile mutation", { ...tile, destroyed: result.destroyed, hp: result.hp });
    }
  }

  _applyDamageVisualUpdate(tx, ty, result) {
    const renderer = this.scene.worldRenderer;
    if (
      result?.destroyed !== true
      && typeof renderer?.applyTileDamageUpdate === "function"
    ) {
      renderer.applyTileDamageUpdate(tx, ty);
      return;
    }
    this.scene.worldRenderer.applyTileUpdate(tx, ty);
  }

  _findDugRubbleCandidates(limit, radiusOverride = null) {
    const epicenter = this.epicenter;
    if (!epicenter) return [];

    const model = this.scene.worldModel;
    const radius = Number.isFinite(radiusOverride)
      ? radiusOverride
      : this.config.rubbleRespawnRadiusTiles ?? this.config.radiusTiles ?? 12;
    const occupied = this._getPlayerOccupiedTileKeys();
    const candidates = [];

    const minimumX = Math.floor(epicenter.tx - radius);
    const maximumX = Math.ceil(epicenter.tx + radius);
    const minimumY = Math.floor(epicenter.ty - radius);
    const maximumY = Math.ceil(epicenter.ty + radius);
    for (let ty = minimumY; ty <= maximumY; ty += 1) {
      for (let tx = minimumX; tx <= maximumX; tx += 1) {
        if (!model.inBounds(tx, ty)) continue;
        const distance = Math.abs(tx - epicenter.tx) + Math.abs(ty - epicenter.ty);
        if (distance > radius) continue;
        if (occupied.has(tileKey(tx, ty))) continue;
        if (model.getTileType(tx, ty) !== TILE_TYPES.AIR) continue;
        const source = model.getDugTileSource(tx, ty);
        if (!source) continue;
        candidates.push({
          ...source,
          score: -distance + (ty >= epicenter.ty ? 0.35 : 0) + Math.random() * 0.25,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit);
  }

  _isMutableCeiling(tx, ty) {
    return MUTABLE_TYPES.has(this.scene.worldModel.getTileType(tx, ty));
  }

  _findCeilingCandidates(limit) {
    return collectLocalFallZones(this, limit);
  }

  _queueCaveInGroup(candidate, chain) {
    const occupied = new Set(
      [...this.caveIns, ...this.fallingRocks]
        .map(zone => tileKey(zone.tx, zone.ty)),
    );
    const spawn = this.config.worldSpawn;
    const zones = expandFallZoneCandidate({
      candidate,
      intensity: this.intensity,
      widths: this.config.collapseWidths,
      worldModel: this.scene.worldModel,
      airType: TILE_TYPES.AIR,
      minimumAirTiles: spawn.minAirDropTiles,
      maximumAirTiles: spawn.maxAirDropTiles,
      isMutableType: type => MUTABLE_TYPES.has(type),
    });
    let queued = 0;
    for (const zone of zones) {
      if (this._eventFallZonesQueued >= this.config.localHazards.budget[this.intensity]) break;
      if (
        this.caveIns.length + this.fallingRocks.length
        >= this.config.maxConcurrentFallZones
      ) {
        break;
      }
      const key = tileKey(zone.tx, zone.ty);
      if (occupied.has(key)) continue;
      occupied.add(key);
      this._queueCaveIn(zone, chain);
      queued += 1;
    }
    return queued;
  }

  _queueCaveIn(candidate, chain) {
    this._eventFallZonesQueued += 1;
    this.health.queued += 1;
    this._nextFallZoneId = Number(this._nextFallZoneId) || 0;
    this.caveIns.push({
      ...candidate,
      id: ++this._nextFallZoneId,
      remaining: this.config.caveInWarningMs,
      chain,
      lastStage: -1,
      originalType: candidate.originalType || this.scene?.worldModel?.getTileType(candidate.tx, candidate.ty),
      originalHp: candidate.originalHp || this.scene?.worldModel?.getTileHp(candidate.tx, candidate.ty),
      _rubbleQueued: false,
    });
    this._log("cave-in queued", candidate);
  }

  _updateCaveIns(delta) {
    for (let i = this.caveIns.length - 1; i >= 0; i -= 1) {
      const caveIn = this.caveIns[i];
      caveIn.remaining -= delta;
      const elapsed = this.config.caveInWarningMs - caveIn.remaining;
      const progress = elapsed / this.config.caveInWarningMs;
      const [middleStage, fractureStage] = this.config.caveInWarningStageRatios;
      const stage = progress < middleStage ? 0 : progress < fractureStage ? 1 : 2;
      if (stage !== caveIn.lastStage) {
        caveIn.lastStage = stage;
        this._emitDust(caveIn.tx, caveIn.ty + 1, stage === 0 ? 3 : 5);
        if (stage === 2) {
          this.scene.earthquakeTileFeedbackSystem?.showCaveInFracture?.({
            tx: caveIn.tx,
            ty: caveIn.ty,
          });
          this._playTone("crack");
        }
      }
      if (caveIn.remaining <= 0) {
        this._collapse(caveIn);
        this.caveIns.splice(i, 1);
      }
    }
  }

  /**
   * Collapse a cave-in tile — destroys it AND schedules rubble
   * restoration so the player gets "stuck" underground.
   * @param {Object} caveIn - { tx, ty, type, originalType }
   * @private
   */
  _collapse(caveIn) {
    const { tx, ty } = caveIn;
    const type = this.scene.worldModel.getTileType(tx, ty);
    if (!MUTABLE_TYPES.has(type)) {
      this.health.cancelledCeilings += 1;
      return;
    }
    const hp = this.scene.worldModel.getTileHp(tx, ty);
    const result = this.scene.worldModel.damageTile(tx, ty, Math.max(1, hp));
    this._applyDamageVisualUpdate(tx, ty, result);
    this.scene.earthquakeTileFeedbackSystem?.showDamage?.({
      tx,
      ty,
      damage: result.damage ?? hp,
      destroyed: result.destroyed,
      source: "cave-in",
    });
    if (!result.destroyed) return;
    this._recordOpenedPassage(tx, ty);

    if (this._isTileNearPlayer(tx, ty, this.config.playerFeedback?.rewardRadiusTiles)) {
      const reward = this.scene.digSystem?.processDestroyedTile(tx, ty, result.typeBeforeDamage, (this.clockNow?.() ?? performance.now()), false, result.wasRubble);
      this.scene.showLootPickupFeedback?.(reward, { tx, ty });
    }
    this._queueRubbleRestore({
      tx,
      ty,
      type,
      hp: Math.max(1, Math.floor(hp * this.config.rubbleHpRatio)),
      maxHp: this.scene.worldModel.getTileMaxHp(tx, ty, type),
      delayMs: this.config.rubbleRestoreDelayMs,
      source: "cave-in",
    });
    this._spawnFallingRock(caveIn, type);
    const collapseProximity = this._getPlayerProximity(
      this.config.playerFeedback?.collapseShakeRadiusTiles
    );
    if (collapseProximity > 0) {
      this.scene.shakeSystem?.shake("earthquake.caveIn", collapseProximity);
    }
    this._playTone("collapse");

    this.scene.queueDugTilesSave?.();
    this._log("cave-in collapsed", caveIn);
  }

  _recordOpenedPassage(tx, ty) {
    const key = tileKey(tx, ty);
    if (this._openedPassageKeys.has(key)) return;
    this._openedPassageKeys.add(key);
    this._openedPassageTiles.push({ tx, ty });
    this.scene.earthquakeHazardOverlay?.markOpenedPassage?.(tx, ty);
  }

  _spawnFallingRock(caveIn, type) {
    this.health.rocks += 1;
    const ts = this.scene.config.tileSize;
    const { tx, ty, landingTy } = caveIn;
    const falling = this.config.fallingRock;
    const x = tx * ts + ts / 2;
    const y = (ty + 1) * ts;
    this.fallingRocks.push({
      id: caveIn.id,
      tx,
      ty,
      landingTy,
      type,
      x,
      y,
      previousY: y,
      endY: landingTy * ts,
      vy: falling.initialVelocityPxPerSecond,
      angle: rand(...falling.initialAngleRadians),
      hit: false,
    });
  }

  _updateFallingRocks(delta) {
    const seconds = delta / 1000;
    const body = this.scene.playerController?.physicsBody;
    const falling = this.config.fallingRock;
    for (let i = this.fallingRocks.length - 1; i >= 0; i -= 1) {
      const rock = this.fallingRocks[i];
      rock.previousY = rock.y;
      rock.landingTy = resolveRockLandingRow(this.scene.worldModel, rock,
        this.scene.config.tileSize, this.config.localHazards.maximumFallTiles);
      rock.endY = rock.landingTy * this.scene.config.tileSize;
      rock.vy += falling.gravityPxPerSecondSq * seconds;
      rock.y = Math.min(rock.endY, rock.y + rock.vy * seconds);
      rock.angle += (
        falling.angularVelocityDegPerSecond * seconds * Math.PI
      ) / 180;
      if (!rock.hit && body && this.impactCooldown <= 0 && this._rockCrossesBody(rock, body)) {
        rock.hit = true;
        this.health.hits += 1;
        this.impactCooldown = this.config.impactCooldownMs;
        const drained = this.scene.playerController.drainAllGemPower({
          source: "fallingRock",
          hazard: true,
        });
        if (this.scene._hardcoreDeathInProgress || this.scene.gameState === "dead") {
          this.scene.shakeSystem?.shake("earthquake.rockImpact");
          this._log("lethal player impact", { drainedGemPower: drained });
          continue;
        }
        const direction = body.x + body.w / 2 < rock.x ? -1 : 1;
        this.scene.playerController.applyExternalKnockback(
          direction * falling.knockbackX,
          falling.knockbackY,
        );
        this.scene.playPlayerImpactReaction?.();
        this.scene.shakeSystem?.shake("earthquake.rockImpact");
        this._log("player impact", { drainedGemPower: drained, zeroGpHit: drained <= 0 });
      }
      if (rock.y >= rock.endY) {
        this._emitDust(Math.floor(rock.x / this.scene.config.tileSize), Math.floor(rock.y / this.scene.config.tileSize), 5);
        this.scene.earthquakeHazardOverlay?.playRockImpact?.(rock);
        this.fallingRocks.splice(i, 1);
      }
    }
  }

  _rockCrossesBody(rock, body) {
    const ts = this.scene.config.tileSize;
    return rockSweptAabbCrossesBody({
      rock,
      body,
      hitboxWidth: ts * this.config.fallingRock.hitboxWidthTiles,
      hitboxHeight: ts * this.config.fallingRock.hitboxHeightTiles,
    });
  }

  _warningFx(delta) {
    if (Math.random() < delta / 280) {
      const epicenter = this.epicenter;
      if (epicenter) this._emitDust(epicenter.tx + randInt(-7, 7), epicenter.ty - randInt(2, 6), 1);
    }
    const proximity = this._getPlayerProximity(this.config.playerFeedback?.shakeRadiusTiles);
    if (proximity > 0 && this.scene.shakeSystem && !this.scene.shakeSystem._active) {
      this.scene.shakeSystem.shake("earthquake.warning", proximity);
    }
  }

  _quakeFx(delta) {
    const shakeIntensity = this.intensity === "medium" ? "moderate" : this.intensity;
    const proximity = this._getPlayerProximity(this.config.playerFeedback?.shakeRadiusTiles);
    if (proximity > 0 && this.scene.shakeSystem && !this.scene.shakeSystem._active) {
      this.scene.shakeSystem.shake("earthquake." + shakeIntensity, proximity);
    }
    if (Math.random() < delta / 90) {
      const epicenter = this.epicenter;
      if (epicenter) this._emitDust(epicenter.tx + randInt(-9, 9), epicenter.ty - randInt(2, 8), 2);
    }
  }

  _emitDust(tx, ty, count) {
    const ts = this.scene.config.tileSize;
    for (let i = 0; i < count; i += 1) {
      const dot = this.scene.add.circle(tx * ts + rand(8, ts - 8), ty * ts + rand(5, ts * 0.5), rand(2, 5), 0xb9a58d, 0.75).setDepth(34);
      this.scene.tweens.add({ targets: dot, y: dot.y + rand(20, 60), x: dot.x + rand(-12, 12), alpha: 0, duration: rand(450, 1000), onComplete: () => dot.destroy() });
    }
  }

  _drawInstability() {
    this.stressFx.clear();
    const player = this.scene.playerController?.getPlayerTile();
    if (!player || this._getDepth() < 100) return;
    const ts = this.scene.config.tileSize;
    let drawn = 0;
    this.stressFx.lineStyle(2, 0x6e5445, 0.28);
    for (let ty = player.ty - 8; ty <= player.ty + 8 && drawn < 18; ty += 1) {
      for (let tx = player.tx - 10; tx <= player.tx + 10 && drawn < 18; tx += 1) {
        if (!MUTABLE_TYPES.has(this.scene.worldModel.getTileType(tx, ty)) || !this._isUnstable(tx, ty) || !this._hasAdjacentAir(tx, ty)) continue;
        const x = tx * ts;
        const y = ty * ts;
        this.stressFx.lineBetween(x + ts * 0.3, y + ts * 0.1, x + ts * 0.48, y + ts * 0.38);
        this.stressFx.lineBetween(x + ts * 0.48, y + ts * 0.38, x + ts * 0.62, y + ts * 0.62);
        drawn += 1;
      }
    }
  }

  _selectWorldEpicenter() {
    const model = this.scene.worldModel;
    if (!model) return null;

    const spawn = this.config.worldSpawn || {};
    const margin = Math.max(0, Math.floor(spawn.horizontalMarginTiles ?? 0));
    const bottomMargin = Math.max(1, Math.floor(spawn.bottomMarginTiles ?? 1));
    const minTx = Math.min(margin, Math.max(0, model.widthTiles - 1));
    const maxTx = Math.max(minTx, model.widthTiles - 1 - margin);
    const minTy = Math.min(
      model.depthTiles - bottomMargin,
      Math.max(model.topAirRows, model.topAirRows + this.config.minimumDepth - 1)
    );
    const maxTy = Math.max(minTy, model.depthTiles - 1 - bottomMargin);
    const player = this.scene.playerController?.getPlayerTile?.();
    if (player) {
      const encounter = this._selectPlayerEncounterEpicenter(player, {
        minTx,
        maxTx,
        minTy,
        maxTy,
      });
      if (encounter) return this._makeEpicenter(encounter.tx, encounter.ty);
    }

    const attempts = Math.max(1, Math.floor(spawn.randomCandidateAttempts ?? 1));
    let fallback = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const origin = { tx: randInt(minTx, maxTx), ty: randInt(minTy, maxTy) };
      fallback ||= origin;
      const cavity = this._findCavityAnchorNear(origin);
      if (cavity) return this._makeEpicenter(cavity.tx, cavity.ty);
    }

    return fallback ? this._makeEpicenter(fallback.tx, fallback.ty) : null;
  }

  _selectPlayerEncounterEpicenter(player, bounds) {
    const model = this.scene.worldModel;
    const spawn = this.config.worldSpawn || {};
    const distanceRange = spawn.playerEncounterDistanceTiles;
    const minDistance = Math.max(0, Math.floor(distanceRange?.[0] ?? 0));
    const maxDistance = Math.max(minDistance, Math.floor(distanceRange?.[1] ?? minDistance));
    const attempts = Math.max(1, Math.floor(spawn.playerEncounterCandidateAttempts ?? 1));
    let fallback = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const tx = Math.max(bounds.minTx, Math.min(bounds.maxTx, player.tx + randInt(-maxDistance, maxDistance)));
      const ty = Math.max(bounds.minTy, Math.min(bounds.maxTy, player.ty + randInt(-maxDistance, maxDistance)));
      const distance = Math.hypot(tx - player.tx, ty - player.ty);
      if (distance < minDistance || distance > maxDistance || !model.inBounds(tx, ty)) continue;

      const origin = { tx, ty };
      fallback ||= origin;
      const cavity = this._findCavityAnchorNear(origin);
      if (!cavity) continue;

      const cavityDistance = Math.hypot(cavity.tx - player.tx, cavity.ty - player.ty);
      if (cavityDistance >= minDistance && cavityDistance <= maxDistance) return cavity;
    }

    return fallback;
  }

  _findCavityAnchorNear(origin) {
    if (this._isCavityAnchor(origin.tx, origin.ty)) return origin;
    const spawn = this.config.worldSpawn || {};
    const radius = Math.max(0, Math.floor(spawn.cavitySearchRadiusTiles ?? 0));
    const attempts = Math.max(0, Math.floor(spawn.cavitySearchAttempts ?? 0));
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const tx = origin.tx + randInt(-radius, radius);
      const ty = origin.ty + randInt(-radius, radius);
      if (this._isCavityAnchor(tx, ty)) return { tx, ty };
    }
    return null;
  }

  _isCavityAnchor(tx, ty) {
    const model = this.scene.worldModel;
    if (!model?.inBounds(tx, ty + 1)) return false;
    return model.getTileType(tx, ty) === TILE_TYPES.AIR
      && model.getTileType(tx, ty + 1) === TILE_TYPES.AIR
      && MUTABLE_TYPES.has(model.getTileType(tx, ty - 1));
  }

  _makeEpicenter(tx, ty) {
    return {
      tx,
      ty,
      depth: Math.max(0, ty - this.scene.config.topAirRows + 1),
    };
  }

  isPlayerAware() {
    const active = this.state !== "idle"
      || this.chainPending
      || (this.caveIns?.length ?? 0) > 0
      || (this.fallingRocks?.length ?? 0) > 0;
    if (!active) return false;
    return this._getPlayerProximity(this.config.playerFeedback?.awarenessRadiusTiles) > 0;
  }

  isTilePlayerAware(tx, ty) {
    return this._isTileNearPlayer(tx, ty, this.config.playerFeedback?.awarenessRadiusTiles);
  }

  _getPlayerDistanceToEpicenter() {
    if (!this.epicenter) return null;
    return this._getTileDistanceToPlayer(this.epicenter.tx, this.epicenter.ty);
  }

  _getPlayerProximity(radiusTiles) {
    if (!Number.isFinite(radiusTiles) || radiusTiles <= 0) return 0;
    const distance = this._getPlayerDistanceToEpicenter();
    if (!Number.isFinite(distance)) return 0;
    return Math.max(0, Math.min(1, 1 - distance / radiusTiles));
  }

  _isTileNearPlayer(tx, ty, radiusTiles) {
    if (!Number.isFinite(radiusTiles) || radiusTiles < 0) return false;
    const distance = this._getTileDistanceToPlayer(tx, ty);
    return Number.isFinite(distance) && distance <= radiusTiles;
  }

  _getTileDistanceToPlayer(tx, ty) {
    const player = this.scene.playerController?.getPlayerTile?.();
    if (!player) return null;
    return Math.hypot(tx - player.tx, ty - player.ty);
  }

  _getPlayerOccupiedTileKeys() {
    const occupied = new Set();
    const body = this.scene.playerController?.physicsBody;
    const ts = this.scene.config.tileSize;

    if (!body || !Number.isFinite(ts) || ts <= 0) {
      const player = this.scene.playerController?.getPlayerTile();
      if (player) occupied.add(tileKey(player.tx, player.ty));
      return occupied;
    }

    const left = Math.floor(body.x / ts);
    const right = Math.floor((body.x + body.w - 1) / ts);
    const top = Math.floor(body.y / ts);
    const bottom = Math.floor((body.y + body.h - 1) / ts);

    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        occupied.add(tileKey(tx, ty));
      }
    }

    const player = this.scene.playerController?.getPlayerTile();
    if (player) occupied.add(tileKey(player.tx, player.ty));
    return occupied;
  }

  _isPlayerOccupiedTile(tx, ty) {
    return this._getPlayerOccupiedTileKeys().has(tileKey(tx, ty));
  }

  _isUnstable(tx, ty) {
    const depth = Math.max(0, ty - this.scene.config.topAirRows + 1);
    const chance = depth < 100 ? 0.01 : depth < 300 ? 0.03 : depth < 600 ? 0.06 : depth < 1000 ? 0.1 : 0.15;
    let hash = (tx * 73856093) ^ (ty * 19349663) ^ this.scene.config.seed;
    hash = ((hash >>> 0) * 2654435761) >>> 0;
    return (hash % 10000) / 10000 < chance;
  }

  _hasAdjacentAir(tx, ty) {
    const model = this.scene.worldModel;
    return model.getTileType(tx - 1, ty) === TILE_TYPES.AIR
      || model.getTileType(tx + 1, ty) === TILE_TYPES.AIR
      || model.getTileType(tx, ty - 1) === TILE_TYPES.AIR
      || model.getTileType(tx, ty + 1) === TILE_TYPES.AIR;
  }

  _getDepth() {
    const tile = this.scene.playerController?.getPlayerTile();
    return tile ? Math.max(0, tile.ty - this.scene.config.topAirRows + 1) : 0;
  }

  _getEpicenterDepth() {
    return this.epicenter?.depth ?? this.config.minimumDepth;
  }

  _getBand(depth) {
    return this.config.depthBands.find(band => depth >= band.min && depth <= band.max) ?? this.config.depthBands[0];
  }

  _scheduleNext({ firstEligible = false } = {}) {
    const multiplier = this._debugEnabled() ? this.config.debugFrequencyMultiplier : 1;
    const worldCooldown = this.config.worldSpawn?.cooldownMultiplier ?? 1;
    const depthCooldown = this._getBand(this._getDepth())?.cooldown ?? 1;
    const interval = firstEligible
      ? this.config.firstEventIntervalMs
      : this.config.baseIntervalMs;
    this.nextEventSchedule = firstEligible ? "first" : "repeat";
    this.nextEventMs = rand(...interval)
      * worldCooldown
      * depthCooldown
      / multiplier;
  }

  _rollIntensity(depth) {
    const weights = this._getBand(depth).weights;
    const roll = Math.random();
    let cumulative = 0;
    for (const [name, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll <= cumulative) {
        this._log("intensity roll", { depth, roll, result: name, weights });
        return name;
      }
    }
    return "minor";
  }

  _debugEnabled() {
    return this.config.debugFlags?.Earthquakes === true;
  }

  _log(message, data) {
    if (!this._debugEnabled()) return;
    if (data === undefined) console.log(`[Earthquakes] ${message}`);
    else console.log(`[Earthquakes] ${message}`, data);
  }

  _installDebugApi() {
    if (!this._debugEnabled() || typeof window === "undefined") return;
    const system = this;
    window.earthquakeDebug = {
      system,
      status: () => system.getStatus(),
      force: intensity => {
        const selected = String(intensity ?? "minor").toLowerCase();
        if (!system.config.intensities[selected]) throw new Error(`Unknown intensity: ${selected}`);
        system.start(selected);
        return system.getStatus();
      },
      cancel: () => system.cancelActiveHazards(),
    };
  }

  refreshAudioVolume() {
    const context = this.scene.sound?.context;
    if (!context) return;
    const system = this.scene.soundSystem;
    const volume = system?.getSfxMixVolume?.() ?? system?.sfxVolume ?? 1;
    for (const tone of this._audioTones || []) tone.mix.gain.setValueAtTime(volume, context.currentTime);
  }

  stopAudio() {
    for (const tone of this._audioTones || []) {
      try { tone.oscillator.stop(); } catch (_) {}
      tone.oscillator.onended?.();
    }
    this._audioTones?.clear();
  }

  _playTone(kind) {
    const soundSystem = this.scene.soundSystem;
    if (!soundSystem?.sfxEnabled || !soundSystem.audioInitialized || this.paused
      || globalThis.document?.hidden) return;
    const proximity = this._getPlayerProximity(this.config.playerFeedback?.audioRadiusTiles);
    if (proximity <= 0) return;
    const context = this.scene.sound?.context;
    if (!context || context.state === "suspended" || typeof context.createOscillator !== "function") return;
    const settings = {
      rumble: [42, 1.2, 0.055],
      crack: [130, 0.18, 0.08],
      collapse: [58, 0.7, 0.12],
      settle: [75, 0.35, 0.035],
    }[kind];
    if (!settings) return;
    const [frequency, duration, volume] = settings;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const mix = context.createGain();
    mix.gain.value = soundSystem.getSfxMixVolume?.() ?? soundSystem.sfxVolume ?? 1;
    oscillator.type = kind === "crack" ? "square" : "sawtooth";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * 0.55), context.currentTime + duration);
    gain.gain.setValueAtTime(volume * proximity, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(mix);
    mix.connect(this.scene.sound.destination || context.destination);
    const tone = { oscillator, gain, mix };
    (this._audioTones ??= new Set()).add(tone);
    oscillator.onended = () => {
      this._audioTones.delete(tone);
      for (const node of [oscillator, gain, mix]) { try { node.disconnect(); } catch (_) {} }
    };
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }
}
