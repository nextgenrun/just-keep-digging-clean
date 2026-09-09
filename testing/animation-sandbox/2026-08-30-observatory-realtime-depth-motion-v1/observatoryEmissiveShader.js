export const OBSERVATORY_EMISSIVE_FRAGMENT = `
precision highp float;

uniform sampler2D uMainSampler;
uniform sampler2D uLightIdSampler;
uniform float uPhase;
uniform float uStrength;
uniform float uBaseIntensity;
uniform float uPulseRange;
uniform float uFlutterRange;
uniform float uBloomGain;

varying vec2 outTexCoord;

const float TAU = 6.28318530718;

vec2 auxiliaryUv(vec2 uv) {
  return vec2(uv.x, 1.0 - uv.y);
}

float seedFromId(vec3 id) {
  return fract(dot(id, vec3(12.9898, 78.233, 37.719)));
}

float spatialSeed(vec2 uv) {
  vec2 cell = floor(uv * vec2(209.0, 118.0));
  return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 source = texture2D(uMainSampler, outTexCoord);
  vec3 lightId = texture2D(uLightIdSampler, auxiliaryUv(outTexCoord)).rgb;
  float hasId = step(0.002, dot(lightId, vec3(1.0)));
  float seed = mix(spatialSeed(outTexCoord), seedFromId(lightId), hasId);
  float active = step(0.001, source.a);
  float time = uPhase * TAU;
  float frequency = 1.0 + floor(seed * 3.0);
  float slowPulse = sin(time * frequency + seed * TAU);
  float flutter = sin(time * (frequency + 5.0) + seed * 19.0);
  float rareDip = smoothstep(0.94, 1.0, sin(time * 2.0 + seed * 43.0));
  float animated = uBaseIntensity + slowPulse * uPulseRange + flutter * uFlutterRange - rareDip * 0.24;
  float intensity = 1.0 + active * clamp(uStrength, 0.0, 1.6) * (max(animated, 0.24) - 1.0);
  source.rgb *= intensity * uBloomGain;
  source.a *= mix(1.0, 0.84 + intensity * 0.16, active);
  gl_FragColor = clamp(source, 0.0, 1.0);
}
`;
