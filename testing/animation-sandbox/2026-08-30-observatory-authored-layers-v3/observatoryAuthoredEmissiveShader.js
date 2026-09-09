export const OBSERVATORY_AUTHORED_EMISSIVE_FRAGMENT = `
precision highp float;

uniform sampler2D uMainSampler;
uniform float uPhase;
uniform float uWorldTime;
uniform float uWeekPhase;
uniform float uStrength;
uniform float uBaseIntensity;
uniform float uMicroFlickerRange;
uniform float uFlameFlickerRange;
uniform float uOffIntensity;
uniform float uOccupancyThreshold;
uniform float uOccupancyFeather;
uniform float uShadowThreshold;
uniform float uShadowFeather;
uniform float uShadowDepth;
uniform float uSteadyClassEnd;
uniform float uOccupiedClassEnd;
uniform float uShadowClassEnd;
uniform float uBloomGain;

varying vec2 outTexCoord;

const float TAU = 6.28318530718;

float hash11(float value) {
  return fract(sin(value * 91.733 + 13.137) * 43758.5453123);
}

void main() {
  vec4 source = texture2D(uMainSampler, outTexCoord);
  if (source.a < 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float seed = source.r;
  float identityA = hash11(seed * 11.17 + 0.07);
  float identityB = hash11(seed * 23.41 + 0.31);
  float identityC = hash11(seed * 47.83 + 0.73);
  float identityD = hash11(seed * 71.29 + 0.19);

  float flameFrequency = 37.0 + floor(identityB * 19.0);
  float flame = sin(uPhase * TAU * flameFrequency + identityC * TAU);
  float microFrequency = 19.0 + floor(identityC * 13.0);
  float micro = sin(uPhase * TAU * microFrequency + identityD * TAU);
  float flameLevel = uBaseIntensity + flame * uFlameFlickerRange + micro * uMicroFlickerRange;

  float scheduleShift = (identityC - 0.5) * 0.24;
  float dailyTime = fract(uWorldTime + scheduleShift);
  float weeklyInfluence = sin(uWeekPhase * TAU + identityD * TAU) * 0.12;
  float scheduleThreshold = uOccupancyThreshold + (identityB - 0.5) * 0.55 - weeklyInfluence;
  float occupancyWave = cos(dailyTime * TAU);
  float occupancyGate = smoothstep(scheduleThreshold - uOccupancyFeather, scheduleThreshold + uOccupancyFeather, occupancyWave);

  float shadowFrequency = 4.0 + floor(identityD * 4.0);
  float shadowWave = sin(uPhase * TAU * shadowFrequency + identityB * TAU);
  float shadowPass = smoothstep(uShadowThreshold - uShadowFeather, uShadowThreshold + uShadowFeather, shadowWave);
  float shadowGate = 1.0 - shadowPass * uShadowDepth;

  float slowRoomTime = fract(uWorldTime + identityD * 0.32);
  float slowRoomWave = cos(slowRoomTime * TAU) + weeklyInfluence;
  float slowRoomGate = smoothstep(-uOccupancyFeather, uOccupancyFeather, slowRoomWave);

  float steadyClass = 1.0 - step(uSteadyClassEnd, identityA);
  float occupiedClass = step(uSteadyClassEnd, identityA) * (1.0 - step(uOccupiedClassEnd, identityA));
  float shadowClass = step(uOccupiedClassEnd, identityA) * (1.0 - step(uShadowClassEnd, identityA));
  float slowRoomClass = step(uShadowClassEnd, identityA);
  float behaviorGate = steadyClass
    + occupiedClass * occupancyGate
    + shadowClass * shadowGate
    + slowRoomClass * slowRoomGate;

  float animatedIntensity = mix(uOffIntensity, flameLevel, behaviorGate);
  float motionMix = clamp(uStrength, 0.0, 1.0);
  float strengthGain = mix(0.72, 1.10, clamp(uStrength / 1.35, 0.0, 1.0));
  float intensity = clamp(mix(1.0, animatedIntensity, motionMix) * strengthGain, 0.0, 1.45);
  float alpha = source.a * clamp(intensity, 0.0, 1.0);
  vec3 warmTint = mix(vec3(1.0, 0.40, 0.075), vec3(1.0, 0.64, 0.19), identityD);
  gl_FragColor = vec4(warmTint * intensity * uBloomGain * alpha, alpha);
}
`;
