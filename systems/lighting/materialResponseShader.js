export const MATERIAL_RESPONSE_SHADER_KEY = "jkd-material-response-shader";

export const MATERIAL_RESPONSE_FRAGMENT = `
precision mediump float;

uniform vec2 resolution;
uniform float uLayerAlpha;
uniform float uGameTime;
uniform float uRainAmount;
uniform float uStormAmount;
uniform float uSurfaceAmount;
uniform float uUndergroundAmount;
uniform float uWeatherWetness;
uniform float uWeatherShelterAmount;
uniform float uNightAmount;
uniform float uTorchActive;
uniform vec2 uTorchPosition;
uniform float uTorchRadius;
uniform float uTorchGlow;
uniform float uTorchWarmth;
uniform float uTorchCoolEdge;
uniform float uSurfaceLightInfluence;
uniform float uUndergroundDarknessInfluence;
uniform float uMaterialWetSurfaceStrength;
uniform float uMaterialWarmPoolStrength;
uniform float uMaterialFloorBounceStrength;
uniform float uMaterialCaveReliefStrength;
uniform float uMaterialHighlightCeiling;
uniform float uMaterialGroundBandStart;
uniform float uMaterialGroundBandEnd;
uniform float uMaterialDetailFrequency;

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

void main() {
  vec2 uv = fragCoord / resolution.xy;
  float aspect = resolution.x / max(1.0, resolution.y);
  float surface = clamp(uSurfaceAmount * uSurfaceLightInfluence, 0.0, 1.0);
  float underground = clamp(
    max(uUndergroundAmount, uUndergroundDarknessInfluence),
    0.0,
    1.0
  );
  float shelter = clamp(uWeatherShelterAmount, 0.0, 1.0);
  float wetness = clamp(
    max(uWeatherWetness, uRainAmount * 0.72 + uStormAmount * 0.22),
    0.0,
    1.0
  ) * surface * (1.0 - shelter * 0.58);

  vec2 torchUv = vec2(uTorchPosition.x, 1.0 - uTorchPosition.y);
  float radius = max(0.045, uTorchRadius);
  vec2 torchDelta = vec2((uv.x - torchUv.x) * aspect, uv.y - torchUv.y);
  float localDistance = length(vec2(torchDelta.x, torchDelta.y * 1.08));
  float localPool = 1.0 - smoothstep(radius * 0.18, radius, localDistance);
  localPool *= clamp(0.18 + uTorchGlow * 0.82, 0.0, 1.0);

  vec2 floorCenter = torchUv - vec2(0.0, radius * 0.22);
  vec2 floorDelta = vec2((uv.x - floorCenter.x) * aspect * 0.70, (uv.y - floorCenter.y) * 2.55);
  float floorBounce = 1.0 - smoothstep(radius * 0.10, radius * 0.92, length(floorDelta));
  floorBounce *= clamp(uTorchGlow + uTorchActive * 0.18, 0.0, 1.0);

  float lower = smoothstep(uMaterialGroundBandStart, uMaterialGroundBandStart + 0.08, uv.y);
  float upper = 1.0 - smoothstep(uMaterialGroundBandEnd - 0.10, uMaterialGroundBandEnd, uv.y);
  float groundBand = clamp(lower * upper, 0.0, 1.0);
  float frequency = max(8.0, uMaterialDetailFrequency);
  float facets = noise(vec2(uv.x * frequency, uv.y * frequency * 0.32));
  float seams = abs(sin((uv.x * frequency + uv.y * frequency * 0.18) * 3.14159265));
  float wetGlint = smoothstep(0.76, 0.96, facets) * pow(seams, 8.0) * groundBand * wetness;

  float caveDetail = noise(vec2(uv.x * frequency * 0.72, uv.y * frequency * 0.52));
  float caveRelief = smoothstep(0.62, 0.90, caveDetail) * localPool * underground;

  vec3 warmColor = mix(
    vec3(0.96, 0.58, 0.24),
    vec3(1.00, 0.79, 0.48),
    clamp(uTorchWarmth, 0.0, 1.0)
  );
  vec3 coolColor = mix(
    vec3(0.28, 0.52, 0.68),
    vec3(0.48, 0.70, 0.82),
    clamp(uTorchCoolEdge, 0.0, 1.0)
  );

  float warmPoolEnergy = localPool * uMaterialWarmPoolStrength;
  float floorEnergy = floorBounce * uMaterialFloorBounceStrength;
  float wetEnergy = wetGlint * uMaterialWetSurfaceStrength;
  float caveEnergy = caveRelief * uMaterialCaveReliefStrength;
  float nightRestraint = mix(0.86, 1.0, clamp(uNightAmount, 0.0, 1.0));
  float energy = min(
    uMaterialHighlightCeiling,
    (warmPoolEnergy + floorEnergy + wetEnergy + caveEnergy) * nightRestraint
  );

  vec3 color = warmColor * (warmPoolEnergy + floorEnergy);
  color += coolColor * (wetEnergy + caveEnergy);
  color = min(color, vec3(uMaterialHighlightCeiling));

  gl_FragColor = vec4(color * uLayerAlpha, energy * uLayerAlpha);
}
`;
