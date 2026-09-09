/** Checks whether a short player reaction describes a confirmed, current moment. */
export function canSpeakPlayerVoice(scene, soundSystem) {
  return soundSystem.sfxEnabled !== false
    && scene.gameState !== "paused"
    && (!scene.gameState || scene.gameState === "playing")
    && scene.scene?.isPaused?.() !== true
    && scene.scene?.isActive?.() !== false
    && scene.playerController?.input?.controlsEnabled !== false
    && globalThis.document?.visibilityState !== "hidden";
}

export function matchesPlayerVoiceContext(config, eventId, context) {
  const ids = config.eventIds;
  const identity = context.dedupeKey ?? context.identity;
  if (eventId === ids.rareMaterialDiscovery) {
    return Boolean(identity) && config.materialDiscoveryKeys.includes(context.material);
  }
  if (eventId === ids.starRelease) return Boolean(identity) && context.gained > 0;
  if (eventId === ids.titanDiscovery) return Boolean(identity);
  if (eventId === ids.earthquakeWarning) {
    return Number.isFinite(context.proximity)
      && context.proximity >= config.earthquakeMinimumProximity;
  }
  if (eventId === ids.hardcoreDanger) return context.band === "critical";
  if (eventId === ids.deepReturn) {
    return Boolean(identity) && context.summary?.maxDepth >= config.deepReturnMinimumDepth;
  }
  return false;
}
