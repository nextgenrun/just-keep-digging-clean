import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  MUSIC_CONTEXT_IDS,
  MUSIC_CUE_IDS,
  MUSIC_DIRECTOR_CONFIG,
} from "../values/musicDirector.js";
import { PLAYER_VOICE_CONFIG } from
  "../values/playerVoiceCharacterLeoV1.generated.js";
import {
  buildMusicTrackCatalog,
  getMusicIndexesForContext,
  getMusicIndexesForCue,
} from "./musicTrackCatalog.js";

function finiteTime(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveMusicContext(snapshot = {}, config = MUSIC_DIRECTOR_CONFIG) {
  if (snapshot.scene === "menu") return config.menuContext;
  if (
    snapshot.wurmActive === true
    && config.graveborerWurmPhases.includes(snapshot.wurmPhase)
  ) return MUSIC_CONTEXT_IDS.graveborerWurm;
  if (
    snapshot.earthquakePlayerAware === true
    && config.earthquakeStates.includes(snapshot.earthquakeState)
  ) return MUSIC_CONTEXT_IDS.earthquake;
  if (snapshot.hardcoreArmed === true && snapshot.hardcoreStressBand === "critical") {
    return MUSIC_CONTEXT_IDS.hardcoreCritical;
  }
  if (snapshot.hardcoreArmed === true && snapshot.hardcoreStressBand === "warning") {
    return MUSIC_CONTEXT_IDS.hardcoreWarning;
  }
  if (snapshot.tutorialActive === true) return MUSIC_CONTEXT_IDS.tutorial;
  if (snapshot.biome === "surface") {
    if (finiteTime(snapshot.depth) >= config.shallowDepthTiles) {
      return MUSIC_CONTEXT_IDS.shallow;
    }
    if (snapshot.weather === "storm") return MUSIC_CONTEXT_IDS.storm;
    return config.surfacePhaseContexts[snapshot.dayPhase]
      || MUSIC_CONTEXT_IDS.surfaceDay;
  }
  return config.biomeContexts[snapshot.biome] || config.defaultContext;
}

export class MusicDirector {
  constructor(soundSystem, config = MUSIC_DIRECTOR_CONFIG) {
    this.system = soundSystem;
    this.config = config;
    this.currentContext = this._initialContext();
    this.candidateContext = this.currentContext;
    this.candidateSince = 0;
    this.activeCue = null;
    this.lastCueAt = new Map();
    this.seenCueKeys = new Set();
    this.recentTrackIndexes = [];
    this.lastTransitionAt = Number.NEGATIVE_INFINITY;
    this.lastSnapshot = null;
    this.catalog = Object.freeze([]);
    this.catalogFiles = null;
    this.destroyed = false;
    this._refreshCatalog();
  }

  update(snapshot = {}, options = {}) {
    if (this.destroyed) return this.getSnapshot();
    const now = this._now(options.now);
    this.lastSnapshot = Object.freeze({ ...snapshot });
    this._clearExpiredCue(now);
    const nextContext = resolveMusicContext(snapshot, this.config);
    const immediate = options.immediate === true
      || this.config.urgentContexts.includes(nextContext);

    if (nextContext !== this.candidateContext) {
      this.candidateContext = nextContext;
      this.candidateSince = now;
    }
    if (
      nextContext !== this.currentContext
      && (immediate || now - this.candidateSince >= this.config.contextStableMs)
    ) {
      this.currentContext = nextContext;
    }
    if (this.activeCue) this._transitionForCue();
    else if (nextContext === this.currentContext) {
      this._transitionForContext(now, immediate);
    }
    return this.getSnapshot();
  }

  requestCue(cueId, options = {}) {
    if (this.destroyed) return false;
    const policy = this.config.cuePolicies[cueId];
    if (!policy) return false;
    const now = this._now(options.now);
    this._clearExpiredCue(now);
    const dedupeKey = options.dedupeKey
      ? `${cueId}:${options.dedupeKey}`
      : "";
    if (dedupeKey && this.seenCueKeys.has(dedupeKey)) return false;
    const lastAt = this.lastCueAt.get(cueId) ?? Number.NEGATIVE_INFINITY;
    if (now - lastAt < policy.cooldownMs) return false;
    const activePolicy = this.activeCue
      ? this.config.cuePolicies[this.activeCue.id]
      : null;
    if (activePolicy && activePolicy.priority > policy.priority) return false;

    this.activeCue = Object.freeze({
      id: cueId,
      startedAt: now,
      expiresAt: now + policy.holdMs,
      dedupeKey,
    });
    this.lastCueAt.set(cueId, now);
    if (dedupeKey) this.seenCueKeys.add(dedupeKey);
    this._transitionForCue();
    return true;
  }

  handleVoiceEvent(eventId, context = {}) {
    const ids = PLAYER_VOICE_CONFIG.eventIds;
    let cueId = null;
    if ([
      ids.rareMaterialDiscovery,
      ids.starRelease,
      ids.titanDiscovery,
      ids.biomeFirstEntry,
    ].includes(eventId)) cueId = MUSIC_CUE_IDS.discovery;
    else if ([
      ids.digMomentum,
      ids.depthMilestone,
      ids.depthRecord,
      ids.meaningfulPurchase,
    ].includes(eventId)) cueId = MUSIC_CUE_IDS.milestone;
    else if ([
      ids.earthquakeAftermath,
      ids.hardcoreRecovery,
      ids.deepReturn,
      ids.campfireRest,
    ].includes(eventId)) cueId = MUSIC_CUE_IDS.recovery;
    if (!cueId) return false;
    return this.requestCue(cueId, {
      dedupeKey: context.dedupeKey,
      now: context.now,
    });
  }

  selectNextIndex({ availableIndexes = null, currentIndex = -1 } = {}) {
    this._refreshCatalog();
    this._clearExpiredCue(this._now());
    let candidates = this._activeRouteIndexes();
    if (!candidates.length) candidates = this.catalog.map(track => track.index);
    const available = Array.isArray(availableIndexes)
      ? candidates.filter(index => availableIndexes.includes(index))
      : [];
    if (available.length) candidates = available;
    if (candidates.length > 1) {
      candidates = candidates.filter(index => index !== currentIndex);
    }
    const fresh = candidates.filter(index => !this.recentTrackIndexes.includes(index));
    if (fresh.length) candidates = fresh;
    if (!candidates.length) return 0;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  noteTrackStarted(index, now = this._now()) {
    if (!Number.isInteger(index) || index < 0) return;
    this.lastTransitionAt = now;
    this.recentTrackIndexes = this.recentTrackIndexes.filter(value => value !== index);
    this.recentTrackIndexes.push(index);
    while (this.recentTrackIndexes.length > this.config.recentTrackHistory) {
      this.recentTrackIndexes.shift();
    }
  }

  isIndexEligible(index) {
    this._refreshCatalog();
    this._clearExpiredCue(this._now());
    return this._activeRouteIndexes().includes(index);
  }

  completeCue(trackIndex) {
    if (!this.activeCue) return false;
    const cueIndexes = getMusicIndexesForCue(this.catalog, this.activeCue.id);
    if (!cueIndexes.includes(trackIndex)) return false;
    this.activeCue = null;
    return true;
  }

  getSnapshot() {
    this._refreshCatalog();
    const index = this.system?.currentTrackIndex ?? -1;
    const track = this.catalog[index] || null;
    return Object.freeze({
      schemaVersion: this.config.schemaVersion,
      context: this.currentContext,
      candidateContext: this.candidateContext,
      cue: this.activeCue?.id || null,
      trackIndex: index,
      trackFile: track?.file || null,
      trackCategory: track?.category || null,
      catalogTracks: this.catalog.length,
      classifiedTracks: this.catalog.filter(entry => entry.classified).length,
    });
  }

  destroy() {
    this.activeCue = null;
    this.lastCueAt.clear();
    this.seenCueKeys.clear();
    this.recentTrackIndexes.length = 0;
    this.destroyed = true;
  }

  _initialContext() {
    const sceneKey = this.system?.scene?.sys?.settings?.key;
    return sceneKey === "MenuAudioScene"
      ? this.config.menuContext
      : this.config.defaultContext;
  }

  _activeRouteIndexes() {
    if (this.activeCue) return getMusicIndexesForCue(this.catalog, this.activeCue.id);
    return getMusicIndexesForContext(this.catalog, this.currentContext);
  }

  _transitionForCue() {
    if (
      this.system?.audioInitialized === true
      && this.system?.currentTrack
      && !this._currentTrackMatchesActiveRoute()
    ) {
      this.system?.musicStreamController?.crossfade?.();
    }
  }

  _transitionForContext(now, urgent) {
    if (
      this.activeCue
      || this.system?.audioInitialized !== true
      || !this.system?.currentTrack
      || this._currentTrackMatchesActiveRoute()
    ) return;
    const interval = urgent
      ? this.config.urgentTransitionIntervalMs
      : this.config.minimumTransitionIntervalMs;
    if (now - this.lastTransitionAt < interval) return;
    this.system?.musicStreamController?.crossfade?.();
  }

  _currentTrackMatchesActiveRoute() {
    const currentIndex = this.system?.currentTrackIndex ?? -1;
    return currentIndex >= 0 && this._activeRouteIndexes().includes(currentIndex);
  }

  _clearExpiredCue(now) {
    if (this.activeCue && now >= this.activeCue.expiresAt) this.activeCue = null;
  }

  _refreshCatalog() {
    const files = ASSET_KEYS.audio.music.files || [];
    if (files === this.catalogFiles) return;
    this.catalog = buildMusicTrackCatalog(files, this.config);
    this.catalogFiles = files;
  }

  _now(value = undefined) {
    return finiteTime(value, finiteTime(this.system?.scene?.time?.now, 0));
  }
}
