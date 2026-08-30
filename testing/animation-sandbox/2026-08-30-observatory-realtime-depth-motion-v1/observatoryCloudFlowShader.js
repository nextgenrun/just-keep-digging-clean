export const OBSERVATORY_CLOUD_FLOW_FRAGMENT = `
precision highp float;

uniform sampler2D uMainSampler;
uniform float uPhase;
uniform float uStrength;
uniform float uAmplitude;
uniform float uFrequencyX;
uniform float uFrequencyY;
uniform float uVerticalRatio;
uniform float uCycles;
uniform float uPhaseOffset;

varying vec2 outTexCoord;

const float TAU = 6.28318530718;

vec2 mirroredUv(vec2 uv) {
  return abs(mod(uv, 2.0) - 1.0);
}

void main() {
  vec2 uv = outTexCoord;
  if (uStrength < 0.001) {
    gl_FragColor = texture2D(uMainSampler, uv);
    return;
  }
  float time = uPhase * uCycles * TAU;
  float phase = uPhaseOffset * TAU;
  float spatialA = (uv.y * uFrequencyY + uv.x * 1.7) * TAU + phase;
  float spatialB = (uv.x * uFrequencyX - uv.y * 2.1) * TAU + phase * 1.7;
  float spatialC = (uv.x * 2.6 + uv.y * 4.3) * TAU + phase * 2.3;
  float waveA = sin(spatialA - time) - sin(spatialA);
  float waveB = cos(spatialB + time * 2.0) - cos(spatialB);
  float waveC = sin(spatialC - time * 3.0) - sin(spatialC);
  vec2 flow = vec2(
    waveA * 0.58 + waveB * 0.28 + waveC * 0.14,
    (waveB * 0.52 - waveA * 0.30 + waveC * 0.18) * uVerticalRatio
  ) * uAmplitude * uStrength;

  vec2 movedUv = mirroredUv(uv + flow);
  vec2 detailOffset = vec2(cos(time + uv.y * 19.0), sin(time * 2.0 + uv.x * 17.0))
    * uAmplitude * uStrength * 0.24;
  vec4 primary = texture2D(uMainSampler, movedUv);
  vec4 detailA = texture2D(uMainSampler, mirroredUv(movedUv + detailOffset));
  vec4 detailB = texture2D(uMainSampler, mirroredUv(movedUv - detailOffset * 0.63));
  vec4 color = primary * 0.72 + detailA * 0.18 + detailB * 0.10;

  float billowWave = (uv.x * 6.0 + uv.y * 5.0) * TAU + phase;
  float billow = 1.0 + (sin(billowWave - time * 2.0) - sin(billowWave)) * 0.035 * uStrength;
  color.rgb *= billow;
  float alphaWave = (uv.x * 3.0 - uv.y * 4.0) * TAU + phase;
  color.a *= 1.0 + (sin(alphaWave + time) - sin(alphaWave)) * 0.015 * uStrength;
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`;
