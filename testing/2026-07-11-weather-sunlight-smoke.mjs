import assert from "node:assert/strict";

import { WeatherSystem } from "../systems/environment/WeatherSystem.js";
import { LightSystem } from "../systems/lighting/LightSystem.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";

const weather = Object.create(WeatherSystem.prototype);
weather.weatherConfig = WEATHER_CONFIG;
weather.kind = "clear";
weather.intensity = 0;
weather._lightingSnapshot = weather._getLightingTarget();

const clearWeather = { ...weather._lightingSnapshot };
assert.equal(clearWeather.sunTransmittance, 1);
assert.equal(clearWeather.sunExposure, 1);
assert.equal(clearWeather.sunTint, 0xffffff);

weather.kind = "storm";
weather.intensity = 1;
const stormTarget = weather._getLightingTarget();
weather._updateLightingSnapshot(16);
assert.ok(weather._lightingSnapshot.sunTransmittance < clearWeather.sunTransmittance);
assert.ok(weather._lightingSnapshot.sunTransmittance > stormTarget.sunTransmittance);

for (let frame = 0; frame < 1200; frame += 1) weather._updateLightingSnapshot(16);
const stormWeather = { ...weather._lightingSnapshot };
assert.ok(Math.abs(stormWeather.sunTransmittance - stormTarget.sunTransmittance) < 0.0001);
assert.ok(stormWeather.cloudCoverAmount > clearWeather.cloudCoverAmount);
assert.ok(stormWeather.fogAmount > clearWeather.fogAmount);
assert.equal(stormWeather.sunTint, stormTarget.sunTint);

function sampleColorAfter(stepMs, totalMs) {
  const system = Object.create(WeatherSystem.prototype);
  system.weatherConfig = WEATHER_CONFIG;
  system.kind = "clear";
  system.intensity = 0;
  system._lightingSnapshot = system._getLightingTarget();
  system._lightingColorChannels = system._colorChannels(system._lightingSnapshot.sunTint);
  system.kind = "storm";
  system.intensity = 1;
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    system._updateLightingSnapshot(Math.min(stepMs, totalMs - elapsed));
  }
  return system._lightingSnapshot.sunTint;
}

const tintAt60Fps = sampleColorAfter(1000 / 60, 2000);
const tintAt30Fps = sampleColorAfter(1000 / 30, 2000);
for (const shift of [16, 8, 0]) {
  assert.ok(Math.abs(((tintAt60Fps >> shift) & 0xff) - ((tintAt30Fps >> shift) & 0xff)) <= 1);
}

const light = Object.create(LightSystem.prototype);
light.scene = {
  cameras: { main: { width: 1280, height: 720 } },
  config: { viewportWidth: 1280, viewportHeight: 720 },
};
light.dayNightCycle = {
  getSunAlpha: () => 1,
  getNightAmount: () => 0,
  getSunWorldPosition: () => ({ x: 12000, y: 5200 }),
  getSunScreenPosition: () => ({ x: 640, y: 0 }),
};
light.weatherSystem = { getLightingSnapshot: () => clearWeather };

const clearSun = light.getSunlightSnapshot();
light.weatherSystem.getLightingSnapshot = () => stormWeather;
const stormSun = light.getSunlightSnapshot();

assert.equal(clearSun.strength, clearSun.baseStrength);
assert.deepEqual(clearSun.worldPosition, { x: 12000, y: 5200 });
assert.ok(stormSun.strength < clearSun.strength * 0.2);
assert.ok(stormSun.tint !== clearSun.tint);
assert.equal(light._getSunStrength(stormSun), stormSun.strength);

console.log("weather sunlight smoke: clear daylight, storm attenuation, and frame-rate-safe tint passed");
