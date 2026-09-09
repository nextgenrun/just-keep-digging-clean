import { SHADOW_MINER_REPELLENTS } from "../../values/shadowMiner.js";

export function clampShadowMinerAlpha(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function mixShadowMinerColor(fromColor, toColor, amount) {
  const ratio = clampShadowMinerAlpha(amount);
  const mixChannel = shift => Math.round(
    ((fromColor >> shift) & 0xff) * (1 - ratio)
      + ((toColor >> shift) & 0xff) * ratio,
  );
  return (mixChannel(16) << 16) | (mixChannel(8) << 8) | mixChannel(0);
}

export function resolveShadowMinerEchoPresentation({
  config,
  time,
  arrivalStartedAtMs,
  observeStartedAtMs,
  recoilStartedAtMs,
  observing,
  fleeing,
  lightPressure = 0,
}) {
  let scale = config.visual.echoScale;
  let alpha = config.visual.echoAlpha;
  const arrivalElapsedMs = time - arrivalStartedAtMs;
  if (arrivalElapsedMs >= 0 && arrivalElapsedMs < config.timing.spawnMs) {
    const leadMs = config.timing.arrivalTellLeadMs;
    const strength = arrivalElapsedMs <= leadMs
      ? clampShadowMinerAlpha(arrivalElapsedMs / leadMs)
      : clampShadowMinerAlpha((config.timing.spawnMs - arrivalElapsedMs)
        / (config.timing.spawnMs - leadMs));
    scale += (config.visual.arrivalEchoScale - scale) * strength;
  }
  if (observing) {
    const settle = clampShadowMinerAlpha(
      (time - observeStartedAtMs) / config.timing.observeSettleMs,
    );
    scale += (config.visual.observeEchoScale - scale) * settle;
    alpha += (config.visual.observeEchoAlpha - alpha) * settle;
  }
  const light = clampShadowMinerAlpha(lightPressure);
  scale += (config.visual.lightExposureEchoScale - scale) * light;
  alpha += (config.visual.lightExposureEchoAlpha - alpha) * light;
  const recoil = fleeing
    ? clampShadowMinerAlpha(1 - ((time - recoilStartedAtMs)
      / config.timing.lightRecoilMs))
    : 0;
  scale += (config.visual.lightRecoilEchoScale - scale) * recoil;
  alpha += (config.visual.lightRecoilEchoAlpha - alpha) * recoil;
  return { scale, alpha };
}

export function resolveShadowMinerRecoilTint(config, repellent) {
  return repellent === SHADOW_MINER_REPELLENTS.STAR
    ? config.visual.starLightRecoilTint
    : config.visual.lightRecoilTint;
}
