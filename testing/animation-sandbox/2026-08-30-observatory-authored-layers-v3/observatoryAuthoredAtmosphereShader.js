export const OBSERVATORY_AUTHORED_ATMOSPHERE_FRAGMENT = `
precision highp float;

uniform sampler2D uMainSampler;
uniform float uPhase;
uniform float uStrength;
uniform float uRegionCols;
uniform float uRegionRows;
uniform float uDriftAmplitude;
uniform float uAmplitude;
uniform float uOrbitRatio;
uniform float uSpatialX;
uniform float uSpatialY;
uniform float uLuminanceRange;
uniform float uCycles;
uniform float uPhaseOffset;
uniform float uOpacity;

varying vec2 outTexCoord;

const float TAU = 6.28318530718;

float hashCell(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

float regionalGain(vec2 uv, float offset) {
  vec2 regionUv = uv * vec2(uRegionCols, uRegionRows);
  vec2 cell = floor(regionUv);
  vec2 blend = fract(regionUv);
  blend = blend * blend * (3.0 - 2.0 * blend);
  float top = mix(hashCell(cell + offset), hashCell(cell + vec2(1.0, 0.0) + offset), blend.x);
  float bottom = mix(hashCell(cell + vec2(0.0, 1.0) + offset), hashCell(cell + vec2(1.0) + offset), blend.x);
  return mix(0.78, 1.06, mix(top, bottom, blend.y));
}

void main() {
  vec2 uv = outTexCoord;
  if (uStrength < 0.001) {
    vec4 stillColor = texture2D(uMainSampler, uv);
    stillColor *= uOpacity;
    gl_FragColor = stillColor.a < 0.001 ? vec4(0.0) : stillColor;
    return;
  }
  float time = uPhase * uCycles * TAU;
  float offset = uPhaseOffset * TAU;
  float fieldA = (uv.x * uSpatialX + uv.y * 0.42) * TAU + offset - time;
  float fieldB = (uv.x * (uSpatialX * 0.57) - uv.y * (uSpatialY * 0.68)) * TAU + offset * 1.73 - time * 2.0;
  float fieldC = (uv.x * (uSpatialX * 1.71) + uv.y * (uSpatialY * 0.36)) * TAU + offset * 2.31 - time * 3.0;
  float gain = regionalGain(uv, uPhaseOffset);
  float horizontal = sin(fieldA) * 0.66 + sin(fieldB) * 0.25 + sin(fieldC) * 0.09;
  float vertical = cos(fieldA + 1.1) * 0.56 + sin(fieldB - 0.7) * 0.31 + cos(fieldC) * 0.13;
  vec2 flow = vec2(horizontal * uDriftAmplitude, vertical * uAmplitude * uOrbitRatio) * gain * uStrength;
  vec2 sampleUv = clamp(uv + flow, vec2(0.001), vec2(0.999));
  vec4 color = texture2D(uMainSampler, sampleUv);
  float structure = sin(fieldA) * 0.72 + cos(fieldB) * 0.28;
  color.rgb *= 1.0 + structure * uLuminanceRange * uStrength;
  color *= uOpacity;
  gl_FragColor = color.a < 0.001 ? vec4(0.0) : clamp(color, 0.0, 1.0);
}
`;
