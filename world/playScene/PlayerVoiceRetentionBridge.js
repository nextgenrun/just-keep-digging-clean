import { PLAYER_VOICE_CONFIG } from "../../values/playerVoiceCharacterLeoV1.generated.js";
import { RETENTION_EVENT_TYPES } from "../../values/retentionConfig.js";

/** Maps authoritative retention events into contextual player-voice requests. */
export function routeRetentionVoiceEvent(scene, event) {
  const sound = scene.soundSystem;
  if (!sound?.playPlayerVoiceEvent || !event) return null;
  const ids = PLAYER_VOICE_CONFIG.eventIds;
  switch (event.type) {
    case RETENTION_EVENT_TYPES.DISCOVERY:
      if (
        event.group !== "materials"
        || !PLAYER_VOICE_CONFIG.materialDiscoveryKeys.includes(event.key)
      ) return null;
      return sound.playPlayerVoiceEvent(ids.rareMaterialDiscovery, {
        dedupeKey: event.key,
        material: event.key,
        label: event.label,
        tags: [event.key],
      });
    case RETENTION_EVENT_TYPES.PERSONAL_BEST:
      if (!Number.isFinite(event.previousBest)) {
        if (event.depth < PLAYER_VOICE_CONFIG.firstDescentDepth) return null;
        return sound.playPlayerVoiceEvent(ids.firstDescent, {
          depth: event.depth,
          tags: ["first"],
        });
      }
      return sound.playPlayerVoiceEvent(ids.depthRecord, {
        depth: event.depth,
        previousBest: event.previousBest,
        tags: event.depth >= PLAYER_VOICE_CONFIG.deepReturnMinimumDepth
          ? ["deep"]
          : ["repeat"],
      });
    case RETENTION_EVENT_TYPES.EARTHQUAKE_RECAP:
      return sound.playPlayerVoiceEvent(ids.earthquakeAftermath, {
        passagesOpened: event.passagesOpened,
        intensity: event.intensity,
        tags: event.passagesOpened > 0 ? ["opened"] : ["repeat"],
      });
    case RETENTION_EVENT_TYPES.EXPEDITION_SUMMARY: {
      const summary = event.summary;
      if (!summary || summary.maxDepth < PLAYER_VOICE_CONFIG.deepReturnMinimumDepth) {
        return null;
      }
      const tags = ["deep"];
      if (summary.stars > 0) tags.push("stars");
      if (summary.bestMaterial) tags.push("valuable");
      return sound.playPlayerVoiceEvent(ids.deepReturn, {
        dedupeKey: `${summary.maxDepth}-${scene.time?.now || 0}`,
        summary,
        tags,
      });
    }
    default:
      return null;
  }
}
