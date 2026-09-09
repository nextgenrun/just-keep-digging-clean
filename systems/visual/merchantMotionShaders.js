import { MERCHANT_MOTION_CONFIG as C } from '../../values/merchantMotion.js';

export const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 aPosition;
in vec4 aBones;
in vec4 aWeights;
uniform mat3 uBones[${C.maxBones}];
uniform vec2 uViewport;
uniform vec2 uOrigin;
uniform float uScale;
out vec2 vUv;
void main() {
  vec3 source = vec3(aPosition, 1.0);
  vec3 p = (uBones[int(aBones.x)] * source) * aWeights.x
    + (uBones[int(aBones.y)] * source) * aWeights.y
    + (uBones[int(aBones.z)] * source) * aWeights.z
    + (uBones[int(aBones.w)] * source) * aWeights.w;
  vec2 screen = uOrigin + p.xy * uScale;
  gl_Position = vec4(screen / uViewport * vec2(2.0,-2.0) + vec2(-1.0,1.0), 0.0, 1.0);
  vUv = aPosition / ${C.referenceSize.toFixed(1)};
}`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform int uGlowKind;
uniform float uGlow;
uniform float uLodBias;
uniform float uOpacity;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec4 tex = texture(uTexture, vUv, uLodBias);
  vec3 rgb = tex.rgb / max(tex.a, 0.001);
  float mask = 0.0;
  if (uGlowKind == 1) {
    mask = (1.0-smoothstep(0.022,0.053,distance(vUv,vec2(0.230,0.348)))) * smoothstep(0.40,0.90,rgb.r);
  } else if (uGlowKind == 2) {
    mask = smoothstep(0.40,0.87,max(rgb.r,rgb.b)) * smoothstep(0.07,0.30,rgb.b-rgb.g);
  } else if (uGlowKind == 3) {
    mask = smoothstep(0.35,0.80,rgb.r) * (1.0-smoothstep(0.30,0.65,rgb.g)) * (1.0-smoothstep(0.12,0.35,rgb.b));
  } else if (uGlowKind == 4) {
    mask = (1.0-smoothstep(0.031,0.046,distance(vUv,vec2(0.429,0.106)))) * smoothstep(0.50,0.88,rgb.r);
  }
  fragColor = vec4(tex.rgb * (1.0 + uGlow * mask), tex.a) * uOpacity;
}`;
