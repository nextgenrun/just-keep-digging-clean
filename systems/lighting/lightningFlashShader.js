export const LIGHTNING_FLASH_SHADER_KEY = "jkd-lightning-flash-shader";

export const LIGHTNING_FLASH_FRAGMENT = `
precision mediump float;

uniform vec2 resolution;
uniform float uLayerAlpha;
uniform float uGameTime;
uniform float uLightningFlash;
uniform float uStormAmount;
uniform float uSurfaceAmount;
uniform float uUndergroundAmount;
uniform float uUndergroundSignal;
uniform float uStormCavePulse;
uniform vec2 uSunPosition;

varying vec2 fragCoord;

float hash(vec2 p) {
  p = fract(p * vec2(269.5, 183.3));
  p += dot(p, p + 19.19);
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
  float t = uGameTime * 0.001;
  float flash = clamp(uLightningFlash, 0.0, 1.0);
  float surface = clamp(uSurfaceAmount, 0.0, 1.0);
  float cave = clamp(uUndergroundAmount + uUndergroundSignal + uStormCavePulse, 0.0, 1.0);
  vec2 strikeOrigin = vec2(clamp(uSunPosition.x, 0.12, 0.88), 1.0 - clamp(uSunPosition.y, 0.04, 0.55));
  float aspect = resolution.x / max(1.0, resolution.y);
  vec2 d = vec2((uv.x - strikeOrigin.x) * aspect, uv.y - strikeOrigin.y);
  float bloom = smoothstep(0.90, 0.02, length(d)) * surface;
  float bands = noise(vec2(uv.x * 9.0 + t * 9.0, uv.y * 36.0 - t * 4.0));
  float cavePulse = cave * smoothstep(1.00, 0.00, abs(uv.y - 0.52) * 1.7);
  vec3 color = vec3(0.72, 0.88, 1.0) * flash * (0.42 + bloom * 0.58);
  color += vec3(0.28, 0.48, 0.72) * flash * cavePulse * 0.30;
  color += vec3(1.0) * flash * bands * uStormAmount * 0.055;
  float alpha = clamp(flash * uLayerAlpha * (0.18 + bloom * 0.30 + cavePulse * 0.13), 0.0, 0.62);
  gl_FragColor = vec4(color * uLayerAlpha, alpha);
}
`;
