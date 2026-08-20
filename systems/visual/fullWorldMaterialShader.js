export const FULL_WORLD_MATERIAL_FRAGMENT = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uSharpness;
uniform float uReliefStrength;
uniform float uReliefRadiusPx;
uniform float uVibrance;
uniform float uShadowLift;
uniform float uHighlightCompression;
uniform float uGradientGain;
uniform float uReliefCeiling;
uniform float uDetailCeiling;
uniform vec2 uLightDirection;

varying vec2 outTexCoord;

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 texel = vec2(uReliefRadiusPx) / max(uResolution, vec2(1.0));
  vec4 centerSample = texture2D(uMainSampler, outTexCoord);
  vec3 center = centerSample.rgb;
  vec3 left = texture2D(uMainSampler, outTexCoord - vec2(texel.x, 0.0)).rgb;
  vec3 right = texture2D(uMainSampler, outTexCoord + vec2(texel.x, 0.0)).rgb;
  vec3 up = texture2D(uMainSampler, outTexCoord - vec2(0.0, texel.y)).rgb;
  vec3 down = texture2D(uMainSampler, outTexCoord + vec2(0.0, texel.y)).rgb;

  vec3 localAverage = (left + right + up + down) * 0.25;
  vec3 detail = clamp(center - localAverage, vec3(-uDetailCeiling), vec3(uDetailCeiling));
  vec3 color = center + detail * uSharpness;

  float gradientX = luminance(right) - luminance(left);
  float gradientY = luminance(down) - luminance(up);
  float relief = dot(vec2(gradientX, gradientY), normalize(uLightDirection));
  relief = clamp(relief * uGradientGain, -uReliefCeiling, uReliefCeiling);
  float centerLuma = luminance(center);
  float reliefMask = smoothstep(0.035, 0.16, length(vec2(gradientX, gradientY)));
  float highlightGuard = 1.0 - smoothstep(0.72, 0.98, centerLuma);
  color += relief * reliefMask * highlightGuard * uReliefStrength;

  float luma = luminance(color);
  color = mix(vec3(luma), color, 1.0 + uVibrance);
  color += uShadowLift * (1.0 - smoothstep(0.08, 0.46, luma));
  color -= uHighlightCompression * smoothstep(0.72, 1.0, luma);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), centerSample.a);
}
`;
