// ==================== AUDIO CONFIG ====================
export const AUDIO_CONFIG = Object.freeze({
  // Volume settings (all values must be 0.0–1.0; Web Audio clips above 1.0)
  masterVolume: 0.9,
  musicVolume: 0.4,
  sfxVolume: 0.9,
  voiceVolume: 0.8,
  npcVoiceVolume: 0.7,
  footstepVolume: 0.14,
  digVolume: 1.0,
  digStepVolumeMultiplier: 0.6,
  tileBreakVolume: 0.9,
  tileHitVolume: 0.9,
  copperCollectVolume: 1.2,
  rewardVolume: 1.0,
  uiVolume: 0.6,
  uiSelectVolumeMultiplier: 0.42,
  uiConfirmVolumeMultiplier: 0.58,
  uiSelectRate: 1.08,
  uiConfirmRate: 1.0,
  uiSelectMinIntervalMs: 70,
  
  // Intervals
  musicTrackChangeInterval: 180000, // 3 minutes in ms
  footstepIntervalMs: 900, // time between footstep sounds when walking
  voiceLineMinInterval: 30000, // 30 seconds minimum
  voiceLineMaxInterval: 200000, // 200 seconds maximum
});

const RUNTIME_AUDIO_ENABLE_VALUES = Object.freeze(["1", "on", "true"]);
const RUNTIME_AUDIO_DISABLE_VALUES = Object.freeze(["0", "off", "false"]);

export const AUDIO_RUNTIME_LOADING = Object.freeze({
  schemaVersion: 1,
  enabled: true,
  queryParam: "runtimeAudioQueue",
  queryEnableValues: RUNTIME_AUDIO_ENABLE_VALUES,
  queryDisableValues: RUNTIME_AUDIO_DISABLE_VALUES,
  bootMusicTracks: 1,
  bootVoiceLinesPerLibrary: 1,
  maxResidentMusicTracks: 3,
  maxResidentVoiceLines: 12,
  musicPrefetchDelayMs: 15000,
  fallbackQueue: Object.freeze({
    framesBeforeLoad: 2,
    idleTimeoutMs: 250,
    postRenderEvent: "postrender",
    completeEvent: "complete",
    errorEvent: "loaderror",
  }),
});

export function resolveRuntimeAudioStreamingEnabled(
  config = AUDIO_RUNTIME_LOADING,
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}
