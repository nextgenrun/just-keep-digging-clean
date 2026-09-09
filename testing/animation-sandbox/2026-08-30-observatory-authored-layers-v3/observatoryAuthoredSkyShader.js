export const OBSERVATORY_AUTHORED_SKY_FRAGMENT = `
precision highp float;

uniform sampler2D uMainSampler;
uniform float uPhase;
uniform float uStrength;
uniform float uBaseIntensity;
uniform float uSteadyLevel;
uniform float uSteadyDepth;
uniform float uTwinkleDepth;
uniform float uMicroRange;
uniform float uDeepClassThreshold;
uniform float uSparkleClassThreshold;
uniform float uExtinguishLow;
uniform float uExtinguishHigh;
uniform float uTwinkleGain;
uniform float uSparkleGain;

varying vec2 outTexCoord;

const float TAU = 6.28318530718;

float hash11(float value) {
  return fract(sin(value * 103.97 + 17.31) * 43758.5453123);
}

void main() {
  vec4 source = texture2D(uMainSampler, outTexCoord);
  if (source.a < 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float seed = source.r;
  float identityA = hash11(seed * 13.13 + 0.11);
  float identityB = hash11(seed * 29.71 + 0.37);
  float identityC = hash11(seed * 53.47 + 0.79);
  float identityD = hash11(seed * 83.11 + 0.23);

  float slowFrequency = 1.0 + floor(identityB * 5.0);
  float slowTwinkle = sin(uPhase * TAU * slowFrequency + identityC * TAU) * 0.5 + 0.5;
  float microFrequency = 11.0 + floor(identityC * 12.0);
  float microTwinkle = sin(uPhase * TAU * microFrequency + identityD * TAU) * 0.5 + 0.5;
  float sparkleFrequency = 17.0 + floor(identityD * 13.0);
  float sparkleWave = sin(uPhase * TAU * sparkleFrequency + identityB * TAU) * 0.5 + 0.5;

  float steadyActivity = uBaseIntensity + uSteadyLevel + slowTwinkle * uSteadyDepth + microTwinkle * uMicroRange;
  float deepGate = smoothstep(uExtinguishLow, uExtinguishHigh, slowTwinkle);
  float deepActivity = uBaseIntensity + deepGate * uTwinkleDepth + microTwinkle * uMicroRange;
  float sparkleActivity = uBaseIntensity + slowTwinkle * uSteadyDepth
    + pow(sparkleWave, 9.0) * uSparkleGain;

  float steadyClass = 1.0 - step(uDeepClassThreshold, identityA);
  float deepClass = step(uDeepClassThreshold, identityA) * (1.0 - step(uSparkleClassThreshold, identityA));
  float sparkleClass = step(uSparkleClassThreshold, identityA);
  float activity = (steadyClass * steadyActivity + deepClass * deepActivity + sparkleClass * sparkleActivity)
    * uTwinkleGain * clamp(uStrength, 0.0, 1.0);
  vec3 starTint = mix(vec3(0.52, 0.72, 1.0), vec3(1.0, 0.82, 0.62), step(0.78, identityD));
  float alpha = clamp(source.a * activity, 0.0, 1.0);
  gl_FragColor = vec4(starTint * alpha, alpha);
}
`;
