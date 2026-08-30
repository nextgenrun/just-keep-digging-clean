import assert from "node:assert/strict";
import fs from "node:fs";

import {
  WeatherImpactRainController,
} from "../systems/environment/WeatherImpactRainController.js";
import {
  WeatherPrecipitationEnvelope,
} from "../systems/environment/WeatherPrecipitationEnvelope.js";
import { WeatherSystem } from "../systems/environment/WeatherSystem.js";
import { WeatherWorldState } from "../systems/environment/WeatherWorldState.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";

function advance(envelope, kind, intensity, totalMs, stepMs) {
  const values = [];
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    values.push(envelope.update(kind, intensity, stepMs));
  }
  return values;
}

const envelope = new WeatherPrecipitationEnvelope(WEATHER_CONFIG, "clear", 0);
const rise = advance(envelope, "rain", 1, 6000, 100);
assert.ok(rise[0].rainAmount > 0 && rise[0].rainAmount < 1);
assert.ok(rise.every((sample, index) => (
  index === 0 || sample.rainAmount >= rise[index - 1].rainAmount
)));
assert.ok(rise.at(-1).rainAmount > 0.94);

const rainBeforeClear = envelope.getSnapshot().rainAmount;
const clearTail = envelope.update("clear", 0, 100);
assert.ok(clearTail.rainAmount > 0);
assert.ok(clearTail.rainAmount < rainBeforeClear);
assert.equal(clearTail.snowAmount, 0);
assert.equal(clearTail.stormAmount, 0);
const dry = advance(envelope, "clear", 0, 30000, 100).at(-1);
assert.equal(dry.rainAmount, 0);

envelope.snap("storm", 0.9);
const easingOutOfStorm = envelope.update("rain", 0.7, 100);
assert.ok(easingOutOfStorm.rainAmount > 0.7);
assert.ok(easingOutOfStorm.stormAmount > 0);
assert.ok(easingOutOfStorm.stormAmount < 0.9);

envelope.snap("snow", 0.8);
const snowTail = envelope.update("clear", 0, 100);
assert.ok(snowTail.snowAmount > 0 && snowTail.snowAmount < 0.8);
assert.equal(snowTail.rainAmount, 0);

const coarse = new WeatherPrecipitationEnvelope(WEATHER_CONFIG, "clear", 0);
const fine = new WeatherPrecipitationEnvelope(WEATHER_CONFIG, "clear", 0);
const coarseResult = advance(coarse, "rain", 0.75, 5000, 100).at(-1);
const fineResult = advance(fine, "rain", 0.75, 5000, 20).at(-1);
assert.ok(Math.abs(coarseResult.rainAmount - fineResult.rainAmount) < 1e-9);

const rainRouting = Object.create(WeatherImpactRainController.prototype);
assert.equal(rainRouting._getSurfaceRainAmount({
  kind: "clear",
  intensity: 0,
  rainAmount: 0.4,
  depth: { surfaceAmount: 0.5 },
  occlusion: { openSkyAmount: 0.5 },
}), 0.1);
assert.equal(rainRouting._getSurfaceRainAmount({
  kind: "clear",
  intensity: 0,
  depth: { surfaceAmount: 1 },
  occlusion: { openSkyAmount: 1 },
}), 0);

const wetScene = {};
const wetState = new WeatherWorldState(wetScene, { tileSize: 94, topAirRows: 65 }, WEATHER_CONFIG);
wetState.update(100, {
  kind: "clear",
  intensity: 0,
  rainAmount: 0.5,
  depth: { surfaceAmount: 1, undergroundAmount: 0 },
  occlusion: {
    openSkyAmount: 1,
    landingSamples: [{ worldX: 47 }],
    samples: [],
  },
});
assert.ok(wetState.worldWetnessAmount > 0);
assert.ok(wetState._wetColumns.get(0) > 0);

let snapCount = 0;
const forcedWeather = Object.create(WeatherSystem.prototype);
forcedWeather.weatherConfig = { phases: { rain: {} } };
forcedWeather.scene = { time: { now: 100 } };
forcedWeather.kind = "clear";
forcedWeather.intensity = 0.2;
forcedWeather.targetIntensity = 0;
forcedWeather.director = {
  force: (kind, intensity) => ({ kind, targetIntensity: intensity }),
};
forcedWeather.precipitationEnvelope = { snap: () => { snapCount += 1; } };
forcedWeather.lightningController = { schedule: () => undefined };
forcedWeather._applyDirectorPatch = (patch) => {
  forcedWeather.kind = patch.kind;
  forcedWeather.targetIntensity = patch.targetIntensity;
};
forcedWeather.forceWeather("rain", 1, 20000, true);
assert.equal(snapCount, 0, "smooth review forcing must retain the live envelope");
forcedWeather.forceWeather("rain", 1, 20000, false);
assert.equal(snapCount, 1, "default forceWeather must remain deterministic");

const layers = WEATHER_CONFIG.rain.layers;
const totalPeakSpawnRate = layers.foreground.ratePerSecond
  + layers.midground.ratePerSecond
  + layers.sheet.ratePerSecond;
assert.ok(totalPeakSpawnRate <= 610);
assert.ok(WEATHER_CONFIG.rain.impact.maxActiveDrops <= 400);
assert.ok(WEATHER_CONFIG.rain.impact.maxEventsPerFrame <= 32);
assert.ok(WEATHER_CONFIG.rain.impact.visualStyles.foreground.widthPx <= 4);
assert.ok(layers.foreground.alpha <= 0.68);
assert.ok(WEATHER_CONFIG.splashes.ratePerSecond <= 95);
Object.values(WEATHER_CONFIG.phases).forEach((phase) => {
  assert.ok(phase.durationMs[0] >= 24000);
});
assert.ok(WEATHER_CONFIG.intensityRetargetMs[0] >= 4500);

const weatherSystemSource = fs.readFileSync(
  new URL("../systems/environment/WeatherSystem.js", import.meta.url),
  "utf8",
);
const particleSource = fs.readFileSync(
  new URL("../systems/environment/WeatherParticleController.js", import.meta.url),
  "utf8",
);
const audioSource = fs.readFileSync(
  new URL("../systems/environment/WeatherAudioController.js", import.meta.url),
  "utf8",
);
const harnessSource = fs.readFileSync(
  new URL("./JkdE2EHarness.js", import.meta.url),
  "utf8",
);
assert.match(weatherSystemSource, /precipitationEnvelope\.update/);
assert.match(weatherSystemSource, /\.\.\.precipitation/);
assert.match(particleSource, /state\.rainAmount/);
assert.match(audioSource, /state\.rainAmount/);
assert.match(harnessSource, /Shift\+F12 smooth rain-entry preview/);
assert.match(harnessSource, /Shift\+F11 smooth rain-release preview/);

console.log(
  "Weather transition polish contract passed: precipitation fades continuously and peak rain clutter stays bounded",
);
