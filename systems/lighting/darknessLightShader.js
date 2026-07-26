export const DARKNESS_LIGHT_SHADER_KEY = "jkd-darkness-light-shader";

export const DARKNESS_LIGHT_FRAGMENT = `
precision mediump float;

uniform vec2 resolution;
uniform float uLayerAlpha;
uniform float uGameTime;
uniform float uDarknessAlpha;
uniform float uDepthRatio;
uniform float uTorchActive;
uniform vec2 uTorchPosition;
uniform float uTorchRadius;
uniform float uTorchGlow;
uniform float uPlayerLightVisualUpgrade;
uniform float uTorchWarmthStrength;
uniform float uTorchOpacityStrength;
uniform float uTorchCoreStrength;
uniform float uTorchBounceStrength;
uniform float uTorchFalloffPower;
uniform float uTorchCoreRadiusRatio;
uniform float uTorchHotRadiusRatio;
uniform float uTorchEdgeNoiseStrength;
uniform float uTorchBounceOffsetRatio;
uniform float uTorchBounceVerticalScale;
uniform float uNightAmount;
uniform float uRainAmount;
uniform float uStormAmount;
uniform float uWind;
uniform float uUndergroundSignal;
uniform float uUndergroundDarknessInfluence;
uniform float uStormCavePulse;
uniform float uSunStrength;

varying vec2 fragCoord;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 74.7);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = fragCoord / resolution.xy;
  float aspect = resolution.x / max(1.0, resolution.y);
  float t = uGameTime * 0.001;
  vec2 torchUv = vec2(uTorchPosition.x, 1.0 - uTorchPosition.y);
  vec2 delta = vec2((uv.x - torchUv.x) * aspect, uv.y - torchUv.y);
  float radius = max(0.001, uTorchRadius);
  float dist = length(delta) / radius;

  float legacyFirePulse = 0.96
    + sin(t * 6.4 + uWind * 0.010) * 0.020
    + sin(t * 13.2) * 0.012
    + uStormCavePulse * 0.045;
  float legacyTorch = smoothstep(1.08 * legacyFirePulse, 0.02, dist)
    * clamp(uTorchActive * uTorchGlow, 0.0, 1.0);
  float legacyCore = smoothstep(0.28 * legacyFirePulse, 0.00, dist)
    * clamp(uTorchActive * uTorchGlow, 0.0, 1.0);

  vec2 centered = uv - 0.5;
  centered.x *= aspect;
  float vignette = smoothstep(0.28, 0.88, length(centered));
  float darkness = clamp(uDarknessAlpha, 0.0, 1.0);
  float cave = clamp(uUndergroundDarknessInfluence, 0.0, 1.0);
  float grain = noise(vec2(uv.x * 180.0 + t * 0.9, uv.y * 110.0 - t * 0.33));
  float caveGrain = (grain - 0.45) * cave * darkness * 0.11;

  vec3 caveBlue = vec3(0.045, 0.075, 0.105);
  vec3 legacyWarm = mix(
    vec3(1.0, 0.34, 0.10),
    vec3(1.0, 0.78, 0.36),
    legacyCore
  );
  vec3 legacyColor = legacyWarm * legacyTorch * 0.16;
  legacyColor += caveBlue * max(0.0, caveGrain);
  legacyColor *= uLayerAlpha;

  float legacyTorchAlpha = legacyTorch
    * (0.055 + uNightAmount * 0.025 + cave * 0.025 + uRainAmount * 0.010);
  float vignetteAlpha = vignette * (0.05 + darkness * 0.11 + uDepthRatio * 0.08 + uStormAmount * 0.04);
  float grainAlpha = abs(caveGrain) * 0.55;
  float legacyAlpha = clamp(
    (legacyTorchAlpha + vignetteAlpha + grainAlpha) * uLayerAlpha,
    0.0,
    0.28
  );

  float naturalPulse = 0.985
    + sin(t * 5.7 + uWind * 0.007) * 0.012
    + sin(t * 11.9 + 1.4) * 0.007
    + uStormCavePulse * 0.025;
  float edgeNoise = (
    noise(vec2(uv.x * 96.0 + t * 0.23, uv.y * 72.0 - t * 0.17)) - 0.5
  ) * 2.0 * uTorchEdgeNoiseStrength;
  float noisyDistance = max(
    0.0,
    dist + edgeNoise * smoothstep(0.36, 1.0, dist)
  );
  float naturalDistance = noisyDistance / max(0.001, naturalPulse);
  float naturalRadial = clamp(1.0 - naturalDistance, 0.0, 1.0);
  float naturalSpill = pow(
    naturalRadial,
    max(0.1, uTorchFalloffPower)
  );
  float naturalCore = 1.0 - smoothstep(
    0.0,
    max(0.001, uTorchCoreRadiusRatio),
    naturalDistance
  );
  float naturalHot = 1.0 - smoothstep(
    0.0,
    max(0.001, uTorchHotRadiusRatio),
    naturalDistance
  );

  vec2 bounceDelta = delta;
  bounceDelta.y = (
    bounceDelta.y + radius * uTorchBounceOffsetRatio
  ) * max(0.1, uTorchBounceVerticalScale);
  float bounceDistance = length(bounceDelta) / radius;
  float bounceRadial = clamp(1.0 - bounceDistance, 0.0, 1.0);
  float belowLight = 1.0 - smoothstep(0.0, radius * 0.38, delta.y);
  float naturalBounce = pow(
    bounceRadial,
    max(0.1, uTorchFalloffPower + 0.4)
  ) * belowLight;

  float activeGlow = clamp(uTorchActive * uTorchGlow, 0.0, 1.0);
  naturalSpill *= activeGlow;
  naturalCore *= activeGlow;
  naturalHot *= activeGlow;
  naturalBounce *= activeGlow;

  vec3 ember = vec3(1.0, 0.20, 0.035);
  vec3 amber = vec3(1.0, 0.58, 0.18);
  vec3 hot = vec3(1.0, 0.93, 0.68);
  vec3 naturalTemperature = mix(ember, amber, naturalCore);
  naturalTemperature = mix(naturalTemperature, hot, naturalHot);
  vec3 naturalColor = naturalTemperature
    * naturalSpill
    * uTorchWarmthStrength;
  naturalColor += hot
    * (naturalCore + naturalHot * 0.45)
    * uTorchCoreStrength
    * uTorchWarmthStrength;
  naturalColor += amber
    * naturalBounce
    * uTorchBounceStrength
    * uTorchWarmthStrength;
  naturalColor += caveBlue * max(0.0, caveGrain) * 0.35;

  float naturalAlpha = (
    naturalSpill
    + naturalCore * uTorchCoreStrength * 0.65
    + naturalHot * 0.35
    + naturalBounce * uTorchBounceStrength
  ) * uTorchOpacityStrength * uLayerAlpha;
  naturalAlpha += abs(caveGrain) * 0.18 * uLayerAlpha;
  naturalAlpha = clamp(naturalAlpha, 0.0, 0.34);

  float visualUpgrade = clamp(uPlayerLightVisualUpgrade, 0.0, 1.0);
  vec3 color = mix(legacyColor, naturalColor, visualUpgrade);
  float alpha = mix(legacyAlpha, naturalAlpha, visualUpgrade);

  gl_FragColor = vec4(color, alpha);
}
`;
