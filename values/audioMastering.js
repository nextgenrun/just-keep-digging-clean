// Offline source calibration. User category/master preferences remain separate.
export const AUDIO_MASTERING = Object.freeze({
  musicTargetLufs: -18,
  voiceTargetLufs: -20,
  musicMaxBoostDb: 0,
  voiceMaxBoostDb: 2,
  truePeakCeilingDb: -3,
  voiceSilenceThresholdSeconds: 0.5,
  voiceLeadingPadSeconds: 0.12,
  voiceTrailingPadSeconds: 0.18,
  voiceFadeInSeconds: 0.003,
  voiceFadeOutSeconds: 0.012,
  starDcHighpassHz: 20,
  // Web Audio low/high-pass Q uses dB; match FFmpeg's linear Butterworth Q.
  starDcFilterQ: 20 * Math.log10(Math.SQRT1_2),
  starFilteredPeak: 1.17,
  starSoundKey: "sfx-star-destruction-0",
});
