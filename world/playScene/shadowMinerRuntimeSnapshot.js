import { SHADOW_MINER_STATES } from "../../values/shadowMiner.js";

export function createShadowMinerRuntimeSnapshot(runtime) {
  return Object.freeze({
    id: runtime.config.id,
    ready: !runtime.destroyed && runtime.mode.enabled,
    reviewMode: runtime.mode.review,
    dev10x: runtime.mode.dev10x === true,
    rateMultiplier: runtime.rateMultiplier,
    nextCheckAtMs: runtime.nextCheckAtMs,
    state: runtime.state,
    active: runtime.state !== SHADOW_MINER_STATES.DORMANT,
    encounterBand: runtime.encounterBand,
    depthProfile: runtime.depthProfile,
    lastDepthProfile: runtime.lastDepthProfile,
    behavior: runtime.behaviorPlan,
    lastBehavior: runtime.lastBehaviorPlan,
    approachPlaybackRate: runtime.behaviorPlan?.approachPlaybackRate || null,
    playbackDelayMs: runtime.state === SHADOW_MINER_STATES.DORMANT
      ? null
      : Math.max(0, runtime.lastUpdateAtMs - runtime.playbackTimeMs),
    observeAction: runtime.observeActionWindow
      ? Object.freeze({
        active: true,
        startTime: runtime.observeActionWindow.startTime,
        endTime: runtime.observeActionWindow.endTime,
        playbackTime: runtime.observeActionPlaybackMs,
      })
      : Object.freeze({ active: false }),
    distanceToPlayerTiles: runtime.distanceToPlayerTiles,
    repelledBy: runtime.repelledBy,
    lastRepelledBy: runtime.lastRepelledBy,
    lightInteraction: Object.freeze({
      active: runtime.lightPressure > 0,
      source: runtime.lightSource,
      pressure: runtime.lightPressure,
      exposureProgress: runtime.lightExposureProgress,
      response: runtime.lastLightResponse,
    }),
    lastEntryVisible: runtime.lastEntryVisible,
    lastEntryDistanceTiles: runtime.lastEntryDistanceTiles,
    awarenessCue: runtime.lastAwarenessCue,
    lastSpawnAttempt: runtime.lastSpawnAttempt ? { ...runtime.lastSpawnAttempt } : null,
    work: runtime.workLoop?.snapshot?.() || null,
    lastUpdateAtMs: runtime.lastUpdateAtMs,
    spawnCount: runtime.spawnCount,
    approachCount: runtime.approachCount,
    observeCount: runtime.observeCount,
    fleeCount: runtime.fleeCount,
    completedCount: runtime.completedCount,
    replayWindow: runtime.lastWindowSummary,
    history: runtime.history.getSnapshot?.() || null,
    view: runtime.view.getSnapshot?.() || null,
  });
}
