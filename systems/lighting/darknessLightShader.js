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

  float firePulse = 0.96
    + sin(t * 6.4 + uWind * 0.010) * 0.020
    + sin(t * 13.2) * 0.012
    + uStormCavePulse * 0.045;
  float torch = smoothstep(1.08 * firePulse, 0.02, dist)
    * clamp(uTorchActive * uTorchGlow, 0.0, 1.0);
  float core = smoothstep(0.28 * firePulse, 0.00, dist)
    * clamp(uTorchActive * uTorchGlow, 0.0, 1.0);

  vec2 centered = uv - 0.5;
  centered.x *= aspect;
  float vignette = smoothstep(0.28, 0.88, length(centered));
  float darkness = clamp(uDarknessAlpha, 0.0, 1.0);
  float cave = clamp(uUndergroundDarknessInfluence, 0.0, 1.0);
  float grain = noise(vec2(uv.x * 180.0 + t * 0.9, uv.y * 110.0 - t * 0.33));
  float caveGrain = (grain - 0.45) * cave * darkness * 0.11;

  vec3 warm = mix(vec3(1.0, 0.34, 0.10), vec3(1.0, 0.78, 0.36), core);
  vec3 caveBlue = vec3(0.045, 0.075, 0.105);
  vec3 color = warm * torch * 0.16;
  color += caveBlue * max(0.0, caveGrain);
  color += vec3(0.0, 0.0, 0.0) * vignette;

  float torchAlpha = torch * (0.055 + uNightAmount * 0.025 + cave * 0.025 + uRainAmount * 0.010);
  float vignetteAlpha = vignette * (0.05 + darkness * 0.11 + uDepthRatio * 0.08 + uStormAmount * 0.04);
  float grainAlpha = abs(caveGrain) * 0.55;
  float alpha = clamp((torchAlpha + vignetteAlpha + grainAlpha) * uLayerAlpha, 0.0, 0.28);

  gl_FragColor = vec4(color * uLayerAlpha, alpha);
}
`;
