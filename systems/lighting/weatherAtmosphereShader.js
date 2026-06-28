export const WEATHER_ATMOSPHERE_SHADER_KEY = "jkd-weather-atmosphere-shader";

export const WEATHER_ATMOSPHERE_FRAGMENT = `
precision mediump float;

uniform vec2 resolution;
uniform float uLayerAlpha;
uniform float uGameTime;
uniform float uWeatherIntensity;
uniform float uRainAmount;
uniform float uStormAmount;
uniform float uWind;
uniform float uLightningFlash;
uniform float uSurfaceAmount;
uniform float uUndergroundAmount;
uniform float uUndergroundSignal;
uniform float uNightAmount;
uniform vec3 uSkyColor;
uniform vec3 uHorizonColor;

varying vec2 fragCoord;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
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

float rainLines(vec2 uv, float wind, float time) {
  vec2 p = uv;
  p.x += p.y * (wind * 0.0017) + time * (0.22 + abs(wind) * 0.0006);
  p.y += time * 1.85;
  float lane = abs(fract(p.x * 58.0) - 0.50);
  float dash = smoothstep(0.78, 0.20, abs(fract(p.y * 22.0) - 0.50));
  return smoothstep(0.030, 0.000, lane) * dash;
}

void main() {
  vec2 uv = fragCoord / resolution.xy;
  float t = uGameTime * 0.001;
  float surface = clamp(uSurfaceAmount, 0.0, 1.0);
  float underground = clamp(uUndergroundAmount, 0.0, 1.0);
  float rain = clamp(uRainAmount, 0.0, 1.0) * surface;
  float storm = clamp(uStormAmount, 0.0, 1.0);
  float cave = clamp(uUndergroundSignal + underground * 0.25, 0.0, 1.0);

  float vertical = smoothstep(1.04, 0.04, uv.y);
  float cloudNoise = noise(vec2(uv.x * 3.0 + t * 0.025 + uWind * 0.0009, uv.y * 4.4 - t * 0.018));
  float haze = (rain * 0.18 + storm * surface * 0.13 + uNightAmount * surface * 0.06) * vertical;
  haze += cloudNoise * rain * 0.10;

  float rainLine = rainLines(uv, uWind, t) * rain * 0.20;
  float caveNoise = noise(vec2(uv.x * 92.0 + t * 0.55, uv.y * 58.0 - t * 0.28));
  float caveGrain = (caveNoise - 0.42) * cave * 0.14;

  vec3 rainColor = mix(vec3(0.42, 0.60, 0.72), vec3(0.16, 0.25, 0.38), storm);
  vec3 caveColor = vec3(0.12, 0.20, 0.27);
  vec3 skyWash = mix(uSkyColor, uHorizonColor, smoothstep(0.74, 0.05, uv.y));
  vec3 color = mix(rainColor, skyWash, 0.20) * haze;
  color += vec3(0.72, 0.88, 1.00) * rainLine;
  color += caveColor * max(0.0, caveGrain);
  color += vec3(0.82, 0.93, 1.0) * uLightningFlash * surface * 0.08;

  float alpha = clamp((haze + rainLine + max(0.0, caveGrain) + uLightningFlash * surface * 0.05) * uLayerAlpha, 0.0, 0.42);
  gl_FragColor = vec4(color * uLayerAlpha, alpha);
}
`;
