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
  
  // Intervals
  musicTrackChangeInterval: 180000, // 3 minutes in ms
  footstepIntervalMs: 900, // time between footstep sounds when walking
  voiceLineMinInterval: 30000, // 30 seconds minimum
  voiceLineMaxInterval: 200000, // 200 seconds maximum
});
