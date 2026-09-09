import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ASSET_KEYS } from "../values/assetKeys.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";
import { resolveWeatherAmbienceMix } from "../systems/environment/WeatherRecordedAmbienceController.js";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = WEATHER_CONFIG.audio.recorded;
const baseState = {
  kind: "rain",
  rainAmount: 0.7,
  stormAmount: 0,
  wind: 0,
  gust: 0,
  depth: { surfaceAmount: 1 },
  occlusion: { coveredAmount: 0, openSkyAmount: 1 },
};

assert.equal(resolveWeatherAmbienceMix(baseState, config).rainRole, "rainOpen");
assert.equal(
  resolveWeatherAmbienceMix({
    ...baseState,
    occlusion: { coveredAmount: 0.8, openSkyAmount: 0.2 },
  }, config).rainRole,
  "rainRoof",
);
assert.equal(
  resolveWeatherAmbienceMix({ ...baseState, stormAmount: 0.8 }, config).rainRole,
  "stormOpen",
);
assert.equal(
  resolveWeatherAmbienceMix({
    ...baseState,
    stormAmount: 0.8,
    occlusion: { coveredAmount: 0.8, openSkyAmount: 0.2 },
  }, config).rainRole,
  "rainShelter",
);
assert.equal(
  resolveWeatherAmbienceMix({ ...baseState, rainAmount: 0, wind: 80 }, config).windRole,
  "windOpen",
);
assert.equal(
  resolveWeatherAmbienceMix({ ...baseState, rainAmount: 0, wind: 150 }, config).windRole,
  "windStrong",
);
assert.equal(
  resolveWeatherAmbienceMix({
    ...baseState,
    rainAmount: 0,
    wind: 85,
  }, config, null, "windStrong").windRole,
  "windStrong",
  "strong wind must use exit hysteresis instead of chattering at one threshold",
);

const assets = Object.values(ASSET_KEYS.audio.weatherAmbience);
assert.equal(assets.length, 6);
assert.equal(new Set(assets.map(asset => asset.key)).size, assets.length);
for (const asset of assets) {
  assert.ok(!asset.path.includes("SoundLibrary_Review"));
  const bytes = fs.readFileSync(path.join(root, asset.path));
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WAVE");
  assert.equal(bytes.readUInt32LE(24), 32000);
  assert.equal(bytes.readUInt16LE(22), 2);
  assert.equal(bytes.readUInt16LE(34), 16);
  const duration = bytes.readUInt32LE(40) / (32000 * 2 * 2);
  assert.ok(Math.abs(duration - 10) < 0.001);
}

const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "sound/soundEffects/weather-ambience-v1/manifest.json"),
  "utf8",
));
assert.equal(manifest.runtimeEligible, true);
assert.equal(manifest.records.length, 6);
assert.match(manifest.licenseUrl, /sonniss\.com/);
assert.ok(manifest.records.every(record => record.runtimeEligible));
for (const record of manifest.records) {
  const bytes = fs.readFileSync(path.join(root, record.runtimePath));
  assert.equal(
    crypto.createHash("sha256").update(bytes).digest("hex"),
    record.runtimeSha256,
    `${record.output} must match its approved runtime hash`,
  );
}

const bootSource = fs.readFileSync(path.join(root, "ui/scenes/BootScene.js"), "utf8");
const controllerSource = fs.readFileSync(
  path.join(root, "systems/environment/WeatherRecordedAmbienceController.js"),
  "utf8",
);
assert.match(bootSource, /ASSET_KEYS\.audio\.weatherAmbience/);
assert.match(bootSource, /preload: false/);
assert.match(controllerSource, /new AudioLayerBus/);
const busSource = fs.readFileSync(path.join(root, "sound/AudioLayerBus.js"), "utf8");
assert.match(busSource, /runtimeAudioAssetManager/);
assert.match(busSource, /loop: layer.loop !== false/);

console.log(
  "Recorded weather ambience contract passed: six seamless lazy assets, one contextual rain role, and hysteretic wind selection",
);
