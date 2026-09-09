export const OBSERVATORY_CLOUD_STREAM_FRAGMENT = `
precision highp float;

uniform sampler2D uMainSampler;
uniform float uPhase;
uniform float uStrength;
uniform float uTravelX;
uniform float uTravelY;
uniform float uCycles;
uniform float uPhaseOffset;
uniform float uOpacity;
uniform float uResetFeather;

varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;
  if (uStrength < 0.001) {
    vec4 stillColor = texture2D(uMainSampler, uv) * uOpacity;
    gl_FragColor = stillColor.a < 0.001 ? vec4(0.0) : stillColor;
    return;
  }
  float streamPhase = fract(uPhase * uCycles + uPhaseOffset);
  vec2 travel = vec2(uTravelX, uTravelY) * uStrength;
  vec2 streamOffset = (streamPhase - 0.5) * travel;
  float fadeIn = smoothstep(0.0, uResetFeather, streamPhase);
  float fadeOut = 1.0 - smoothstep(1.0 - uResetFeather, 1.0, streamPhase);
  float resetFade = fadeIn * fadeOut;
  vec4 color = texture2D(uMainSampler, clamp(uv - streamOffset, vec2(0.001), vec2(0.999)));
  color *= uOpacity * resetFade;
  gl_FragColor = color.a < 0.001 ? vec4(0.0) : color;
}
`;
