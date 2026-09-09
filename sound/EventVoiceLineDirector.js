import {
  PLAYER_VOICE_CONFIG,
  PLAYER_VOICE_LIBRARY,
} from "../values/playerVoiceCharacterLeoV1.generated.js";
import { EventVoiceLineReviewBridge } from "./EventVoiceLineReviewBridge.js";
import {
  resolvePlayerVoiceRuntime,
  scalePlayerVoicePolicy,
} from "./PlayerVoiceRuntimeMode.js";
import { PlayerVoiceSession } from "./PlayerVoiceSession.js";
import { VoiceLineRequestQueue } from "./VoiceLineRequestQueue.js";

/** Arbitrates NPC, narration, and context-driven LEO player speech on one channel. */
export class EventVoiceLineDirector {
  constructor(scene, soundSystem, config = PLAYER_VOICE_CONFIG, options = {}) {
    this.scene = scene;
    this.soundSystem = soundSystem;
    this.manager = soundSystem.voiceLineManager;
    this.config = config;
    this.random = options.random || Math.random;
    this.runtime = resolvePlayerVoiceRuntime(config, options.search);
    this.enabled = this.runtime.enabled;
    this.session = new PlayerVoiceSession(config);
    this.requestQueue = new VoiceLineRequestQueue(config.maxQueuedLines, request => (
      this.session.release(request.selection)
    ));
    this.activeRequest = null;
    this.drainTimer = null;
    this.ambientBlockedUntilMs = 0;
    this.lastMerchantAt = new Map();
    this.lastGlobalEventAt = Number.NEGATIVE_INFINITY;
    this.destroyed = false;
    this.metrics = {
      legacyAmbientAttempts: 0, legacyAmbientDisabled: 0,
      merchantAttempts: 0, merchantChanceMisses: 0,
      merchantCooldownDrops: 0, merchantBusyDrops: 0,
      eventAttempts: 0, eventChanceMisses: 0,
      eventCooldownDrops: 0, eventDuplicateDrops: 0, eventBusyDrops: 0,
      queued: 0, queueDrops: 0, started: 0,
    };
    this.lastDecision = null;
    this.reviewBridge = new EventVoiceLineReviewBridge(this, config, options.search);
    this.reviewFamily = this.reviewBridge.reviewFamily;
  }

  shouldScheduleLegacyAmbient() {
    return this.config.legacyPlayerRandomEnabled === true;
  }

  requestAmbient() {
    this.metrics.legacyAmbientAttempts += 1;
    if (!this.shouldScheduleLegacyAmbient()) {
      this.metrics.legacyAmbientDisabled += 1;
      return this._decide("legacy-player-random-disabled", null);
    }
    if (this.isAmbientDeferred()) return this._decide("ambient-deferred", null);
    return this._playRequest({
      id: "player-random",
      source: this.config.sources.ambient,
      priority: this.config.priorities.ambient,
      play: () => this.manager.playRandomPlayerVoiceLine(),
    });
  }

  requestMerchantOpen(npcName) {
    const now = this._now();
    this.metrics.merchantAttempts += 1;
    const lastAt = this.lastMerchantAt.get(npcName) ?? Number.NEGATIVE_INFINITY;
    if (now - lastAt < this.config.merchantOpenCooldownMs) {
      this.metrics.merchantCooldownDrops += 1;
      return this._decide("merchant-cooldown", null, npcName);
    }
    if (this.random() >= this.config.merchantOpenChance) {
      this.metrics.merchantChanceMisses += 1;
      return this._decide("merchant-chance-miss", null, npcName);
    }
    if (this._channelBusy() || this.requestQueue.length > 0) {
      this.metrics.merchantBusyDrops += 1;
      return this._decide("merchant-busy-drop", null, npcName);
    }
    const request = {
      id: `merchant:${npcName}`,
      source: this.config.sources.merchant,
      priority: this.config.priorities.merchant,
      play: () => this.manager.playNPCVoiceLine(npcName),
    };
    const result = this._playRequest(request);
    if (this.activeRequest === request) this.lastMerchantAt.set(npcName, now);
    return result;
  }

  requestEvent(eventId, context = {}) {
    const definition = this.config.events[eventId];
    const now = this._now();
    this.metrics.eventAttempts += 1;
    if (!this.enabled || !definition) {
      return this._decide("player-event-disabled", null, eventId);
    }
    const library = PLAYER_VOICE_LIBRARY[definition.id];
    if (!library?.length) return this._decide("event-library-missing", null, eventId);
    const selection = this.session.prepare(eventId, definition, library, context);
    if (!selection) {
      this.metrics.eventDuplicateDrops += 1;
      return this._decide("event-duplicate", null, eventId);
    }
    const policy = scalePlayerVoicePolicy(definition, this.runtime);
    const globalCooldownMs = this.config.globalCooldownMs / policy.globalCooldownDivisor;
    if (
      now - this.session.lastAcceptedAt(eventId) < policy.cooldownMs
      || (
        definition.bypassGlobalCooldown !== true
        && now - this.lastGlobalEventAt < globalCooldownMs
      )
    ) {
      this.metrics.eventCooldownDrops += 1;
      return this._decide("event-cooldown", null, eventId);
    }
    if (this.random() >= policy.chance) {
      this.metrics.eventChanceMisses += 1;
      return this._decide("event-chance-miss", null, eventId);
    }
    const request = {
      id: `event:${selection.admissionKey}`,
      eventId,
      assetId: selection.asset.id,
      selection,
      source: this.config.sources.event,
      priority: definition.priority ?? this.config.priorities.event,
      createdAtMs: now,
      expiresAtMs: now + policy.queueTtlMs,
      quietTailMs: policy.quietTailMs,
      context: { ...context },
      play: () => this.manager.playExactVoiceLine(selection.asset, {
        onStarted: () => this.session.markStarted(selection),
      }),
    };
    this.session.reserve(selection);
    let result;
    if ((this._channelBusy() || this.requestQueue.length > 0) && policy.queueTtlMs <= 0) {
      this.metrics.eventBusyDrops += 1;
      result = this._decide("event-busy-drop", null, eventId);
    } else {
      result = this._channelBusy() || this.requestQueue.length > 0
        ? this._enqueue(request)
        : this._playRequest(request);
    }
    if (this.activeRequest === request || this.requestQueue.includes(request)) {
      this.session.markAccepted(eventId, now);
      this.lastGlobalEventAt = now;
    } else {
      this.session.release(selection);
    }
    return result;
  }

  requestNarration(entry, cueId = entry?.key) {
    if (!entry?.key || !entry?.path) return null;
    const now = this._now();
    const request = {
      id: `narration:${cueId}`,
      source: this.config.sources.narration,
      priority: this.config.priorities.narration,
      createdAtMs: now,
      expiresAtMs: now + this.config.narrationQueueTtlMs,
      play: () => this.manager.playExactVoiceLine(entry),
    };
    return this._channelBusy() || this.requestQueue.length > 0
      ? this._enqueue(request)
      : this._playRequest(request);
  }

  isAmbientDeferred() {
    return this._channelBusy()
      || this.requestQueue.length > 0
      || this._now() < this.ambientBlockedUntilMs;
  }

  getAmbientRetryDelayMs() {
    if (!this.shouldScheduleLegacyAmbient()) return null;
    return this.lastDecision?.reason === "ambient-deferred"
      ? this.config.ambientBusyRetryMs
      : null;
  }

  onChannelIdle({ played = true } = {}) {
    const completed = this.activeRequest;
    this.activeRequest = null;
    if (!played) this.session.release(completed?.selection);
    if (played && completed?.source === this.config.sources.event) {
      this.ambientBlockedUntilMs = Math.max(
        this.ambientBlockedUntilMs,
        this._now() + completed.quietTailMs,
      );
    } else if (played && completed?.source === this.config.sources.merchant) {
      this.ambientBlockedUntilMs = Math.max(
        this.ambientBlockedUntilMs,
        this._now() + this.config.ambientQuietAfterMerchantMs,
      );
    }
    this._scheduleDrain();
  }

  getSnapshot() {
    return {
      schemaVersion: this.config.schemaVersion,
      characterId: this.config.characterId,
      voice: this.config.voice,
      enabled: this.enabled,
      mode: this.runtime.modeId,
      stressMode: this.runtime.stressMode,
      legacyPlayerRandomEnabled: this.shouldScheduleLegacyAmbient(),
      reviewFamily: this.reviewFamily,
      merchantOpenChance: this.config.merchantOpenChance,
      channelBusy: this._channelBusy(),
      activeId: this.activeRequest?.id || null,
      activeSource: this.activeRequest?.source || null,
      queuedIds: this.requestQueue.ids(),
      ambientQuietRemainingMs: Math.max(0, this.ambientBlockedUntilMs - this._now()),
      lastDecision: this.lastDecision ? { ...this.lastDecision } : null,
      session: this.session.getSnapshot(),
      metrics: { ...this.metrics },
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.reviewBridge?.destroy();
    this.drainTimer?.remove?.();
    this.requestQueue.clear();
    this.session.release(this.activeRequest?.selection);
    this.activeRequest = null;
    this.drainTimer = null;
    this.session.clear();
  }

  suspend() {
    this.drainTimer?.remove?.();
    this.drainTimer = null;
    this.requestQueue.clear();
    this.session.release(this.activeRequest?.selection);
    this.activeRequest = null;
  }

  _playRequest(request) {
    if (this.destroyed || this._channelBusy()) return null;
    const result = request.play();
    if (!this.manager.isBusy()) {
      this.session.release(request.selection);
      return this._decide("playback-unavailable", null, request.id);
    }
    this.activeRequest = request;
    this.metrics.started += 1;
    this._decide("started", request.id, request.source);
    return result;
  }

  _enqueue(request) {
    const outcome = this.requestQueue.enqueue(request, this._now());
    this.metrics.queueDrops += outcome.expired + outcome.replaced;
    if (!outcome.accepted) {
      this.metrics.queueDrops += 1;
      return this._decide(outcome.reason, null, request.id);
    }
    this.metrics.queued += 1;
    this._decide("queued", request.id, request.source);
    return null;
  }

  _scheduleDrain() {
    if (this.destroyed || this.requestQueue.length === 0 || this.drainTimer) return;
    const drain = () => {
      this.drainTimer = null;
      this._drainQueue();
    };
    this.drainTimer = this.scene.time?.delayedCall
      ? this.scene.time.delayedCall(this.config.queueInterlineDelayMs, drain)
      : (drain(), null);
  }

  _drainQueue() {
    if (this.destroyed || this._channelBusy()) return;
    this._dropExpired();
    while (this.requestQueue.length > 0 && !this._channelBusy()) {
      this._playRequest(this.requestQueue.shift());
    }
  }

  _dropExpired() {
    const now = this._now();
    this.metrics.queueDrops += this.requestQueue.dropExpired(now);
  }

  _channelBusy() {
    return this.manager?.isBusy?.() === true;
  }

  _now() {
    return Number(this.scene.time?.now) || 0;
  }

  _decide(reason, result, detail = null) {
    this.lastDecision = { reason, detail, atMs: this._now() };
    return result;
  }
}
