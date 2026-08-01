import assert from "node:assert/strict";
import fs from "node:fs";

import {
  resolveSkylineWeatherVfxEnabled,
} from "../systems/environment/SkylineWeatherVfxSystem.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";

assert.equal(resolveSkylineWeatherVfxEnabled(SKYLINE_WEATHER_VFX), true);
assert.deepEqual(
  Object.keys(SKYLINE_WEATHER_VFX.sheets),
  ["clouds", "atmosphere", "lightning"],
);
assert.equal(SKYLINE_WEATHER_VFX.particleSheet.file, "weather-particles-v2.png");
assert.deepEqual(SKYLINE_WEATHER_VFX.particleFrames.rainStreaks, [0, 1, 2, 3]);
assert.equal(SKYLINE_WEATHER_VFX.particleFrames.snowFlakes.length, 8);
assert.equal(SKYLINE_WEATHER_VFX.particleFrames.rainSplashes.length, 4);
assert.equal(SKYLINE_WEATHER_VFX.particleFrames.snowPowder.length, 3);

const weatherSource = fs.readFileSync(
  new URL("../systems/environment/WeatherSystem.js", import.meta.url),
  "utf8",
);
const bootSource = fs.readFileSync(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8",
);
const rainSource = fs.readFileSync(
  new URL("../systems/environment/WeatherImpactRainController.js", import.meta.url),
  "utf8",
);
const snowSource = fs.readFileSync(
  new URL("../systems/environment/WeatherSnowController.js", import.meta.url),
  "utf8",
);
const skylineSource = fs.readFileSync(
  new URL("../systems/environment/SkylineWeatherVfxSystem.js", import.meta.url),
  "utf8",
);

assert.match(weatherSource, /new WeatherSnowController/);
assert.match(weatherSource, /precipitationImpacts/);
assert.match(weatherSource, /approvedParticleVisualsReady/);
assert.match(
  bootSource,
  /this\.preloadBackgrounds\(\);\s*(?:this\.preloadSurfaceSkyPropAtlasesV3\(\);\s*)?this\.preloadWeatherVfx\(\);/,
);
assert.match(bootSource, /preloadWeatherVfx\(\)\s*\{/);
assert.match(bootSource, /this\.load\.spritesheet\(\s*weatherVfx\.particles/);
assert.match(rainSource, /nearestImpactForWorldX/);
assert.match(rainSource, /impactWorldY/);
assert.match(snowSource, /nearestImpactForWorldX/);
assert.match(rainSource, /raycastWorldSegment/);
assert.match(snowSource, /raycastWorldSegment/);
assert.doesNotMatch(rainSource, /\.setScrollFactor\(0\)/);
assert.doesNotMatch(snowSource, /\.setScrollFactor\(0\)/);
assert.doesNotMatch(skylineSource, /_createPrecipitation/);
assert.doesNotMatch(skylineSource, /impactScreenY/);

console.log(
  "Weather atlas guard passed: clean ImageGen precipitation is owned by world-space rain and snow controllers",
);
