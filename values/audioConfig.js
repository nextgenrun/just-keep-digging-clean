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
  seismicWarningVolume: 0.72,
  hardcoreNearDeathVolume: 0.9,
  hardcoreNearDeathRate: 0.88,
  rareDiscoveryVolume: 0.78,
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

const APPROVED_SFX_BASE_PATH = "sound/soundEffects/approved-sfx-findings-v1/";

export const APPROVED_SFX_FAMILIES = Object.freeze({
  seismicWarning: Object.freeze([
    Object.freeze({
      key: "sfx-seismic-warning-0",
      file: "seismic-warning-distant-collapse.ogg",
      path: `${APPROVED_SFX_BASE_PATH}seismic-warning-distant-collapse.ogg`,
      sha256: "FC4BB3EC3DA0A6D01BC37F7E229B05347C00E201330BC2DE81B06A3886D756E2",
    }),
    Object.freeze({
      key: "sfx-seismic-warning-1",
      file: "seismic-warning-heavy-collapse.ogg",
      path: `${APPROVED_SFX_BASE_PATH}seismic-warning-heavy-collapse.ogg`,
      sha256: "F392BA177C12980B8872FB875FEE16893FD87621FF98E8110D5D5A82E5B9CCD2",
    }),
  ]),
  rareDiscovery: Object.freeze([
    Object.freeze({
      key: "sfx-rare-discovery-0",
      file: "rare-discovery-clean-reward.ogg",
      path: `${APPROVED_SFX_BASE_PATH}rare-discovery-clean-reward.ogg`,
      sha256: "7E10823163718361C50A0047BDE5E8D8BBC9BEE12DE1DB3DDE472E7452E0F9A8",
    }),
    Object.freeze({
      key: "sfx-rare-discovery-1",
      file: "rare-discovery-tight-reward.ogg",
      path: `${APPROVED_SFX_BASE_PATH}rare-discovery-tight-reward.ogg`,
      sha256: "B02B380A98442B41BE53261224505CC29F7BDDD6B5F893AFDFA9A30D5EC734C4",
    }),
  ]),
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
