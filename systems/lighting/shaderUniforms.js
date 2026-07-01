const vec2 = (x = 0, y = 0) => ({ type: "2f", value: { x, y } });
const vec3 = (x = 0, y = 0, z = 0) => ({ type: "3f", value: { x, y, z } });
const float = (value = 0) => ({ type: "1f", value });

export function createCommonShaderUniforms() {
  return {
    uLayerAlpha: float(0),
    uGameTime: float(0),
    uResolution: vec2(1280, 720),

    uWeatherIntensity: float(0),
    uRainAmount: float(0),
    uStormAmount: float(0),
    uWind: float(0),
    uLightningFlash: float(0),
    uSurfaceAmount: float(1),
    uUndergroundAmount: float(0),
    uUndergroundSignal: float(0),
    uWeatherWetness: float(0),
    uWeatherVisibilityPenalty: float(0),
    uWeatherShelterAmount: float(0),
    uWeatherGustAmount: float(0),

    uNightAmount: float(0),
    uSunAlpha: float(1),
    uMoonAlpha: float(0),
    uSunPosition: vec2(0.5, 0.2),
    uMoonPosition: vec2(0.5, 0.2),
    uSkyColor: vec3(0.35, 0.48, 0.60),
    uHorizonColor: vec3(0.69, 0.75, 0.82),

    uDarknessAlpha: float(0),
    uDepthRatio: float(0),
    uTorchActive: float(1),
    uTorchPosition: vec2(0.5, 0.5),
    uTorchRadius: float(0.25),
    uTorchGlow: float(0),
    uSurfaceLightInfluence: float(1),
    uUndergroundDarknessInfluence: float(0),
    uStormCavePulse: float(0),
    uSunStrength: float(1),
  };
}
