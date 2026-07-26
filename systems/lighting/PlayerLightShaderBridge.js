import { clamp01Finite as clamp01 } from "../../values/mathUtils.js";

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function resolvePlayerLightLayerDepth(scene, name, layerConfig) {
  if (name !== "darknessLight") return layerConfig.depth;

  const light = scene.lightSystem?.getShaderSnapshot?.();
  const naturalDepth = scene.lightSystem
    ?.config
    ?.playerLightVisual
    ?.natural
    ?.shaderRenderDepth;

  return light?.playerLightVisualUpgrade === true && Number.isFinite(naturalDepth)
    ? naturalDepth
    : layerConfig.depth;
}

export function resolvePlayerLightShaderState(
  light,
  width,
  height,
  darknessLightConfig
) {
  const visualUpgrade = light.playerLightVisualUpgrade !== false;
  const radiusScale = visualUpgrade
    ? finiteOr(darknessLightConfig.naturalRadiusScale, 1)
    : 1;
  const radiusDenominator = visualUpgrade
    ? Math.max(1, height)
    : Math.max(width, height);
  const maxScreenRadius = visualUpgrade
    ? darknessLightConfig.maxNaturalTorchScreenRadius
    : darknessLightConfig.maxTorchScreenRadius;

  return {
    visualUpgrade,
    radius: Math.min(
      clamp01(finiteOr(maxScreenRadius, 1)),
      clamp01((light.torchRadiusPx || 0) * radiusScale / radiusDenominator)
    ),
    warmthStrength: clamp01(darknessLightConfig.torchWarmthStrength),
    opacityStrength: clamp01(darknessLightConfig.torchOpacityStrength),
    coreStrength: clamp01(darknessLightConfig.torchCoreStrength),
    bounceStrength: clamp01(darknessLightConfig.torchBounceStrength),
    falloffPower: Math.max(
      0.1,
      finiteOr(darknessLightConfig.torchFalloffPower, 1)
    ),
    coreRadiusRatio: clamp01(darknessLightConfig.torchCoreRadiusRatio),
    hotRadiusRatio: clamp01(darknessLightConfig.torchHotRadiusRatio),
    edgeNoiseStrength: clamp01(darknessLightConfig.torchEdgeNoiseStrength),
    bounceOffsetRatio: clamp01(darknessLightConfig.torchBounceOffsetRatio),
    bounceVerticalScale: Math.max(
      0.1,
      finiteOr(darknessLightConfig.torchBounceVerticalScale, 1)
    ),
  };
}

export function applyPlayerLightShaderUniforms(shader, state) {
  shader.setUniform(
    "uPlayerLightVisualUpgrade.value",
    state.visualUpgrade ? 1 : 0
  );
  shader.setUniform("uTorchWarmthStrength.value", state.warmthStrength);
  shader.setUniform("uTorchOpacityStrength.value", state.opacityStrength);
  shader.setUniform("uTorchCoreStrength.value", state.coreStrength);
  shader.setUniform("uTorchBounceStrength.value", state.bounceStrength);
  shader.setUniform("uTorchFalloffPower.value", state.falloffPower);
  shader.setUniform("uTorchCoreRadiusRatio.value", state.coreRadiusRatio);
  shader.setUniform("uTorchHotRadiusRatio.value", state.hotRadiusRatio);
  shader.setUniform("uTorchEdgeNoiseStrength.value", state.edgeNoiseStrength);
  shader.setUniform("uTorchBounceOffsetRatio.value", state.bounceOffsetRatio);
  shader.setUniform(
    "uTorchBounceVerticalScale.value",
    state.bounceVerticalScale
  );
}
