import assert from "node:assert/strict";
import fs from "node:fs";

import { SkylineWeatherVfxSystem } from "../systems/environment/SkylineWeatherVfxSystem.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";

const system = new SkylineWeatherVfxSystem({}, SKYLINE_WEATHER_VFX);
const allocatedSheets = [];
system._image = sheet => {
  allocatedSheets.push(sheet);
  return { setVisible: () => {} };
};
system._createPrecipitation();

assert.equal(SKYLINE_WEATHER_VFX.precipitation.rainAtlasEnabled, false);
assert.equal(SKYLINE_WEATHER_VFX.precipitation.snowAtlasEnabled, true);
assert.equal(system.precipitation.length, SKYLINE_WEATHER_VFX.precipitation.count);
assert.deepEqual(system.impacts, []);
assert.deepEqual(
  [...new Set(allocatedSheets)],
  ["snow"],
  "winter snow may allocate, but rejected rain and its water impacts may not"
);

const weatherSource = fs.readFileSync(
  new URL("../systems/environment/WeatherSystem.js", import.meta.url),
  "utf8",
);
const impactSource = fs.readFileSync(
  new URL("../systems/environment/WeatherImpactRainController.js", import.meta.url),
  "utf8",
);
assert.match(weatherSource, /impactRainController\.update/);
assert.match(impactSource, /nearestImpactForScreenX/);
assert.match(impactSource, /impactScreenY/);

const skylineSource = fs.readFileSync(
  new URL("../systems/environment/SkylineWeatherVfxSystem.js", import.meta.url),
  "utf8",
);
assert.match(skylineSource, /rainAtlasEnabled/);
assert.match(skylineSource, /snowAtlasEnabled/);

console.log("Weather atlas guard passed; procedural rain remains authoritative and atlas snow is preserved");
