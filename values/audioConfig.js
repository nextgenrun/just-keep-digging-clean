// ==================== AUDIO CONFIG ====================
export const AUDIO_CONFIG = Object.freeze({
  // Volume settings (all values must be 0.0–1.0; Web Audio clips above 1.0)
  masterVolume: 0.9,
  musicVolume: 0.4,
  sfxVolume: 0.9,
  voiceVolume: 0.8,
  npcVoiceVolume: 0.7,
  voiceMusicDuckMultiplier: 0.3,
  voiceSfxDuckMultiplier: 0.5,
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
  uiVolume: 0.6,
  uiSelectVolumeMultiplier: 0.42,
  uiConfirmVolumeMultiplier: 0.58,
  uiSelectRate: 1.08,
  uiConfirmRate: 1.0,
  uiSelectMinIntervalMs: 70,
  xpGatherVolumeMultiplier: 0.14,
  xpGatherSpecialVolumeMultiplier: 0.2,
  xpGatherBaseRate: 1.08,
  xpGatherSegmentRateStep: 0.018,
  xpGatherMaxSegmentIndex: 9,
  xpGatherLevelRateBoost: 0.06,
  xpGatherMinIntervalMs: 180,
  starDigVolume: 0.85,
  starDestructionVolume: 0.18,
  levelUpRewardVolume: 0.5,
  
  // Intervals
  musicTrackChangeInterval: 180000, // 3 minutes in ms
  footstepIntervalMs: 900, // time between footstep sounds when walking
  voiceLineMinInterval: 30000, // 30 seconds minimum
  voiceLineMaxInterval: 200000, // 200 seconds maximum
});

const EVENT_VOICE_ENABLE_VALUES = Object.freeze(["1", "on", "true"]);

export const EVENT_VOICE_CONFIG = Object.freeze({
  schemaVersion: 1,
  enabledByDefault: false,
  queryParam: "eventVoices",
  queryEnableValues: EVENT_VOICE_ENABLE_VALUES,
  queryFamilyParam: "eventVoiceFamily",
  reviewTriggerKey: "F8",
  eventIds: Object.freeze({
    earthquakeWarning: "earthquakeWarning",
    rareMaterialDiscovery: "rareMaterialDiscovery",
    deepReturn: "deepReturn",
    hardcoreDanger: "hardcoreDanger",
    meaningfulPurchase: "meaningfulPurchase",
    biomeFirstEntry: "biomeFirstEntry",
    titanDiscovery: "titanDiscovery",
    comboRecord: "comboRecord",
    inventoryCritical: "inventoryCritical",
    starRelease: "starRelease",
  }),
  merchantOpenChance: 0.35,
  merchantOpenCooldownMs: 45000,
  maxQueuedLines: 2,
  queueInterlineDelayMs: 750,
  narrationQueueTtlMs: 15000,
  ambientBusyRetryMs: 5000,
  ambientQuietAfterEventMs: 20000,
  ambientQuietAfterMerchantMs: 12000,
  eventGlobalCooldownMs: 12000,
  sources: Object.freeze({
    ambient: "ambient-random",
    merchant: "merchant-open",
    event: "gameplay-event",
    narration: "narration",
  }),
  priorities: Object.freeze({
    ambient: 0,
    merchant: 100,
    event: 200,
    narration: 300,
  }),
  events: Object.freeze({
    earthquakeWarning: Object.freeze({
      libraryId: "earthquakeWarning",
      cooldownMs: 180000,
      queueTtlMs: 7000,
      ambientQuietAfterMs: 20000,
      priority: 220,
      oncePerSession: false,
    }),
    rareMaterialDiscovery: Object.freeze({ libraryId: "rareMaterialDiscovery", cooldownMs: 0, queueTtlMs: 12000, ambientQuietAfterMs: 15000, priority: 160, oncePerSession: true }),
    deepReturn: Object.freeze({ libraryId: "deepReturn", cooldownMs: 0, queueTtlMs: 15000, ambientQuietAfterMs: 15000, priority: 140, oncePerSession: false }),
    hardcoreDanger: Object.freeze({ libraryId: "hardcoreDanger", cooldownMs: 60000, queueTtlMs: 4000, ambientQuietAfterMs: 15000, priority: 240, oncePerSession: false }),
    meaningfulPurchase: Object.freeze({ libraryId: "meaningfulPurchase", cooldownMs: 90000, queueTtlMs: 0, ambientQuietAfterMs: 12000, priority: 100, oncePerSession: false }),
    biomeFirstEntry: Object.freeze({ libraryId: "biomeFirstEntry", cooldownMs: 0, queueTtlMs: 15000, ambientQuietAfterMs: 15000, priority: 150, oncePerSession: true }),
    titanDiscovery: Object.freeze({ libraryId: "titanDiscovery", cooldownMs: 0, queueTtlMs: 30000, ambientQuietAfterMs: 20000, priority: 250, oncePerSession: true }),
    comboRecord: Object.freeze({ libraryId: "comboRecord", cooldownMs: 0, queueTtlMs: 8000, ambientQuietAfterMs: 8000, priority: 90, oncePerSession: true }),
    inventoryCritical: Object.freeze({ libraryId: "inventoryCritical", cooldownMs: 60000, queueTtlMs: 5000, ambientQuietAfterMs: 10000, priority: 110, oncePerSession: false }),
    starRelease: Object.freeze({ libraryId: "starRelease", cooldownMs: 0, queueTtlMs: 12000, ambientQuietAfterMs: 18000, priority: 210, oncePerSession: true }),
  }),
});

export function resolveEventVoiceDemoEnabled(
  config = EVENT_VOICE_CONFIG,
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value) return config.queryEnableValues.includes(value);
  return config.enabledByDefault;
}

export function resolveEventVoiceReviewFamily(
  config = EVENT_VOICE_CONFIG,
  search = globalThis.location?.search || "",
) {
  const requested = new URLSearchParams(search).get(config.queryFamilyParam);
  return requested && config.events[requested]
    ? requested
    : config.eventIds.earthquakeWarning;
}

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
  hardcoreNearDeath: Object.freeze([
    Object.freeze({
      key: "sfx-hardcore-near-death-0",
      file: "hardcore-near-death-warning.wav",
      path: `${APPROVED_SFX_BASE_PATH}hardcore-near-death-warning.wav`,
      sha256: "7A4EEF03201228A108C8D481D8FFE17F2A97F8D20DF0FFE1ED0A60B4AF88508E",
    }),
  ]),
  starDestruction: Object.freeze([
    Object.freeze({
      key: "sfx-star-destruction-0",
      file: "star-destruction-shockwave-freesound-814053.mp3",
      path: `${APPROVED_SFX_BASE_PATH}star-destruction-shockwave-freesound-814053.mp3`,
      sha256: "AB12C94200983A26D0614EC1A3EAD2F692CFA07B7F20406E2D6D61DA83F3B2A0",
      volumeMultiplier: 1,
      sourceUrl: "https://freesound.org/people/qubodup/sounds/814053/",
      license: "CC0-1.0",
    }),
  ]),
  levelUpReward: Object.freeze([
    Object.freeze({
      key: "sfx-level-up-reward-0",
      file: "level-up-short-freesound-320655.mp3",
      path: `${APPROVED_SFX_BASE_PATH}level-up-short-freesound-320655.mp3`,
      sha256: "3F321B470816F9CDC807E3CC0E960800D4D54E5DFE429FBAD1C9328B30AB4E42",
      volumeMultiplier: 0.4,
      sourceUrl: "https://freesound.org/people/rhodesmas/sounds/320655/",
      license: "CC-BY-4.0",
      credit: "Level Up 01 by rhodesmas",
    }),
    Object.freeze({
      key: "sfx-level-up-reward-1",
      file: "level-up-epic-freesound-682633.mp3",
      path: `${APPROVED_SFX_BASE_PATH}level-up-epic-freesound-682633.mp3`,
      sha256: "7E7EDDA3BEA604A7D6174DFCDCA54C1CF89254E0CE6B23D8ABE064746404ED93",
      volumeMultiplier: 1,
      sourceUrl: "https://freesound.org/people/Bastianhallo/sounds/682633/",
      license: "CC0-1.0",
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
