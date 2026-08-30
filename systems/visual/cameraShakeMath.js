const MILLISECONDS_PER_SECOND = 1000;
const TAU = Math.PI * 2;

/** Resolves one deterministic, bounded camera-shake sample. */
export function resolveCameraShakeOffset(shake, elapsedMs, progress, config) {
  let factor;
  if (shake.decay === "linear") {
    factor = 1 - progress;
  } else if (shake.decay === "none") {
    factor = 1;
  } else {
    factor = Math.exp(-progress * config.exponentialDecayRate)
      * Math.pow(1 - progress, config.exponentialEndTaperPower);
  }

  const elapsedSeconds = elapsedMs / MILLISECONDS_PER_SECOND;
  const phaseX = elapsedSeconds * shake.freqX * TAU;
  const phaseY = elapsedSeconds * shake.freqY * TAU;
  const amplitude = shake.intensity * factor;
  const secondaryRatio = config.secondaryWaveAmplitudeRatio;
  const waveNormalization = 1 + secondaryRatio;
  const secondaryX = Math.sin(
    phaseX * config.secondaryWaveFrequencyRatioX + config.secondaryWavePhaseX,
  );
  const secondaryY = Math.cos(
    phaseY * config.secondaryWaveFrequencyRatioY + config.secondaryWavePhaseY,
  );

  return {
    offsetX: (Math.sin(phaseX) + secondaryX * secondaryRatio)
      * amplitude / waveNormalization,
    offsetY: (Math.cos(phaseY) + secondaryY * secondaryRatio)
      * amplitude / waveNormalization,
  };
}
