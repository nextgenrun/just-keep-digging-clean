export const OBSERVATORY_DEPTH_MOTION_FRAGMENT = `
precision highp float;

uniform sampler2D uMainSampler;
uniform sampler2D uDepthSampler;
uniform sampler2D uDomainSampler;
uniform float uPhase;
uniform float uMotionStrength;
uniform float uDepthStrength;
uniform float uUpperAmplitude;
uniform float uLowerAmplitude;
uniform float uDepthAmplitude;
uniform float uRigidSuppression;
uniform float uReliefStrength;
uniform float uViewMode;
uniform vec2 uView;

varying vec2 outTexCoord;

const float TAU = 6.28318530718;

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

float sourceLuma(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec2 clampedUv(vec2 uv) {
  return clamp(uv, vec2(0.002), vec2(0.998));
}

vec2 auxiliaryUv(vec2 uv) {
  return vec2(uv.x, 1.0 - uv.y);
}

vec3 renderMotion(vec2 uv, vec3 base, vec3 domains, float depth) {
  float angle = uPhase * TAU;
  float spatialA = sin(uv.x * 18.0 + uv.y * 11.0);
  float spatialB = cos(uv.x * 9.0 - uv.y * 17.0);
  float upperMask = domains.r * (1.0 - domains.b * uRigidSuppression);
  float lowerMask = domains.g * (1.0 - domains.b * uRigidSuppression);

  vec2 upperOrbit = vec2(
    cos(angle + uv.y * 7.0 + spatialB),
    sin(angle + uv.x * 5.0 + spatialA)
  ) * uUpperAmplitude;
  vec2 lowerOrbit = vec2(
    cos(angle + uv.y * 3.0 + spatialA * 0.55),
    sin(angle + uv.x * 4.0 + spatialB * 0.45)
  ) * uLowerAmplitude;
  vec2 depthShift = (uView + vec2(sin(angle), cos(angle)) * 0.26)
    * (depth - 0.5) * uDepthAmplitude * uDepthStrength;
  vec2 flow = (upperOrbit * upperMask + lowerOrbit * lowerMask) * uMotionStrength;
  vec2 movedUv = clampedUv(uv + flow + depthShift * (1.0 - domains.b));
  vec3 sampledDomains = texture2D(uDomainSampler, auxiliaryUv(movedUv)).rgb;
  float sourceSafety = 1.0 - sampledDomains.b * uRigidSuppression;
  float motionMask = clamp((upperMask + lowerMask) * sourceSafety, 0.0, 1.0);

  vec3 moved = texture2D(uMainSampler, movedUv).rgb;
  vec2 echoUv = clampedUv(uv + flow * 0.42 - depthShift * 0.35);
  vec3 echo = texture2D(uMainSampler, echoUv).rgb;
  vec3 color = mix(base, mix(moved, echo, 0.22), motionMask);

  vec2 texel = vec2(1.0 / 1672.0, 1.0 / 941.0);
  float depthLeft = texture2D(uDepthSampler, auxiliaryUv(clampedUv(movedUv - vec2(texel.x, 0.0)))).r;
  float depthRight = texture2D(uDepthSampler, auxiliaryUv(clampedUv(movedUv + vec2(texel.x, 0.0)))).r;
  float depthUp = texture2D(uDepthSampler, auxiliaryUv(clampedUv(movedUv - vec2(0.0, texel.y)))).r;
  float depthDown = texture2D(uDepthSampler, auxiliaryUv(clampedUv(movedUv + vec2(0.0, texel.y)))).r;
  vec3 normal = normalize(vec3((depthLeft - depthRight) * 13.0, (depthUp - depthDown) * 13.0, 0.82));
  vec3 lightDirection = normalize(vec3(cos(angle) * 0.24 - 0.34, 0.52, 0.9));
  float relief = dot(normal, lightDirection) - 0.68;
  color *= 1.0 + relief * uReliefStrength * motionMask * uMotionStrength;

  float warm = smoothstep(0.035, 0.18, base.r - base.b) * smoothstep(0.06, 0.42, sourceLuma(base));
  float cellPhase = hash21(floor(uv * vec2(82.0, 46.0))) * TAU;
  float lightPulse = sin(angle * 3.0 + cellPhase) * 0.045 * warm * uMotionStrength;
  color += base * lightPulse;
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 uv = outTexCoord;
  vec3 base = texture2D(uMainSampler, uv).rgb;
  vec3 domains = texture2D(uDomainSampler, auxiliaryUv(uv)).rgb;
  float depth = texture2D(uDepthSampler, auxiliaryUv(uv)).r;
  vec3 runtimeColor = renderMotion(uv, base, domains, depth);

  if (uViewMode < 0.5) {
    gl_FragColor = vec4(base, 1.0);
  } else if (uViewMode < 1.5) {
    gl_FragColor = vec4(runtimeColor, 1.0);
  } else if (uViewMode < 2.5) {
    float divider = smoothstep(0.497, 0.5, uv.x) - smoothstep(0.5, 0.503, uv.x);
    vec3 splitColor = uv.x < 0.5 ? base : runtimeColor;
    gl_FragColor = vec4(mix(splitColor, vec3(0.62, 0.88, 1.0), divider * 0.8), 1.0);
  } else if (uViewMode < 3.5) {
    gl_FragColor = vec4(vec3(depth), 1.0);
  } else {
    gl_FragColor = vec4(domains, 1.0);
  }
}
`;
