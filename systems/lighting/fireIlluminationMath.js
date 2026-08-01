import {
  clampFireLight01,
  mixFireLight,
} from "./fireLightMath.js";

export function resolveFireIlluminationFrame(
  time,
  framesPerSecond,
  frameCount,
  offset = 0
) {
  return (
    Math.floor(Math.max(0, time) * framesPerSecond / 1000) + offset
  ) % frameCount;
}

export function resolveFireIlluminationMotion(
  time,
  reducedFlicker,
  config
) {
  const motionScale = reducedFlicker ? config.reducedPulseScale : 1;
  const animationTime = Math.max(0, Number(time) || 0)
    * (reducedFlicker ? config.reducedFrameRateScale : 1);
  const phase = animationTime * config.radiansPerMs;
  return {
    animationTime,
    alphaPulse: 1 + Math.sin(phase) * config.alphaAmount * motionScale,
    scalePulse: 1 + Math.cos(phase * 1.71)
      * config.scaleAmount * motionScale,
  };
}

export function resolveFireIlluminationEnvironmentAlpha(
  lighting,
  intensity
) {
  const surface = clampFireLight01(lighting?.surfaceLightInfluence);
  const underground = clampFireLight01(
    lighting?.undergroundDarknessInfluence
  );
  const surfaceAlpha = mixFireLight(
    intensity.surfaceDay,
    intensity.surfaceNight,
    clampFireLight01(lighting?.nightAmount)
  );
  return clampFireLight01(
    underground * intensity.underground + surface * surfaceAlpha
  );
}

export function resolveFireIlluminationFuelScale(fuelRatio, intensity) {
  const fuel = clampFireLight01(fuelRatio);
  return fuel >= intensity.lowFuelReferenceRatio
    ? 1
    : mixFireLight(
      intensity.lowFuelMinimumScale,
      1,
      fuel / intensity.lowFuelReferenceRatio
    );
}

export function resolveFireIlluminationStateFrame(
  time,
  state,
  layer,
  atlas
) {
  const row = layer.stateRows[state];
  const alpha = layer.stateAlpha[state] || 0;
  if (!Number.isFinite(row) || alpha <= 0) {
    return { frame: null, alpha: 0 };
  }
  const localFrame = resolveFireIlluminationFrame(
    time,
    layer.framesPerSecond,
    atlas.columns
  );
  return {
    frame: row * atlas.columns + localFrame,
    alpha,
  };
}
